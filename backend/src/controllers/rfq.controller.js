/**
 * RFQ Controller
 */
const rfqQueries = require('../db/queries/rfq.queries');
const activityService = require('../services/activity.service');
const notificationService = require('../services/notification.service');
const logger = require('../utils/logger');
const { createNotFoundError, createValidationError } = require('../middleware/error-handler');

const rfqController = {
  async getRFQs(req, res, next) {
    try {
      const { id: user_id, organization_id: org_id, role } = req.session.user;
      const { status, page, limit } = req.query;
      const rfqs = await rfqQueries.findAll({ org_id, status, user_id, role, page: +page || 1, limit: +limit || 20 });
      const total = rfqs[0]?.total_count ? parseInt(rfqs[0].total_count) : 0;
      res.json({ success: true, data: { rfqs: rfqs.map(v => { const { total_count, ...r } = v; return r; }), total } });
    } catch (err) { next(err); }
  },

  async getRFQ(req, res, next) {
    try {
      const org_id = req.session.user.organization_id;
      const rfq = await rfqQueries.findById(req.params.id, org_id);
      if (!rfq) return next(createNotFoundError('RFQ not found'));
      res.json({ success: true, data: { rfq } });
    } catch (err) { next(err); }
  },

  async createRFQ(req, res, next) {
    try {
      const { id: created_by, organization_id: org_id } = req.session.user;
      const { title, description, category, deadline, line_items, vendor_ids } = req.body;

      if (!title) return next(createValidationError('RFQ title is required'));
      if (!deadline) return next(createValidationError('Deadline is required'));
      if (!line_items || !line_items.length) return next(createValidationError('At least one line item is required'));

      const rfq = await rfqQueries.create({ org_id, created_by, title, description, category, deadline, line_items, vendor_ids: vendor_ids || [] });

      await activityService.logActivity(created_by, 'rfq_created', 'rfq', rfq.id, { title, rfq_number: rfq.rfq_number }, req.ip, req.get('User-Agent'));

      logger.info('RFQ created', { rfqId: rfq.id, rfq_number: rfq.rfq_number, userId: created_by });
      res.status(201).json({ success: true, message: 'RFQ created successfully', data: { rfq } });
    } catch (err) { next(err); }
  },

  async updateRFQ(req, res, next) {
    try {
      const org_id = req.session.user.organization_id;
      const rfq = await rfqQueries.update(req.params.id, org_id, req.body);
      if (!rfq) return next(createNotFoundError('RFQ not found or cannot be updated'));

      await activityService.logActivity(req.session.user.id, 'rfq_updated', 'rfq', rfq.id, req.body, req.ip, req.get('User-Agent'));

      res.json({ success: true, message: 'RFQ updated', data: { rfq } });
    } catch (err) { next(err); }
  },

  async deleteRFQ(req, res, next) {
    try {
      const org_id = req.session.user.organization_id;
      const deleted = await rfqQueries.delete(req.params.id, org_id);
      if (!deleted) return next(createNotFoundError('RFQ not found or cannot be deleted'));

      await activityService.logActivity(req.session.user.id, 'rfq_deleted', 'rfq', req.params.id, {}, req.ip, req.get('User-Agent'));

      res.json({ success: true, message: 'RFQ deleted' });
    } catch (err) { next(err); }
  },

  async sendRFQ(req, res, next) {
    try {
      const org_id = req.session.user.organization_id;
      const rfq = await rfqQueries.sendRFQ(req.params.id, org_id);
      if (!rfq) return next(createNotFoundError('RFQ not found or already sent'));

      // Get invited vendors and notify them
      const vendors = await rfqQueries.getInvitedVendors(rfq.id);
      for (const vendor of vendors) {
        if (vendor.user_id) {
          await notificationService.createNotification(
            vendor.user_id, 'rfq_received',
            `New RFQ: ${rfq.title}`,
            `You have been invited to submit a quotation for ${rfq.rfq_number}. Deadline: ${new Date(rfq.deadline).toLocaleDateString()}`,
            'rfq', rfq.id
          );
        }
      }

      await activityService.logActivity(req.session.user.id, 'rfq_sent', 'rfq', rfq.id, { rfq_number: rfq.rfq_number, vendor_count: vendors.length }, req.ip, req.get('User-Agent'));

      res.json({ success: true, message: `RFQ sent to ${vendors.length} vendor(s)`, data: { rfq } });
    } catch (err) { next(err); }
  },

  async closeRFQ(req, res, next) {
    try {
      const org_id = req.session.user.organization_id;
      const rfq = await rfqQueries.closeRFQ(req.params.id, org_id);
      if (!rfq) return next(createNotFoundError('RFQ not found'));

      await activityService.logActivity(req.session.user.id, 'rfq_closed', 'rfq', rfq.id, {}, req.ip, req.get('User-Agent'));

      res.json({ success: true, message: 'RFQ closed', data: { rfq } });
    } catch (err) { next(err); }
  }
};

module.exports = rfqController;
