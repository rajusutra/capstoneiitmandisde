// /api/availability — protected, same middleware chain as employees.
const express = require('express');
const auth = require('../middleware/auth');
const tenantContext = require('../middleware/tenantContext');
const roleGuard = require('../middleware/roleGuard');
const AvailabilityController = require('../controllers/AvailabilityController');

const router = express.Router();

router.use(auth, tenantContext);

router.get('/:employeeId', AvailabilityController.listForEmployee);
router.post('/', roleGuard('admin', 'manager'), AvailabilityController.create);

module.exports = router;
