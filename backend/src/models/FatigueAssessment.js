// Stored result of one fatigue check on one shift (the AI output log).
const mongoose = require('mongoose');

const fatigueAssessmentSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  shiftId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift', required: true },
  riskScore: { type: Number, required: true },   // 0 - 100
  riskLevel: { type: String, enum: ['low', 'medium', 'high'], required: true },
  flags: [{ type: String }],                     // which rules were violated
  aiExplanation: { type: String, default: '' },
  suggestedAlternative: { type: String, default: '' },
  generatedAt: { type: Date, default: Date.now },
});

fatigueAssessmentSchema.index({ tenantId: 1, generatedAt: -1 });

module.exports = mongoose.model('FatigueAssessment', fatigueAssessmentSchema);
