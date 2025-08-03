#!/usr/bin/env node

/**
 * Migration script to move existing JSON files from public/jsons to Neon database
 * Run with: npx tsx src/scripts/migrate-json-files.ts
 */

// Load environment variables from .env.local
import { config } from 'dotenv';
import { join as pathJoin } from 'path';

// Load .env.local file
config({ path: pathJoin(process.cwd(), '.env.local') });

import { readdir, readFile, stat } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set. Please check your .env.local file.');
  process.exit(1);
}

// Create database connection
const sql = neon(process.env.DATABASE_URL);

async function migrateJsonFiles() {
  console.log('🚀 Starting JSON files migration to Neon database...');
  
  const jsonsDir = join(process.cwd(), 'public', 'jsons');
  
  // Check if jsons directory exists
  if (!existsSync(jsonsDir)) {
    console.log('📁 No public/jsons directory found. Nothing to migrate.');
    return;
  }

  try {
    // Test database connection
    console.log('🔧 Testing database connection...');
    const testResult = await sql`SELECT NOW() as current_time`;
    console.log('Database connected successfully:', testResult[0].current_time);
    
    // Read all JSON files
    const files = await readdir(jsonsDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    if (jsonFiles.length === 0) {
      console.log('📄 No JSON files found to migrate.');
      return;
    }
    
    console.log(`📊 Found ${jsonFiles.length} JSON files to migrate.`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const file of jsonFiles) {
      try {
        console.log(`📝 Processing: ${file}`);
        
        const filePath = join(jsonsDir, file);
        const stats = await stat(filePath);
        const content = await readFile(filePath, 'utf8');
        const data = JSON.parse(content);
        
        // Extract original filename from the data if available
        const originalFileName = data.metadata?.fileName || file.replace(/^operations_/, '').replace(/_\d+\.json$/, '.pdf');
        
        // Check if this file is already in the database
        const existing = await sql`
          SELECT id FROM operations
          WHERE file_name = ${file}
          LIMIT 1
        `;

        if (existing.length > 0) {
          console.log(`⚠️  Skipping ${file} - already exists in database`);
          continue;
        }

        // Save to database
        await sql`
          INSERT INTO operations (
            file_name,
            original_file_name,
            file_size,
            data,
            metadata
          )
          VALUES (
            ${file},
            ${originalFileName},
            ${stats.size},
            ${JSON.stringify(data)},
            ${JSON.stringify({
              migratedAt: new Date().toISOString(),
              originalPath: filePath,
              fileStats: {
                size: stats.size,
                created: stats.birthtime.toISOString(),
                modified: stats.mtime.toISOString()
              }
            })}
          )
        `;
        
        successCount++;
        console.log(`✅ Successfully migrated: ${file}`);
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Failed to migrate ${file}:`, error);
      }
    }
    
    console.log('\n🎉 Migration completed!');
    console.log(`✅ Successfully migrated: ${successCount} files`);
    console.log(`❌ Failed to migrate: ${errorCount} files`);
    
    if (successCount > 0) {
      console.log('\n📋 Next steps:');
      console.log('1. Test the application to ensure everything works correctly');
      console.log('2. Once confirmed, you can safely delete the public/jsons directory');
      console.log('3. Remove any file system related code if no longer needed');
    }
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
migrateJsonFiles().catch((error) => {
  console.error('Migration script failed:', error);
  process.exit(1);
});
