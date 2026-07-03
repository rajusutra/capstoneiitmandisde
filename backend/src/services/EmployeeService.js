// Business logic for employees. Every query includes tenantId — this is the
// tenant isolation rule from docs section 3: no query without a tenant filter.
const Employee = require('../models/Employee');
const { httpError } = require('../middleware/errorHandler');

const EmployeeService = {
  async list(tenantId) {
    return Employee.find({ tenantId }).sort({ name: 1 });
  },

  async create(tenantId, data) {
    const existing = await Employee.findOne({ tenantId, employeeCode: data.employeeCode });
    if (existing) throw httpError(409, 'An employee with this code already exists.');

    return Employee.create({
      tenantId,
      name: data.name,
      employeeCode: data.employeeCode,
      department: data.department,
      maxWeeklyHours: data.maxWeeklyHours,
      contactInfo: data.contactInfo,
    });
  },

  async update(tenantId, employeeId, data) {
    const employee = await Employee.findOneAndUpdate(
      { _id: employeeId, tenantId }, // tenantId in the filter = cannot touch other tenants
      { $set: { name: data.name, department: data.department, maxWeeklyHours: data.maxWeeklyHours, contactInfo: data.contactInfo } },
      { new: true, runValidators: true }
    );
    if (!employee) throw httpError(404, 'Employee not found.');
    return employee;
  },

  async remove(tenantId, employeeId) {
    const employee = await Employee.findOneAndDelete({ _id: employeeId, tenantId });
    if (!employee) throw httpError(404, 'Employee not found.');
    return employee;
  },
};

module.exports = EmployeeService;
