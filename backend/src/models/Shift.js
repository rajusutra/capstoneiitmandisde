// One work shift assigned to one employee.
const mongoose = require('mongoose');

const shiftSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  shiftType: { type: String, enum: ['morning', 'evening', 'night', 'custom'], default: 'custom' },
  status: { type: String, enum: ['scheduled', 'completed', 'cancelled'], default: 'scheduled' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});

shiftSchema.index({ tenantId: 1, employeeId: 1, startTime: 1 });

module.exports = mongoose.model('Shift', shiftSchema);
