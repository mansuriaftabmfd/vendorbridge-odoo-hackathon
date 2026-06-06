/**
 * Approval, Purchase Order, Invoice, and Report Controllers
 */
const { approvalQueries, poQueries, invoiceQueries, reportQueries } = require('../db/queries/procurement.queries');
const activityService = require('../services/activity.service');
const notificationService = require('../services/notification.service');
const logger = require('../utils/logger');
const { createNotFoundError, createValidationError } = require('../middleware/error-handler');

// ─── Approval Controller ─────────────────────────────────────────────────────
const approvalController = {
  async getApprovals(req, res, next) {
    try {
      const org_id = req.session.user.organization_id;
      const { status, page, limit } = req.query;
      const approvals = await approvalQueries.findAll({ org_id, status, page: +page || 1, limit: +limit || 20 });
      const total = approvals[0]?.total_count ? parseInt(approvals[0].total_count) : 0;
      res.json({ success: true, data: { approvals: approvals.map(v => { const { total_count, ...r } = v; return r; }), total } });
    } catch (err) { next(err); }
  },

  async getApproval(req, res, next) {
    try {
      const org_id = req.session.user.organization_id;
      const approval = await approvalQueries.findById(req.params.id, org_id);
      if (!approval) return next(createNotFoundError('Approval not found'));
      res.json({ success: true, data: { approval } });
    } catch (err) { next(err); }
  },

  async approveQuotation(req, res, next) {
    try {
      const { id: approved_by, organization_id: org_id } = req.session.user;
      const { remarks } = req.body;

      const approval = await approvalQueries.findById(req.params.id, org_id);
      if (!approval) return next(createNotFoundError('Approval not found'));
      if (approval.status !== 'PENDING') return next(createValidationError('Approval already decided'));

      await approvalQueries.approve(req.params.id, approved_by, remarks, org_id);

      // Auto-generate PO from approved quotation
      const po = await poQueries.createFromQuotation(approval.quotation_id, approved_by, org_id, null);

      await activityService.logActivity(approved_by, 'quotation_approved', 'approval', req.params.id,
        { remarks, po_number: po?.po_number }, req.ip, req.get('User-Agent'));

      // Notify requester
      await notificationService.createNotification(
        approval.requested_by, 'approval_approved',
        'Quotation Approved!',
        `${approval.quotation_number} has been approved. PO ${po?.po_number} has been generated.`,
        'approval', req.params.id
      );

      res.json({ success: true, message: 'Quotation approved and PO generated', data: { po } });
    } catch (err) { next(err); }
  },

  async rejectQuotation(req, res, next) {
    try {
      const { id: approved_by, organization_id: org_id } = req.session.user;
      const { remarks } = req.body;
      if (!remarks) return next(createValidationError('Remarks required for rejection'));

      const approval = await approvalQueries.findById(req.params.id, org_id);
      if (!approval) return next(createNotFoundError('Approval not found'));

      await approvalQueries.reject(req.params.id, approved_by, remarks, org_id);

      await activityService.logActivity(approved_by, 'quotation_rejected', 'approval', req.params.id, { remarks }, req.ip, req.get('User-Agent'));

      await notificationService.createNotification(
        approval.requested_by, 'approval_rejected',
        'Quotation Rejected',
        `${approval.quotation_number} was rejected. Reason: ${remarks}`,
        'approval', req.params.id
      );

      res.json({ success: true, message: 'Quotation rejected' });
    } catch (err) { next(err); }
  },

  async requestChanges(req, res, next) {
    try {
      const { id: approved_by, organization_id: org_id } = req.session.user;
      const { remarks } = req.body;
      if (!remarks) return next(createValidationError('Remarks required'));

      await approvalQueries.requestChanges(req.params.id, approved_by, remarks, org_id);

      await activityService.logActivity(approved_by, 'approval_changes_requested', 'approval', req.params.id, { remarks }, req.ip, req.get('User-Agent'));

      res.json({ success: true, message: 'Changes requested' });
    } catch (err) { next(err); }
  }
};

// ─── Purchase Order Controller ───────────────────────────────────────────────
const poController = {
  async getPOs(req, res, next) {
    try {
      const org_id = req.session.user.organization_id;
      const { vendor_id, status, page, limit } = req.query;
      const pos = await poQueries.findAll({ org_id, vendor_id, status, page: +page || 1, limit: +limit || 20 });
      const total = pos[0]?.total_count ? parseInt(pos[0].total_count) : 0;
      res.json({ success: true, data: { pos: pos.map(v => { const { total_count, ...r } = v; return r; }), total } });
    } catch (err) { next(err); }
  },

  async getPO(req, res, next) {
    try {
      const org_id = req.session.user.organization_id;
      const po = await poQueries.findById(req.params.id, org_id);
      if (!po) return next(createNotFoundError('Purchase order not found'));
      res.json({ success: true, data: { po } });
    } catch (err) { next(err); }
  },

  async createPO(req, res, next) {
    try {
      const { id: created_by, organization_id: org_id } = req.session.user;
      const { quotation_id, terms } = req.body;
      if (!quotation_id) return next(createValidationError('Quotation ID required'));

      const po = await poQueries.createFromQuotation(quotation_id, created_by, org_id, terms);
      if (!po) return next(createNotFoundError('Quotation not found or already used'));

      await activityService.logActivity(created_by, 'po_created', 'purchase_order', po.id, { po_number: po.po_number }, req.ip, req.get('User-Agent'));

      res.status(201).json({ success: true, message: 'Purchase order created', data: { po } });
    } catch (err) { next(err); }
  },

  async updatePO(req, res, next) {
    try {
      const org_id = req.session.user.organization_id;
      const po = await poQueries.updateStatus(req.params.id, req.body.status, org_id);
      if (!po) return next(createNotFoundError('Purchase order not found'));
      res.json({ success: true, message: 'Purchase order updated', data: { po } });
    } catch (err) { next(err); }
  },

  async approvePO(req, res, next) {
    try {
      const org_id = req.session.user.organization_id;
      const po = await poQueries.updateStatus(req.params.id, 'APPROVED', org_id);
      if (!po) return next(createNotFoundError('Purchase order not found'));

      await activityService.logActivity(req.session.user.id, 'po_approved', 'purchase_order', po.id, { po_number: po.po_number }, req.ip, req.get('User-Agent'));
      res.json({ success: true, message: 'Purchase order approved', data: { po } });
    } catch (err) { next(err); }
  },

  async sendPO(req, res, next) {
    try {
      const org_id = req.session.user.organization_id;
      const po = await poQueries.findById(req.params.id, org_id);
      if (!po) return next(createNotFoundError('Purchase order not found'));

      await poQueries.updateStatus(req.params.id, 'SENT', org_id);
      await activityService.logActivity(req.session.user.id, 'po_sent', 'purchase_order', po.id, { po_number: po.po_number }, req.ip, req.get('User-Agent'));

      res.json({ success: true, message: 'Purchase order sent to vendor' });
    } catch (err) { next(err); }
  },

  async getPOPDF(req, res, next) {
    try {
      const org_id = req.session.user.organization_id;
      const po = await poQueries.findById(req.params.id, org_id);
      if (!po) return next(createNotFoundError('Purchase order not found'));

      const { generatePOPDF } = require('../utils/pdf-generator');
      const pdfBuffer = await generatePOPDF(po);

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${po.po_number}.pdf"`,
        'Content-Length': pdfBuffer.length
      });
      res.send(pdfBuffer);
    } catch (err) { next(err); }
  }
};

// ─── Invoice Controller ──────────────────────────────────────────────────────
const invoiceController = {
  async getInvoices(req, res, next) {
    try {
      const org_id = req.session.user.organization_id;
      const { status, page, limit } = req.query;
      const invoices = await invoiceQueries.findAll({ org_id, status, page: +page || 1, limit: +limit || 20 });
      const total = invoices[0]?.total_count ? parseInt(invoices[0].total_count) : 0;
      res.json({ success: true, data: { invoices: invoices.map(v => { const { total_count, ...r } = v; return r; }), total } });
    } catch (err) { next(err); }
  },

  async getInvoice(req, res, next) {
    try {
      const org_id = req.session.user.organization_id;
      const invoice = await invoiceQueries.findById(req.params.id, org_id);
      if (!invoice) return next(createNotFoundError('Invoice not found'));
      res.json({ success: true, data: { invoice } });
    } catch (err) { next(err); }
  },

  async createInvoice(req, res, next) {
    try {
      const { id: created_by, organization_id: org_id } = req.session.user;
      const { po_id, bank_details } = req.body;
      if (!po_id) return next(createValidationError('PO ID required'));

      const invoice = await invoiceQueries.createFromPO(po_id, created_by, org_id, bank_details);
      if (!invoice) return next(createNotFoundError('PO not found or invoice already exists'));

      await activityService.logActivity(created_by, 'invoice_created', 'invoice', invoice.id, { invoice_number: invoice.invoice_number }, req.ip, req.get('User-Agent'));

      res.status(201).json({ success: true, message: 'Invoice created', data: { invoice } });
    } catch (err) { next(err); }
  },

  async sendInvoice(req, res, next) {
    try {
      const org_id = req.session.user.organization_id;
      const invoice = await invoiceQueries.findById(req.params.id, org_id);
      if (!invoice) return next(createNotFoundError('Invoice not found'));

      // Generate PDF and send email
      const { generateInvoicePDF } = require('../utils/pdf-generator');
      const { sendEmail } = require('../config/email');

      const pdfBuffer = await generateInvoicePDF(invoice);

      try {
        await sendEmail({
          to: invoice.vendor_email,
          subject: `Invoice ${invoice.invoice_number} from ${invoice.org_name}`,
          html: `
            <h2>Invoice from ${invoice.org_name}</h2>
            <p>Dear ${invoice.vendor_name},</p>
            <p>Please find attached Invoice <strong>${invoice.invoice_number}</strong>.</p>
            <p><strong>Amount Due:</strong> ₹${parseFloat(invoice.total_amount).toLocaleString('en-IN')}</p>
            <p><strong>Due Date:</strong> ${new Date(invoice.due_date).toLocaleDateString('en-IN')}</p>
            <p>Thank you for your business.</p>
            <p>Regards,<br>${invoice.org_name}</p>
          `,
          attachments: [{ filename: `${invoice.invoice_number}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }]
        });
      } catch (emailErr) {
        logger.warn('Email send failed (email not configured):', emailErr.message);
      }

      await invoiceQueries.updateStatus(req.params.id, 'SENT', org_id, { emailed_at: new Date() });
      await activityService.logActivity(req.session.user.id, 'invoice_sent', 'invoice', invoice.id, { invoice_number: invoice.invoice_number }, req.ip, req.get('User-Agent'));

      res.json({ success: true, message: 'Invoice sent to vendor' });
    } catch (err) { next(err); }
  },

  async getInvoicePDF(req, res, next) {
    try {
      const org_id = req.session.user.organization_id;
      const invoice = await invoiceQueries.findById(req.params.id, org_id);
      if (!invoice) return next(createNotFoundError('Invoice not found'));

      const { generateInvoicePDF } = require('../utils/pdf-generator');
      const pdfBuffer = await generateInvoicePDF(invoice);

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${invoice.invoice_number}.pdf"`,
        'Content-Length': pdfBuffer.length
      });
      res.send(pdfBuffer);
    } catch (err) { next(err); }
  },

  async markPaid(req, res, next) {
    try {
      const org_id = req.session.user.organization_id;
      const invoice = await invoiceQueries.updateStatus(req.params.id, 'PAID', org_id);
      if (!invoice) return next(createNotFoundError('Invoice not found'));

      await activityService.logActivity(req.session.user.id, 'invoice_marked_paid', 'invoice', invoice.id, {}, req.ip, req.get('User-Agent'));

      res.json({ success: true, message: 'Invoice marked as paid', data: { invoice } });
    } catch (err) { next(err); }
  }
};

// ─── Report Controller ───────────────────────────────────────────────────────
const reportController = {
  async getStats(req, res, next) {
    try {
      const org_id = req.session.user.organization_id;
      const stats = await reportQueries.procurementStats(org_id);
      res.json({ success: true, data: { stats } });
    } catch (err) { next(err); }
  },

  async getSpending(req, res, next) {
    try {
      const org_id = req.session.user.organization_id;
      const data = await reportQueries.spendingSummary(org_id, req.query.period || 'month');
      res.json({ success: true, data: { spending: data } });
    } catch (err) { next(err); }
  },

  async getVendorPerformance(req, res, next) {
    try {
      const org_id = req.session.user.organization_id;
      const data = await reportQueries.vendorPerformance(org_id);
      res.json({ success: true, data: { vendors: data } });
    } catch (err) { next(err); }
  },

  async getProcurementTrends(req, res, next) {
    try {
      const org_id = req.session.user.organization_id;
      const data = await reportQueries.monthlyTrends(org_id);
      res.json({ success: true, data: { trends: data } });
    } catch (err) { next(err); }
  },

  async exportReport(req, res, next) {
    try {
      const org_id = req.session.user.organization_id;
      const { type } = req.params;
      let data;

      if (type === 'vendor-performance') data = await reportQueries.vendorPerformance(org_id);
      else if (type === 'spending') data = await reportQueries.spendingSummary(org_id);
      else data = await reportQueries.monthlyTrends(org_id);

      // Simple CSV export
      if (!data.length) return res.json({ success: true, data: [] });

      const headers = Object.keys(data[0]);
      const csv = [headers.join(','), ...data.map(row => headers.map(h => `"${row[h] ?? ''}"`).join(','))].join('\n');

      res.set({ 'Content-Type': 'text/csv', 'Content-Disposition': `attachment; filename="${type}-report.csv"` });
      res.send(csv);
    } catch (err) { next(err); }
  }
};

module.exports = { approvalController, poController, invoiceController, reportController };
