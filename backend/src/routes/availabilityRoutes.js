// /api/availability — protected, same middleware chain as employees.
const express = require('express');
const auth = require('../middleware/auth');
const tenantContext = require('../middleware/tenantContext');
const roleGuard = require('../middleware/roleGuard');
const subscriptionGuard = require('../middleware/subscriptionGuard');
const AvailabilityController = require('../controllers/AvailabilityController');

const router = express.Router();

router.use(auth, tenantContext, subscriptionGuard);

router.get('/:employeeId', AvailabilityController.listForEmployee);
router.post('/', roleGuard('admin', 'manager'), AvailabilityController.create);

module.exports = router;
