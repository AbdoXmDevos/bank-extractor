import { sql } from './database';

export interface OperationRecord {
  id: number;
  file_name: string;
  original_file_name?: string;
  created_at: string;
  updated_at: string;
  file_size?: number;
  data: any; // JSON data
  metadata: any; // Additional metadata
}

export interface CreateOperationData {
  fileName: string;
  originalFileName?: string;
  fileSize?: number;
  data: any;
  metadata?: any;
}

export interface OperationSummary {
  id: number;
  file_name: string;
  original_file_name?: string;
  created_at: string;
  file_size?: number;
  transaction_count?: number;
}

export class OperationsService {
  /**
   * Save a new operation to the database
   */
  async saveOperation(operationData: CreateOperationData): Promise<OperationRecord> {
    try {
      const result = await sql`
        INSERT INTO operations (
          file_name, 
          original_file_name, 
          file_size, 
          data, 
          metadata
        )
        VALUES (
          ${operationData.fileName},
          ${operationData.originalFileName || null},
          ${operationData.fileSize || null},
          ${JSON.stringify(operationData.data)},
          ${JSON.stringify(operationData.metadata || {})}
        )
        RETURNING *
      `;

      return result[0] as OperationRecord;
    } catch (error) {
      console.error('Error saving operation:', error);
      throw new Error('Failed to save operation to database');
    }
  }

  /**
   * Get a specific operation by file name
   */
  async getOperationByFileName(fileName: string): Promise<OperationRecord | null> {
    try {
      const result = await sql`
        SELECT * FROM operations 
        WHERE file_name = ${fileName}
        ORDER BY created_at DESC
        LIMIT 1
      `;

      return result.length > 0 ? (result[0] as OperationRecord) : null;
    } catch (error) {
      console.error('Error getting operation by file name:', error);
      throw new Error('Failed to retrieve operation from database');
    }
  }

  /**
   * Get a specific operation by ID
   */
  async getOperationById(id: number): Promise<OperationRecord | null> {
    try {
      const result = await sql`
        SELECT * FROM operations 
        WHERE id = ${id}
      `;

      return result.length > 0 ? (result[0] as OperationRecord) : null;
    } catch (error) {
      console.error('Error getting operation by ID:', error);
      throw new Error('Failed to retrieve operation from database');
    }
  }

  /**
   * List all operations with optional pagination
   */
  async listOperations(limit: number = 50, offset: number = 0): Promise<OperationSummary[]> {
    try {
      const result = await sql`
        SELECT 
          id,
          file_name,
          original_file_name,
          created_at,
          file_size,
          jsonb_array_length(data->'transactions') as transaction_count
        FROM operations 
        ORDER BY created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;

      return result as OperationSummary[];
    } catch (error) {
      console.error('Error listing operations:', error);
      throw new Error('Failed to list operations from database');
    }
  }

  /**
   * Delete an operation by file name
   */
  async deleteOperationByFileName(fileName: string): Promise<boolean> {
    try {
      const result = await sql`
        DELETE FROM operations
        WHERE file_name = ${fileName}
        RETURNING id
      `;

      return result.length > 0;
    } catch (error) {
      console.error('Error deleting operation:', error);
      throw new Error('Failed to delete operation from database');
    }
  }

  /**
   * Delete an operation by ID
   */
  async deleteOperationById(id: number): Promise<boolean> {
    try {
      const result = await sql`
        DELETE FROM operations
        WHERE id = ${id}
        RETURNING id
      `;

      return result.length > 0;
    } catch (error) {
      console.error('Error deleting operation by ID:', error);
      throw new Error('Failed to delete operation from database');
    }
  }

  /**
   * Search operations by original file name or content
   */
  async searchOperations(searchTerm: string, limit: number = 20): Promise<OperationSummary[]> {
    try {
      const result = await sql`
        SELECT 
          id,
          file_name,
          original_file_name,
          created_at,
          file_size,
          jsonb_array_length(data->'transactions') as transaction_count
        FROM operations 
        WHERE 
          original_file_name ILIKE ${`%${searchTerm}%`}
          OR file_name ILIKE ${`%${searchTerm}%`}
          OR data::text ILIKE ${`%${searchTerm}%`}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;

      return result as OperationSummary[];
    } catch (error) {
      console.error('Error searching operations:', error);
      throw new Error('Failed to search operations in database');
    }
  }

  /**
   * Get total count of operations
   */
  async getOperationsCount(): Promise<number> {
    try {
      const result = await sql`
        SELECT COUNT(*) as total FROM operations
      `;

      return parseInt(result[0].total);
    } catch (error) {
      console.error('Error getting operations count:', error);
      throw new Error('Failed to get operations count from database');
    }
  }

  /**
   * Update operation data
   */
  async updateOperation(id: number, data: any, metadata?: any): Promise<OperationRecord | null> {
    try {
      const result = await sql`
        UPDATE operations 
        SET 
          data = ${JSON.stringify(data)},
          metadata = ${JSON.stringify(metadata || {})},
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;

      return result.length > 0 ? (result[0] as OperationRecord) : null;
    } catch (error) {
      console.error('Error updating operation:', error);
      throw new Error('Failed to update operation in database');
    }
  }
}
