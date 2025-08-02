import { NextRequest, NextResponse } from 'next/server';

interface OperationData {
  id: number;
  date: string;
  operation: string;
  status: 'Incoming' | 'Outgoing';
  category?: string; // Unified category ID
}

interface ExtractOperationsResult {
  operations: OperationData[];
  totalOperations: number;
  fileName: string;
  extractDate: string;
}



// Add OPTIONS handler for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    console.log('Extract Operations API called');
    console.log('Request method:', request.method);
    console.log('Request URL:', request.url);

    const formData = await request.formData();
    const file = formData.get('file') as File;

    console.log('File received:', file?.name, file?.size, file?.type);

    // Validate file
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { success: false, error: 'File must be a PDF' },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB
      return NextResponse.json(
        { success: false, error: 'File size must be under 10MB' },
        { status: 400 }
      );
    }

    // For now, return a simple test response to verify the API is working
    // We'll add PDF processing back once the basic API is working
    console.log('Creating test response...');

    const result: ExtractOperationsResult = {
      operations: [
        {
          id: 1,
          date: '2024-01-01',
          operation: 'Test Operation - API is working!',
          status: 'Outgoing',
          category: 'test'
        }
      ],
      totalOperations: 1,
      fileName: file.name,
      extractDate: new Date().toISOString()
    };

    const response = NextResponse.json({
      success: true,
      data: result
    });

    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');

    return response;

  } catch (error) {
    console.error('Extract operations failed:', error);
    const errorResponse = NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process PDF'
      },
      { status: 500 }
    );

    // Add CORS headers to error response too
    errorResponse.headers.set('Access-Control-Allow-Origin', '*');
    errorResponse.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    errorResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type');

    return errorResponse;
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Extract Operations API is working. Use POST to upload files.',
    timestamp: new Date().toISOString(),
    methods: ['POST', 'OPTIONS']
  });
}
