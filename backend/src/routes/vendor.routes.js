/**
 * Vendor Management Routes
 */
const express = require('express');
const router = express.Router();
const { requireAuth, requireProcurement } = require('../middleware/auth');
const { enforceOrgIsolation } = require('../middleware/org-isolation');
const vendorController = require('../controllers/vendor.controller');

router.get('/', requireAuth, enforceOrgIsolation, vendorController.getVendors);
router.get('/:id', requireAuth, enforceOrgIsolation, vendorController.getVendor);
router.post('/', requireAuth, requireProcurement, enforceOrgIsolation, vendorController.createVendor);
router.put('/:id', requireAuth, requireProcurement, enforceOrgIsolation, vendorController.updateVendor);
router.delete('/:id', requireAuth, requireProcurement, enforceOrgIsolation, vendorController.deleteVendor);
router.post('/:id/documents', requireAuth, requireProcurement, enforceOrgIsolation, vendorController.uploadDocument);

module.exports = router;