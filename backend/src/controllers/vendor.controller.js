/**
 * Vendor Controller – Full CRUD with activity logging
 */
const vendorQueries = require('../db/queries/vendors.queries');
const activityService = require('../services/activity.service');
const logger = require('../utils/logger');
const { query } = require('../config/database');
const { createNotFoundError, createValidationError, createConflictError } = require('../middleware/error-handler');

const vendorController = {
  async getVendors(req, res, next) {
    try {
      const org_id = req.session.user.organization_id;
      const { status, category, search, page, limit } = req.query;
      const vendors = await vendorQueries.findAll({ org_id, status, category, search, page: +page || 1, limit: +limit || 20 });
      const total = vendors[0]?.total_count ? parseInt(vendors[0].total_count) : 0;
      res.json({ success: true, data: { vendors: vendors.map(v => { const { total_count, ...rest } = v; return rest; }), total, page: +page || 1 } });
    } catch (err) { next(err); }
  },

  async getVendor(req, res, next) {
    try {
      const org_id = req.session.user.organization_id;
      const vendor = await vendorQueries.findById(req.params.id, org_id);
      if (!vendor) return next(createNotFoundError('Vendor not found'));
      res.json({ success: true, data: { vendor } });
    } catch (err) { next(err); }
  },

  async createVendor(req, res, next) {
    try {
      const org_id = req.session.user.organization_id;
      const { company_name, category, gstin, address, primary_contact_name, primary_contact_email, primary_contact_phone } = req.body;

      if (!company_name) return next(createValidationError('Company name is required'));

      if (primary_contact_email) {
        const existing = await vendorQueries.findByEmail(primary_contact_email, org_id);
        if (existing) return next(createConflictError('A vendor with this email already exists'));
      }

      const vendor = await vendorQueries.create({ org_id, company_name, category, gstin, address, primary_contact_name, primary_contact_email, primary_contact_phone });

      await activityService.logActivity(req.session.user.id, 'vendor_created', 'vendor', vendor.id, { company_name }, req.ip, req.get('User-Agent'));

      logger.info('Vendor created', { vendorId: vendor.id, company_name, userId: req.session.user.id });
      res.status(201).json({ success: true, message: 'Vendor created successfully', data: { vendor } });
    } catch (err) { next(err); }
  },

  async updateVendor(req, res, next) {
    try {
      const org_id = req.session.user.organization_id;
      const vendor = await vendorQueries.update(req.params.id, org_id, req.body);
      if (!vendor) return next(createNotFoundError('Vendor not found'));

      await activityService.logActivity(req.session.user.id, 'vendor_updated', 'vendor', vendor.id, req.body, req.ip, req.get('User-Agent'));

      res.json({ success: true, message: 'Vendor updated successfully', data: { vendor } });
    } catch (err) { next(err); }
  },

  async deleteVendor(req, res, next) {
    try {
      const org_id = req.session.user.organization_id;
      const deleted = await vendorQueries.delete(req.params.id, org_id);
      if (!deleted) return next(createNotFoundError('Vendor not found'));

      await activityService.logActivity(req.session.user.id, 'vendor_deleted', 'vendor', req.params.id, {}, req.ip, req.get('User-Agent'));

      res.json({ success: true, message: 'Vendor deleted successfully' });
    } catch (err) { next(err); }
  },

  async uploadDocument(req, res, next) {
    try {
      const org_id = req.session.user.organization_id;
      const { id } = req.params;
      const { document_type, document_url, document_name } = req.body;

      const vendor = await vendorQueries.findById(id, org_id);
      if (!vendor) return next(createNotFoundError('Vendor not found'));

      if (!document_type || !document_url) {
        return next(createValidationError('document_type and document_url are required'));
      }

      const result = await query(`
        INSERT INTO vendor_documents (vendor_id, document_type, document_url, document_name, uploaded_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, vendor_id, document_type, document_url, document_name, created_at
      `, [id, document_type, document_url, document_name || document_type, req.session.user.id]);

      await activityService.logActivity(req.session.user.id, 'vendor_document_uploaded', 'vendor', id,
        { document_type, document_name }, req.ip, req.get('User-Agent'));

      logger.info('Vendor document uploaded', { vendorId: id, document_type, userId: req.session.user.id });
      res.status(201).json({ success: true, message: 'Document uploaded successfully', data: { document: result.rows[0] } });
    } catch (err) { next(err); }
  }
};

module.exports = vendorController;
