/**
 * Logging Utility
 * Using Winston for structured logging
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...(Object.keys(meta).length > 0 && { meta }),
      ...(stack && { stack })
    };
    
    return JSON.stringify(logEntry);
  })
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    const stackStr = stack ? `\n${stack}` : '';
    return `${timestamp} [${level}]: ${message}${metaStr}${stackStr}`;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: {
    service: 'vendorbridge-api',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Write all logs to combined.log
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true
    }),
    
    // Write error logs to error.log
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true
    }),

    // Write warning logs to warning.log
    new winston.transports.File({
      filename: path.join(logsDir, 'warning.log'),
      level: 'warn',
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 3,
      tailable: true
    })
  ],
  
  // Handle exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 3
    })
  ],
  
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 3
    })
  ]
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
    level: process.env.LOG_LEVEL || 'debug'
  }));
}

// Add console transport for production errors
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
    level: 'error'
  }));
}

// Custom logging methods
const customLogger = {
  // Standard log levels
  error: (message, meta = {}) => logger.error(message, meta),
  warn: (message, meta = {}) => logger.warn(message, meta),
  info: (message, meta = {}) => logger.info(message, meta),
  debug: (message, meta = {}) => logger.debug(message, meta),
  
  // Specialized logging methods
  audit: (action, userId, entityType, entityId, details = {}) => {
    logger.info('AUDIT', {
      action,
      userId,
      entityType,
      entityId,
      details,
      type: 'audit'
    });
  },
  
  security: (event, details = {}) => {
    logger.warn('SECURITY', {
      event,
      details,
      type: 'security'
    });
  },
  
  performance: (operation, duration, details = {}) => {
    logger.info('PERFORMANCE', {
      operation,
      duration,
      details,
      type: 'performance'
    });
  },
  
  database: (query, duration, params = {}) => {
    logger.debug('DATABASE', {
      query: query.substring(0, 200), // Limit query length
      duration,
      paramCount: Array.isArray(params) ? params.length : Object.keys(params).length,
      type: 'database'
    });
  },
  
  email: (to, subject, status, messageId = null) => {
    logger.info('EMAIL', {
      to,
      subject,
      status,
      messageId,
      type: 'email'
    });
  },
  
  api: (method, url, status, duration, userId = null) => {
    const level = status >= 400 ? 'warn' : 'info';
    logger[level]('API', {
      method,
      url,
      status,
      duration,
      userId,
      type: 'api'
    });
  }
};

// Error logging helper
const logError = (error, context = {}) => {
  const errorDetails = {
    message: error.message,
    stack: error.stack,
    name: error.name,
    code: error.code,
    ...context
  };
  
  logger.error('Unhandled Error', errorDetails);
};

// Performance logging helper
const logPerformance = (label, startTime, context = {}) => {
  const duration = Date.now() - startTime;
  logger.info(`Performance: ${label}`, {
    duration: `${duration}ms`,
    ...context,
    type: 'performance'
  });
};

// Request logging helper
const logRequest = (req, res, duration) => {
  const logData = {
    method: req.method,
    url: req.originalUrl,
    status: res.statusCode,
    duration: `${duration}ms`,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    organizationId: req.user?.organization_id
  };
  
  const level = res.statusCode >= 400 ? 'warn' : 'info';
  logger[level]('HTTP Request', logData);
};

module.exports = {
  ...customLogger,
  logger, // Winston logger instance
  logError,
  logPerformance,
  logRequest
};