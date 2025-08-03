#!/usr/bin/env node

/**
 * Database migration script for Neon database
 * Run with: npx tsx src/scripts/migrate.ts
 */

// Load environment variables from .env.local
import { config } from 'dotenv';
import { join } from 'path';
import { neon } from '@neondatabase/serverless';

// Load .env.local file BEFORE creating database connection
const envResult = config({ path: join(process.cwd(), '.env.local') });
console.log('Environment loading result:', envResult.error ? envResult.error.message : 'Success');
console.log('DATABASE_URL loaded:', !!process.env.DATABASE_URL);

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set. Please check your .env.local file.');
  process.exit(1);
}

// Create database connection
const sql = neon(process.env.DATABASE_URL);

// Test the database connection
async function testConnection() {
  try {
    const result = await sql`SELECT NOW() as current_time`;
    console.log('Database connected successfully:', result[0].current_time);
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// Initialize database tables if they don't exist
async function initializeDatabase() {
  try {
    // Create the operations table
    await sql`
      CREATE TABLE IF NOT EXISTS operations (
        id SERIAL PRIMARY KEY,
        file_name VARCHAR(255) NOT NULL,
        original_file_name VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        file_size INTEGER,
        data JSONB NOT NULL,
        metadata JSONB DEFAULT '{}'::jsonb
      )
    `;

    // Create an index on file_name for faster queries
    await sql`
      CREATE INDEX IF NOT EXISTS idx_operations_file_name
      ON operations(file_name)
    `;

    // Create an index on created_at for sorting
    await sql`
      CREATE INDEX IF NOT EXISTS idx_operations_created_at
      ON operations(created_at DESC)
    `;

    console.log('Database tables initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    return false;
  }
}

async function runMigration() {
  console.log('Starting database migration...');
  
  // Test connection first
  console.log('Testing database connection...');
  const connectionTest = await testConnection();
  
  if (!connectionTest) {
    console.error('❌ Database connection failed. Please check your DATABASE_URL.');
    process.exit(1);
  }
  
  console.log('✅ Database connection successful');
  
  // Initialize database tables
  console.log('Initializing database tables...');
  const initResult = await initializeDatabase();
  
  if (!initResult) {
    console.error('❌ Database initialization failed.');
    process.exit(1);
  }
  
  console.log('✅ Database tables initialized successfully');
  
  // Check if tables exist and show their structure
  try {
    const tables = await sql`
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'operations'
      ORDER BY ordinal_position
    `;
    
    console.log('\n📋 Operations table structure:');
    tables.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULLABLE)'}`);
    });
    
    // Show current record count
    const count = await sql`SELECT COUNT(*) as total FROM operations`;
    console.log(`\n📊 Current records in operations table: ${count[0].total}`);
    
  } catch (error) {
    console.error('Error checking table structure:', error);
  }
  
  console.log('\n🎉 Migration completed successfully!');
}

// Run the migration
runMigration().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
