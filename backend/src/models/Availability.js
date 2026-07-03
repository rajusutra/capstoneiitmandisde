// The weekly hours an employee is available to work, one record per weekday.
const mongoose = require('mongoose');

const availabilitySchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  dayOfWeek: { type: Number, min: 0, max: 6, required: true }, // 0 = Sunday ... 6 = Saturday
  availableFrom: { type: String, required: true }, // "09:00"
  availableTo: { type: String, required: true },   // "17:00"
});

availabilitySchema.index({ tenantId: 1, employeeId: 1, dayOfWeek: 1 });

module.exports = mongoose.model('Availability', availabilitySchema);
