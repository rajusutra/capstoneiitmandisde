// /api/employees — protected. Middleware order (docs section 6):
// auth (verify JWT) -> tenantContext (set req.tenantId) -> roleGuard -> controller
const express = require('express');
const auth = require('../middleware/auth');
const tenantContext = require('../middleware/tenantContext');
const roleGuard = require('../middleware/roleGuard');
const subscriptionGuard = require('../middleware/subscriptionGuard');
const EmployeeController = require('../controllers/EmployeeController');

const router = express.Router();

router.use(auth, tenantContext, subscriptionGuard);

router.get('/', EmployeeController.list);
router.post('/', roleGuard('admin', 'manager'), EmployeeController.create);
router.put('/:id', roleGuard('admin', 'manager'), EmployeeController.update);
router.delete('/:id', roleGuard('admin', 'manager'), EmployeeController.remove);

module.exports = router;
