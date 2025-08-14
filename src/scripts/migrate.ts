#!/usr/bin/env node

/**
 * Database migration script for Neon database
 * Run with: npx tsx src/scripts/migrate.ts
 */

// Load environment variables from .env.local
import { config } from 'dotenv';
import { join } from 'path';
import { neon } from '@neondatabase/serverless';
import categoriesConfig from '../config/categories.json';

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

    // Create the categories table
    await sql`
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        keywords TEXT[] NOT NULL DEFAULT '{}',
        color VARCHAR(7) NOT NULL DEFAULT '#6B7280',
        description TEXT,
        applicable_for TEXT[] DEFAULT '{}',
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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

    // Create an index on categories name for faster queries
    await sql`
      CREATE INDEX IF NOT EXISTS idx_categories_name
      ON categories(name)
    `;

    // Create an index on categories applicable_for for filtering
    await sql`
      CREATE INDEX IF NOT EXISTS idx_categories_applicable_for
      ON categories USING GIN(applicable_for)
    `;

    console.log('Database tables initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    return false;
  }
}

// Populate categories table with data from JSON config
async function populateCategories() {
  try {
    // Check if categories already exist
    const existingCategories = await sql`SELECT COUNT(*) as count FROM categories`;

    if (existingCategories[0].count > 0) {
      console.log('Categories table already has data, skipping population');
      return true;
    }

    console.log('Populating categories table with default data...');

    // Insert all categories from the JSON config
    const allCategories = [...categoriesConfig.categories, ...categoriesConfig.otherCategories];

    for (const category of allCategories) {
      await sql`
        INSERT INTO categories (
          id, name, keywords, color, description, applicable_for, is_default
        ) VALUES (
          ${category.id},
          ${category.name},
          ${category.keywords},
          ${category.color},
          ${category.description || null},
          ${category.applicableFor || []},
          ${categoriesConfig.otherCategories.some(c => c.id === category.id)}
        )
        ON CONFLICT (id) DO NOTHING
      `;
    }

    console.log(`✅ Populated ${allCategories.length} categories successfully`);
    return true;
  } catch (error) {
    console.error('Failed to populate categories:', error);
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

  // Populate categories table with default data
  console.log('Populating categories table...');
  const populateResult = await populateCategories();

  if (!populateResult) {
    console.error('❌ Categories population failed.');
    process.exit(1);
  }

  console.log('✅ Categories populated successfully');

  // Check if tables exist and show their structure
  try {
    const operationsTables = await sql`
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'operations'
      ORDER BY ordinal_position
    `;

    const categoriesTables = await sql`
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'categories'
      ORDER BY ordinal_position
    `;

    console.log('\n📋 Operations table structure:');
    operationsTables.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULLABLE)'}`);
    });

    console.log('\n📋 Categories table structure:');
    categoriesTables.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULLABLE)'}`);
    });

    // Show current record counts
    const operationsCount = await sql`SELECT COUNT(*) as total FROM operations`;
    const categoriesCount = await sql`SELECT COUNT(*) as total FROM categories`;
    console.log(`\n📊 Current records in operations table: ${operationsCount[0].total}`);
    console.log(`📊 Current records in categories table: ${categoriesCount[0].total}`);

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
