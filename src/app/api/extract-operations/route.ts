import { NextRequest, NextResponse } from 'next/server';
import { CategoryService } from '@/lib/categoryService';

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

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Parse PDF using dynamic import
    const pdf = await import('pdf-parse');
    const data = await pdf.default(buffer);
    console.log('PDF parsed successfully. Pages:', data.numpages);
    console.log('Extracted text length:', data.text.length);

    // Extract operations
    const operations = extractOperationsFromText(data.text);
    console.log('Extracted operations:', operations.length);

    if (operations.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No operations found in the PDF. Please ensure this is a valid CIH bank statement.' },
        { status: 400 }
      );
    }

    const result: ExtractOperationsResult = {
      operations,
      totalOperations: operations.length,
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

function extractOperationsFromText(text: string): OperationData[] {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const operations: OperationData[] = [];
  let operationId = 1;

  console.log('Processing', lines.length, 'lines');
  console.log('Sample lines (first 20):');
  lines.slice(0, 20).forEach((line, index) => {
    console.log(`  ${index + 1}: "${line}"`);
  });

  // Operation keywords that start the operation text
  const operationStarters = ['PAIEMENT', 'VIRT', 'VIREMENT', 'RETRAIT'];

  // Process all lines looking for operations
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip obvious header lines
    if (isHeaderLine(line)) {
      continue;
    }

    // Look for lines that start with a date pattern (DD/MM/YYYY or DD/MM/DD)
    const dateMatch = line.match(/^(\d{2}\/\d{2})\/?\d{0,4}/);
    if (dateMatch) {
      const date = dateMatch[1]; // This will be just DD/MM
      console.log(`Found date line ${i + 1}: "${line}"`);

      // Check if this line contains any of our operation starters
      const upperLine = line.toUpperCase();
      const hasOperationStarter = operationStarters.some(starter =>
        upperLine.includes(starter)
      );

      if (hasOperationStarter) {
        console.log(`Line contains operation starter: "${line}"`);

        // Extract the operation text from this line
        const operation = extractOperationFromLine(line, date, operationStarters);

        if (operation && operation.length > 5) {
          // Determine status based on operation type
          const status = determineOperationStatus(operation);

          // Classify operations using unified category system
          const categoryService = CategoryService.getInstance();
          const transactionType = status === 'Outgoing' ? 'DEBIT' : 'CREDIT';
          const category = categoryService.classifyTransaction(operation, transactionType);

          operations.push({
            id: operationId++,
            date,
            operation: operation.trim(),
            status,
            category
          });

          console.log(`Extracted operation ${operationId - 1}: "${operation}" - Status: ${status} - Category: ${category}`);
        }
      }
    }
  }

  console.log(`Total operations extracted: ${operations.length}`);
  return operations;
}

function extractOperationFromLine(line: string, _date: string, operationStarters: string[]): string {
  console.log(`Extracting from line: "${line}"`);

  // Find which operation starter this line contains
  const upperLine = line.toUpperCase();
  let operationStart = -1;
  let starterFound = '';

  for (const starter of operationStarters) {
    const index = upperLine.indexOf(starter);
    if (index !== -1) {
      operationStart = index;
      starterFound = starter;
      break;
    }
  }

  if (operationStart === -1) {
    console.log('No operation starter found');
    return '';
  }

  console.log(`Found starter "${starterFound}" at position ${operationStart}`);

  // Extract everything from the operation starter onwards
  let operationText = line.substring(operationStart);
  console.log(`Operation text from starter: "${operationText}"`);

  // Find the last amount in the line (ends with ,XX or .XX)
  const amountPattern = /\d{1,3}(?:[,\s]\d{3})*[,\.]\d{2}$/;
  const amountMatch = operationText.match(amountPattern);

  if (amountMatch) {
    // Remove the amount from the end
    const amountIndex = operationText.lastIndexOf(amountMatch[0]);
    operationText = operationText.substring(0, amountIndex).trim();
    console.log(`After removing amount "${amountMatch[0]}": "${operationText}"`);
  }

  // Clean up the operation text
  operationText = operationText
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();

  console.log(`Final operation text: "${operationText}"`);
  return operationText;
}

function determineOperationStatus(operation: string): 'Incoming' | 'Outgoing' {
  const upperOperation = operation.toUpperCase();

  // Incoming operations: VRT, VIRT, and VIREMENT
  if (upperOperation.startsWith('VRT') ||
      upperOperation.startsWith('VIRT') ||
      upperOperation.startsWith('VIREMENT')) {
    return 'Incoming';
  }

  // Outgoing operations: PAIEMENT and RETRAIT
  if (upperOperation.startsWith('PAIEMENT') || upperOperation.startsWith('RETRAIT')) {
    return 'Outgoing';
  }

  // Default to Outgoing if we can't determine
  return 'Outgoing';
}

function isHeaderLine(line: string): boolean {
  const headerPatterns = [
    /^DATES?\s+OPERATION/i,
    /^OPER\s+VALEUR/i,
    /NOUS AVONS L'HONNEUR/i,
    /CENTRE RELATION/i,
    /MEDIATEUR/i,
    /SAUF ERREUR/i,
    /SOUSCRIVEZ/i,
    /^TEL\s*:/i,
    /^EMAIL\s*:/i,
    /^\d{4}\/\d{4}$/, // Page numbers like 0001/0002
    /^[\s\-=_]{5,}$/, // Lines with only separators
    /^PAGE\s*N/i, // Page indicators
    /VOTRE CONSEILLER/i,
    /RELEVE D'IDENTITE/i,
    /BANQUE.*VILLE.*COMPTE/i,
    /DEVISE/i,
  ];

  const isHeader = headerPatterns.some(pattern => pattern.test(line));
  const tooShort = line.length < 8 && !/\d{1,3}(?:[,\s]\d{3})*[,\.]\d{2}/.test(line);

  return isHeader || tooShort;
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Extract Operations API is working. Use POST to upload files.',
    timestamp: new Date().toISOString(),
    methods: ['POST', 'OPTIONS']
  });
}
