// Subscription + payment logic.
// Organizations pay for a SubscriptionPlan (name, price, tenure in days) chosen
// on the Billing page. Plans are managed by the superadmin.
// Supported methods: Razorpay, PayPal, and manual (recorded by the superadmin).
// If Razorpay/PayPal API keys are NOT set in .env, that method runs in "demo mode":
// the order is fake and payment succeeds instantly — perfect for presentations.
const crypto = require('crypto');
const Razorpay = require('razorpay');
const Tenant = require('../models/Tenant');
const Payment = require('../models/Payment');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const { httpError } = require('../middleware/errorHandler');

// Used only when the superadmin has not created any plan yet
const DEFAULT_PLAN = {
  _id: null,
  name: 'Standard',
  priceINR: 999,
  priceUSD: 12,
  durationDays: 30,
  description: 'Default plan',
};

const PAYPAL_BASE = process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com';

function razorpayConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

function paypalConfigured() {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

// Finds the plan to charge: the one requested, or the cheapest active plan,
// or the built-in default if no plans exist yet.
async function resolvePlan(planId) {
  if (planId) {
    const plan = await SubscriptionPlan.findOne({ _id: planId, isActive: true });
    if (!plan) throw httpError(404, 'Subscription plan not found or inactive.');
    return plan;
  }
  const first = await SubscriptionPlan.findOne({ isActive: true }).sort({ durationDays: 1 });
  return first || DEFAULT_PLAN;
}

// Extends the tenant's subscription by "days" and marks it active.
// If there is time left, the new days are added on top of it.
async function extendSubscription(tenant, days = 30) {
  const now = new Date();
  const base = tenant.subscriptionEndsAt && tenant.subscriptionEndsAt > now
    ? new Date(tenant.subscriptionEndsAt)
    : now;
  base.setDate(base.getDate() + days);
  tenant.subscriptionEndsAt = base;
  tenant.status = 'active';
  await tenant.save();
  return tenant;
}

// --- PayPal helpers (plain fetch against the PayPal REST API, sandbox by default) ---

async function paypalAccessToken() {
  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64');

  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  const data = await res.json();
  if (!data.access_token) throw httpError(502, 'Could not connect to PayPal.');
  return data.access_token;
}

const BillingService = {
  // Current subscription status + available plans for the Billing page
  async getStatus(tenantId) {
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) throw httpError(404, 'Organization not found.');

    const now = new Date();
    const trialDaysLeft = tenant.trialEndsAt
      ? Math.max(0, Math.ceil((tenant.trialEndsAt - now) / (1000 * 60 * 60 * 24)))
      : 0;
    const subscriptionActive = Boolean(tenant.subscriptionEndsAt && tenant.subscriptionEndsAt > now);

    let plans = await SubscriptionPlan.find({ isActive: true }).sort({ durationDays: 1 });
    if (plans.length === 0) plans = [DEFAULT_PLAN];

    const payments = await Payment.find({ tenantId }).sort({ paidAt: -1 }).limit(20);

    return {
      status: tenant.status,
      trialEndsAt: tenant.trialEndsAt,
      trialDaysLeft,
      subscriptionEndsAt: tenant.subscriptionEndsAt,
      subscriptionActive,
      plans,
      payments,
    };
  },

  // Creates a payment order for the chosen plan. The frontend uses the returned
  // info to open Razorpay/PayPal — or, in demo mode, confirms directly.
  async createOrder(tenantId, method, planId) {
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) throw httpError(404, 'Organization not found.');
    if (tenant.status === 'suspended') {
      throw httpError(402, 'Your organization was deactivated by the platform admin. Contact support.');
    }

    const plan = await resolvePlan(planId);
    const planInfo = { planId: plan._id, planName: plan.name, durationDays: plan.durationDays };

    if (method === 'razorpay') {
      if (!razorpayConfigured()) {
        return { mode: 'demo', method, orderId: `demo_rzp_${Date.now()}`, amount: plan.priceINR, currency: 'INR', ...planInfo };
      }
      const instance = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });
      const order = await instance.orders.create({
        amount: plan.priceINR * 100, // Razorpay uses paise
        currency: 'INR',
        receipt: `tenant_${tenantId}`,
      });
      return { mode: 'razorpay', method, orderId: order.id, amount: plan.priceINR, currency: 'INR', keyId: process.env.RAZORPAY_KEY_ID, ...planInfo };
    }

    if (method === 'paypal') {
      if (!paypalConfigured()) {
        return { mode: 'demo', method, orderId: `demo_pp_${Date.now()}`, amount: plan.priceUSD, currency: 'USD', ...planInfo };
      }
      const token = await paypalAccessToken();
      const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [{ amount: { currency_code: 'USD', value: plan.priceUSD.toFixed(2) } }],
        }),
      });
      const order = await res.json();
      if (!order.id) throw httpError(502, 'Could not create PayPal order.');
      const approveUrl = (order.links || []).find((l) => l.rel === 'approve')?.href;
      return { mode: 'paypal', method, orderId: order.id, amount: plan.priceUSD, currency: 'USD', approveUrl, ...planInfo };
    }

    throw httpError(400, 'Unknown payment method. Use razorpay or paypal.');
  },

  // Verifies the payment (or accepts it in demo mode), records it,
  // and extends the subscription by the plan's tenure.
  async confirmPayment(tenantId, userId, { method, orderId, paymentId, signature, planId }) {
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) throw httpError(404, 'Organization not found.');
    if (!method || !orderId) throw httpError(400, 'method and orderId are required.');

    const plan = await resolvePlan(planId);
    const isDemoOrder = orderId.startsWith('demo_');
    const amount = method === 'paypal' ? plan.priceUSD : plan.priceINR;
    const currency = method === 'paypal' ? 'USD' : 'INR';

    if (!isDemoOrder && method === 'razorpay') {
      // Real Razorpay: verify the signature Razorpay's checkout returned
      if (!razorpayConfigured()) throw httpError(400, 'Razorpay is not configured on the server.');
      const expected = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');
      if (expected !== signature) throw httpError(400, 'Payment verification failed.');
    } else if (!isDemoOrder && method === 'paypal') {
      // Real PayPal: capture the approved order and check it completed
      if (!paypalConfigured()) throw httpError(400, 'PayPal is not configured on the server.');
      const token = await paypalAccessToken();
      const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const capture = await res.json();
      if (capture.status !== 'COMPLETED') throw httpError(400, 'PayPal payment was not completed.');
      paymentId = capture.purchase_units?.[0]?.payments?.captures?.[0]?.id || '';
    }
    // Demo orders skip verification on purpose — they exist so the app can be
    // demonstrated without real payment gateway accounts.

    const payment = await Payment.create({
      tenantId,
      amount,
      currency,
      method,
      planId: plan._id,
      planName: plan.name,
      durationDays: plan.durationDays,
      providerOrderId: orderId,
      providerPaymentId: paymentId || '',
      note: isDemoOrder ? 'Demo payment (no gateway keys configured)' : '',
      recordedBy: userId,
    });

    await extendSubscription(tenant, plan.durationDays);
    return { payment, tenant };
  },

  resolvePlan,        // reused by the superadmin's manual payment flow
  extendSubscription, // reused by the superadmin's activate flow
};

module.exports = BillingService;
