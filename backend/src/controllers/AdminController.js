// Handles HTTP for /api/admin (superadmin only).
const AdminService = require('../services/AdminService');
const ResponseFormatter = require('../views/ResponseFormatter');

const AdminController = {
  async listTenants(req, res, next) {
    try {
      const tenants = await AdminService.listTenants();
      return ResponseFormatter.success(res, tenants);
    } catch (err) {
      next(err);
    }
  },

  async activate(req, res, next) {
    try {
      const tenant = await AdminService.activate(req.params.id);
      return ResponseFormatter.success(res, { status: tenant.status, subscriptionEndsAt: tenant.subscriptionEndsAt }, 'Organization activated (+30 days)');
    } catch (err) {
      next(err);
    }
  },

  async deactivate(req, res, next) {
    try {
      const tenant = await AdminService.deactivate(req.params.id);
      return ResponseFormatter.success(res, { status: tenant.status }, 'Organization deactivated');
    } catch (err) {
      next(err);
    }
  },

  async recordPayment(req, res, next) {
    try {
      const payment = await AdminService.recordManualPayment(req.params.id, req.user.userId, req.body);
      return ResponseFormatter.success(res, payment, 'Manual payment recorded (+30 days)', 201);
    } catch (err) {
      next(err);
    }
  },

  async listPayments(req, res, next) {
    try {
      const payments = await AdminService.listPayments();
      return ResponseFormatter.success(res, payments);
    } catch (err) {
      next(err);
    }
  },

  // ---- Subscription plan CRUD ----

  async listPlans(req, res, next) {
    try {
      const plans = await AdminService.listPlans();
      return ResponseFormatter.success(res, plans);
    } catch (err) {
      next(err);
    }
  },

  async createPlan(req, res, next) {
    try {
      const plan = await AdminService.createPlan(req.body);
      return ResponseFormatter.success(res, plan, 'Plan created', 201);
    } catch (err) {
      next(err);
    }
  },

  async updatePlan(req, res, next) {
    try {
      const plan = await AdminService.updatePlan(req.params.id, req.body);
      return ResponseFormatter.success(res, plan, 'Plan updated');
    } catch (err) {
      next(err);
    }
  },

  async deletePlan(req, res, next) {
    try {
      await AdminService.deletePlan(req.params.id);
      return ResponseFormatter.success(res, null, 'Plan deleted');
    } catch (err) {
      next(err);
    }
  },
};

module.exports = AdminController;
