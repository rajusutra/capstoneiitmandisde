// Handles HTTP for /api/shifts.
const ShiftService = require('../services/ShiftService');
const ShiftValidator = require('../validators/ShiftValidator');
const { toShiftResponse } = require('../dto/ShiftDTO');
const ResponseFormatter = require('../views/ResponseFormatter');

const ShiftController = {
  async list(req, res, next) {
    try {
      const shifts = await ShiftService.list(req.tenantId);
      return ResponseFormatter.success(res, shifts.map(toShiftResponse));
    } catch (err) {
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      ShiftValidator.validateCreate(req.body);
      const shift = await ShiftService.create(req.tenantId, req.body, req.user.userId);
      return ResponseFormatter.success(res, toShiftResponse(shift), 'Shift created', 201);
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const shift = await ShiftService.update(req.tenantId, req.params.id, req.body);
      return ResponseFormatter.success(res, toShiftResponse(shift), 'Shift updated');
    } catch (err) {
      next(err);
    }
  },

  async remove(req, res, next) {
    try {
      await ShiftService.remove(req.tenantId, req.params.id);
      return ResponseFormatter.success(res, null, 'Shift deleted');
    } catch (err) {
      next(err);
    }
  },
};

module.exports = ShiftController;
