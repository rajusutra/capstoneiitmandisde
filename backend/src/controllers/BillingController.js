// Handles HTTP for /api/billing (used by organization admins to pay).
const BillingService = require('../services/BillingService');
const ResponseFormatter = require('../views/ResponseFormatter');

const BillingController = {
  async status(req, res, next) {
    try {
      const status = await BillingService.getStatus(req.tenantId);
      return ResponseFormatter.success(res, status);
    } catch (err) {
      next(err);
    }
  },

  async createOrder(req, res, next) {
    try {
      const order = await BillingService.createOrder(req.tenantId, req.body.method, req.body.planId);
      return ResponseFormatter.success(res, order, 'Order created', 201);
    } catch (err) {
      next(err);
    }
  },

  async confirm(req, res, next) {
    try {
      const { tenant } = await BillingService.confirmPayment(req.tenantId, req.user.userId, req.body);
      return ResponseFormatter.success(
        res,
        { status: tenant.status, subscriptionEndsAt: tenant.subscriptionEndsAt },
        'Payment successful! Subscription extended by 30 days.'
      );
    } catch (err) {
      next(err);
    }
  },
};

module.exports = BillingController;
