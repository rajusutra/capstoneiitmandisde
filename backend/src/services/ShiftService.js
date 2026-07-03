// Business logic for shifts. All queries are tenant-scoped.
const Shift = require('../models/Shift');
const Employee = require('../models/Employee');
const { httpError } = require('../middleware/errorHandler');

const ShiftService = {
  async list(tenantId) {
    return Shift.find({ tenantId }).populate('employeeId', 'name').sort({ startTime: 1 });
  },

  async create(tenantId, data, createdBy) {
    // The employee must exist inside this tenant
    const employee = await Employee.findOne({ _id: data.employeeId, tenantId });
    if (!employee) throw httpError(404, 'Employee not found in your organization.');

    const start = new Date(data.startTime);
    const end = new Date(data.endTime);

    // Reject overlapping shifts: another shift that starts before this ends
    // AND ends after this starts.
    const overlap = await Shift.findOne({
      tenantId,
      employeeId: data.employeeId,
      status: 'scheduled',
      startTime: { $lt: end },
      endTime: { $gt: start },
    });
    if (overlap) throw httpError(409, 'This employee already has a shift overlapping that time.');

    const shift = await Shift.create({
      tenantId,
      employeeId: data.employeeId,
      startTime: start,
      endTime: end,
      shiftType: data.shiftType,
      createdBy,
    });
    return shift.populate('employeeId', 'name');
  },

  async update(tenantId, shiftId, data) {
    const shift = await Shift.findOneAndUpdate(
      { _id: shiftId, tenantId },
      { $set: { startTime: data.startTime, endTime: data.endTime, shiftType: data.shiftType, status: data.status } },
      { new: true, runValidators: true }
    ).populate('employeeId', 'name');
    if (!shift) throw httpError(404, 'Shift not found.');
    return shift;
  },

  async remove(tenantId, shiftId) {
    const shift = await Shift.findOneAndDelete({ _id: shiftId, tenantId });
    if (!shift) throw httpError(404, 'Shift not found.');
    return shift;
  },
};

module.exports = ShiftService;
