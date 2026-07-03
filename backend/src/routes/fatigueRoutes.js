// /api/fatigue — protected, same middleware chain as other routes.
const express = require('express');
const auth = require('../middleware/auth');
const tenantContext = require('../middleware/tenantContext');
const roleGuard = require('../middleware/roleGuard');
const FatigueController = require('../controllers/FatigueController');

const router = express.Router();

router.use(auth, tenantContext);

router.post('/assess/:shiftId', roleGuard('admin', 'manager'), FatigueController.assess);
router.get('/assessments', FatigueController.listAssessments);

module.exports = router;
