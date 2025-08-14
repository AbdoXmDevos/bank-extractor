import { NextRequest, NextResponse } from 'next/server';
import { testConnection, initializeDatabase } from '@/lib/database';
import { OperationsService } from '@/lib/operationsService';

export async function GET() {
  try {
    console.log('Testing database connection...');

    // Check if DATABASE_URL is available first
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        success: false,
        error: 'DATABASE_URL environment variable is not set',
        operationsCount: 0,
        timestamp: new Date().toISOString()
      });
    }

    // Test basic connection
    const connectionTest = await testConnection();
    if (!connectionTest) {
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        operationsCount: 0,
        timestamp: new Date().toISOString()
      });
    }

    // Initialize database
    const initResult = await initializeDatabase();
    if (!initResult) {
      return NextResponse.json({
        success: false,
        error: 'Database initialization failed',
        operationsCount: 0,
        timestamp: new Date().toISOString()
      });
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
      operationsCount: 0,
      timestamp: new Date().toISOString()
    });
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
