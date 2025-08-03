# Database Migration to Neon

This document explains how to set up and migrate from local JSON file storage to Neon database storage.

## Prerequisites

1. **Create a Neon Account**: Go to [neon.tech](https://neon.tech) and create a free account
2. **Create a New Project**: Create a new project in your Neon dashboard
3. **Get Connection String**: Copy your database connection string from the Neon dashboard

## Setup Instructions

### 1. Configure Environment Variables

Update your `.env.local` file with your actual Neon database connection string:

```env
# Replace with your actual Neon database connection string
DATABASE_URL="postgresql://username:password@ep-example-123456.us-east-1.aws.neon.tech/neondb?sslmode=require"

# Optional: Set to 'development' for local development
NODE_ENV=development
```

### 2. Run Database Migration

Execute the migration script to set up the database tables:

```bash
npx tsx src/scripts/migrate.ts
```

This will:
- Test the database connection
- Create the `operations` table
- Set up necessary indexes
- Display the table structure

### 3. Test the Database Connection

Test that everything is working correctly:

```bash
# Start the development server
npm run dev

# Test the database connection (in another terminal)
curl http://localhost:3000/api/test-db
```

You should see a success response with the current operations count.

## Database Schema

The `operations` table has the following structure:

```sql
CREATE TABLE operations (
  id SERIAL PRIMARY KEY,
  file_name VARCHAR(255) NOT NULL,
  original_file_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  file_size INTEGER,
  data JSONB NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);
```

### Indexes

- `idx_operations_file_name`: Index on `file_name` for faster queries
- `idx_operations_created_at`: Index on `created_at` for sorting

## API Changes

### Save Operations API (`/api/save-operations`)

**Before (File System):**
```json
{
  "fileName": "operations_example_123456.json",
  "data": { ... }
}
```

**After (Database):**
```json
{
  "fileName": "operations_example_123456.json",
  "originalFileName": "example.pdf",
  "fileSize": 1024,
  "data": { ... }
}
```

### Load Operations API (`/api/load-operations`)

**New Query Parameters:**
- `id`: Load operation by database ID
- `fileName`: Load operation by file name
- `search`: Search operations by content
- `limit`: Limit number of results (default: 50)
- `offset`: Offset for pagination (default: 0)

**Examples:**
```bash
# Load by ID
GET /api/load-operations?id=123

# Load by filename
GET /api/load-operations?fileName=operations_example_123456.json

# Search operations
GET /api/load-operations?search=example&limit=10

# List all with pagination
GET /api/load-operations?limit=20&offset=40
```

## Migration Benefits

1. **Scalability**: No file system limitations
2. **Performance**: Database indexes for fast queries
3. **Search**: Full-text search capabilities
4. **Reliability**: ACID transactions and data integrity
5. **Backup**: Automatic backups with Neon
6. **Concurrent Access**: Multiple users can access data simultaneously

## Troubleshooting

### Connection Issues

1. **Check Environment Variables**: Ensure `DATABASE_URL` is correctly set
2. **Network Access**: Verify your network allows connections to Neon
3. **Connection String**: Double-check the connection string format

### Migration Issues

1. **Permissions**: Ensure your Neon user has CREATE TABLE permissions
2. **SSL**: Neon requires SSL connections (`sslmode=require`)
3. **Timeouts**: Large migrations might timeout; consider breaking them down

### Testing

Use the test endpoints to verify functionality:

```bash
# Test database connection
curl http://localhost:3000/api/test-db

# Test saving data
curl -X POST http://localhost:3000/api/test-db \
  -H "Content-Type: application/json" \
  -d '{"testData": {"example": true}}'
```

## Rollback Plan

If you need to rollback to file system storage:

1. Export data from database using the load operations API
2. Revert the API endpoint changes
3. Save exported data as JSON files in `public/jsons`

The original file system code is preserved in git history for reference.
