// /api/shifts — protected, same middleware chain as employees.
const express = require('express');
const auth = require('../middleware/auth');
const tenantContext = require('../middleware/tenantContext');
const roleGuard = require('../middleware/roleGuard');
const subscriptionGuard = require('../middleware/subscriptionGuard');
const ShiftController = require('../controllers/ShiftController');

const router = express.Router();

router.use(auth, tenantContext, subscriptionGuard);

router.get('/', ShiftController.list);
router.post('/', roleGuard('admin', 'manager'), ShiftController.create);
router.put('/:id', roleGuard('admin', 'manager'), ShiftController.update);
router.delete('/:id', roleGuard('admin', 'manager'), ShiftController.remove);

module.exports = router;
