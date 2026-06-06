#!/usr/bin/env node

/**
 * Database Creation Script
 * Creates the database if it doesn't exist
 */

require('dotenv').config();

const { Pool } = require('pg');

// Connect to PostgreSQL without specifying database
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  // Don't specify database - connect to default postgres database
});

async function createDatabase() {
  try {
    console.log('🔧 Connecting to PostgreSQL server...');
    
    // Check if database exists
    const dbName = process.env.DB_NAME || 'vendorbridge';
    const result = await pool.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName]
    );

    if (result.rows.length === 0) {
      console.log(`📦 Creating database: ${dbName}`);
      await pool.query(`CREATE DATABASE "${dbName}"`);
      console.log(`✅ Database '${dbName}' created successfully!`);
    } else {
      console.log(`✅ Database '${dbName}' already exists!`);
    }

  } catch (error) {
    console.error('❌ Failed to create database:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n🔥 PostgreSQL server is not running!');
      console.error('Please start PostgreSQL server and try again.');
    } else if (error.code === '28P01') {
      console.error('\n🔐 Authentication failed!');
      console.error('Please check your database credentials in .env file.');
    }
    
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  createDatabase();
}

module.exports = { createDatabase };