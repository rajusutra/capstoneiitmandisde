// Platform-owner (superadmin) logic: see and manage all organizations.
// This is the ONLY place allowed to query across tenants (docs section 3, rule 5).
const Tenant = require('../models/Tenant');
const User = require('../models/User');
const Employee = require('../models/Employee');
const Shift = require('../models/Shift');
const Payment = require('../models/Payment');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const BillingService = require('./BillingService');
const { httpError } = require('../middleware/errorHandler');

const AdminService = {
  // All organizations with usage counts and subscription info
  async listTenants() {
    const tenants = await Tenant.find({ slug: { $ne: 'platform' } }).sort({ createdAt: -1 });

    return Promise.all(
      tenants.map(async (tenant) => {
        const [users, employees, shifts, paid] = await Promise.all([
          User.countDocuments({ tenantId: tenant._id }),
          Employee.countDocuments({ tenantId: tenant._id }),
          Shift.countDocuments({ tenantId: tenant._id }),
          Payment.aggregate([
            { $match: { tenantId: tenant._id } },
            { $group: { _id: '$currency', total: { $sum: '$amount' } } },
          ]),
        ]);

        return {
          id: tenant._id,
          name: tenant.name,
          slug: tenant.slug,
          status: tenant.status,
          trialEndsAt: tenant.trialEndsAt,
          subscriptionEndsAt: tenant.subscriptionEndsAt,
          createdAt: tenant.createdAt,
          counts: { users, employees, shifts },
          totalPaid: paid.map((p) => `${p.total} ${p._id}`).join(', ') || '0',
        };
      })
    );
  },

  // Reactivate an organization and add 30 days of subscription
  async activate(tenantId) {
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) throw httpError(404, 'Organization not found.');
    return BillingService.extendSubscription(tenant);
  },

  // Suspend an organization — its users are blocked immediately
  async deactivate(tenantId) {
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) throw httpError(404, 'Organization not found.');
    tenant.status = 'suspended';
    await tenant.save();
    return tenant;
  },

  // Record an offline/manual payment (bank transfer, UPI, cash...) for a plan
  // and extend the subscription by that plan's tenure.
  async recordManualPayment(tenantId, superadminUserId, { amount, note, planId }) {
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) throw httpError(404, 'Organization not found.');

    const plan = await BillingService.resolvePlan(planId);
    const paidAmount = amount || plan.priceINR;
    if (paidAmount <= 0) throw httpError(400, 'A positive amount is required.');

    const payment = await Payment.create({
      tenantId,
      amount: paidAmount,
      currency: 'INR',
      method: 'manual',
      planId: plan._id,
      planName: plan.name,
      durationDays: plan.durationDays,
      note: note || 'Recorded by platform admin',
      recordedBy: superadminUserId,
    });

    await BillingService.extendSubscription(tenant, plan.durationDays);
    return payment;
  },

  // ---- Subscription plan CRUD (the products the platform sells) ----

  async listPlans() {
    return SubscriptionPlan.find().sort({ durationDays: 1 });
  },

  async createPlan({ name, priceINR, priceUSD, durationDays, description }) {
    if (!name || !priceINR || !priceUSD || !durationDays) {
      throw httpError(400, 'name, priceINR, priceUSD and durationDays are required.');
    }
    if (durationDays < 1) throw httpError(400, 'durationDays (tenure) must be at least 1.');
    return SubscriptionPlan.create({ name, priceINR, priceUSD, durationDays, description });
  },

  async updatePlan(planId, data) {
    const plan = await SubscriptionPlan.findByIdAndUpdate(
      planId,
      {
        $set: {
          name: data.name,
          priceINR: data.priceINR,
          priceUSD: data.priceUSD,
          durationDays: data.durationDays,
          description: data.description,
          isActive: data.isActive,
        },
      },
      { new: true, runValidators: true }
    );
    if (!plan) throw httpError(404, 'Plan not found.');
    return plan;
  },

  async deletePlan(planId) {
    const plan = await SubscriptionPlan.findByIdAndDelete(planId);
    if (!plan) throw httpError(404, 'Plan not found.');
    return plan;
  },

  // All payments across all tenants (platform revenue view)
  async listPayments() {
    return Payment.find().populate('tenantId', 'name').sort({ paidAt: -1 }).limit(200);
  },
};

module.exports = AdminService;
