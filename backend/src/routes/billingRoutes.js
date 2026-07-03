// /api/billing — protected by auth + tenantContext but NOT by subscriptionGuard,
// so an organization whose trial expired can still reach these routes to pay.
const express = require('express');
const auth = require('../middleware/auth');
const tenantContext = require('../middleware/tenantContext');
const roleGuard = require('../middleware/roleGuard');
const BillingController = require('../controllers/BillingController');

const router = express.Router();

router.use(auth, tenantContext);

router.get('/status', BillingController.status);
router.post('/order', roleGuard('admin'), BillingController.createOrder);
router.post('/confirm', roleGuard('admin'), BillingController.confirm);

module.exports = router;
