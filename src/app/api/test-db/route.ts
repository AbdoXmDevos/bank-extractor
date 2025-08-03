import { NextRequest, NextResponse } from 'next/server';
import { testConnection, initializeDatabase } from '@/lib/database';
import { OperationsService } from '@/lib/operationsService';

export async function GET() {
  try {
    console.log('Testing database connection...');
    
    // Test basic connection
    const connectionTest = await testConnection();
    if (!connectionTest) {
      return NextResponse.json({
        success: false,
        error: 'Database connection failed'
      }, { status: 500 });
    }

    // Initialize database
    const initResult = await initializeDatabase();
    if (!initResult) {
      return NextResponse.json({
        success: false,
        error: 'Database initialization failed'
      }, { status: 500 });
    }

    // Test operations service
    const operationsService = new OperationsService();
    const count = await operationsService.getOperationsCount();

    return NextResponse.json({
      success: true,
      message: 'Database connection and initialization successful',
      operationsCount: count,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Database test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { testData } = await request.json();
    
    // Test saving a sample operation
    const operationsService = new OperationsService();
    
    const testOperation = await operationsService.saveOperation({
      fileName: `test_${Date.now()}.json`,
      originalFileName: 'test.pdf',
      fileSize: 1024,
      data: testData || { test: true, timestamp: new Date().toISOString() },
      metadata: { source: 'test-api' }
    });

    return NextResponse.json({
      success: true,
      message: 'Test operation saved successfully',
      operation: testOperation
    });

  } catch (error) {
    console.error('Test operation save failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
