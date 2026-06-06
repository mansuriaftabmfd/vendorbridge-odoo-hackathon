/**
 * Centralized Error Handler Middleware
 * Handles all errors and sends consistent error responses
 */

const logger = require('../utils/logger');

// Custom error class for application errors
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Database error mappings
const dbErrorMessages = {
  '23505': 'A record with this information already exists',
  '23503': 'Referenced record does not exist',
  '23502': 'Required field is missing',
  '23514': 'Invalid data provided',
  '42703': 'Invalid field specified',
  '42P01': 'Table does not exist',
  '3D000': 'Database does not exist',
  '28P01': 'Database authentication failed',
  '08006': 'Database connection failed'
};

/**
 * Handle PostgreSQL errors
 */
const handleDatabaseError = (error) => {
  const code = error.code;
  const message = dbErrorMessages[code] || 'Database operation failed';
  
  logger.error('Database error:', {
    code: error.code,
    detail: error.detail,
    hint: error.hint,
    constraint: error.constraint,
    table: error.table,
    column: error.column
  });

  // Don't expose internal database details in production
  if (process.env.NODE_ENV === 'production') {
    return new AppError(message, 400, `DB_${code}`, true);
  }

  return new AppError(`${message}: ${error.detail || error.message}`, 400, `DB_${code}`, true);
};

/**
 * Handle validation errors (Zod)
 */
const handleValidationError = (error) => {
  const messages = error.errors?.map(err => `${err.path.join('.')}: ${err.message}`) || [error.message];
  return new AppError(`Validation failed: ${messages.join(', ')}`, 400, 'VALIDATION_ERROR', true);
};

/**
 * Handle JWT errors
 */
const handleJWTError = (error) => {
  if (error.name === 'JsonWebTokenError') {
    return new AppError('Invalid authentication token', 401, 'INVALID_TOKEN', true);
  }
  if (error.name === 'TokenExpiredError') {
    return new AppError('Authentication token has expired', 401, 'TOKEN_EXPIRED', true);
  }
  return new AppError('Authentication failed', 401, 'AUTH_ERROR', true);
};

/**
 * Handle file upload errors
 */
const handleFileUploadError = (error) => {
  if (error.code === 'LIMIT_FILE_SIZE') {
    return new AppError('File size too large', 400, 'FILE_TOO_LARGE', true);
  }
  if (error.code === 'LIMIT_FILE_COUNT') {
    return new AppError('Too many files uploaded', 400, 'TOO_MANY_FILES', true);
  }
  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return new AppError('Invalid file field', 400, 'INVALID_FILE_FIELD', true);
  }
  return new AppError('File upload failed', 400, 'FILE_UPLOAD_ERROR', true);
};

/**
 * Send error response in development
 */
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    success: false,
    error: err.message,
    code: err.code,
    stack: err.stack,
    timestamp: err.timestamp || new Date().toISOString(),
    ...(err.details && { details: err.details })
  });
};

/**
 * Send error response in production
 */
const sendErrorProd = (err, res) => {
  // Operational errors - safe to send to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
      timestamp: err.timestamp || new Date().toISOString()
    });
  } else {
    // Programming errors - don't leak details to client
    logger.error('Programming error:', err);
    
    res.status(500).json({
      success: false,
      error: 'Something went wrong on our end',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Main error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error details
  logger.error('Error Handler:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    organizationId: req.user?.organization_id
  });

  // Handle specific error types
  if (err.code && err.code.startsWith('23')) {
    // PostgreSQL constraint violations
    error = handleDatabaseError(err);
  } else if (err.code && dbErrorMessages[err.code]) {
    // Other PostgreSQL errors
    error = handleDatabaseError(err);
  } else if (err.name === 'ZodError') {
    // Zod validation errors
    error = handleValidationError(err);
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    // JWT errors
    error = handleJWTError(err);
  } else if (err.code && err.code.startsWith('LIMIT_')) {
    // Multer file upload errors
    error = handleFileUploadError(err);
  } else if (err.name === 'ValidationError') {
    // Generic validation errors
    error = new AppError(err.message, 400, 'VALIDATION_ERROR', true);
  } else if (err.name === 'CastError') {
    // Invalid ID format errors
    error = new AppError('Invalid ID format', 400, 'INVALID_ID', true);
  } else if (err.statusCode) {
    // Already handled application errors
    error = new AppError(err.message, err.statusCode, err.code || 'APPLICATION_ERROR', true);
  } else {
    // Unknown errors - mark as non-operational
    error = new AppError(
      process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message,
      500,
      'INTERNAL_ERROR',
      false
    );
  }

  // Send appropriate response
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, res);
  } else {
    sendErrorProd(error, res);
  }
};

/**
 * Handle 404 errors for undefined routes
 */
const notFoundHandler = (req, res, next) => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404, 'ROUTE_NOT_FOUND', true);
  next(error);
};

/**
 * Async error catcher wrapper
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Create a validation error
 */
const createValidationError = (message, field = null) => {
  const error = new AppError(message, 400, 'VALIDATION_ERROR', true);
  if (field) {
    error.field = field;
  }
  return error;
};

/**
 * Create a not found error
 */
const createNotFoundError = (resource = 'Resource') => {
  return new AppError(`${resource} not found`, 404, 'NOT_FOUND', true);
};

/**
 * Create an unauthorized error
 */
const createUnauthorizedError = (message = 'Authentication required') => {
  return new AppError(message, 401, 'UNAUTHORIZED', true);
};

/**
 * Create a forbidden error
 */
const createForbiddenError = (message = 'Access forbidden') => {
  return new AppError(message, 403, 'FORBIDDEN', true);
};

/**
 * Create a conflict error
 */
const createConflictError = (message = 'Resource conflict') => {
  return new AppError(message, 409, 'CONFLICT', true);
};

/**
 * Create a rate limit error
 */
const createRateLimitError = (message = 'Too many requests') => {
  return new AppError(message, 429, 'RATE_LIMIT', true);
};

module.exports = {
  AppError,
  errorHandler,
  notFoundHandler,
  catchAsync,
  createValidationError,
  createNotFoundError,
  createUnauthorizedError,
  createForbiddenError,
  createConflictError,
  createRateLimitError
};