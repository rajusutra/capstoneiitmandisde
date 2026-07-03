// One record per payment an organization makes to use the platform.
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  method: { type: String, enum: ['razorpay', 'paypal', 'manual'], required: true },
  planId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan' },
  planName: { type: String, default: '' },       // kept as text so history survives plan deletion
  durationDays: { type: Number, default: 30 },   // tenure this payment bought
  providerOrderId: { type: String, default: '' },   // Razorpay/PayPal order id ("demo_..." in demo mode)
  providerPaymentId: { type: String, default: '' },
  note: { type: String, default: '' },              // used for manual payments (e.g. "UPI ref 12345")
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // who confirmed it
  paidAt: { type: Date, default: Date.now },
});

paymentSchema.index({ tenantId: 1, paidAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
