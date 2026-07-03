// Business logic for availability records. All queries are tenant-scoped.
const Availability = require('../models/Availability');
const Employee = require('../models/Employee');
const { httpError } = require('../middleware/errorHandler');

const AvailabilityService = {
  async listForEmployee(tenantId, employeeId) {
    const employee = await Employee.findOne({ _id: employeeId, tenantId });
    if (!employee) throw httpError(404, 'Employee not found in your organization.');
    return Availability.find({ tenantId, employeeId }).sort({ dayOfWeek: 1 });
  },

  // Creates or replaces the availability for one employee + weekday
  async upsert(tenantId, data) {
    const employee = await Employee.findOne({ _id: data.employeeId, tenantId });
    if (!employee) throw httpError(404, 'Employee not found in your organization.');

    return Availability.findOneAndUpdate(
      { tenantId, employeeId: data.employeeId, dayOfWeek: data.dayOfWeek },
      { $set: { availableFrom: data.availableFrom, availableTo: data.availableTo } },
      { new: true, upsert: true }
    );
  },
};

module.exports = AvailabilityService;
