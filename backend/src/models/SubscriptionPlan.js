// A subscription plan the platform sells (managed by the superadmin).
// "durationDays" is the tenure: how many days of access one payment buys.
const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema({
  name: { type: String, required: true },          // e.g. "Monthly", "Quarterly", "Yearly"
  priceINR: { type: Number, required: true },      // Razorpay + manual payments
  priceUSD: { type: Number, required: true },      // PayPal payments
  durationDays: { type: Number, required: true },  // tenure, e.g. 30 / 90 / 365
  description: { type: String, default: '' },
  isActive: { type: Boolean, default: true },      // inactive plans are hidden from orgs
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
