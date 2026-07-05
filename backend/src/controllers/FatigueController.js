// Handles HTTP for /api/fatigue.
// POST /assess/:shiftId -> run the rule engine + AI explanation and save the result
// GET  /assessments     -> list past assessments for this tenant
const Shift = require('../models/Shift');
const Employee = require('../models/Employee');
const FatigueRule = require('../models/FatigueRule');
const FatigueAssessment = require('../models/FatigueAssessment');
const FatigueEngine = require('../services/ai/FatigueEngine');
const AIExplainer = require('../services/ai/AIExplainer');
const { toAssessmentResponse } = require('../dto/FatigueDTO');
const ResponseFormatter = require('../views/ResponseFormatter');
const { httpError } = require('../middleware/errorHandler');

const FatigueController = {
  async assess(req, res, next) {
    try {
      const tenantId = req.tenantId;

      // 1. Load the shift (tenant-scoped, so other tenants' shifts are invisible)
      const shift = await Shift.findOne({ _id: req.params.shiftId, tenantId });
      if (!shift) throw httpError(404, 'Shift not found.');

      const employee = await Employee.findOne({ _id: shift.employeeId, tenantId });
      if (!employee) throw httpError(404, 'Employee not found.');

      // 2. Load the employee's other shifts and the tenant's fatigue rules
      const otherShifts = await Shift.find({
        tenantId,
        employeeId: shift.employeeId,
        _id: { $ne: shift._id },
        status: 'scheduled',
      });
      let rule = await FatigueRule.findOne({ tenantId });
      if (!rule) rule = await FatigueRule.create({ tenantId }); // defaults

      // Respect the employee's personal weekly cap if it is stricter
      const effectiveRule = rule.toObject();
      effectiveRule.maxWeeklyHours = Math.min(rule.maxWeeklyHours, employee.maxWeeklyHours);

      // 3. Deterministic scoring, then AI explanation on top
      const result = FatigueEngine.assess(shift, otherShifts, effectiveRule);
      const explanation = await AIExplainer.explain(employee.name, result, shift);

      // 4. Replace this shift's previous assessment(s) — we keep one current
      // result per shift, not one row per time it happens to get (re-)assessed
      // (background auto-assess runs on every page load, so without this the
      // history collection fills up with duplicates of an unchanged shift).
      await FatigueAssessment.deleteMany({ tenantId, shiftId: shift._id });

      const assessment = await FatigueAssessment.create({
        tenantId,
        employeeId: employee._id,
        shiftId: shift._id,
        riskScore: result.riskScore,
        riskLevel: result.riskLevel,
        flags: result.flags,
        aiExplanation: explanation.aiExplanation,
        suggestedAlternative: explanation.suggestedAlternative,
      });

      return ResponseFormatter.success(res, toAssessmentResponse(assessment), 'Assessment complete', 201);
    } catch (err) {
      next(err);
    }
  },

  async listAssessments(req, res, next) {
    try {
      const assessments = await FatigueAssessment.find({ tenantId: req.tenantId })
        .populate('employeeId', 'name')
        .sort({ generatedAt: -1 })
        .limit(100);
      return ResponseFormatter.success(res, assessments.map(toAssessmentResponse));
    } catch (err) {
      next(err);
    }
  },
};

module.exports = FatigueController;
