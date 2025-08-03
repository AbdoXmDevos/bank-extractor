import { NextRequest, NextResponse } from 'next/server';
import { OperationsService } from '@/lib/operationsService';
import { initializeDatabase } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { fileName, data, originalFileName, fileSize } = await request.json();

    if (!fileName || !data) {
      return NextResponse.json(
        { error: 'Missing fileName or data' },
        { status: 400 }
      );
    }

    // Initialize database if needed
    await initializeDatabase();

    // Create operations service instance
    const operationsService = new OperationsService();

    // Save the operation to database
    const savedOperation = await operationsService.saveOperation({
      fileName,
      originalFileName,
      fileSize,
      data,
      metadata: {
        savedAt: new Date().toISOString(),
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    });

    return NextResponse.json({
      success: true,
      id: savedOperation.id,
      fileName: savedOperation.file_name,
      createdAt: savedOperation.created_at,
      message: 'Operations saved successfully to database'
    });

  } catch (error) {
    console.error('Error saving operations:', error);
    return NextResponse.json(
      { error: 'Failed to save operations to database' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { fileName, id } = await request.json();

    if (!fileName && !id) {
      return NextResponse.json(
        { error: 'Missing fileName or id' },
        { status: 400 }
      );
    }

    // Create operations service instance
    const operationsService = new OperationsService();

    let deleted = false;

    // Delete by ID if provided, otherwise by fileName
    if (id) {
      deleted = await operationsService.deleteOperationById(parseInt(id));
    } else if (fileName) {
      deleted = await operationsService.deleteOperationByFileName(fileName);
    }

    if (!deleted) {
      return NextResponse.json(
        { error: 'Operation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      fileName: fileName || `ID: ${id}`,
      message: 'Operation deleted successfully from database'
    });

  } catch (error) {
    console.error('Error deleting operation:', error);
    return NextResponse.json(
      { error: 'Failed to delete operation from database' },
      { status: 500 }
    );
  }
}
