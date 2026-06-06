/**
 * PostgreSQL Database Configuration
 * Using pg library with connection pooling
 */

const { Pool } = require('pg');
const logger = require('../utils/logger');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'vendorbridge',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 20, // Maximum number of connections in the pool
  idleTimeoutMillis: 30000, // How long to wait before timing out when connecting a new client
  connectionTimeoutMillis: 2000, // How long to wait for a connection
  maxUses: 7500, // Disconnect client after it has been used this many times
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

// Create connection pool
const pool = new Pool(dbConfig);

// Pool event handlers
pool.on('connect', (client) => {
  logger.debug(`Connected to database: ${client.database}`);
});

pool.on('error', (err) => {
  logger.error('Database pool error:', err);
  process.exit(1);
});

pool.on('remove', () => {
  logger.debug('Database client removed from pool');
});

// Test database connection
const testDatabaseConnection = async () => {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    return true;
  } catch (error) {
    logger.error('Database connection test failed:', error);
    throw error;
  }
};

// Execute query with error handling and logging
const query = async (text, params = []) => {
  const start = Date.now();
  
  try {
    logger.debug('Executing query:', { text, params });
    
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    logger.debug(`Query executed in ${duration}ms:`, {
      text,
      paramCount: params.length,
      rowCount: result.rowCount,
      duration
    });
    
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    
    logger.error(`Query failed after ${duration}ms:`, {
      text,
      params,
      error: error.message,
      duration
    });
    
    // Re-throw the error for handling by the caller
    throw error;
  }
};

// Execute query within a transaction
const queryInTransaction = async (queries) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const results = [];
    for (const { text, params = [] } of queries) {
      const result = await client.query(text, params);
      results.push(result);
    }
    
    await client.query('COMMIT');
    return results;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Get a client from the pool for complex transactions
const getClient = async () => {
  return await pool.connect();
};

// Close all connections in the pool
const closePool = async () => {
  try {
    await pool.end();
    logger.info('Database pool closed');
  } catch (error) {
    logger.error('Error closing database pool:', error);
  }
};

// Graceful shutdown handler
process.on('SIGINT', closePool);
process.on('SIGTERM', closePool);

module.exports = {
  pool,
  query,
  queryInTransaction,
  getClient,
  testDatabaseConnection,
  closePool
};