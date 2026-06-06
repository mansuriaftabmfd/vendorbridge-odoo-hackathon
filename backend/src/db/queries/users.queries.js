/**
 * User Database Queries
 * Raw SQL queries for user operations
 */

const { query } = require('../../config/database');
const logger = require('../../utils/logger');

const userQueries = {
  /**
   * Create a new user
   */
  async createUser(userData) {
    const sql = `
      INSERT INTO users (email, password_hash, full_name, role, organization_id, email_verification_token)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, email, full_name, role, organization_id, is_active, email_verified, created_at
    `;
    
    const values = [
      userData.email,
      userData.password_hash,
      userData.full_name,
      userData.role,
      userData.organization_id || null,
      userData.email_verification_token || null
    ];
    
    const result = await query(sql, values);
    return result.rows[0];
  },

  /**
   * Find user by email
   */
  async findByEmail(email) {
    const sql = `
      SELECT 
        u.id, u.email, u.password_hash, u.full_name, u.role, 
        u.organization_id, u.is_active, u.email_verified, 
        u.last_login_at, u.created_at, u.updated_at,
        o.name as organization_name, o.is_active as organization_active
      FROM users u
      LEFT JOIN organizations o ON u.organization_id = o.id
      WHERE u.email = $1
    `;
    
    const result = await query(sql, [email]);
    return result.rows[0] || null;
  },

  /**
   * Find user by ID
   */
  async findById(id) {
    const sql = `
      SELECT 
        u.id, u.email, u.full_name, u.role, u.organization_id, 
        u.is_active, u.email_verified, u.last_login_at, 
        u.created_at, u.updated_at,
        o.name as organization_name, o.is_active as organization_active
      FROM users u
      LEFT JOIN organizations o ON u.organization_id = o.id
      WHERE u.id = $1
    `;
    
    const result = await query(sql, [id]);
    return result.rows[0] || null;
  },

  /**
   * Find user by email verification token
   */
  async findByVerificationToken(token) {
    const sql = `
      SELECT id, email, full_name, email_verified
      FROM users
      WHERE email_verification_token = $1 AND is_active = true
    `;
    
    const result = await query(sql, [token]);
    return result.rows[0] || null;
  },

  /**
   * Find user by password reset token
   */
  async findByResetToken(token) {
    const sql = `
      SELECT id, email, full_name, password_reset_expires
      FROM users
      WHERE password_reset_token = $1 
        AND password_reset_expires > NOW()
        AND is_active = true
    `;
    
    const result = await query(sql, [token]);
    return result.rows[0] || null;
  },

  /**
   * Update user password
   */
  async updatePassword(userId, passwordHash) {
    const sql = `
      UPDATE users 
      SET password_hash = $1, 
          password_reset_token = NULL, 
          password_reset_expires = NULL,
          updated_at = NOW()
      WHERE id = $2
      RETURNING id, email
    `;
    
    const result = await query(sql, [passwordHash, userId]);
    return result.rows[0];
  },

  /**
   * Set password reset token
   */
  async setResetToken(email, token, expiresAt) {
    const sql = `
      UPDATE users 
      SET password_reset_token = $1, 
          password_reset_expires = $2,
          updated_at = NOW()
      WHERE email = $3
      RETURNING id, email, full_name
    `;
    
    const result = await query(sql, [token, expiresAt, email]);
    return result.rows[0];
  },

  /**
   * Verify user email
   */
  async verifyEmail(token) {
    const sql = `
      UPDATE users 
      SET email_verified = true, 
          email_verification_token = NULL,
          updated_at = NOW()
      WHERE email_verification_token = $1
      RETURNING id, email, full_name
    `;
    
    const result = await query(sql, [token]);
    return result.rows[0];
  },

  /**
   * Update last login timestamp
   */
  async updateLastLogin(userId) {
    const sql = `
      UPDATE users 
      SET last_login_at = NOW(), updated_at = NOW()
      WHERE id = $1
    `;
    
    await query(sql, [userId]);
  },

  /**
   * Get users with pagination and filters
   */
  async getUsers(filters = {}) {
    let sql = `
      SELECT 
        u.id, u.email, u.full_name, u.role, u.organization_id,
        u.is_active, u.email_verified, u.last_login_at, u.created_at,
        o.name as organization_name
      FROM users u
      LEFT JOIN organizations o ON u.organization_id = o.id
      WHERE 1=1
    `;
    
    const values = [];
    let valueIndex = 1;

    // Apply filters
    if (filters.organization_id) {
      sql += ` AND u.organization_id = $${valueIndex}`;
      values.push(filters.organization_id);
      valueIndex++;
    }

    if (filters.role) {
      sql += ` AND u.role = $${valueIndex}`;
      values.push(filters.role);
      valueIndex++;
    }

    if (filters.is_active !== undefined) {
      sql += ` AND u.is_active = $${valueIndex}`;
      values.push(filters.is_active);
      valueIndex++;
    }

    if (filters.search) {
      sql += ` AND (u.full_name ILIKE $${valueIndex} OR u.email ILIKE $${valueIndex})`;
      values.push(`%${filters.search}%`);
      valueIndex++;
    }

    // Add ordering
    sql += ` ORDER BY u.created_at DESC`;

    // Add pagination
    if (filters.limit) {
      sql += ` LIMIT $${valueIndex}`;
      values.push(filters.limit);
      valueIndex++;
    }

    if (filters.offset) {
      sql += ` OFFSET $${valueIndex}`;
      values.push(filters.offset);
      valueIndex++;
    }

    const result = await query(sql, values);
    return result.rows;
  },

  /**
   * Count users with filters
   */
  async countUsers(filters = {}) {
    let sql = `
      SELECT COUNT(*) as total
      FROM users u
      WHERE 1=1
    `;
    
    const values = [];
    let valueIndex = 1;

    // Apply same filters as getUsers
    if (filters.organization_id) {
      sql += ` AND u.organization_id = $${valueIndex}`;
      values.push(filters.organization_id);
      valueIndex++;
    }

    if (filters.role) {
      sql += ` AND u.role = $${valueIndex}`;
      values.push(filters.role);
      valueIndex++;
    }

    if (filters.is_active !== undefined) {
      sql += ` AND u.is_active = $${valueIndex}`;
      values.push(filters.is_active);
      valueIndex++;
    }

    if (filters.search) {
      sql += ` AND (u.full_name ILIKE $${valueIndex} OR u.email ILIKE $${valueIndex})`;
      values.push(`%${filters.search}%`);
      valueIndex++;
    }

    const result = await query(sql, values);
    return parseInt(result.rows[0].total);
  },

  /**
   * Update user profile
   */
  async updateProfile(userId, updates) {
    const allowedFields = ['full_name', 'role', 'is_active'];
    const updateFields = [];
    const values = [];
    let valueIndex = 1;

    // Build dynamic update query
    Object.keys(updates).forEach(field => {
      if (allowedFields.includes(field)) {
        updateFields.push(`${field} = $${valueIndex}`);
        values.push(updates[field]);
        valueIndex++;
      }
    });

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    updateFields.push(`updated_at = NOW()`);
    values.push(userId);

    const sql = `
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = $${valueIndex}
      RETURNING id, email, full_name, role, is_active, updated_at
    `;

    const result = await query(sql, values);
    return result.rows[0];
  },

  /**
   * Deactivate user (soft delete)
   */
  async deactivateUser(userId) {
    const sql = `
      UPDATE users 
      SET is_active = false, updated_at = NOW()
      WHERE id = $1
      RETURNING id, email, full_name
    `;
    
    const result = await query(sql, [userId]);
    return result.rows[0];
  },

  /**
   * Activate user
   */
  async activateUser(userId) {
    const sql = `
      UPDATE users 
      SET is_active = true, updated_at = NOW()
      WHERE id = $1
      RETURNING id, email, full_name
    `;
    
    const result = await query(sql, [userId]);
    return result.rows[0];
  },

  /**
   * Check if email exists
   */
  async emailExists(email, excludeId = null) {
    let sql = `SELECT id FROM users WHERE email = $1`;
    const values = [email];
    
    if (excludeId) {
      sql += ` AND id != $2`;
      values.push(excludeId);
    }
    
    const result = await query(sql, values);
    return result.rows.length > 0;
  },

  /**
   * Get user statistics
   */
  async getUserStats(organizationId = null) {
    let sql = `
      SELECT 
        role,
        COUNT(*) as count,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_count,
        COUNT(CASE WHEN email_verified = true THEN 1 END) as verified_count
      FROM users
    `;
    
    const values = [];
    if (organizationId) {
      sql += ` WHERE organization_id = $1`;
      values.push(organizationId);
    }
    
    sql += ` GROUP BY role ORDER BY role`;
    
    const result = await query(sql, values);
    return result.rows;
  },

  /**
   * Get recent user activities
   */
  async getRecentActivity(userId, limit = 50) {
    const sql = `
      SELECT 
        action, entity_type, entity_id, details, 
        ip_address, created_at
      FROM activity_logs
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;
    
    const result = await query(sql, [userId, limit]);
    return result.rows;
  }
};

module.exports = userQueries;