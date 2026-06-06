/**
 * Vendor Database Queries
 */
const { query, queryInTransaction } = require('../../config/database');

const vendorQueries = {
  async findAll({ org_id, status, category, search, page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    const conditions = ['v.organization_id = $1'];
    const params = [org_id];
    let idx = 2;

    if (status) { conditions.push(`v.status = $${idx++}`); params.push(status); }
    if (category) { conditions.push(`v.category = $${idx++}`); params.push(category); }
    if (search) {
      conditions.push(`(v.company_name ILIKE $${idx} OR v.primary_contact_email ILIKE $${idx} OR v.gstin ILIKE $${idx})`);
      params.push(`%${search}%`); idx++;
    }

    const where = conditions.join(' AND ');
    const result = await query(`
      SELECT v.*, COUNT(*) OVER() AS total_count
      FROM vendors v
      WHERE ${where}
      ORDER BY v.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `, [...params, limit, offset]);

    return result.rows;
  },

  async findById(id, org_id) {
    const result = await query(`
      SELECT v.*,
        json_agg(DISTINCT jsonb_build_object(
          'id', vd.id, 'file_name', vd.file_name,
          'file_type', vd.file_type, 'uploaded_at', vd.uploaded_at
        )) FILTER (WHERE vd.id IS NOT NULL) AS documents
      FROM vendors v
      LEFT JOIN vendor_documents vd ON vd.vendor_id = v.id
      WHERE v.id = $1 AND v.organization_id = $2
      GROUP BY v.id
    `, [id, org_id]);
    return result.rows[0] || null;
  },

  async create({ org_id, company_name, category, gstin, address, primary_contact_name, primary_contact_email, primary_contact_phone }) {
    const result = await query(`
      INSERT INTO vendors (organization_id, company_name, category, gstin, address,
        primary_contact_name, primary_contact_email, primary_contact_phone, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'PENDING')
      RETURNING *
    `, [org_id, company_name, category || null, gstin || null, address || null,
        primary_contact_name || null, primary_contact_email || null, primary_contact_phone || null]);
    return result.rows[0];
  },

  async update(id, org_id, fields) {
    const allowed = ['company_name','category','gstin','address','primary_contact_name',
      'primary_contact_email','primary_contact_phone','status','rating'];
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
      UPDATE vendors SET ${setClauses.join(', ')}, updated_at = NOW()
      WHERE id = $${idx} AND organization_id = $${idx + 1}
      RETURNING *
    `, params);
    return result.rows[0] || null;
  },

  async delete(id, org_id) {
    const result = await query(`
      DELETE FROM vendors WHERE id = $1 AND organization_id = $2 RETURNING id
    `, [id, org_id]);
    return result.rowCount > 0;
  },

  async findByEmail(email, org_id) {
    const result = await query(`
      SELECT * FROM vendors WHERE primary_contact_email = $1 AND organization_id = $2
    `, [email, org_id]);
    return result.rows[0] || null;
  }
};

module.exports = vendorQueries;
