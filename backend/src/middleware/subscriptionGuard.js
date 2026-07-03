// Step 4 of the middleware chain (after auth + tenantContext):
// blocks the whole app for organizations whose trial has ended (and haven't paid)
// or that were deactivated by the platform superadmin.
// Billing routes do NOT use this guard, so an expired org can still pay.
const Tenant = require('../models/Tenant');
const ResponseFormatter = require('../views/ResponseFormatter');

async function subscriptionGuard(req, res, next) {
  try {
    // The platform owner is never blocked
    if (req.user.role === 'superadmin') return next();

    const tenant = await Tenant.findById(req.tenantId);
    if (!tenant) {
      return ResponseFormatter.error(res, 'Organization not found.', 403);
    }

    if (tenant.status === 'suspended') {
      // 402 = "Payment Required" — the frontend redirects to the Billing page on this code
      return ResponseFormatter.error(
        res,
        'Your organization has been deactivated by the platform admin. Please contact support or renew your subscription.',
        402
      );
    }

    const now = new Date();
    const trialOk = tenant.trialEndsAt && tenant.trialEndsAt > now;
    const subscriptionOk = tenant.subscriptionEndsAt && tenant.subscriptionEndsAt > now;

    if (!trialOk && !subscriptionOk) {
      return ResponseFormatter.error(
        res,
        'Your 10-day free trial has ended. Please subscribe to keep using the platform.',
        402
      );
    }

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = subscriptionGuard;
