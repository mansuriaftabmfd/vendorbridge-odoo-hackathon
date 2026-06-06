/**
 * Quotation Database Queries
 */
const { query } = require('../../config/database');

const quotationQueries = {
  async generateQuotationNumber() {
    const year = new Date().getFullYear();
    const result = await query(`
      INSERT INTO quotation_counters (year, last_number) VALUES ($1, 1)
      ON CONFLICT (year) DO UPDATE SET last_number = quotation_counters.last_number + 1
      RETURNING last_number
    `, [year]);
    const num = String(result.rows[0].last_number).padStart(4, '0');
    return `QUO-${year}-${num}`;
  },

  async findAll({ org_id, rfq_id, vendor_id, status, page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    const conditions = ['r.organization_id = $1'];
    const params = [org_id];
    let idx = 2;

    if (rfq_id) { conditions.push(`q.rfq_id = $${idx++}`); params.push(rfq_id); }
    if (vendor_id) { conditions.push(`q.vendor_id = $${idx++}`); params.push(vendor_id); }
    if (status) { conditions.push(`q.status = $${idx++}`); params.push(status); }

    const where = conditions.join(' AND ');
    const result = await query(`
      SELECT q.*,
        v.company_name AS vendor_name,
        v.rating AS vendor_rating,
        r.title AS rfq_title,
        r.rfq_number,
        u.full_name AS submitted_by_name,
        COUNT(*) OVER() AS total_count
      FROM quotations q
      JOIN rfqs r ON q.rfq_id = r.id
      JOIN vendors v ON q.vendor_id = v.id
      JOIN users u ON q.submitted_by = u.id
      WHERE ${where}
      ORDER BY q.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `, [...params, limit, offset]);
    return result.rows;
  },

  async findById(id, org_id) {
    const result = await query(`
      SELECT q.*,
        v.company_name AS vendor_name, v.rating AS vendor_rating,
        v.primary_contact_email AS vendor_email, v.primary_contact_name AS vendor_contact,
        r.title AS rfq_title, r.rfq_number, r.deadline,
        u.full_name AS submitted_by_name,
        json_agg(DISTINCT jsonb_build_object(
          'id', qli.id, 'rfq_line_item_id', qli.rfq_line_item_id,
          'item_name', rli.item_name, 'quantity', rli.quantity, 'uom', rli.uom,
          'unit_price', qli.unit_price, 'total_price', qli.total_price,
          'delivery_days', qli.delivery_days, 'notes', qli.notes
        )) FILTER (WHERE qli.id IS NOT NULL) AS line_items
      FROM quotations q
      JOIN rfqs r ON q.rfq_id = r.id
      JOIN vendors v ON q.vendor_id = v.id
      JOIN users u ON q.submitted_by = u.id
      LEFT JOIN quotation_line_items qli ON qli.quotation_id = q.id
      LEFT JOIN rfq_line_items rli ON qli.rfq_line_item_id = rli.id
      WHERE q.id = $1 AND r.organization_id = $2
      GROUP BY q.id, v.company_name, v.rating, v.primary_contact_email, v.primary_contact_name,
               r.title, r.rfq_number, r.deadline, u.full_name
    `, [id, org_id]);
    return result.rows[0] || null;
  },

  async create({ rfq_id, vendor_id, submitted_by, total_amount, delivery_days, payment_terms, notes, line_items = [] }) {
    const quotation_number = await quotationQueries.generateQuotationNumber();
    const qResult = await query(`
      INSERT INTO quotations (quotation_number, rfq_id, vendor_id, submitted_by, total_amount, delivery_days, payment_terms, notes, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'DRAFT')
      RETURNING *
    `, [quotation_number, rfq_id, vendor_id, submitted_by, total_amount, delivery_days, payment_terms || null, notes || null]);

    const quot = qResult.rows[0];
    for (const item of line_items) {
      await query(`
        INSERT INTO quotation_line_items (quotation_id, rfq_line_item_id, unit_price, total_price, delivery_days, notes)
        VALUES ($1,$2,$3,$4,$5,$6)
      `, [quot.id, item.rfq_line_item_id, item.unit_price, item.total_price, item.delivery_days || null, item.notes || null]);
    }
    return quot;
  },

  async update(id, fields) {
    const allowed = ['total_amount','delivery_days','payment_terms','notes'];
    const setClauses = [];
    const params = [];
    let idx = 1;
    for (const key of allowed) {
      if (fields[key] !== undefined) {
        setClauses.push(`${key} = $${idx++}`);
        params.push(fields[key]);
      }
    }
    if (!setClauses.length) return null;
    params.push(id);
    const result = await query(`
      UPDATE quotations SET ${setClauses.join(', ')}, updated_at = NOW()
      WHERE id = $${idx} AND status = 'DRAFT'
      RETURNING *
    `, params);
    return result.rows[0] || null;
  },

  async submit(id) {
    const result = await query(`
      UPDATE quotations SET status = 'SUBMITTED', submitted_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND status = 'DRAFT'
      RETURNING *
    `, [id]);
    return result.rows[0] || null;
  },

  async select(id, org_id) {
    // First get quotation + rfq to validate org
    const qResult = await query(`
      SELECT q.*, r.organization_id FROM quotations q JOIN rfqs r ON q.rfq_id = r.id WHERE q.id = $1
    `, [id]);
    const quot = qResult.rows[0];
    if (!quot || quot.organization_id !== org_id) return null;

    // Mark this as selected, reject others for same rfq
    await query(`
      UPDATE quotations SET status = 'REJECTED', is_selected = false, updated_at = NOW()
      WHERE rfq_id = $1 AND id != $2 AND status = 'SUBMITTED'
    `, [quot.rfq_id, id]);

    const result = await query(`
      UPDATE quotations SET status = 'SELECTED', is_selected = true, updated_at = NOW()
      WHERE id = $1 RETURNING *
    `, [id]);
    return result.rows[0];
  },

  async findForRFQ(rfq_id) {
    const result = await query(`
      SELECT q.*,
        v.company_name AS vendor_name, v.rating AS vendor_rating,
        json_agg(DISTINCT jsonb_build_object(
          'id', qli.id, 'rfq_line_item_id', qli.rfq_line_item_id,
          'item_name', rli.item_name, 'quantity', rli.quantity, 'uom', rli.uom,
          'unit_price', qli.unit_price, 'total_price', qli.total_price,
          'delivery_days', qli.delivery_days
        )) FILTER (WHERE qli.id IS NOT NULL) AS line_items
      FROM quotations q
      JOIN vendors v ON q.vendor_id = v.id
      LEFT JOIN quotation_line_items qli ON qli.quotation_id = q.id
      LEFT JOIN rfq_line_items rli ON qli.rfq_line_item_id = rli.id
      WHERE q.rfq_id = $1 AND q.status IN ('SUBMITTED', 'SELECTED', 'REJECTED')
      GROUP BY q.id, v.company_name, v.rating
      ORDER BY q.total_amount ASC
    `, [rfq_id]);
    return result.rows;
  }
};

module.exports = quotationQueries;
