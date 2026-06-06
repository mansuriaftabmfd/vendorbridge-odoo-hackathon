/**
 * VendorBridge Procurement ERP - Express App Configuration
 */

const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const fs = require('fs');

const { pool } = require('./config/database');
const logger = require('./utils/logger');
const { errorHandler } = require('./middleware/error-handler');

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const vendorRoutes = require('./routes/vendor.routes');
const rfqRoutes = require('./routes/rfq.routes');
const quotationRoutes = require('./routes/quotation.routes');
const approvalRoutes = require('./routes/approval.routes');
const poRoutes = require('./routes/po.routes');
const invoiceRoutes = require('./routes/invoice.routes');
const activityRoutes = require('./routes/activity.routes');
const notificationRoutes = require('./routes/notification.routes');
const reportRoutes = require('./routes/report.routes');

const app = express();

// Trust proxy (for rate limiting and secure cookies behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false, // Allow PDF viewing
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'http://localhost:3000',
      'http://127.0.0.1:3000'
    ].filter(Boolean);
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Disposition'] // For file downloads
};

app.use(cors(corsOptions));

// Compression
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: {
    error: 'Too many requests from this IP, please try again later',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: new rateLimit.MemoryStore(), // Use Redis store in production
});

// Stricter rate limiting for auth endpoints (but not session checks)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_AUTH_MAX) || 20,
  message: {
    error: 'Too many authentication attempts, please try again later',
    code: 'AUTH_RATE_LIMIT_EXCEEDED'
  },
  skipSuccessfulRequests: true,
  skip: (req) => {
    // Don't rate limit session checks, password changes by authenticated users, or health checks
    return req.path === '/session' || req.path === '/me' || (req.path === '/change-password' && req.session?.user);
  }
});

app.use(limiter);

// Session configuration with PostgreSQL store
app.use(session({
  store: new pgSession({
    pool: pool,                // Connection pool
    tableName: 'session',      // Use 'session' table name
    createTableIfMissing: true // Create table if it doesn't exist
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  name: 'vendorbridge.sid',
  cookie: {
    secure: process.env.NODE_ENV === 'production' && process.env.SESSION_SECURE === 'true',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict'
  }
}));

// Create upload directory if it doesn't exist
const uploadDir = process.env.UPLOAD_PATH || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Serve static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, '..', uploadDir)));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.session?.user?.id || 'anonymous'
    };
    
    if (res.statusCode >= 400) {
      logger.warn('HTTP Request', logData);
    } else {
      logger.info('HTTP Request', logData);
    }
  });
  
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/rfqs', rfqRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/pos', poRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/activity-logs', activityRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found',
    code: 'ENDPOINT_NOT_FOUND'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'VendorBridge Procurement ERP API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    docs: '/api/docs'
  });
});

// Global error handler (must be last)
app.use(errorHandler);

module.exports = app;