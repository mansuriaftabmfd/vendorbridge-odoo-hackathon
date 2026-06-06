/**
 * Socket.IO Configuration
 * Real-time communication for notifications and updates
 */

const { Server } = require('socket.io');
const logger = require('../utils/logger');
const { query } = require('../config/database');
const activityService = require('../services/activity.service');

let io = null;

/**
 * Setup Socket.IO server
 * @param {http.Server} server - HTTP server instance
 */
const setupSocketIO = (server) => {
  io = new Server(server, {
    cors: {
      origin: [
        process.env.FRONTEND_URL,
        'http://localhost:3000',
        'http://127.0.0.1:3000'
      ].filter(Boolean),
      credentials: true,
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Middleware to authenticate socket connections
  io.use(async (socket, next) => {
    try {
      const sessionId = socket.handshake.auth.sessionId;
      const userId = socket.handshake.auth.userId;

      if (!sessionId || !userId) {
        return next(new Error('Authentication required'));
      }

      // Verify user exists and is active
      const userResult = await query(`
        SELECT id, email, full_name, role, organization_id, is_active
        FROM users
        WHERE id = $1 AND is_active = true
      `, [userId]);

      if (userResult.rows.length === 0) {
        return next(new Error('Invalid user'));
      }

      const user = userResult.rows[0];
      socket.userId = user.id;
      socket.userEmail = user.email;
      socket.userRole = user.role;
      socket.organizationId = user.organization_id;

      logger.debug('Socket authenticated', {
        socketId: socket.id,
        userId: user.id,
        email: user.email,
        role: user.role
      });

      next();
    } catch (error) {
      logger.error('Socket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });

  // Handle socket connections
  io.on('connection', (socket) => {
    const { userId, userEmail, userRole, organizationId } = socket;
    
    logger.info('User connected via socket', {
      socketId: socket.id,
      userId,
      email: userEmail,
      role: userRole
    });

    // Join user-specific room for notifications
    socket.join(`user_${userId}`);

    // Join organization room if user belongs to one
    if (organizationId) {
      socket.join(`org_${organizationId}`);
    }

    // Join role-based rooms
    socket.join(`role_${userRole}`);

    // Send connection confirmation
    socket.emit('connected', {
      message: 'Successfully connected to VendorBridge ERP',
      userId,
      timestamp: new Date().toISOString()
    });

    // Handle joining specific rooms
    socket.on('join_room', (data) => {
      const { room, context } = data;
      
      // Validate room access based on user role and organization
      if (isValidRoom(room, userRole, organizationId, context)) {
        socket.join(room);
        socket.emit('room_joined', { room, message: `Joined room: ${room}` });
        
        logger.debug('User joined room', {
          socketId: socket.id,
          userId,
          room
        });
      } else {
        socket.emit('error', { message: 'Access denied to room' });
        
        logger.security('Unauthorized room access attempt', {
          socketId: socket.id,
          userId,
          room,
          userRole
        });
      }
    });

    // Handle leaving rooms
    socket.on('leave_room', (data) => {
      const { room } = data;
      socket.leave(room);
      socket.emit('room_left', { room, message: `Left room: ${room}` });
      
      logger.debug('User left room', {
        socketId: socket.id,
        userId,
        room
      });
    });

    // Handle real-time status updates
    socket.on('status_update', (data) => {
      const { entityType, entityId, status, message } = data;
      
      // Validate user can update this entity
      validateEntityAccess(userId, userRole, organizationId, entityType, entityId)
        .then(canAccess => {
          if (canAccess) {
            // Broadcast status update to relevant rooms
            broadcastStatusUpdate(entityType, entityId, status, message, {
              userId,
              userName: socket.userEmail,
              organizationId
            });
          } else {
            socket.emit('error', { message: 'Access denied for entity update' });
          }
        })
        .catch(error => {
          logger.error('Status update validation error:', error);
          socket.emit('error', { message: 'Failed to update status' });
        });
    });

    // Handle typing indicators for collaborative features
    socket.on('typing_start', (data) => {
      const { entityType, entityId } = data;
      socket.to(`${entityType}_${entityId}`).emit('user_typing', {
        userId,
        userName: userEmail,
        entityType,
        entityId
      });
    });

    socket.on('typing_stop', (data) => {
      const { entityType, entityId } = data;
      socket.to(`${entityType}_${entityId}`).emit('user_stopped_typing', {
        userId,
        entityType,
        entityId
      });
    });

    // Handle presence updates
    socket.on('presence_update', (data) => {
      const { status } = data; // online, away, busy, offline
      
      // Broadcast presence to organization members
      if (organizationId) {
        socket.to(`org_${organizationId}`).emit('user_presence', {
          userId,
          userName: userEmail,
          status,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      logger.info('User disconnected from socket', {
        socketId: socket.id,
        userId,
        email: userEmail,
        reason
      });

      // Log activity
      setImmediate(() => {
        activityService.logActivity(
          userId,
          'socket_disconnected',
          'system',
          null,
          { reason, socketId: socket.id }
        );
      });

      // Notify organization members of disconnection
      if (organizationId) {
        socket.to(`org_${organizationId}`).emit('user_presence', {
          userId,
          userName: userEmail,
          status: 'offline',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Log successful connection
    setImmediate(() => {
      activityService.logActivity(
        userId,
        'socket_connected',
        'system',
        null,
        { socketId: socket.id }
      );
    });
  });

  logger.info('Socket.IO server initialized');
  return io;
};

/**
 * Validate if user can join a specific room
 */
const isValidRoom = (room, userRole, organizationId, context = {}) => {
  // Public rooms
  if (room.startsWith('public_')) {
    return true;
  }

  // User-specific rooms
  if (room.startsWith('user_')) {
    const roomUserId = room.split('_')[1];
    return roomUserId === context.userId || userRole === 'ADMIN';
  }

  // Organization rooms
  if (room.startsWith('org_')) {
    const roomOrgId = room.split('_')[1];
    return roomOrgId === organizationId || userRole === 'ADMIN';
  }

  // Role-based rooms
  if (room.startsWith('role_')) {
    return true; // Users can join their own role rooms
  }

  // Entity-specific rooms (RFQ, Quotation, etc.)
  if (room.includes('_')) {
    const [entityType] = room.split('_');
    
    // Allow access based on role and entity type
    const entityAccess = {
      rfq: ['PROCUREMENT_OFFICER', 'MANAGER', 'ADMIN'],
      quotation: ['PROCUREMENT_OFFICER', 'VENDOR', 'MANAGER', 'ADMIN'],
      approval: ['MANAGER', 'ADMIN'],
      po: ['PROCUREMENT_OFFICER', 'MANAGER', 'ADMIN'],
      invoice: ['PROCUREMENT_OFFICER', 'MANAGER', 'ADMIN']
    };

    return entityAccess[entityType]?.includes(userRole) || false;
  }

  return false;
};

/**
 * Validate entity access for updates
 */
const validateEntityAccess = async (userId, userRole, organizationId, entityType, entityId) => {
  try {
    // Admin can access everything
    if (userRole === 'ADMIN') {
      return true;
    }

    // Define entity-specific validation queries
    const accessQueries = {
      rfq: `
        SELECT 1 FROM rfqs r 
        JOIN users u ON r.created_by = u.id 
        WHERE r.id = $1 AND u.organization_id = $2
      `,
      quotation: `
        SELECT 1 FROM quotations q
        JOIN rfqs r ON q.rfq_id = r.id
        JOIN users u ON r.created_by = u.id
        WHERE q.id = $1 AND u.organization_id = $2
      `,
      po: `
        SELECT 1 FROM purchase_orders po
        JOIN vendors v ON po.vendor_id = v.id
        WHERE po.id = $1 AND v.organization_id = $2
      `
    };

    const accessQuery = accessQueries[entityType];
    if (!accessQuery) {
      return false;
    }

    const result = await query(accessQuery, [entityId, organizationId]);
    return result.rows.length > 0;
  } catch (error) {
    logger.error('Entity access validation error:', error);
    return false;
  }
};

/**
 * Broadcast status update to relevant rooms
 */
const broadcastStatusUpdate = (entityType, entityId, status, message, userInfo) => {
  if (!io) return;

  const update = {
    entityType,
    entityId,
    status,
    message,
    updatedBy: {
      userId: userInfo.userId,
      userName: userInfo.userName
    },
    timestamp: new Date().toISOString()
  };

  // Broadcast to entity-specific room
  io.to(`${entityType}_${entityId}`).emit('status_update', update);

  // Broadcast to organization room
  if (userInfo.organizationId) {
    io.to(`org_${userInfo.organizationId}`).emit('entity_update', {
      ...update,
      entityType,
      entityId
    });
  }

  logger.debug('Status update broadcasted', {
    entityType,
    entityId,
    status,
    updatedBy: userInfo.userId
  });
};

/**
 * Send notification to specific user
 */
const sendNotificationToUser = (userId, notification) => {
  if (!io) return;

  io.to(`user_${userId}`).emit('notification', {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    entity_type: notification.entity_type,
    entity_id: notification.entity_id,
    is_read: notification.is_read,
    created_at: notification.created_at
  });

  logger.debug('Notification sent to user', {
    userId,
    notificationId: notification.id,
    type: notification.type
  });
};

/**
 * Broadcast to organization
 */
const broadcastToOrganization = (organizationId, event, data) => {
  if (!io) return;

  io.to(`org_${organizationId}`).emit(event, {
    ...data,
    timestamp: new Date().toISOString()
  });

  logger.debug('Message broadcasted to organization', {
    organizationId,
    event,
    data: typeof data === 'object' ? Object.keys(data) : data
  });
};

/**
 * Broadcast to role
 */
const broadcastToRole = (role, event, data) => {
  if (!io) return;

  io.to(`role_${role}`).emit(event, {
    ...data,
    timestamp: new Date().toISOString()
  });

  logger.debug('Message broadcasted to role', {
    role,
    event,
    data: typeof data === 'object' ? Object.keys(data) : data
  });
};

/**
 * Get Socket.IO instance
 */
const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

/**
 * Get connected users count
 */
const getConnectedUsersCount = () => {
  if (!io) return 0;
  return io.engine.clientsCount;
};

/**
 * Get organization users online
 */
const getOrganizationOnlineUsers = (organizationId) => {
  if (!io) return [];
  
  const room = io.sockets.adapter.rooms.get(`org_${organizationId}`);
  return room ? Array.from(room) : [];
};

module.exports = {
  setupSocketIO,
  getIO,
  sendNotificationToUser,
  broadcastToOrganization,
  broadcastToRole,
  broadcastStatusUpdate,
  getConnectedUsersCount,
  getOrganizationOnlineUsers
};