#!/usr/bin/env node

/**
 * VendorBridge Procurement ERP - Server Entry Point
 * Starts HTTP server with Socket.io support
 */

require('dotenv').config();

const http = require('http');
const app = require('./src/app');
const { setupSocketIO } = require('./src/sockets');
const logger = require('./src/utils/logger');
const { testDatabaseConnection } = require('./src/config/database');

// Normalize port value
const normalizePort = (val) => {
  const port = parseInt(val, 10);
  if (isNaN(port)) return val;
  if (port >= 0) return port;
  return false;
};

// Get port from environment
const port = normalizePort(process.env.PORT || '5000');
app.set('port', port);

// Create HTTP server
const server = http.createServer(app);

// Setup Socket.IO
setupSocketIO(server);

// Error event handler
const onError = (error) => {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof port === 'string' ? `Pipe ${port}` : `Port ${port}`;

  switch (error.code) {
    case 'EACCES':
      logger.error(`${bind} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      logger.error(`${bind} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
};

// Listening event handler
const onListening = () => {
  const addr = server.address();
  const bind = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr.port}`;
  logger.info(`VendorBridge API Server listening on ${bind}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
};

// Test database and start server
const startServer = async () => {
  try {
    // Test database connection
    await testDatabaseConnection();
    logger.info('Database connection successful');

    // Start server
    server.listen(port);
    server.on('error', onError);
    server.on('listening', onListening);

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown handler
const gracefulShutdown = (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  server.close((err) => {
    if (err) {
      logger.error('Error during server shutdown:', err);
      process.exit(1);
    }
    
    logger.info('Server closed successfully');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Handle process signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  process.exit(1);
});

// Start the server
startServer();