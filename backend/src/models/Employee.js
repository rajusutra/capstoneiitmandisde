// A worker who gets shifts assigned. Belongs to one tenant.
const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  name: { type: String, required: true },
  employeeCode: { type: String, required: true },
  department: { type: String, default: 'General' },
  maxWeeklyHours: { type: Number, default: 40 },
  contactInfo: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

// Compound index keeps tenant-scoped lookups fast (docs section 3)
employeeSchema.index({ tenantId: 1, employeeCode: 1 }, { unique: true });

module.exports = mongoose.model('Employee', employeeSchema);
