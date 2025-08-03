import { NextRequest, NextResponse } from 'next/server';
import { OperationsService } from '@/lib/operationsService';
import { initializeDatabase } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('fileName');
    const id = searchParams.get('id');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Initialize database if needed
    await initializeDatabase();

    // Create operations service instance
    const operationsService = new OperationsService();

    // If ID is provided, load specific operation by ID
    if (id) {
      const operation = await operationsService.getOperationById(parseInt(id));

      if (!operation) {
        return NextResponse.json(
          { error: 'Operation not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        id: operation.id,
        fileName: operation.file_name,
        originalFileName: operation.original_file_name,
        createdAt: operation.created_at,
        updatedAt: operation.updated_at,
        fileSize: operation.file_size,
        data: operation.data,
        metadata: operation.metadata
      });
    }

    // If fileName is provided, load specific operation by fileName
    if (fileName) {
      const operation = await operationsService.getOperationByFileName(fileName);

      if (!operation) {
        return NextResponse.json(
          { error: 'Operation not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        id: operation.id,
        fileName: operation.file_name,
        originalFileName: operation.original_file_name,
        createdAt: operation.created_at,
        updatedAt: operation.updated_at,
        fileSize: operation.file_size,
        data: operation.data,
        metadata: operation.metadata
      });
    }

    // If search term is provided, search operations
    if (search) {
      const operations = await operationsService.searchOperations(search, limit);

      return NextResponse.json({
        success: true,
        operations,
        total: operations.length,
        search: search
      });
    }

    // Otherwise, list all operations with pagination
    const operations = await operationsService.listOperations(limit, offset);
    const totalCount = await operationsService.getOperationsCount();

    return NextResponse.json({
      success: true,
      operations,
      total: totalCount,
      limit,
      offset,
      hasMore: offset + limit < totalCount
    });

  } catch (error) {
    console.error('Error loading operations:', error);
    return NextResponse.json(
      { error: 'Failed to load operations from database' },
      { status: 500 }
    );
  }
}
