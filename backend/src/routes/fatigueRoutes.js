// /api/fatigue — protected, same middleware chain as other routes.
const express = require('express');
const auth = require('../middleware/auth');
const tenantContext = require('../middleware/tenantContext');
const roleGuard = require('../middleware/roleGuard');
const subscriptionGuard = require('../middleware/subscriptionGuard');
const FatigueController = require('../controllers/FatigueController');

const router = express.Router();

router.use(auth, tenantContext, subscriptionGuard);

router.post('/assess/:shiftId', roleGuard('admin', 'manager'), FatigueController.assess);
router.get('/assessments', FatigueController.listAssessments);

module.exports = router;
