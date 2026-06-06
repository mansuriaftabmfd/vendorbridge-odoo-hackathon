/**
 * Approval, Purchase Order, and Invoice Database Queries
 */
const { query } = require('../../config/database');

// ─── PO Number Generator ────────────────────────────────────────────────────
async function generatePONumber() {
  const year = new Date().getFullYear();
  const result = await query(`
    INSERT INTO po_counters (year, last_number) VALUES ($1, 1)
    ON CONFLICT (year) DO UPDATE SET last_number = po_counters.last_number + 1
    RETURNING last_number
  `, [year]);
  const num = String(result.rows[0].last_number).padStart(4, '0');
  return `PO-${year}-${num}`;
}

// ─── Invoice Number Generator ────────────────────────────────────────────────
async function generateInvoiceNumber() {
  const year = new Date().getFullYear();
  const result = await query(`
    INSERT INTO invoice_counters (year, last_number) VALUES ($1, 1)
    ON CONFLICT (year) DO UPDATE SET last_number = invoice_counters.last_number + 1
    RETURNING last_number
  `, [year]);
  const num = String(result.rows[0].last_number).padStart(4, '0');
  return `INV-${year}-${num}`;
}

// ─── Approval Queries ────────────────────────────────────────────────────────
const approvalQueries = {
  async findAll({ org_id, status, page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    const conditions = ['r.organization_id = $1'];
    const params = [org_id];
    let idx = 2;
    if (status) { conditions.push(`a.status = $${idx++}`); params.push(status); }

    const result = await query(`
      SELECT a.*,
        q.quotation_number, q.total_amount, q.delivery_days,
        v.company_name AS vendor_name,
        r.title AS rfq_title, r.rfq_number,
        requester.full_name AS requested_by_name,
        approver.full_name AS approved_by_name,
        COUNT(*) OVER() AS total_count
      FROM approvals a
      JOIN quotations q ON a.quotation_id = q.id
      JOIN rfqs r ON q.rfq_id = r.id
      JOIN vendors v ON q.vendor_id = v.id
      JOIN users requester ON a.requested_by = requester.id
      LEFT JOIN users approver ON a.approved_by = approver.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY a.requested_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `, [...params, limit, offset]);
    return result.rows;
  },

  async findById(id, org_id) {
    const result = await query(`
      SELECT a.*,
        q.quotation_number, q.total_amount, q.delivery_days, q.payment_terms, q.notes,
        v.company_name AS vendor_name, v.rating AS vendor_rating,
        r.title AS rfq_title, r.rfq_number,
        requester.full_name AS requested_by_name,
        approver.full_name AS approved_by_name,
        json_agg(DISTINCT jsonb_build_object(
          'id', aws.id, 'step_number', aws.step_number, 'step_name', aws.step_name,
          'status', aws.status, 'remarks', aws.remarks, 'acted_at', aws.acted_at
        )) FILTER (WHERE aws.id IS NOT NULL) AS workflow_steps
      FROM approvals a
      JOIN quotations q ON a.quotation_id = q.id
      JOIN rfqs r ON q.rfq_id = r.id
      JOIN vendors v ON q.vendor_id = v.id
      JOIN users requester ON a.requested_by = requester.id
      LEFT JOIN users approver ON a.approved_by = approver.id
      LEFT JOIN approval_workflow_steps aws ON aws.approval_id = a.id
      WHERE a.id = $1 AND r.organization_id = $2
      GROUP BY a.id, q.quotation_number, q.total_amount, q.delivery_days, q.payment_terms, q.notes,
               v.company_name, v.rating, r.title, r.rfq_number,
               requester.full_name, approver.full_name
    `, [id, org_id]);
    return result.rows[0] || null;
  },

  async createForQuotation(quotation_id, requested_by) {
    // Check if approval already exists
    const existing = await query(`SELECT id FROM approvals WHERE quotation_id = $1`, [quotation_id]);
    if (existing.rows.length) return existing.rows[0];

    const result = await query(`
      INSERT INTO approvals (quotation_id, requested_by, status)
      VALUES ($1, $2, 'PENDING')
      RETURNING *
    `, [quotation_id, requested_by]);

    const approval = result.rows[0];

    // Create workflow steps
    const steps = [
      { step_number: 1, step_name: 'Quotation Review' },
      { step_number: 2, step_name: 'Manager Approval' },
      { step_number: 3, step_name: 'Finance Review' },
      { step_number: 4, step_name: 'PO Generation' }
    ];

    for (const step of steps) {
      await query(`
        INSERT INTO approval_workflow_steps (approval_id, step_number, step_name, status)
        VALUES ($1, $2, $3, $4)
      `, [approval.id, step.step_number, step.step_name, step.step_number === 1 ? 'COMPLETED' : 'PENDING']);
    }

    return approval;
  },

  async approve(id, approved_by, remarks, org_id) {
    const approval = await approvalQueries.findById(id, org_id);
    if (!approval) return null;

    await query(`
      UPDATE approvals SET status = 'APPROVED', approved_by = $1, remarks = $2, decided_at = NOW()
      WHERE id = $3
    `, [approved_by, remarks || null, id]);

    // Update workflow steps
    await query(`
      UPDATE approval_workflow_steps SET status = 'COMPLETED', acted_by = $1, remarks = $2, acted_at = NOW()
      WHERE approval_id = $3 AND status != 'COMPLETED'
    `, [approved_by, remarks || null, id]);

    return true;
  },

  async reject(id, approved_by, remarks, org_id) {
    const approval = await approvalQueries.findById(id, org_id);
    if (!approval) return null;

    await query(`
      UPDATE approvals SET status = 'REJECTED', approved_by = $1, remarks = $2, decided_at = NOW()
      WHERE id = $3
    `, [approved_by, remarks, id]);

    // Mark current pending step as skipped
    await query(`
      UPDATE approval_workflow_steps SET status = 'SKIPPED', acted_by = $1, remarks = $2, acted_at = NOW()
      WHERE approval_id = $3 AND status = 'PENDING'
      AND step_number = (SELECT MIN(step_number) FROM approval_workflow_steps WHERE approval_id = $3 AND status = 'PENDING')
    `, [approved_by, remarks, id]);

    return true;
  },

  async requestChanges(id, approved_by, remarks, org_id) {
    const approval = await approvalQueries.findById(id, org_id);
    if (!approval) return null;

    await query(`
      UPDATE approvals SET status = 'REQUESTED_CHANGES', approved_by = $1, remarks = $2, decided_at = NOW()
      WHERE id = $3
    `, [approved_by, remarks, id]);

    return true;
  }
};

// ─── Purchase Order Queries ──────────────────────────────────────────────────
const poQueries = {
  async findAll({ org_id, vendor_id, status, page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    const conditions = ['po.created_by IN (SELECT id FROM users WHERE organization_id = $1)'];
    const params = [org_id];
    let idx = 2;
    if (vendor_id) { conditions.push(`po.vendor_id = $${idx++}`); params.push(vendor_id); }
    if (status) { conditions.push(`po.status = $${idx++}`); params.push(status); }

    const result = await query(`
      SELECT po.*,
        v.company_name AS vendor_name, v.primary_contact_email AS vendor_email,
        u.full_name AS created_by_name,
        COUNT(*) OVER() AS total_count
      FROM purchase_orders po
      JOIN vendors v ON po.vendor_id = v.id
      JOIN users u ON po.created_by = u.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY po.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `, [...params, limit, offset]);
    return result.rows;
  },

  async findById(id, org_id) {
    const result = await query(`
      SELECT po.*,
        v.company_name AS vendor_name, v.primary_contact_email AS vendor_email,
        v.address AS vendor_address, v.gstin AS vendor_gstin,
        v.primary_contact_name AS vendor_contact,
        u.full_name AS created_by_name,
        r.rfq_number, r.title AS rfq_title,
        json_agg(DISTINCT jsonb_build_object(
          'id', pli.id, 'item_name', pli.item_name, 'description', pli.description,
          'hsn_code', pli.hsn_code, 'quantity', pli.quantity,
          'unit_price', pli.unit_price, 'amount', pli.amount
        )) FILTER (WHERE pli.id IS NOT NULL) AS line_items
      FROM purchase_orders po
      JOIN vendors v ON po.vendor_id = v.id
      JOIN users u ON po.created_by = u.id
      LEFT JOIN rfqs r ON po.rfq_id = r.id
      LEFT JOIN po_line_items pli ON pli.po_id = po.id
      WHERE po.id = $1 AND u.organization_id = $2
      GROUP BY po.id, v.company_name, v.primary_contact_email, v.address, v.gstin,
               v.primary_contact_name, u.full_name, r.rfq_number, r.title
    `, [id, org_id]);
    return result.rows[0] || null;
  },

  async createFromQuotation(quotation_id, created_by, org_id, terms) {
    // Get quotation with line items
    const qResult = await query(`
      SELECT q.*, v.company_name, r.organization_id
      FROM quotations q JOIN rfqs r ON q.rfq_id = r.id JOIN vendors v ON q.vendor_id = v.id
      WHERE q.id = $1 AND r.organization_id = $2
    `, [quotation_id, org_id]);
    const quot = qResult.rows[0];
    if (!quot) return null;

    const lineItemsResult = await query(`
      SELECT qli.*, rli.item_name, rli.description, rli.quantity, rli.uom
      FROM quotation_line_items qli JOIN rfq_line_items rli ON qli.rfq_line_item_id = rli.id
      WHERE qli.quotation_id = $1
    `, [quotation_id]);

    const po_number = await generatePONumber();
    const subtotal = parseFloat(quot.total_amount);
    const tax_rate = 0.18; // 18% GST
    const tax_amount = Math.round(subtotal * tax_rate * 100) / 100;
    const total_amount = subtotal + tax_amount;

    const poResult = await query(`
      INSERT INTO purchase_orders (po_number, rfq_id, quotation_id, vendor_id, created_by,
        status, subtotal, tax_amount, total_amount, terms)
      VALUES ($1, $2, $3, $4, $5, 'DRAFT', $6, $7, $8, $9)
      RETURNING *
    `, [po_number, quot.rfq_id, quotation_id, quot.vendor_id, created_by,
        subtotal, tax_amount, total_amount, terms || 'Standard terms and conditions apply.']);

    const po = poResult.rows[0];

    for (const item of lineItemsResult.rows) {
      await query(`
        INSERT INTO po_line_items (po_id, item_name, description, quantity, unit_price, amount)
        VALUES ($1,$2,$3,$4,$5,$6)
      `, [po.id, item.item_name, item.description || null, item.quantity, item.unit_price, item.total_price]);
    }

    return po;
  },

  async updateStatus(id, status, org_id) {
    const result = await query(`
      UPDATE purchase_orders SET status = $1, updated_at = NOW()
      WHERE id = $2 AND created_by IN (SELECT id FROM users WHERE organization_id = $3)
      RETURNING *
    `, [status, id, org_id]);
    return result.rows[0] || null;
  }
};

// ─── Invoice Queries ─────────────────────────────────────────────────────────
const invoiceQueries = {
  async findAll({ org_id, status, page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    const conditions = ['po.created_by IN (SELECT id FROM users WHERE organization_id = $1)'];
    const params = [org_id];
    let idx = 2;
    if (status) { conditions.push(`inv.status = $${idx++}`); params.push(status); }

    const result = await query(`
      SELECT inv.*,
        v.company_name AS vendor_name, v.primary_contact_email AS vendor_email,
        po.po_number, u.full_name AS created_by_name,
        COUNT(*) OVER() AS total_count
      FROM invoices inv
      JOIN purchase_orders po ON inv.po_id = po.id
      JOIN vendors v ON po.vendor_id = v.id
      JOIN users u ON inv.created_by = u.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY inv.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `, [...params, limit, offset]);
    return result.rows;
  },

  async findById(id, org_id) {
    const result = await query(`
      SELECT inv.*,
        v.company_name AS vendor_name, v.primary_contact_email AS vendor_email,
        v.address AS vendor_address, v.gstin AS vendor_gstin,
        po.po_number, u.full_name AS created_by_name,
        org.name AS org_name, org.address AS org_address, org.gstin AS org_gstin,
        json_agg(DISTINCT jsonb_build_object(
          'id', pli.id, 'item_name', pli.item_name, 'description', pli.description,
          'quantity', pli.quantity, 'unit_price', pli.unit_price, 'amount', pli.amount
        )) FILTER (WHERE pli.id IS NOT NULL) AS line_items
      FROM invoices inv
      JOIN purchase_orders po ON inv.po_id = po.id
      JOIN vendors v ON po.vendor_id = v.id
      JOIN users u ON inv.created_by = u.id
      JOIN organizations org ON u.organization_id = org.id
      LEFT JOIN po_line_items pli ON pli.po_id = po.id
      WHERE inv.id = $1 AND u.organization_id = $2
      GROUP BY inv.id, v.company_name, v.primary_contact_email, v.address, v.gstin,
               po.po_number, u.full_name, org.name, org.address, org.gstin
    `, [id, org_id]);
    return result.rows[0] || null;
  },

  async createFromPO(po_id, created_by, org_id, bank_details) {
    const existing = await query(`SELECT id FROM invoices WHERE po_id = $1`, [po_id]);
    if (existing.rows.length) return existing.rows[0];

    const poResult = await query(`
      SELECT po.*, u.organization_id
      FROM purchase_orders po JOIN users u ON po.created_by = u.id
      WHERE po.id = $1 AND u.organization_id = $2
    `, [po_id, org_id]);
    const po = poResult.rows[0];
    if (!po) return null;

    const invoice_number = await generateInvoiceNumber();
    const invoice_date = new Date();
    const due_date = new Date(invoice_date);
    due_date.setDate(due_date.getDate() + 30);

    const result = await query(`
      INSERT INTO invoices (invoice_number, po_id, created_by, status, invoice_date, due_date,
        subtotal, tax_amount, total_amount, bank_details)
      VALUES ($1,$2,$3,'DRAFT',$4,$5,$6,$7,$8,$9)
      RETURNING *
    `, [invoice_number, po_id, created_by, invoice_date.toISOString().split('T')[0],
        due_date.toISOString().split('T')[0], po.subtotal, po.tax_amount, po.total_amount,
        bank_details || null]);

    return result.rows[0];
  },

  async updateStatus(id, status, org_id, extra = {}) {
    const setClauses = ['status = $1', 'updated_at = NOW()'];
    const params = [status];
    let idx = 2;

    if (extra.emailed_at) { setClauses.push(`emailed_at = $${idx++}`); params.push(extra.emailed_at); }

    params.push(id, org_id);
    const result = await query(`
      UPDATE invoices SET ${setClauses.join(', ')}
      WHERE id = $${idx} AND created_by IN (SELECT id FROM users WHERE organization_id = $${idx + 1})
      RETURNING *
    `, params);
    return result.rows[0] || null;
  }
};

// ─── Report Queries ──────────────────────────────────────────────────────────
const reportQueries = {
  async spendingSummary(org_id, period = 'month') {
    const result = await query(`
      SELECT
        DATE_TRUNC($2, po.created_at) AS period,
        SUM(po.total_amount) AS total_spend,
        COUNT(po.id) AS po_count,
        COUNT(DISTINCT po.vendor_id) AS vendor_count
      FROM purchase_orders po
      JOIN users u ON po.created_by = u.id
      WHERE u.organization_id = $1
        AND po.status NOT IN ('CANCELLED', 'DRAFT')
      GROUP BY DATE_TRUNC($2, po.created_at)
      ORDER BY period DESC
      LIMIT 12
    `, [org_id, period]);
    return result.rows;
  },

  async vendorPerformance(org_id) {
    const result = await query(`
      SELECT
        v.id, v.company_name, v.category, v.status, v.rating,
        COUNT(DISTINCT q.id) AS total_quotations,
        COUNT(DISTINCT po.id) AS total_pos,
        COALESCE(SUM(po.total_amount), 0) AS total_po_value,
        COALESCE(AVG(q.delivery_days), 0)::INT AS avg_delivery_days
      FROM vendors v
      LEFT JOIN quotations q ON q.vendor_id = v.id AND q.status IN ('SUBMITTED','SELECTED')
      LEFT JOIN purchase_orders po ON po.vendor_id = v.id AND po.status NOT IN ('CANCELLED','DRAFT')
      WHERE v.organization_id = $1
      GROUP BY v.id
      ORDER BY total_po_value DESC
    `, [org_id]);
    return result.rows;
  },

  async procurementStats(org_id) {
    const [rfqs, vendors, pos, invoices, pending_approvals] = await Promise.all([
      query(`SELECT COUNT(*) FROM rfqs WHERE organization_id = $1`, [org_id]),
      query(`SELECT COUNT(*) FROM vendors WHERE organization_id = $1 AND status = 'ACTIVE'`, [org_id]),
      query(`SELECT COUNT(*), COALESCE(SUM(total_amount),0) AS total_spend FROM purchase_orders po JOIN users u ON po.created_by = u.id WHERE u.organization_id = $1 AND po.status NOT IN ('CANCELLED','DRAFT')`, [org_id]),
      query(`SELECT COUNT(*) FROM invoices inv JOIN purchase_orders po ON inv.po_id = po.id JOIN users u ON po.created_by = u.id WHERE u.organization_id = $1 AND inv.status IN ('SENT','PAID')`, [org_id]),
      query(`SELECT COUNT(*) FROM approvals a JOIN quotations q ON a.quotation_id = q.id JOIN rfqs r ON q.rfq_id = r.id WHERE r.organization_id = $1 AND a.status = 'PENDING'`, [org_id])
    ]);
    return {
      total_rfqs: parseInt(rfqs.rows[0].count),
      active_vendors: parseInt(vendors.rows[0].count),
      total_pos: parseInt(pos.rows[0].count),
      total_spend: parseFloat(pos.rows[0].total_spend),
      total_invoices: parseInt(invoices.rows[0].count),
      pending_approvals: parseInt(pending_approvals.rows[0].count)
    };
  },

  async monthlyTrends(org_id) {
    const result = await query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', po.created_at), 'Mon YYYY') AS month,
        DATE_TRUNC('month', po.created_at) AS month_date,
        COUNT(po.id) AS po_count,
        SUM(po.total_amount) AS spend
      FROM purchase_orders po
      JOIN users u ON po.created_by = u.id
      WHERE u.organization_id = $1
        AND po.created_at >= NOW() - INTERVAL '12 months'
        AND po.status NOT IN ('CANCELLED', 'DRAFT')
      GROUP BY DATE_TRUNC('month', po.created_at)
      ORDER BY month_date ASC
    `, [org_id]);
    return result.rows;
  }
};

module.exports = { approvalQueries, poQueries, invoiceQueries, reportQueries };
