/**
 * Reports & Analytics Routes
 */
const express = require('express');
const router = express.Router();
const { requireAuth, requireProcurement } = require('../middleware/auth');
const { enforceOrgIsolation } = require('../middleware/org-isolation');
const { reportController } = require('../controllers/procurement.controller');

router.get('/stats', requireAuth, enforceOrgIsolation, reportController.getStats);
router.get('/spending', requireAuth, requireProcurement, enforceOrgIsolation, reportController.getSpending);
router.get('/vendor-performance', requireAuth, requireProcurement, enforceOrgIsolation, reportController.getVendorPerformance);
router.get('/procurement-trends', requireAuth, requireProcurement, enforceOrgIsolation, reportController.getProcurementTrends);
router.get('/export/:type', requireAuth, requireProcurement, enforceOrgIsolation, reportController.exportReport);

module.exports = router;