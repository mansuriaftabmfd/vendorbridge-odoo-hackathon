/**
 * Organization Isolation Middleware
 * Ensures users can only access data from their own organization
 */

const logger = require('../utils/logger');
const { createForbiddenError, createUnauthorizedError } = require('./error-handler');

/**
 * Enforce organization isolation for all database operations
 * Adds organization_id to request context and validates access
 */
const enforceOrgIsolation = (req, res, next) => {
  // Skip for public endpoints or non-authenticated requests
  if (!req.user) {
    return next(createUnauthorizedError('Authentication required'));
  }

  const userOrgId = req.user.organization_id;
  const userRole = req.user.role;

  // System admin can access cross-organization data in some cases
  if (userRole === 'ADMIN' && !userOrgId) {
    // System admin without organization (super admin)
    logger.debug('System admin access granted', {
      userId: req.user.id,
      url: req.originalUrl
    });
    return next();
  }

  // Regular users must belong to an organization
  if (!userOrgId) {
    logger.security('User without organization attempted access', {
      userId: req.user.id,
      email: req.user.email,
      role: userRole,
      url: req.originalUrl,
      ip: req.ip
    });
    return next(createForbiddenError('User must belong to an organization'));
  }

  // Attach organization context to request
  req.organizationId = userOrgId;
  req.organizationName = req.user.organization_name;

  // Log organization access
  logger.debug('Organization context established', {
    userId: req.user.id,
    organizationId: userOrgId,
    organizationName: req.user.organization_name,
    url: req.originalUrl
  });

  next();
};

/**
 * Validate organization access for specific resource
 * Check if requested resource belongs to user's organization
 * @param {string} resourceOrgIdParam - Parameter name containing resource organization ID
 */
const validateResourceOrganization = (resourceOrgIdParam = 'organizationId') => {
  return (req, res, next) => {
    if (!req.user || !req.user.organization_id) {
      return next(createUnauthorizedError('Authentication required'));
    }

    const userOrgId = req.user.organization_id;
    const resourceOrgId = req.params[resourceOrgIdParam] || req.body[resourceOrgIdParam] || req.query[resourceOrgIdParam];

    // System admin can access any organization's data
    if (req.user.role === 'ADMIN' && !userOrgId) {
      return next();
    }

    // Validate organization access
    if (resourceOrgId && resourceOrgId !== userOrgId) {
      logger.security('Cross-organization access attempt', {
        userId: req.user.id,
        userOrgId,
        requestedOrgId: resourceOrgId,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip
      });
      
      return next(createForbiddenError('Access denied - resource belongs to different organization'));
    }

    next();
  };
};

/**
 * Add organization filter to query parameters
 * Automatically adds organization_id filter to database queries
 */
const addOrgFilter = (req, res, next) => {
  if (!req.user) {
    return next(createUnauthorizedError('Authentication required'));
  }

  const userOrgId = req.user.organization_id;
  const userRole = req.user.role;

  // Skip for system admin without organization
  if (userRole === 'ADMIN' && !userOrgId) {
    return next();
  }

  if (!userOrgId) {
    return next(createForbiddenError('User must belong to an organization'));
  }

  // Add organization filter to query
  req.query.organization_id = userOrgId;
  
  // Also add to body if this is a POST/PUT request
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body && typeof req.body === 'object') {
    req.body.organization_id = userOrgId;
  }

  next();
};

/**
 * Validate vendor access - vendors can only access their own data
 */
const validateVendorAccess = (req, res, next) => {
  if (!req.user) {
    return next(createUnauthorizedError('Authentication required'));
  }

  const userRole = req.user.role;
  
  // Non-vendor users with organization access can proceed with normal org isolation
  if (userRole !== 'VENDOR') {
    return next();
  }

  // For vendor users, additional restrictions apply
  const userId = req.user.id;
  const requestedUserId = req.params.userId || req.body.userId || req.query.userId;
  
  // Vendors can only access their own data
  if (requestedUserId && requestedUserId !== userId) {
    logger.security('Vendor cross-user access attempt', {
      vendorUserId: userId,
      requestedUserId,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip
    });
    
    return next(createForbiddenError('Vendors can only access their own data'));
  }

  // Add vendor-specific filters
  req.vendorUserId = userId;
  
  next();
};

/**
 * Check if user can access RFQ
 * Vendors can only see RFQs they are invited to
 */
const validateRFQAccess = async (req, res, next) => {
  if (!req.user) {
    return next(createUnauthorizedError('Authentication required'));
  }

  const userRole = req.user.role;
  
  // Non-vendor users can access all RFQs in their organization
  if (userRole !== 'VENDOR') {
    return next();
  }

  // For vendor users, check if they are invited to the RFQ
  const rfqId = req.params.rfqId || req.params.id;
  
  if (!rfqId) {
    return next(); // No specific RFQ being accessed
  }

  try {
    const { query } = require('../config/database');
    
    // Check if vendor is invited to this RFQ
    const result = await query(`
      SELECT rv.id 
      FROM rfq_vendors rv
      JOIN rfqs r ON rv.rfq_id = r.id
      JOIN vendors v ON rv.vendor_id = v.id
      JOIN users u ON v.organization_id = u.organization_id
      WHERE rv.rfq_id = $1 AND u.id = $2
    `, [rfqId, req.user.id]);

    if (result.rows.length === 0) {
      logger.security('Vendor attempted to access non-invited RFQ', {
        vendorUserId: req.user.id,
        rfqId,
        ip: req.ip
      });
      
      return next(createForbiddenError('Access denied - you are not invited to this RFQ'));
    }

    next();
  } catch (error) {
    logger.error('Error validating RFQ access:', error);
    next(createForbiddenError('Unable to validate RFQ access'));
  }
};

/**
 * Organization statistics and audit middleware
 * Tracks organization-level access patterns
 */
const trackOrgActivity = (req, res, next) => {
  if (req.user && req.user.organization_id) {
    // Track organization activity asynchronously
    setImmediate(() => {
      logger.audit('org_activity', req.user.id, 'http_request', req.user.organization_id, {
        method: req.method,
        url: req.originalUrl,
        userRole: req.user.role,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
    });
  }
  next();
};

/**
 * Middleware to ensure organization exists and is active
 */
const validateOrganization = async (req, res, next) => {
  if (!req.user || !req.user.organization_id) {
    return next();
  }

  try {
    const { query } = require('../config/database');
    
    const result = await query(`
      SELECT id, name, is_active 
      FROM organizations 
      WHERE id = $1
    `, [req.user.organization_id]);

    if (result.rows.length === 0) {
      logger.security('User with invalid organization', {
        userId: req.user.id,
        organizationId: req.user.organization_id,
        ip: req.ip
      });
      
      return next(createForbiddenError('Organization not found'));
    }

    const organization = result.rows[0];
    
    if (!organization.is_active) {
      logger.security('User from inactive organization attempted access', {
        userId: req.user.id,
        organizationId: req.user.organization_id,
        organizationName: organization.name,
        ip: req.ip
      });
      
      return next(createForbiddenError('Organization account is inactive'));
    }

    // Attach organization info to request
    req.organization = organization;
    
    next();
  } catch (error) {
    logger.error('Error validating organization:', error);
    next(createForbiddenError('Unable to validate organization'));
  }
};

module.exports = {
  enforceOrgIsolation,
  validateResourceOrganization,
  addOrgFilter,
  validateVendorAccess,
  validateRFQAccess,
  trackOrgActivity,
  validateOrganization
};