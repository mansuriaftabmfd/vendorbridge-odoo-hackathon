/**
 * Activity Logging Service
 * Service for logging user activities and audit trails
 */

const { query } = require('../config/database');
const logger = require('../utils/logger');

class ActivityService {
  /**
   * Log user activity
   * @param {string} userId - User ID performing the action
   * @param {string} action - Action performed
   * @param {string} entityType - Type of entity affected
   * @param {string} entityId - ID of entity affected
   * @param {Object} details - Additional details
   * @param {string} ipAddress - IP address
   * @param {string} userAgent - User agent string
   */
  async logActivity(userId, action, entityType, entityId, details = {}, ipAddress = null, userAgent = null) {
    try {
      const sql = `
        INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, created_at
      `;

      const values = [
        userId,
        action,
        entityType,
        entityId,
        JSON.stringify(details),
        ipAddress,
        userAgent
      ];

      const result = await query(sql, values);
      
      logger.audit(action, userId, entityType, entityId, details);
      
      return result.rows[0];
    } catch (error) {
      // Don't throw error for activity logging failures - just log it
      logger.error('Failed to log activity:', {
        error: error.message,
        userId,
        action,
        entityType,
        entityId,
        details
      });
      return null;
    }
  }

  /**
   * Get user activities with pagination
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   */
  async getUserActivities(userId, options = {}) {
    try {
      const {
        limit = 50,
        offset = 0,
        action = null,
        entityType = null,
        startDate = null,
        endDate = null
      } = options;

      let sql = `
        SELECT 
          id, action, entity_type, entity_id, details, 
          ip_address, user_agent, created_at
        FROM activity_logs
        WHERE user_id = $1
      `;

      const values = [userId];
      let valueIndex = 2;

      // Add filters
      if (action) {
        sql += ` AND action = $${valueIndex}`;
        values.push(action);
        valueIndex++;
      }

      if (entityType) {
        sql += ` AND entity_type = $${valueIndex}`;
        values.push(entityType);
        valueIndex++;
      }

      if (startDate) {
        sql += ` AND created_at >= $${valueIndex}`;
        values.push(startDate);
        valueIndex++;
      }

      if (endDate) {
        sql += ` AND created_at <= $${valueIndex}`;
        values.push(endDate);
        valueIndex++;
      }

      sql += ` ORDER BY created_at DESC LIMIT $${valueIndex} OFFSET $${valueIndex + 1}`;
      values.push(limit, offset);

      const result = await query(sql, values);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get user activities:', error);
      throw error;
    }
  }

  /**
   * Get organization activities
   * @param {string} organizationId - Organization ID
   * @param {Object} options - Query options
   */
  async getOrganizationActivities(organizationId, options = {}) {
    try {
      const {
        limit = 100,
        offset = 0,
        action = null,
        entityType = null,
        startDate = null,
        endDate = null
      } = options;

      let sql = `
        SELECT 
          al.id, al.action, al.entity_type, al.entity_id, al.details,
          al.ip_address, al.user_agent, al.created_at,
          u.full_name as user_name, u.email as user_email
        FROM activity_logs al
        JOIN users u ON al.user_id = u.id
        WHERE u.organization_id = $1
      `;

      const values = [organizationId];
      let valueIndex = 2;

      // Add filters
      if (action) {
        sql += ` AND al.action = $${valueIndex}`;
        values.push(action);
        valueIndex++;
      }

      if (entityType) {
        sql += ` AND al.entity_type = $${valueIndex}`;
        values.push(entityType);
        valueIndex++;
      }

      if (startDate) {
        sql += ` AND al.created_at >= $${valueIndex}`;
        values.push(startDate);
        valueIndex++;
      }

      if (endDate) {
        sql += ` AND al.created_at <= $${valueIndex}`;
        values.push(endDate);
        valueIndex++;
      }

      sql += ` ORDER BY al.created_at DESC LIMIT $${valueIndex} OFFSET $${valueIndex + 1}`;
      values.push(limit, offset);

      const result = await query(sql, values);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get organization activities:', error);
      throw error;
    }
  }

  /**
   * Get entity activities (activities for a specific entity)
   * @param {string} entityType - Entity type
   * @param {string} entityId - Entity ID
   * @param {Object} options - Query options
   */
  async getEntityActivities(entityType, entityId, options = {}) {
    try {
      const {
        limit = 50,
        offset = 0,
        startDate = null,
        endDate = null
      } = options;

      let sql = `
        SELECT 
          al.id, al.action, al.entity_type, al.entity_id, al.details,
          al.ip_address, al.user_agent, al.created_at,
          u.full_name as user_name, u.email as user_email
        FROM activity_logs al
        JOIN users u ON al.user_id = u.id
        WHERE al.entity_type = $1 AND al.entity_id = $2
      `;

      const values = [entityType, entityId];
      let valueIndex = 3;

      // Add date filters
      if (startDate) {
        sql += ` AND al.created_at >= $${valueIndex}`;
        values.push(startDate);
        valueIndex++;
      }

      if (endDate) {
        sql += ` AND al.created_at <= $${valueIndex}`;
        values.push(endDate);
        valueIndex++;
      }

      sql += ` ORDER BY al.created_at DESC LIMIT $${valueIndex} OFFSET $${valueIndex + 1}`;
      values.push(limit, offset);

      const result = await query(sql, values);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get entity activities:', error);
      throw error;
    }
  }

  /**
   * Get activity statistics
   * @param {Object} filters - Filter options
   */
  async getActivityStats(filters = {}) {
    try {
      const {
        organizationId = null,
        userId = null,
        startDate = null,
        endDate = null,
        groupBy = 'day' // day, week, month
      } = filters;

      let dateFormat;
      switch (groupBy) {
        case 'hour':
          dateFormat = 'YYYY-MM-DD HH24:00';
          break;
        case 'week':
          dateFormat = 'IYYY-IW';
          break;
        case 'month':
          dateFormat = 'YYYY-MM';
          break;
        default:
          dateFormat = 'YYYY-MM-DD';
      }

      let sql = `
        SELECT 
          TO_CHAR(al.created_at, '${dateFormat}') as period,
          COUNT(*) as total_activities,
          COUNT(DISTINCT al.user_id) as unique_users,
          COUNT(DISTINCT al.action) as unique_actions,
          array_agg(DISTINCT al.action) as actions
        FROM activity_logs al
      `;

      const values = [];
      let valueIndex = 1;
      const conditions = [];

      // Add filters
      if (organizationId) {
        sql += ` JOIN users u ON al.user_id = u.id`;
        conditions.push(`u.organization_id = $${valueIndex}`);
        values.push(organizationId);
        valueIndex++;
      }

      if (userId) {
        conditions.push(`al.user_id = $${valueIndex}`);
        values.push(userId);
        valueIndex++;
      }

      if (startDate) {
        conditions.push(`al.created_at >= $${valueIndex}`);
        values.push(startDate);
        valueIndex++;
      }

      if (endDate) {
        conditions.push(`al.created_at <= $${valueIndex}`);
        values.push(endDate);
        valueIndex++;
      }

      if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(' AND ')}`;
      }

      sql += ` GROUP BY period ORDER BY period DESC`;

      const result = await query(sql, values);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get activity statistics:', error);
      throw error;
    }
  }

  /**
   * Get top actions
   * @param {Object} filters - Filter options
   */
  async getTopActions(filters = {}) {
    try {
      const {
        organizationId = null,
        userId = null,
        startDate = null,
        endDate = null,
        limit = 10
      } = filters;

      let sql = `
        SELECT 
          action,
          COUNT(*) as count,
          COUNT(DISTINCT user_id) as unique_users
        FROM activity_logs al
      `;

      const values = [];
      let valueIndex = 1;
      const conditions = [];

      // Add filters
      if (organizationId) {
        sql += ` JOIN users u ON al.user_id = u.id`;
        conditions.push(`u.organization_id = $${valueIndex}`);
        values.push(organizationId);
        valueIndex++;
      }

      if (userId) {
        conditions.push(`al.user_id = $${valueIndex}`);
        values.push(userId);
        valueIndex++;
      }

      if (startDate) {
        conditions.push(`al.created_at >= $${valueIndex}`);
        values.push(startDate);
        valueIndex++;
      }

      if (endDate) {
        conditions.push(`al.created_at <= $${valueIndex}`);
        values.push(endDate);
        valueIndex++;
      }

      if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(' AND ')}`;
      }

      sql += ` GROUP BY action ORDER BY count DESC LIMIT $${valueIndex}`;
      values.push(limit);

      const result = await query(sql, values);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get top actions:', error);
      throw error;
    }
  }

  /**
   * Get most active users
   * @param {string} organizationId - Organization ID
   * @param {Object} options - Query options
   */
  async getMostActiveUsers(organizationId, options = {}) {
    try {
      const {
        startDate = null,
        endDate = null,
        limit = 10
      } = options;

      let sql = `
        SELECT 
          u.id, u.full_name, u.email, u.role,
          COUNT(al.id) as activity_count,
          MAX(al.created_at) as last_activity,
          array_agg(DISTINCT al.action ORDER BY al.action) as actions
        FROM users u
        JOIN activity_logs al ON u.id = al.user_id
        WHERE u.organization_id = $1
      `;

      const values = [organizationId];
      let valueIndex = 2;

      if (startDate) {
        sql += ` AND al.created_at >= $${valueIndex}`;
        values.push(startDate);
        valueIndex++;
      }

      if (endDate) {
        sql += ` AND al.created_at <= $${valueIndex}`;
        values.push(endDate);
        valueIndex++;
      }

      sql += ` GROUP BY u.id, u.full_name, u.email, u.role`;
      sql += ` ORDER BY activity_count DESC LIMIT $${valueIndex}`;
      values.push(limit);

      const result = await query(sql, values);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get most active users:', error);
      throw error;
    }
  }

  /**
   * Clean up old activity logs
   * @param {number} daysToKeep - Number of days to keep logs
   */
  async cleanupOldLogs(daysToKeep = 365) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const sql = `
        DELETE FROM activity_logs 
        WHERE created_at < $1
        RETURNING COUNT(*) as deleted_count
      `;

      const result = await query(sql, [cutoffDate]);
      const deletedCount = result.rowCount;

      logger.info(`Cleaned up ${deletedCount} old activity log entries older than ${daysToKeep} days`);
      
      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup old activity logs:', error);
      throw error;
    }
  }

  /**
   * Search activities
   * @param {Object} searchParams - Search parameters
   */
  async searchActivities(searchParams = {}) {
    try {
      const {
        query: searchQuery = '',
        organizationId = null,
        userId = null,
        actions = [],
        entityTypes = [],
        startDate = null,
        endDate = null,
        limit = 50,
        offset = 0
      } = searchParams;

      let sql = `
        SELECT 
          al.id, al.action, al.entity_type, al.entity_id, al.details,
          al.ip_address, al.user_agent, al.created_at,
          u.full_name as user_name, u.email as user_email, u.role as user_role
        FROM activity_logs al
        JOIN users u ON al.user_id = u.id
        WHERE 1=1
      `;

      const values = [];
      let valueIndex = 1;

      // Organization filter
      if (organizationId) {
        sql += ` AND u.organization_id = $${valueIndex}`;
        values.push(organizationId);
        valueIndex++;
      }

      // User filter
      if (userId) {
        sql += ` AND al.user_id = $${valueIndex}`;
        values.push(userId);
        valueIndex++;
      }

      // Text search in action, entity_type, or details
      if (searchQuery) {
        sql += ` AND (
          al.action ILIKE $${valueIndex} OR 
          al.entity_type ILIKE $${valueIndex} OR 
          al.details::text ILIKE $${valueIndex} OR
          u.full_name ILIKE $${valueIndex}
        )`;
        values.push(`%${searchQuery}%`);
        valueIndex++;
      }

      // Actions filter
      if (actions && actions.length > 0) {
        sql += ` AND al.action = ANY($${valueIndex})`;
        values.push(actions);
        valueIndex++;
      }

      // Entity types filter
      if (entityTypes && entityTypes.length > 0) {
        sql += ` AND al.entity_type = ANY($${valueIndex})`;
        values.push(entityTypes);
        valueIndex++;
      }

      // Date range filters
      if (startDate) {
        sql += ` AND al.created_at >= $${valueIndex}`;
        values.push(startDate);
        valueIndex++;
      }

      if (endDate) {
        sql += ` AND al.created_at <= $${valueIndex}`;
        values.push(endDate);
        valueIndex++;
      }

      sql += ` ORDER BY al.created_at DESC LIMIT $${valueIndex} OFFSET $${valueIndex + 1}`;
      values.push(limit, offset);

      const result = await query(sql, values);
      return result.rows;
    } catch (error) {
      logger.error('Failed to search activities:', error);
      throw error;
    }
  }
}

module.exports = new ActivityService();