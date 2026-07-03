// Platform-owner (superadmin) logic: see and manage all organizations.
// This is the ONLY place allowed to query across tenants (docs section 3, rule 5).
const jwt = require('jsonwebtoken');
const Tenant = require('../models/Tenant');
const User = require('../models/User');
const Employee = require('../models/Employee');
const Shift = require('../models/Shift');
const Payment = require('../models/Payment');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const ImpersonationLog = require('../models/ImpersonationLog');
const BillingService = require('./BillingService');
const { httpError } = require('../middleware/errorHandler');

// Turns an aggregation result like [{_id: tenantId, count: 5}, ...] into a
// Map keyed by the stringified tenantId, for O(1) lookup per row.
function countsById(rows) {
  return new Map(rows.map((row) => [String(row._id), row.count]));
}

// Sunday-start UTC week, used to line up JS-generated week buckets with
// Mongo's $dateTrunc (which also defaults to Sunday-start weeks).
function startOfWeek(date) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

const AdminService = {
  // Paginated + searchable organization list. Per-tenant usage counts (users,
  // employees, shifts, total paid) are computed with ONE aggregation per
  // metric across just the current page's tenant ids — not one query per
  // tenant — so this stays fast regardless of how many tenants exist.
  async listTenants({ page = 1, limit = 20, search = '' } = {}) {
    const filter = { slug: { $ne: 'platform' } };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Tenant.countDocuments(filter);
    const tenants = await Tenant.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const tenantIds = tenants.map((t) => t._id);

    const [userRows, employeeRows, shiftRows, paymentRows] = await Promise.all([
      User.aggregate([{ $match: { tenantId: { $in: tenantIds } } }, { $group: { _id: '$tenantId', count: { $sum: 1 } } }]),
      Employee.aggregate([{ $match: { tenantId: { $in: tenantIds } } }, { $group: { _id: '$tenantId', count: { $sum: 1 } } }]),
      Shift.aggregate([{ $match: { tenantId: { $in: tenantIds } } }, { $group: { _id: '$tenantId', count: { $sum: 1 } } }]),
      Payment.aggregate([
        { $match: { tenantId: { $in: tenantIds } } },
        { $group: { _id: { tenantId: '$tenantId', currency: '$currency' }, total: { $sum: '$amount' } } },
      ]),
    ]);

    const userMap = countsById(userRows);
    const employeeMap = countsById(employeeRows);
    const shiftMap = countsById(shiftRows);

    const paymentMap = new Map();
    for (const row of paymentRows) {
      const key = String(row._id.tenantId);
      const list = paymentMap.get(key) || [];
      list.push(`${row.total} ${row._id.currency}`);
      paymentMap.set(key, list);
    }

    const data = tenants.map((tenant) => {
      const id = String(tenant._id);
      return {
        id: tenant._id,
        name: tenant.name,
        slug: tenant.slug,
        status: tenant.status,
        trialEndsAt: tenant.trialEndsAt,
        subscriptionEndsAt: tenant.subscriptionEndsAt,
        createdAt: tenant.createdAt,
        counts: {
          users: userMap.get(id) || 0,
          employees: employeeMap.get(id) || 0,
          shifts: shiftMap.get(id) || 0,
        },
        totalPaid: (paymentMap.get(id) || []).join(', ') || '0',
      };
    });

    return { tenants: data, total, page, pages: Math.max(1, Math.ceil(total / limit)) };
  },

  // Paginated + searchable list of every login account across all tenants
  // (i.e. admins/managers — not Employees, which have no login).
  async listUsers({ page = 1, limit = 20, search = '' } = {}) {
    const filter = { role: { $ne: 'superadmin' } };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('tenantId', 'name slug');

    const data = users.map((u) => ({
      id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      tenantName: u.tenantId?.name || 'Unknown organization',
      tenantSlug: u.tenantId?.slug || '',
      createdAt: u.createdAt,
    }));

    return { users: data, total, page, pages: Math.max(1, Math.ceil(total / limit)) };
  },

  // Platform-wide summary numbers + small "recent activity" lists for the
  // dashboard overview page. Every count here is a single aggregate/count
  // query — cheap regardless of how many tenants/employees exist.
  async getDashboardStats() {
    const notPlatform = { slug: { $ne: 'platform' } };
    const WEEKS = 12;
    const since = startOfWeek(new Date(Date.now() - (WEEKS - 1) * 7 * 24 * 60 * 60 * 1000));

    const [
      statusRows,
      totalUsers,
      totalEmployees,
      totalShifts,
      paymentRows,
      recentTenants,
      recentPayments,
      weeklySignupRows,
      paymentMethodRows,
    ] = await Promise.all([
      Tenant.aggregate([{ $match: notPlatform }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      User.countDocuments({ role: { $ne: 'superadmin' } }),
      Employee.countDocuments(),
      Shift.countDocuments(),
      Payment.aggregate([{ $group: { _id: '$currency', total: { $sum: '$amount' } } }]),
      Tenant.find(notPlatform).sort({ createdAt: -1 }).limit(5).select('name slug status createdAt'),
      Payment.find().sort({ paidAt: -1 }).limit(5).populate('tenantId', 'name'),
      // Weekly new-tenant counts, split by status, for the trend chart.
      Tenant.aggregate([
        { $match: { ...notPlatform, createdAt: { $gte: since } } },
        {
          $group: {
            _id: { week: { $dateTrunc: { date: '$createdAt', unit: 'week', startOfWeek: 'sunday' } }, status: '$status' },
            count: { $sum: 1 },
          },
        },
      ]),
      // Payment counts by method (not amount — razorpay/manual are INR and
      // paypal is USD, so summing them on one axis would mix currencies).
      Payment.aggregate([{ $group: { _id: '$method', count: { $sum: 1 } } }]),
    ]);

    const statusBreakdown = { trial: 0, active: 0, suspended: 0 };
    for (const row of statusRows) statusBreakdown[row._id] = row.count;
    const totalTenants = statusBreakdown.trial + statusBreakdown.active + statusBreakdown.suspended;

    // Build a continuous list of week buckets so weeks with zero signups
    // still appear (a gap in the line, not a gap in the x-axis).
    const weeklyMap = new Map();
    for (let i = 0; i < WEEKS; i++) {
      const weekStart = new Date(since.getTime() + i * 7 * 24 * 60 * 60 * 1000);
      weeklyMap.set(weekStart.toISOString(), { week: weekStart.toISOString().slice(0, 10), trial: 0, active: 0, suspended: 0 });
    }
    for (const row of weeklySignupRows) {
      const key = startOfWeek(row._id.week).toISOString();
      if (weeklyMap.has(key)) weeklyMap.get(key)[row._id.status] = row.count;
    }

    const paymentsByMethod = { razorpay: 0, paypal: 0, manual: 0 };
    for (const row of paymentMethodRows) paymentsByMethod[row._id] = row.count;

    return {
      totalTenants,
      statusBreakdown,
      totalUsers,
      totalEmployees,
      totalShifts,
      totalRevenue: paymentRows.map((p) => `${p.total} ${p._id}`).join(', ') || '0',
      recentTenants,
      recentPayments,
      signupsByWeek: Array.from(weeklyMap.values()),
      paymentsByMethod,
    };
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

  // Mints a short-lived JWT for the target tenant's admin account, so the
  // superadmin can browse the app exactly as that organization sees it —
  // without knowing or resetting their password. Every call is logged.
  async impersonateTenant(tenantId, superadmin) {
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) throw httpError(404, 'Organization not found.');

    // Impersonate the tenant's original (earliest-created) admin — the
    // account a support session would normally use. Keeping this to "one
    // fixed target" rather than a user picker keeps the feature simple.
    const targetUser = await User.findOne({ tenantId, role: 'admin' }).sort({ createdAt: 1 });
    if (!targetUser) throw httpError(404, 'This organization has no admin user to impersonate.');

    await ImpersonationLog.create({
      superadminId: superadmin.userId,
      superadminName: superadmin.name,
      tenantId,
      impersonatedUserId: targetUser._id,
      impersonatedUserName: targetUser.name,
    });

    // 1-hour expiry (vs. the normal 1-day login token) limits the blast
    // radius if this token ever leaks. The extra claims let the frontend
    // show a clear "you are impersonating" banner — the middleware chain
    // (auth/tenantContext/subscriptionGuard/roleGuard) ignores them entirely
    // and treats this exactly like the real admin's own session.
    const token = jwt.sign(
      {
        userId: targetUser._id,
        tenantId: targetUser.tenantId,
        role: targetUser.role,
        name: targetUser.name,
        impersonation: true,
        impersonatedBy: superadmin.name,
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    return {
      token,
      user: { id: targetUser._id, name: targetUser.name, email: targetUser.email, role: targetUser.role },
      tenant: { id: tenant._id, name: tenant.name, slug: tenant.slug },
    };
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
