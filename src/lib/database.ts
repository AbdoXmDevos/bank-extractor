import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  console.error('Environment variables check:');
  console.error('- DATABASE_URL exists:', !!process.env.DATABASE_URL);
  console.error('- NODE_ENV:', process.env.NODE_ENV);
  console.error('- All DATABASE env vars:', Object.keys(process.env).filter(key => key.includes('DATABASE')));
  throw new Error('DATABASE_URL environment variable is not set. Please check your .env.local file.');
}

// Create a connection to the Neon database
export const sql = neon(process.env.DATABASE_URL);

// Test the database connection
export async function testConnection() {
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
export async function initializeDatabase() {
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
