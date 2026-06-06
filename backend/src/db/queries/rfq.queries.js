/**
 * RFQ Database Queries
 */
const { query } = require('../../config/database');

const rfqQueries = {
  async generateRFQNumber() {
    const year = new Date().getFullYear();
    const result = await query(`
      INSERT INTO rfq_counters (year, last_number) VALUES ($1, 1)
      ON CONFLICT (year) DO UPDATE SET last_number = rfq_counters.last_number + 1
      RETURNING last_number
    `, [year]);
    const num = String(result.rows[0].last_number).padStart(4, '0');
    return `RFQ-${year}-${num}`;
  },

  async findAll({ org_id, status, user_id, role, page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    const conditions = ['r.organization_id = $1'];
    const params = [org_id];
    let idx = 2;

    if (status) { conditions.push(`r.status = $${idx++}`); params.push(status); }
    // Vendors only see RFQs they are invited to
    if (role === 'VENDOR' && user_id) {
      conditions.push(`EXISTS (
        SELECT 1 FROM rfq_vendors rv
        JOIN vendors v ON rv.vendor_id = v.id
        JOIN users u ON u.organization_id = v.organization_id
        WHERE rv.rfq_id = r.id AND u.id = $${idx++}
      )`);
      params.push(user_id);
    }

    const where = conditions.join(' AND ');
    const result = await query(`
      SELECT r.*,
        u.full_name AS created_by_name,
        COUNT(DISTINCT rv.vendor_id) AS invited_vendors_count,
        COUNT(DISTINCT q.id) AS quotations_count,
        COUNT(DISTINCT CASE WHEN q.status = 'SUBMITTED' THEN q.id END) AS submitted_quotations_count,
        COUNT(*) OVER() AS total_count
      FROM rfqs r
      JOIN users u ON r.created_by = u.id
      LEFT JOIN rfq_vendors rv ON rv.rfq_id = r.id
      LEFT JOIN quotations q ON q.rfq_id = r.id
      WHERE ${where}
      GROUP BY r.id, u.full_name
      ORDER BY r.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `, [...params, limit, offset]);
    return result.rows;
  },

  async findById(id, org_id) {
    const result = await query(`
      SELECT r.*,
        u.full_name AS created_by_name,
        json_agg(DISTINCT jsonb_build_object(
          'id', rli.id, 'item_name', rli.item_name,
          'description', rli.description, 'quantity', rli.quantity, 'uom', rli.uom
        )) FILTER (WHERE rli.id IS NOT NULL) AS line_items,
        json_agg(DISTINCT jsonb_build_object(
          'id', rv.vendor_id, 'company_name', v.company_name
        )) FILTER (WHERE rv.vendor_id IS NOT NULL) AS invited_vendors
      FROM rfqs r
      JOIN users u ON r.created_by = u.id
      LEFT JOIN rfq_line_items rli ON rli.rfq_id = r.id
      LEFT JOIN rfq_vendors rv ON rv.rfq_id = r.id
      LEFT JOIN vendors v ON rv.vendor_id = v.id
      WHERE r.id = $1 AND r.organization_id = $2
      GROUP BY r.id, u.full_name
    `, [id, org_id]);
    return result.rows[0] || null;
  },

  async create({ org_id, created_by, title, description, category, deadline, line_items = [], vendor_ids = [] }) {
    const rfq_number = await rfqQueries.generateRFQNumber();
    const rfqResult = await query(`
      INSERT INTO rfqs (rfq_number, title, description, category, deadline, organization_id, created_by, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,'DRAFT')
      RETURNING *
    `, [rfq_number, title, description || null, category || null, deadline, org_id, created_by]);

    const rfq = rfqResult.rows[0];

    for (const item of line_items) {
      await query(`
        INSERT INTO rfq_line_items (rfq_id, item_name, description, quantity, uom)
        VALUES ($1,$2,$3,$4,$5)
      `, [rfq.id, item.item_name, item.description || null, item.quantity, item.uom || 'Units']);
    }

    for (const vendor_id of vendor_ids) {
      await query(`
        INSERT INTO rfq_vendors (rfq_id, vendor_id) VALUES ($1,$2) ON CONFLICT DO NOTHING
      `, [rfq.id, vendor_id]);
    }

    return rfq;
  },

  async update(id, org_id, fields) {
    const allowed = ['title','description','category','deadline','status'];
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
    params.push(id, org_id);
    const result = await query(`
      UPDATE rfqs SET ${setClauses.join(', ')}, updated_at = NOW()
      WHERE id = $${idx} AND organization_id = $${idx + 1}
      RETURNING *
    `, params);
    return result.rows[0] || null;
  },

  async sendRFQ(id, org_id) {
    const result = await query(`
      UPDATE rfqs SET status = 'SENT', updated_at = NOW()
      WHERE id = $1 AND organization_id = $2 AND status = 'DRAFT'
      RETURNING *
    `, [id, org_id]);
    return result.rows[0] || null;
  },

  async closeRFQ(id, org_id) {
    const result = await query(`
      UPDATE rfqs SET status = 'CLOSED', updated_at = NOW()
      WHERE id = $1 AND organization_id = $2
      RETURNING *
    `, [id, org_id]);
    return result.rows[0] || null;
  },

  async delete(id, org_id) {
    const result = await query(`
      DELETE FROM rfqs WHERE id = $1 AND organization_id = $2 AND status = 'DRAFT' RETURNING id
    `, [id, org_id]);
    return result.rowCount > 0;
  },

  async getInvitedVendors(rfq_id) {
    const result = await query(`
      SELECT v.*, u.email AS user_email, u.id AS user_id
      FROM rfq_vendors rv
      JOIN vendors v ON rv.vendor_id = v.id
      LEFT JOIN users u ON u.organization_id = v.organization_id AND u.role = 'VENDOR'
      WHERE rv.rfq_id = $1
    `, [rfq_id]);
    return result.rows;
  }
};

module.exports = rfqQueries;
