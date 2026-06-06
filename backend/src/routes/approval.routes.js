/**
 * Approval Workflow Routes
 */
const express = require('express');
const router = express.Router();
const { requireAuth, requireManager } = require('../middleware/auth');
const { enforceOrgIsolation } = require('../middleware/org-isolation');
const { approvalController } = require('../controllers/procurement.controller');

router.get('/', requireAuth, requireManager, enforceOrgIsolation, approvalController.getApprovals);
router.get('/:id', requireAuth, requireManager, enforceOrgIsolation, approvalController.getApproval);
router.post('/:id/approve', requireAuth, requireManager, enforceOrgIsolation, approvalController.approveQuotation);
router.post('/:id/reject', requireAuth, requireManager, enforceOrgIsolation, approvalController.rejectQuotation);
router.post('/:id/request-changes', requireAuth, requireManager, enforceOrgIsolation, approvalController.requestChanges);

module.exports = router;