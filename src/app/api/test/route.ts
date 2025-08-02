import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'API is working',
    timestamp: new Date().toISOString()
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return NextResponse.json({
      success: true,
      message: 'POST request received',
      data: body,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to parse request body',
      timestamp: new Date().toISOString()
    }, { status: 400 });
  }
}

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
