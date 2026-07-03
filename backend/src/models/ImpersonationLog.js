// Audit trail: every time a superadmin impersonates an organization's admin.
// Impersonation is a sensitive action (a platform owner acting as a
// customer's account), so this is logged even though nothing else in the
// system requires an audit trail.
const mongoose = require('mongoose');

const impersonationLogSchema = new mongoose.Schema({
  superadminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  superadminName: { type: String, required: true },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  impersonatedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  impersonatedUserName: { type: String, required: true },
  startedAt: { type: Date, default: Date.now },
});

impersonationLogSchema.index({ tenantId: 1, startedAt: -1 });

module.exports = mongoose.model('ImpersonationLog', impersonationLogSchema);
