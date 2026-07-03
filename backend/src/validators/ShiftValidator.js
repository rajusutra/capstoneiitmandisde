// Checks shift input before it reaches the service layer.
const { httpError } = require('../middleware/errorHandler');

const ShiftValidator = {
  validateCreate(body) {
    const { employeeId, startTime, endTime } = body;
    if (!employeeId || !startTime || !endTime) {
      throw httpError(400, 'employeeId, startTime and endTime are required.');
    }
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (isNaN(start) || isNaN(end)) {
      throw httpError(400, 'startTime and endTime must be valid dates.');
    }
    if (end <= start) {
      throw httpError(400, 'endTime must be after startTime.');
    }
    const hours = (end - start) / (1000 * 60 * 60);
    if (hours > 24) {
      throw httpError(400, 'A single shift cannot be longer than 24 hours.');
    }
  },
};

module.exports = ShiftValidator;
