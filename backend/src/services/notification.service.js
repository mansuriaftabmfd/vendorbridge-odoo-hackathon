/**
 * Notification Service
 * Service for managing user notifications
 */

const { query } = require('../config/database');
const logger = require('../utils/logger');
const { memoryCache } = require('../config/cache');

class NotificationService {
  /**
   * Create a new notification
   * @param {string} userId - User ID to notify
   * @param {string} type - Notification type
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @param {string} entityType - Related entity type (optional)
   * @param {string} entityId - Related entity ID (optional)
   */
  async createNotification(userId, type, title, message, entityType = null, entityId = null) {
    try {
      const sql = `
        INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, created_at
      `;

      const values = [userId, type, title, message, entityType, entityId];
      const result = await query(sql, values);

      const notification = {
        id: result.rows[0].id,
        user_id: userId,
        type,
        title,
        message,
        entity_type: entityType,
        entity_id: entityId,
        is_read: false,
        created_at: result.rows[0].created_at
      };

      // Update unread count in cache
      await this.updateUnreadCountCache(userId);

      // Emit real-time notification via Socket.IO
      this.emitRealTimeNotification(userId, notification);

      logger.info('Notification created', {
        notificationId: result.rows[0].id,
        userId,
        type,
        title
      });

      return notification;
    } catch (error) {
      logger.error('Failed to create notification:', error);
      throw error;
    }
  }

  /**
   * Create bulk notifications
   * @param {Array} notifications - Array of notification objects
   */
  async createBulkNotifications(notifications) {
    try {
      if (!notifications || notifications.length === 0) {
        return [];
      }

      const values = [];
      const placeholders = [];
      
      notifications.forEach((notif, index) => {
        const baseIndex = index * 6;
        placeholders.push(
          `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6})`
        );
        values.push(
          notif.userId,
          notif.type,
          notif.title,
          notif.message,
          notif.entityType || null,
          notif.entityId || null
        );
      });

      const sql = `
        INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id)
        VALUES ${placeholders.join(', ')}
        RETURNING id, user_id, type, title, message, entity_type, entity_id, is_read, created_at
      `;

      const result = await query(sql, values);
      
      // Update unread counts for all affected users
      const userIds = [...new Set(notifications.map(n => n.userId))];
      for (const userId of userIds) {
        await this.updateUnreadCountCache(userId);
      }

      // Emit real-time notifications
      result.rows.forEach(notification => {
        this.emitRealTimeNotification(notification.user_id, notification);
      });

      logger.info('Bulk notifications created', {
        count: result.rows.length,
        userIds
      });

      return result.rows;
    } catch (error) {
      logger.error('Failed to create bulk notifications:', error);
      throw error;
    }
  }

  /**
   * Get user notifications with pagination
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   */
  async getUserNotifications(userId, options = {}) {
    try {
      const {
        limit = 20,
        offset = 0,
        type = null,
        unreadOnly = false,
        startDate = null,
        endDate = null
      } = options;

      let sql = `
        SELECT 
          id, type, title, message, entity_type, entity_id,
          is_read, created_at
        FROM notifications
        WHERE user_id = $1
      `;

      const values = [userId];
      let valueIndex = 2;

      // Add filters
      if (type) {
        sql += ` AND type = $${valueIndex}`;
        values.push(type);
        valueIndex++;
      }

      if (unreadOnly) {
        sql += ` AND is_read = false`;
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
      logger.error('Failed to get user notifications:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID (for security)
   */
  async markAsRead(notificationId, userId) {
    try {
      const sql = `
        UPDATE notifications
        SET is_read = true
        WHERE id = $1 AND user_id = $2
        RETURNING id, is_read
      `;

      const result = await query(sql, [notificationId, userId]);
      
      if (result.rows.length === 0) {
        throw new Error('Notification not found or access denied');
      }

      // Update unread count cache
      await this.updateUnreadCountCache(userId);

      logger.debug('Notification marked as read', {
        notificationId,
        userId
      });

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to mark notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   * @param {string} userId - User ID
   */
  async markAllAsRead(userId) {
    try {
      const sql = `
        UPDATE notifications
        SET is_read = true
        WHERE user_id = $1 AND is_read = false
        RETURNING COUNT(*) as updated_count
      `;

      const result = await query(sql, [userId]);
      const updatedCount = result.rowCount;

      // Update unread count cache
      await this.updateUnreadCountCache(userId);

      logger.info('All notifications marked as read', {
        userId,
        updatedCount
      });

      return updatedCount;
    } catch (error) {
      logger.error('Failed to mark all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Get unread notification count
   * @param {string} userId - User ID
   */
  async getUnreadCount(userId) {
    try {
      // Try cache first
      const cacheKey = `notifications:unread:${userId}`;
      const cachedCount = await memoryCache.get(cacheKey);
      
      if (cachedCount !== null) {
        return parseInt(cachedCount);
      }

      // Fallback to database
      const sql = `
        SELECT COUNT(*) as count
        FROM notifications
        WHERE user_id = $1 AND is_read = false
      `;

      const result = await query(sql, [userId]);
      const count = parseInt(result.rows[0].count);

      // Update cache
      await memoryCache.set(cacheKey, count, 300); // Cache for 5 minutes

      return count;
    } catch (error) {
      logger.error('Failed to get unread count:', error);
      throw error;
    }
  }

  /**
   * Update unread count cache
   * @param {string} userId - User ID
   */
  async updateUnreadCountCache(userId) {
    try {
      const sql = `
        SELECT COUNT(*) as count
        FROM notifications
        WHERE user_id = $1 AND is_read = false
      `;

      const result = await query(sql, [userId]);
      const count = parseInt(result.rows[0].count);

      const cacheKey = `notifications:unread:${userId}`;
      await memoryCache.set(cacheKey, count, 300); // Cache for 5 minutes

      return count;
    } catch (error) {
      logger.error('Failed to update unread count cache:', error);
      // Don't throw - this is a non-critical operation
      return 0;
    }
  }

  /**
   * Delete notification
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID (for security)
   */
  async deleteNotification(notificationId, userId) {
    try {
      const sql = `
        DELETE FROM notifications
        WHERE id = $1 AND user_id = $2
        RETURNING id
      `;

      const result = await query(sql, [notificationId, userId]);
      
      if (result.rows.length === 0) {
        throw new Error('Notification not found or access denied');
      }

      // Update unread count cache
      await this.updateUnreadCountCache(userId);

      logger.debug('Notification deleted', {
        notificationId,
        userId
      });

      return true;
    } catch (error) {
      logger.error('Failed to delete notification:', error);
      throw error;
    }
  }

  /**
   * Clean up old notifications
   * @param {number} daysToKeep - Number of days to keep notifications
   */
  async cleanupOldNotifications(daysToKeep = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const sql = `
        DELETE FROM notifications 
        WHERE created_at < $1 AND is_read = true
        RETURNING COUNT(*) as deleted_count
      `;

      const result = await query(sql, [cutoffDate]);
      const deletedCount = result.rowCount;

      logger.info(`Cleaned up ${deletedCount} old read notifications older than ${daysToKeep} days`);
      
      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup old notifications:', error);
      throw error;
    }
  }

  /**
   * Get notification statistics
   * @param {string} userId - User ID (optional)
   */
  async getNotificationStats(userId = null) {
    try {
      let sql = `
        SELECT 
          type,
          COUNT(*) as total_count,
          COUNT(CASE WHEN is_read = false THEN 1 END) as unread_count,
          MAX(created_at) as latest_created
        FROM notifications
      `;

      const values = [];
      if (userId) {
        sql += ` WHERE user_id = $1`;
        values.push(userId);
      }

      sql += ` GROUP BY type ORDER BY total_count DESC`;

      const result = await query(sql, values);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get notification statistics:', error);
      throw error;
    }
  }

  /**
   * Emit real-time notification via Socket.IO
   * @param {string} userId - User ID
   * @param {Object} notification - Notification object
   */
  emitRealTimeNotification(userId, notification) {
    try {
      // This will be implemented when Socket.IO is set up
      // For now, just log it
      logger.debug('Real-time notification emitted', {
        userId,
        notificationId: notification.id,
        type: notification.type
      });

      // TODO: Implement Socket.IO emission
      // const io = require('../sockets').getIO();
      // io.to(`user_${userId}`).emit('notification', notification);
    } catch (error) {
      logger.error('Failed to emit real-time notification:', error);
      // Don't throw - this is a non-critical operation
    }
  }

  /**
   * Create predefined notification types
   */
  async createRFQNotification(userId, rfqId, rfqTitle, action = 'created') {
    const titles = {
      created: 'New RFQ Created',
      sent: 'RFQ Sent to Vendors',
      closed: 'RFQ Closed',
      cancelled: 'RFQ Cancelled'
    };

    const messages = {
      created: `RFQ "${rfqTitle}" has been created successfully.`,
      sent: `RFQ "${rfqTitle}" has been sent to vendors for quotations.`,
      closed: `RFQ "${rfqTitle}" has been closed.`,
      cancelled: `RFQ "${rfqTitle}" has been cancelled.`
    };

    return await this.createNotification(
      userId,
      'rfq_update',
      titles[action] || 'RFQ Update',
      messages[action] || `RFQ "${rfqTitle}" has been updated.`,
      'rfq',
      rfqId
    );
  }

  async createQuotationNotification(userId, quotationId, quotationNumber, vendorName, action = 'submitted') {
    const titles = {
      submitted: 'New Quotation Submitted',
      selected: 'Quotation Selected',
      rejected: 'Quotation Rejected'
    };

    const messages = {
      submitted: `Quotation ${quotationNumber} has been submitted by ${vendorName}.`,
      selected: `Quotation ${quotationNumber} from ${vendorName} has been selected.`,
      rejected: `Quotation ${quotationNumber} from ${vendorName} has been rejected.`
    };

    return await this.createNotification(
      userId,
      'quotation_update',
      titles[action] || 'Quotation Update',
      messages[action] || `Quotation ${quotationNumber} has been updated.`,
      'quotation',
      quotationId
    );
  }

  async createApprovalNotification(userId, approvalId, quotationNumber, action = 'required') {
    const titles = {
      required: 'Approval Required',
      approved: 'Approval Granted',
      rejected: 'Approval Rejected'
    };

    const messages = {
      required: `Quotation ${quotationNumber} requires your approval.`,
      approved: `Quotation ${quotationNumber} has been approved.`,
      rejected: `Quotation ${quotationNumber} has been rejected.`
    };

    return await this.createNotification(
      userId,
      'approval_update',
      titles[action] || 'Approval Update',
      messages[action] || `Approval status for ${quotationNumber} has been updated.`,
      'approval',
      approvalId
    );
  }

  async createPONotification(userId, poId, poNumber, action = 'generated') {
    const titles = {
      generated: 'Purchase Order Generated',
      sent: 'Purchase Order Sent',
      received: 'Purchase Order Received'
    };

    const messages = {
      generated: `Purchase Order ${poNumber} has been generated.`,
      sent: `Purchase Order ${poNumber} has been sent to vendor.`,
      received: `Items for Purchase Order ${poNumber} have been received.`
    };

    return await this.createNotification(
      userId,
      'po_update',
      titles[action] || 'Purchase Order Update',
      messages[action] || `Purchase Order ${poNumber} has been updated.`,
      'purchase_order',
      poId
    );
  }

  async createInvoiceNotification(userId, invoiceId, invoiceNumber, action = 'generated') {
    const titles = {
      generated: 'Invoice Generated',
      sent: 'Invoice Sent',
      paid: 'Invoice Paid',
      overdue: 'Invoice Overdue'
    };

    const messages = {
      generated: `Invoice ${invoiceNumber} has been generated.`,
      sent: `Invoice ${invoiceNumber} has been sent.`,
      paid: `Invoice ${invoiceNumber} has been marked as paid.`,
      overdue: `Invoice ${invoiceNumber} is now overdue.`
    };

    return await this.createNotification(
      userId,
      'invoice_update',
      titles[action] || 'Invoice Update',
      messages[action] || `Invoice ${invoiceNumber} has been updated.`,
      'invoice',
      invoiceId
    );
  }
}

module.exports = new NotificationService();