/**
 * RFQ Routes
 */
const express = require('express');
const router = express.Router();
const { requireAuth, requireProcurement } = require('../middleware/auth');
const { enforceOrgIsolation } = require('../middleware/org-isolation');
const rfqController = require('../controllers/rfq.controller');

router.get('/', requireAuth, enforceOrgIsolation, rfqController.getRFQs);
router.get('/:id', requireAuth, enforceOrgIsolation, rfqController.getRFQ);
router.post('/', requireAuth, requireProcurement, enforceOrgIsolation, rfqController.createRFQ);
router.put('/:id', requireAuth, requireProcurement, enforceOrgIsolation, rfqController.updateRFQ);
router.delete('/:id', requireAuth, requireProcurement, enforceOrgIsolation, rfqController.deleteRFQ);
router.post('/:id/send', requireAuth, requireProcurement, enforceOrgIsolation, rfqController.sendRFQ);
router.post('/:id/close', requireAuth, requireProcurement, enforceOrgIsolation, rfqController.closeRFQ);

module.exports = router;