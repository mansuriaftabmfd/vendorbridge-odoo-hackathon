/**
 * Zod Validation Middleware
 * Validates request data using Zod schemas
 */

const { z } = require('zod');
const logger = require('../utils/logger');
const { createValidationError } = require('./error-handler');

/**
 * Create validation middleware for request body
 * @param {z.ZodSchema} schema - Zod schema to validate against
 */
const validateBody = (schema) => {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated; // Replace with validated/sanitized data
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.errors.map(err => {
          const path = err.path.join('.');
          return `${path}: ${err.message}`;
        });
        
        logger.warn('Request body validation failed', {
          url: req.originalUrl,
          method: req.method,
          errors: error.errors,
          userId: req.user?.id
        });
        
        return next(createValidationError(`Validation failed: ${messages.join(', ')}`));
      }
      next(error);
    }
  };
};

/**
 * Create validation middleware for query parameters
 * @param {z.ZodSchema} schema - Zod schema to validate against
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.query);
      req.query = validated; // Replace with validated/sanitized data
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.errors.map(err => {
          const path = err.path.join('.');
          return `${path}: ${err.message}`;
        });
        
        logger.warn('Query parameters validation failed', {
          url: req.originalUrl,
          method: req.method,
          errors: error.errors,
          userId: req.user?.id
        });
        
        return next(createValidationError(`Query validation failed: ${messages.join(', ')}`));
      }
      next(error);
    }
  };
};

/**
 * Create validation middleware for URL parameters
 * @param {z.ZodSchema} schema - Zod schema to validate against
 */
const validateParams = (schema) => {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.params);
      req.params = validated; // Replace with validated/sanitized data
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.errors.map(err => {
          const path = err.path.join('.');
          return `${path}: ${err.message}`;
        });
        
        logger.warn('URL parameters validation failed', {
          url: req.originalUrl,
          method: req.method,
          errors: error.errors,
          userId: req.user?.id
        });
        
        return next(createValidationError(`Parameter validation failed: ${messages.join(', ')}`));
      }
      next(error);
    }
  };
};

/**
 * Create validation middleware for files
 * @param {Object} options - File validation options
 */
const validateFiles = (options = {}) => {
  const {
    required = false,
    maxFiles = 10,
    maxSize = 10 * 1024 * 1024, // 10MB
    allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'text/plain'],
    allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf', '.txt']
  } = options;

  return (req, res, next) => {
    try {
      const files = req.files || [];
      const fileArray = Array.isArray(files) ? files : [files].filter(Boolean);

      // Check if files are required
      if (required && fileArray.length === 0) {
        return next(createValidationError('At least one file is required'));
      }

      // Check file count
      if (fileArray.length > maxFiles) {
        return next(createValidationError(`Maximum ${maxFiles} files allowed`));
      }

      // Validate each file
      for (const file of fileArray) {
        if (!file) continue;

        // Check file size
        if (file.size > maxSize) {
          return next(createValidationError(`File '${file.originalname}' exceeds maximum size of ${Math.round(maxSize / 1024 / 1024)}MB`));
        }

        // Check MIME type
        if (!allowedTypes.includes(file.mimetype)) {
          return next(createValidationError(`File '${file.originalname}' has invalid type. Allowed types: ${allowedTypes.join(', ')}`));
        }

        // Check file extension
        const extension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
        if (!allowedExtensions.includes(extension)) {
          return next(createValidationError(`File '${file.originalname}' has invalid extension. Allowed extensions: ${allowedExtensions.join(', ')}`));
        }

        // Sanitize filename
        file.sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      }

      logger.debug('File validation passed', {
        fileCount: fileArray.length,
        files: fileArray.map(f => ({ name: f.originalname, size: f.size, type: f.mimetype })),
        userId: req.user?.id
      });

      next();
    } catch (error) {
      logger.error('File validation error:', error);
      next(createValidationError('File validation failed'));
    }
  };
};

/**
 * Common validation schemas
 */
const commonSchemas = {
  // UUID validation
  uuid: z.string().uuid('Invalid UUID format'),
  
  // Email validation
  email: z.string().email('Invalid email format').toLowerCase(),
  
  // Password validation
  password: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one digit')
    .regex(/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?~]/, 'Password must contain at least one special character'),
  
  // Phone validation
  phone: z.string().regex(/^\+?[\d\s\-()]+$/, 'Invalid phone number format').optional(),
  
  // GSTIN validation
  gstin: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z0-9A-Z]{1}$/, 'Invalid GSTIN format').optional(),
  
  // Pagination parameters
  pagination: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).refine(n => n > 0, 'Page must be greater than 0').default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).refine(n => n > 0 && n <= 100, 'Limit must be between 1 and 100').default('20'),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc')
  }),
  
  // Search parameters
  search: z.object({
    q: z.string().min(1, 'Search query is required').max(100, 'Search query too long').optional(),
    category: z.string().optional(),
    status: z.string().optional(),
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional()
  }),
  
  // Date range validation
  dateRange: z.object({
    startDate: z.string().datetime('Invalid start date format'),
    endDate: z.string().datetime('Invalid end date format')
  }).refine(data => new Date(data.startDate) <= new Date(data.endDate), 'End date must be after start date'),
  
  // Amount validation
  amount: z.number().positive('Amount must be positive').multipleOf(0.01, 'Amount can have maximum 2 decimal places'),
  
  // Percentage validation
  percentage: z.number().min(0, 'Percentage cannot be negative').max(100, 'Percentage cannot exceed 100'),
  
  // String with length limits
  shortString: z.string().min(1, 'Field is required').max(255, 'Field is too long'),
  mediumString: z.string().min(1, 'Field is required').max(500, 'Field is too long'),
  longString: z.string().max(2000, 'Field is too long').optional(),
  
  // Enum validations
  userRole: z.enum(['PROCUREMENT_OFFICER', 'VENDOR', 'MANAGER', 'ADMIN'], 'Invalid user role'),
  vendorCategory: z.enum(['ELECTRONICS', 'RAW_MATERIALS', 'LOGISTICS', 'COMPONENTS', 'SERVICES', 'OTHER'], 'Invalid vendor category'),
  vendorStatus: z.enum(['ACTIVE', 'PENDING', 'BLOCKED'], 'Invalid vendor status'),
  rfqStatus: z.enum(['DRAFT', 'SENT', 'CLOSED', 'CANCELLED'], 'Invalid RFQ status'),
  quotationStatus: z.enum(['DRAFT', 'SUBMITTED', 'SELECTED', 'REJECTED'], 'Invalid quotation status'),
  approvalStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'REQUESTED_CHANGES'], 'Invalid approval status'),
  poStatus: z.enum(['DRAFT', 'APPROVED', 'SENT', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'], 'Invalid PO status'),
  invoiceStatus: z.enum(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'], 'Invalid invoice status')
};

/**
 * Sanitize HTML content (basic)
 * @param {string} html - HTML content to sanitize
 */
const sanitizeHtml = (html) => {
  if (!html || typeof html !== 'string') return html;
  
  // Basic HTML sanitization - remove script tags and other potentially dangerous elements
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*>/gi, '')
    .replace(/<link\b[^<]*>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
};

/**
 * Create a sanitization transformer for strings
 */
const sanitizedString = (maxLength = 255) => {
  return z.string()
    .transform(str => sanitizeHtml(str?.trim()))
    .refine(str => str.length <= maxLength, `Text must not exceed ${maxLength} characters`);
};

/**
 * Validation middleware that combines multiple validations
 * @param {Object} validations - Object with body, query, params schemas
 */
const validate = (validations = {}) => {
  return (req, res, next) => {
    const errors = [];

    // Validate body
    if (validations.body) {
      try {
        req.body = validations.body.parse(req.body);
      } catch (error) {
        if (error instanceof z.ZodError) {
          errors.push(...error.errors.map(err => `body.${err.path.join('.')}: ${err.message}`));
        }
      }
    }

    // Validate query
    if (validations.query) {
      try {
        req.query = validations.query.parse(req.query);
      } catch (error) {
        if (error instanceof z.ZodError) {
          errors.push(...error.errors.map(err => `query.${err.path.join('.')}: ${err.message}`));
        }
      }
    }

    // Validate params
    if (validations.params) {
      try {
        req.params = validations.params.parse(req.params);
      } catch (error) {
        if (error instanceof z.ZodError) {
          errors.push(...error.errors.map(err => `params.${err.path.join('.')}: ${err.message}`));
        }
      }
    }

    if (errors.length > 0) {
      logger.warn('Combined validation failed', {
        url: req.originalUrl,
        method: req.method,
        errors,
        userId: req.user?.id
      });
      
      return next(createValidationError(`Validation failed: ${errors.join(', ')}`));
    }

    next();
  };
};

module.exports = {
  validateBody,
  validateQuery,
  validateParams,
  validateFiles,
  validate,
  commonSchemas,
  sanitizeHtml,
  sanitizedString
};