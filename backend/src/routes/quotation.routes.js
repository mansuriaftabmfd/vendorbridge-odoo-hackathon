/**
 * Quotation Routes
 */
const express = require('express');
const router = express.Router();
const { requireAuth, requireProcurement } = require('../middleware/auth');
const { enforceOrgIsolation } = require('../middleware/org-isolation');
const quotationController = require('../controllers/quotation.controller');

router.get('/', requireAuth, enforceOrgIsolation, quotationController.getQuotations);
router.get('/rfq/:rfq_id', requireAuth, enforceOrgIsolation, quotationController.getQuotationsForRFQ);
router.get('/:id', requireAuth, enforceOrgIsolation, quotationController.getQuotation);
router.post('/', requireAuth, enforceOrgIsolation, quotationController.createQuotation);
router.put('/:id', requireAuth, enforceOrgIsolation, quotationController.updateQuotation);
router.post('/:id/submit', requireAuth, enforceOrgIsolation, quotationController.submitQuotation);
router.post('/:id/select', requireAuth, requireProcurement, enforceOrgIsolation, quotationController.selectQuotation);

module.exports = router;