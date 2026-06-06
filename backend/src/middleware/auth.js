/**
 * Authentication Middleware
 * Session-based authentication with user context
 */

const { query } = require('../config/database');
const { memoryCache } = require('../config/cache');
const logger = require('../utils/logger');
const { createUnauthorizedError, createForbiddenError } = require('./error-handler');

/**
 * Check if user is authenticated
 * Attaches user object to req.user if valid session exists
 */
const requireAuth = async (req, res, next) => {
  try {
    // Check if session exists and has user
    if (!req.session || !req.session.user || !req.session.user.id) {
      logger.security('Authentication required', {
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      return next(createUnauthorizedError('Authentication required'));
    }

    const userId = req.session.user.id;

    // Get user details from database
    const result = await query(`
      SELECT 
        u.id, u.email, u.full_name, u.role, u.organization_id, u.is_active,
        u.email_verified, u.last_login_at, u.created_at,
        o.name as organization_name, o.is_active as organization_active
      FROM users u
      LEFT JOIN organizations o ON u.organization_id = o.id
      WHERE u.id = $1 AND u.is_active = true
    `, [userId]);

    if (result.rows.length === 0) {
      // User not found or inactive - destroy session
      req.session.destroy(() => {});
      logger.security('User not found or inactive', {
        userId,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      return next(createUnauthorizedError('Invalid session - please login again'));
    }

    const user = result.rows[0];

    // Check if organization is active (if user belongs to one)
    if (user.organization_id && !user.organization_active) {
      logger.security('Organization inactive', {
        userId: user.id,
        organizationId: user.organization_id,
        ip: req.ip
      });
      return next(createForbiddenError('Your organization account is inactive'));
    }

    // Update session with fresh user data
    req.session.user = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      organization_id: user.organization_id,
      organization_name: user.organization_name
    };

    // Attach user to request
    req.user = user;

    // Log successful authentication
    logger.debug('User authenticated', {
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organization_id,
      url: req.originalUrl
    });

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    next(createUnauthorizedError('Authentication failed'));
  }
};

/**
 * Check if user is authenticated (optional)
 * Attaches user object to req.user if valid session exists, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    if (!req.session || !req.session.user || !req.session.user.id) {
      return next();
    }

    const userId = req.session.user.id;

    // Get user details from database
    const result = await query(`
      SELECT 
        u.id, u.email, u.full_name, u.role, u.organization_id, u.is_active,
        u.email_verified, u.last_login_at, u.created_at,
        o.name as organization_name, o.is_active as organization_active
      FROM users u
      LEFT JOIN organizations o ON u.organization_id = o.id
      WHERE u.id = $1 AND u.is_active = true
    `, [userId]);

    if (result.rows.length > 0) {
      const user = result.rows[0];
      
      // Check if organization is active (if user belongs to one)
      if (!user.organization_id || user.organization_active) {
        req.user = user;
        
        // Update session with fresh user data
        req.session.user = {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          organization_id: user.organization_id,
          organization_name: user.organization_name
        };
      }
    }

    next();
  } catch (error) {
    logger.error('Optional authentication error:', error);
    next(); // Don't fail on optional auth error
  }
};

/**
 * Require specific roles
 * @param {string|string[]} roles - Required role(s)
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(createUnauthorizedError('Authentication required'));
    }

    const userRole = req.user.role;
    const requiredRoles = Array.isArray(roles) ? roles : [roles];

    if (!requiredRoles.includes(userRole)) {
      logger.security('Insufficient permissions', {
        userId: req.user.id,
        userRole,
        requiredRoles,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip
      });
      return next(createForbiddenError(`Access denied. Required role: ${requiredRoles.join(' or ')}`));
    }

    next();
  };
};

/**
 * Check if user is admin
 */
const requireAdmin = requireRole('ADMIN');

/**
 * Check if user is manager or admin
 */
const requireManager = requireRole(['MANAGER', 'ADMIN']);

/**
 * Check if user is procurement officer, manager, or admin
 */
const requireProcurement = requireRole(['PROCUREMENT_OFFICER', 'MANAGER', 'ADMIN']);

/**
 * Check if user owns the resource or is admin
 * @param {string} paramName - Parameter name containing the user ID
 */
const requireOwnerOrAdmin = (paramName = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return next(createUnauthorizedError('Authentication required'));
    }

    const resourceUserId = req.params[paramName];
    const currentUserId = req.user.id;
    const userRole = req.user.role;

    // Admin can access any resource
    if (userRole === 'ADMIN') {
      return next();
    }

    // User can access their own resources
    if (resourceUserId === currentUserId) {
      return next();
    }

    logger.security('Unauthorized resource access attempt', {
      userId: currentUserId,
      resourceUserId,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip
    });

    next(createForbiddenError('Access denied. You can only access your own resources'));
  };
};

/**
 * Check if user is verified
 */
const requireVerified = (req, res, next) => {
  if (!req.user) {
    return next(createUnauthorizedError('Authentication required'));
  }

  if (!req.user.email_verified) {
    return next(createForbiddenError('Email verification required'));
  }

  next();
};

/**
 * Rate limiting based on user ID
 * @param {number} maxRequests - Maximum requests per window
 * @param {number} windowMs - Time window in milliseconds
 */
const rateLimitUser = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  return async (req, res, next) => {
    if (!req.user) {
      return next();
    }

    const userId = req.user.id;
    const key = `rate_limit:user:${userId}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    try {
      // Get current request count
      const requests = await memoryCache.get(key) || [];
      
      // Filter requests within the current window
      const validRequests = requests.filter(timestamp => timestamp > windowStart);
      
      if (validRequests.length >= maxRequests) {
        logger.security('User rate limit exceeded', {
          userId,
          requestCount: validRequests.length,
          maxRequests,
          ip: req.ip
        });
        
        return res.status(429).json({
          success: false,
          error: 'Too many requests. Please try again later.',
          code: 'USER_RATE_LIMIT',
          retryAfter: Math.ceil(windowMs / 1000)
        });
      }

      // Add current request
      validRequests.push(now);
      
      // Update cache
      await memoryCache.set(key, validRequests, Math.ceil(windowMs / 1000));
      
      next();
    } catch (error) {
      logger.error('Rate limiting error:', error);
      next(); // Don't fail the request on rate limit error
    }
  };
};

/**
 * Track user activity
 */
const trackActivity = (req, res, next) => {
  if (req.user) {
    // Track activity asynchronously
    setImmediate(() => {
      logger.audit('user_activity', req.user.id, 'http_request', null, {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
    });
  }
  next();
};

/**
 * Refresh session expiry
 */
const refreshSession = (req, res, next) => {
  if (req.session && req.user) {
    req.session.touch(); // Refresh session expiry
    
    // Update last activity timestamp
    setImmediate(async () => {
      try {
        await query(
          'UPDATE users SET last_login_at = NOW() WHERE id = $1',
          [req.user.id]
        );
      } catch (error) {
        logger.error('Failed to update last activity:', error);
      }
    });
  }
  next();
};

module.exports = {
  requireAuth,
  optionalAuth,
  requireRole,
  requireAdmin,
  requireManager,
  requireProcurement,
  requireOwnerOrAdmin,
  requireVerified,
  rateLimitUser,
  trackActivity,
  refreshSession
};