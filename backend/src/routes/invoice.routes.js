/**
 * Invoice Routes
 */
const express = require('express');
const router = express.Router();
const { requireAuth, requireProcurement } = require('../middleware/auth');
const { enforceOrgIsolation } = require('../middleware/org-isolation');
const { invoiceController } = require('../controllers/procurement.controller');

router.get('/', requireAuth, requireProcurement, enforceOrgIsolation, invoiceController.getInvoices);
router.get('/:id', requireAuth, requireProcurement, enforceOrgIsolation, invoiceController.getInvoice);
router.post('/', requireAuth, requireProcurement, enforceOrgIsolation, invoiceController.createInvoice);
router.post('/:id/send', requireAuth, requireProcurement, enforceOrgIsolation, invoiceController.sendInvoice);
router.get('/:id/pdf', requireAuth, enforceOrgIsolation, invoiceController.getInvoicePDF);
router.post('/:id/mark-paid', requireAuth, requireProcurement, enforceOrgIsolation, invoiceController.markPaid);

module.exports = router;