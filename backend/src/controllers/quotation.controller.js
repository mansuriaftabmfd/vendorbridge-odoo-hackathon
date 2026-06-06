/**
 * Quotation Controller
 */
const quotationQueries = require('../db/queries/quotation.queries');
const { approvalQueries } = require('../db/queries/procurement.queries');
const activityService = require('../services/activity.service');
const notificationService = require('../services/notification.service');
const logger = require('../utils/logger');
const { createNotFoundError, createValidationError } = require('../middleware/error-handler');

const quotationController = {
  async getQuotations(req, res, next) {
    try {
      const org_id = req.session.user.organization_id;
      const { rfq_id, vendor_id, status, page, limit } = req.query;
      const quotations = await quotationQueries.findAll({ org_id, rfq_id, vendor_id, status, page: +page || 1, limit: +limit || 20 });
      const total = quotations[0]?.total_count ? parseInt(quotations[0].total_count) : 0;
      res.json({ success: true, data: { quotations: quotations.map(v => { const { total_count, ...r } = v; return r; }), total } });
    } catch (err) { next(err); }
  },

  async getQuotation(req, res, next) {
    try {
      const org_id = req.session.user.organization_id;
      const quotation = await quotationQueries.findById(req.params.id, org_id);
      if (!quotation) return next(createNotFoundError('Quotation not found'));
      res.json({ success: true, data: { quotation } });
    } catch (err) { next(err); }
  },

  async getQuotationsForRFQ(req, res, next) {
    try {
      const { rfq_id } = req.params;
      const quotations = await quotationQueries.findForRFQ(rfq_id);
      res.json({ success: true, data: { quotations } });
    } catch (err) { next(err); }
  },

  async createQuotation(req, res, next) {
    try {
      const { id: submitted_by, organization_id: org_id } = req.session.user;
      const { rfq_id, vendor_id, total_amount, delivery_days, payment_terms, notes, line_items } = req.body;

      if (!rfq_id) return next(createValidationError('RFQ ID is required'));
      if (!vendor_id) return next(createValidationError('Vendor ID is required'));
      if (!total_amount) return next(createValidationError('Total amount is required'));
      if (!delivery_days) return next(createValidationError('Delivery days is required'));

      const quotation = await quotationQueries.create({ rfq_id, vendor_id, submitted_by, total_amount, delivery_days, payment_terms, notes, line_items: line_items || [] });

      await activityService.logActivity(submitted_by, 'quotation_created', 'quotation', quotation.id, { rfq_id, vendor_id }, req.ip, req.get('User-Agent'));

      res.status(201).json({ success: true, message: 'Quotation created', data: { quotation } });
    } catch (err) { next(err); }
  },

  async updateQuotation(req, res, next) {
    try {
      const quotation = await quotationQueries.update(req.params.id, req.body);
      if (!quotation) return next(createNotFoundError('Quotation not found or already submitted'));

      await activityService.logActivity(req.session.user.id, 'quotation_updated', 'quotation', quotation.id, req.body, req.ip, req.get('User-Agent'));

      res.json({ success: true, message: 'Quotation updated', data: { quotation } });
    } catch (err) { next(err); }
  },

  async submitQuotation(req, res, next) {
    try {
      const quotation = await quotationQueries.submit(req.params.id);
      if (!quotation) return next(createNotFoundError('Quotation not found or already submitted'));

      await activityService.logActivity(req.session.user.id, 'quotation_submitted', 'quotation', quotation.id, { quotation_number: quotation.quotation_number }, req.ip, req.get('User-Agent'));

      res.json({ success: true, message: 'Quotation submitted successfully', data: { quotation } });
    } catch (err) { next(err); }
  },

  async selectQuotation(req, res, next) {
    try {
      const org_id = req.session.user.organization_id;
      const quotation = await quotationQueries.select(req.params.id, org_id);
      if (!quotation) return next(createNotFoundError('Quotation not found'));

      // Auto-create approval workflow
      const approval = await approvalQueries.createForQuotation(quotation.id, req.session.user.id);

      await activityService.logActivity(req.session.user.id, 'quotation_selected', 'quotation', quotation.id, { approval_id: approval.id }, req.ip, req.get('User-Agent'));

      res.json({ success: true, message: 'Quotation selected and sent for approval', data: { quotation, approval } });
    } catch (err) { next(err); }
  }
};

module.exports = quotationController;
