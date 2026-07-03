// /api/admin — the platform owner's routes. Superadmin only.
// Note: no tenantContext here — the superadmin works ACROSS tenants.
const express = require('express');
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const AdminController = require('../controllers/AdminController');

const router = express.Router();

router.use(auth, roleGuard('superadmin'));

router.get('/tenants', AdminController.listTenants);
router.post('/tenants/:id/activate', AdminController.activate);
router.post('/tenants/:id/deactivate', AdminController.deactivate);
router.post('/tenants/:id/record-payment', AdminController.recordPayment);
router.get('/payments', AdminController.listPayments);

// Subscription plan CRUD (name, prices, tenure in days)
router.get('/plans', AdminController.listPlans);
router.post('/plans', AdminController.createPlan);
router.put('/plans/:id', AdminController.updatePlan);
router.delete('/plans/:id', AdminController.deletePlan);

module.exports = router;
