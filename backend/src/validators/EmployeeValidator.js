// Checks employee input before it reaches the service layer.
const { httpError } = require('../middleware/errorHandler');

const EmployeeValidator = {
  validateCreate(body) {
    const { name, employeeCode } = body;
    if (!name || !employeeCode) {
      throw httpError(400, 'name and employeeCode are required.');
    }
    if (body.maxWeeklyHours !== undefined && (body.maxWeeklyHours < 1 || body.maxWeeklyHours > 100)) {
      throw httpError(400, 'maxWeeklyHours must be between 1 and 100.');
    }
  },
};

module.exports = EmployeeValidator;
