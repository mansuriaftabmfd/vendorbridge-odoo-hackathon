#!/usr/bin/env node

/**
 * Database Migration Script
 * Runs SQL migration files in order
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'vendorbridge',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const MIGRATIONS_DIR = path.join(__dirname, '..', 'src', 'db', 'migrations');

/**
 * Create migrations tracking table
 */
async function createMigrationsTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMP DEFAULT NOW()
    );
  `;
  
  await pool.query(sql);
  console.log('✓ Migrations table ready');
}

/**
 * Get executed migrations
 */
async function getExecutedMigrations() {
  const result = await pool.query('SELECT filename FROM migrations ORDER BY filename');
  return result.rows.map(row => row.filename);
}

/**
 * Mark migration as executed
 */
async function markMigrationExecuted(filename) {
  await pool.query(
    'INSERT INTO migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING',
    [filename]
  );
}

/**
 * Execute SQL file
 */
async function executeSqlFile(filepath, filename) {
  console.log(`Running migration: ${filename}`);
  
  const sql = fs.readFileSync(filepath, 'utf8');
  
  try {
    // Execute in a transaction
    await pool.query('BEGIN');
    
    // Execute the entire SQL file as one statement
    await pool.query(sql);
    
    // Mark as executed
    await markMigrationExecuted(filename);
    
    await pool.query('COMMIT');
    console.log(`✓ Migration completed: ${filename}`);
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  }
}

/**
 * Run all pending migrations
 */
async function runMigrations() {
  try {
    console.log('🚀 Starting database migrations...\n');
    
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✓ Database connection successful');
    
    // Create migrations table
    await createMigrationsTable();
    
    // Get executed migrations
    const executedMigrations = await getExecutedMigrations();
    console.log(`✓ Found ${executedMigrations.length} executed migrations`);
    
    // Get all migration files
    if (!fs.existsSync(MIGRATIONS_DIR)) {
      console.log('❌ Migrations directory not found:', MIGRATIONS_DIR);
      process.exit(1);
    }
    
    const migrationFiles = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    console.log(`✓ Found ${migrationFiles.length} migration files`);
    
    // Filter pending migrations
    const pendingMigrations = migrationFiles.filter(
      file => !executedMigrations.includes(file)
    );
    
    if (pendingMigrations.length === 0) {
      console.log('✅ No pending migrations. Database is up to date!');
      return;
    }
    
    console.log(`\n📝 Running ${pendingMigrations.length} pending migrations...\n`);
    
    // Execute pending migrations
    for (const filename of pendingMigrations) {
      const filepath = path.join(MIGRATIONS_DIR, filename);
      await executeSqlFile(filepath, filename);
    }
    
    console.log('\n✅ All migrations completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    
    if (process.env.NODE_ENV === 'development') {
      console.error('Stack trace:', error.stack);
    }
    
    process.exit(1);
  }
}

/**
 * Create a new migration file
 */
function createMigration(name) {
  if (!name) {
    console.error('❌ Migration name is required');
    console.log('Usage: node migrate.js create <migration_name>');
    process.exit(1);
  }
  
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '');
  const filename = `${timestamp}_${name.toLowerCase().replace(/\s+/g, '_')}.sql`;
  const filepath = path.join(MIGRATIONS_DIR, filename);
  
  const template = `-- Migration: ${name}
-- Created: ${new Date().toISOString()}

-- Add your SQL commands here
-- Example:
-- CREATE TABLE example (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   name VARCHAR(255) NOT NULL,
--   created_at TIMESTAMPTZ DEFAULT NOW()
-- );

-- Don't forget to add appropriate indexes
-- CREATE INDEX idx_example_name ON example(name);
`;
  
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
  }
  
  fs.writeFileSync(filepath, template);
  console.log(`✅ Migration file created: ${filepath}`);
}

/**
 * Rollback last migration (simple version)
 */
async function rollbackLastMigration() {
  try {
    console.log('⚠️  Rolling back last migration...\n');
    
    const result = await pool.query(
      'SELECT filename FROM migrations ORDER BY executed_at DESC LIMIT 1'
    );
    
    if (result.rows.length === 0) {
      console.log('❌ No migrations to rollback');
      return;
    }
    
    const lastMigration = result.rows[0].filename;
    console.log(`Rolling back: ${lastMigration}`);
    
    // Remove from migrations table
    await pool.query('DELETE FROM migrations WHERE filename = $1', [lastMigration]);
    
    console.log('⚠️  Migration record removed from database');
    console.log('⚠️  Manual cleanup may be required for database changes');
    console.log('✅ Rollback completed');
    
  } catch (error) {
    console.error('❌ Rollback failed:', error.message);
    process.exit(1);
  }
}

/**
 * Show migration status
 */
async function showStatus() {
  try {
    await createMigrationsTable();
    
    const executedMigrations = await getExecutedMigrations();
    const migrationFiles = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    console.log('📊 Migration Status\n');
    console.log(`Total migration files: ${migrationFiles.length}`);
    console.log(`Executed migrations: ${executedMigrations.length}`);
    console.log(`Pending migrations: ${migrationFiles.length - executedMigrations.length}\n`);
    
    if (migrationFiles.length > 0) {
      console.log('Migration Files:');
      migrationFiles.forEach(file => {
        const status = executedMigrations.includes(file) ? '✅ Executed' : '⏳ Pending';
        console.log(`  ${status} - ${file}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Failed to show status:', error.message);
    process.exit(1);
  }
}

/**
 * Main function
 */
async function main() {
  const command = process.argv[2];
  const arg = process.argv[3];
  
  try {
    switch (command) {
      case 'create':
        createMigration(arg);
        break;
      case 'rollback':
        await rollbackLastMigration();
        break;
      case 'status':
        await showStatus();
        break;
      case 'up':
      case undefined:
        await runMigrations();
        break;
      default:
        console.log('Usage:');
        console.log('  node migrate.js [up]       - Run all pending migrations');
        console.log('  node migrate.js create <name>  - Create a new migration file');
        console.log('  node migrate.js rollback   - Rollback the last migration');
        console.log('  node migrate.js status     - Show migration status');
        break;
    }
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = {
  runMigrations,
  createMigration,
  rollbackLastMigration,
  showStatus
};