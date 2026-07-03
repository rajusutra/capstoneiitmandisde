// Handles HTTP for /api/availability.
const AvailabilityService = require('../services/AvailabilityService');
const AvailabilityValidator = require('../validators/AvailabilityValidator');
const { toAvailabilityResponse } = require('../dto/AvailabilityDTO');
const ResponseFormatter = require('../views/ResponseFormatter');

const AvailabilityController = {
  async listForEmployee(req, res, next) {
    try {
      const records = await AvailabilityService.listForEmployee(req.tenantId, req.params.employeeId);
      return ResponseFormatter.success(res, records.map(toAvailabilityResponse));
    } catch (err) {
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      AvailabilityValidator.validateCreate(req.body);
      const record = await AvailabilityService.upsert(req.tenantId, req.body);
      return ResponseFormatter.success(res, toAvailabilityResponse(record), 'Availability saved', 201);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = AvailabilityController;
