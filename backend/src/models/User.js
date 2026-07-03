// A login account. Every user belongs to one tenant and has a role.
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['superadmin', 'admin', 'manager', 'employee'], default: 'manager' },
  createdAt: { type: Date, default: Date.now },
});

userSchema.index({ tenantId: 1 });

module.exports = mongoose.model('User', userSchema);
