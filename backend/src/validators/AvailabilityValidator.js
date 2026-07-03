// Checks availability input before it reaches the service layer.
const { httpError } = require('../middleware/errorHandler');

const AvailabilityValidator = {
  validateCreate(body) {
    const { employeeId, dayOfWeek, availableFrom, availableTo } = body;
    if (!employeeId || dayOfWeek === undefined || !availableFrom || !availableTo) {
      throw httpError(400, 'employeeId, dayOfWeek, availableFrom and availableTo are required.');
    }
    if (dayOfWeek < 0 || dayOfWeek > 6) {
      throw httpError(400, 'dayOfWeek must be between 0 (Sunday) and 6 (Saturday).');
    }
    const timePattern = /^\d{2}:\d{2}$/; // e.g. "09:00"
    if (!timePattern.test(availableFrom) || !timePattern.test(availableTo)) {
      throw httpError(400, 'Times must be in HH:MM format, e.g. 09:00.');
    }
  },
};

module.exports = AvailabilityValidator;
