// Handles HTTP for /api/employees.
const EmployeeService = require('../services/EmployeeService');
const EmployeeValidator = require('../validators/EmployeeValidator');
const { toEmployeeResponse } = require('../dto/EmployeeDTO');
const ResponseFormatter = require('../views/ResponseFormatter');

const EmployeeController = {
  async list(req, res, next) {
    try {
      const employees = await EmployeeService.list(req.tenantId);
      return ResponseFormatter.success(res, employees.map(toEmployeeResponse));
    } catch (err) {
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      EmployeeValidator.validateCreate(req.body);
      const employee = await EmployeeService.create(req.tenantId, req.body);
      return ResponseFormatter.success(res, toEmployeeResponse(employee), 'Employee created', 201);
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const employee = await EmployeeService.update(req.tenantId, req.params.id, req.body);
      return ResponseFormatter.success(res, toEmployeeResponse(employee), 'Employee updated');
    } catch (err) {
      next(err);
    }
  },

  async remove(req, res, next) {
    try {
      await EmployeeService.remove(req.tenantId, req.params.id);
      return ResponseFormatter.success(res, null, 'Employee deleted');
    } catch (err) {
      next(err);
    }
  },
};

module.exports = EmployeeController;
