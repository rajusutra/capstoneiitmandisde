// A tenant = one company/organization using the platform.
const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true }, // url-friendly name, e.g. "acme-corp"
  plan: { type: String, default: 'free' },

  // Subscription lifecycle:
  // trial     -> inside the free 10-day trial
  // active    -> has paid, subscriptionEndsAt is in the future
  // suspended -> deactivated by the platform superadmin
  status: { type: String, enum: ['trial', 'active', 'suspended'], default: 'trial' },
  trialEndsAt: { type: Date },          // set to registration time + 10 days
  subscriptionEndsAt: { type: Date },   // extended by 30 days per payment

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Tenant', tenantSchema);
