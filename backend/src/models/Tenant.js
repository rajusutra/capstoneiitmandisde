// A tenant = one company/organization using the platform.
const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true }, // url-friendly name, e.g. "acme-corp"
  plan: { type: String, default: 'free' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Tenant', tenantSchema);
