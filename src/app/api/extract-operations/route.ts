import { NextRequest, NextResponse } from 'next/server';
import { CategoryService } from '@/lib/categoryService';

interface OperationData {
  id: number;
  date: string;
  operation: string;
  status: 'Incoming' | 'Outgoing';
  amount: number; // Add amount field
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

function isDateLine(line: string): boolean {
  return /^(\d{2}\/\d{2})\/?\d{0,4}/.test(line.trim());
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

        // Extract the operation text and amount from this line
        const extractionResult = extractOperationAndAmountFromLine(line, date, operationStarters);

        if (extractionResult && extractionResult.operation && extractionResult.operation.length > 5) {
          // Build extended classification text by appending continuation lines (merchant, details)
          let extendedText = extractionResult.operation;
          const nextLine = lines[i + 1];
          if (nextLine && !isHeaderLine(nextLine) && !isDateLine(nextLine)) {
            // Append next line details
            extendedText = `${extendedText} ${nextLine}`.trim();
            const thirdLine = lines[i + 2];
            // Optionally append a third line if still not a date/header and short
            if (thirdLine && !isHeaderLine(thirdLine) && !isDateLine(thirdLine) && thirdLine.length < 60) {
              extendedText = `${extendedText} ${thirdLine}`.trim();
            }
          }

          // Determine status based on operation type
          const status = determineOperationStatus(extractionResult.operation);

          // Classify operations using unified category system with extended text
          const categoryService = CategoryService.getInstance();
          const transactionType = status === 'Outgoing' ? 'DEBIT' : 'CREDIT';
          const category = categoryService.classifyTransactionSync(extendedText, transactionType);

          // Prefer to display extendedText so users see merchant names
          const displayOperation = extendedText;

          operations.push({
            id: operationId++,
            date,
            operation: displayOperation.trim(),
            status,
            amount: extractionResult.amount, // Include amount
            category
          });

          console.log(`Extracted operation ${operationId - 1}: "${displayOperation}" - Amount: ${extractionResult.amount} - Status: ${status} - Category: ${category}`);
        }
      }
    }
  }

  console.log(`Total operations extracted: ${operations.length}`);
  console.log('Final operations with amounts:');
  operations.forEach((op, index) => {
    console.log(`  ${index + 1}: ${op.operation} - Amount: ${op.amount}`);
  });
  return operations;
}

function extractOperationAndAmountFromLine(line: string, _date: string, operationStarters: string[]): { operation: string; amount: number } | null {
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
    return null;
  }

  console.log(`Found starter "${starterFound}" at position ${operationStart}`);

  // Extract everything from the operation starter onwards
  let operationText = line.substring(operationStart);
  console.log(`Operation text from starter: "${operationText}"`);

  // Try multiple amount patterns to find the amount
  let amount = 0;
  let amountStr = '';
  
  // Pattern 1: Amount at the end with decimal (e.g., "1,234.56", "1 234,56")
  const amountPattern1 = /\d{1,3}(?:[,\s]\d{3})*[,\.]\d{2}$/;
  let amountMatch = operationText.match(amountPattern1);
  
  if (amountMatch) {
    amountStr = amountMatch[0];
    amount = parseAmount(amountStr);
    console.log(`Pattern 1 matched: "${amountStr}" -> ${amount}`);
  } else {
    // Pattern 2: Amount with decimal but no thousands separator (e.g., "1234.56", "1234,56")
    const amountPattern2 = /\d+[,\.]\d{2}$/;
    amountMatch = operationText.match(amountPattern2);
    
    if (amountMatch) {
      amountStr = amountMatch[0];
      amount = parseAmount(amountStr);
      console.log(`Pattern 2 matched: "${amountStr}" -> ${amount}`);
    } else {
      // Pattern 3: Look for any amount in the line (more flexible)
      const amountPattern3 = /\d{1,3}(?:[,\s]\d{3})*[,\.]\d{2}/g;
      const allMatches = operationText.match(amountPattern3);
      
      if (allMatches && allMatches.length > 0) {
        // Take the last match (usually the final amount)
        amountStr = allMatches[allMatches.length - 1];
        amount = parseAmount(amountStr);
        console.log(`Pattern 3 matched: "${amountStr}" -> ${amount}`);
      } else {
        // Pattern 4: Look for any number that might be an amount
        const amountPattern4 = /\d+[,\.]\d{2}/g;
        const allMatches2 = operationText.match(amountPattern4);
        
        if (allMatches2 && allMatches2.length > 0) {
          amountStr = allMatches2[allMatches2.length - 1];
          amount = parseAmount(amountStr);
          console.log(`Pattern 4 matched: "${amountStr}" -> ${amount}`);
        } else {
          // Pattern 5: Look for numbers that might be amounts without decimal (e.g., "1234")
          const amountPattern5 = /\b\d{3,}(?:[,\s]\d{3})*\b/g;
          const allMatches3 = operationText.match(amountPattern5);
          
          if (allMatches3 && allMatches3.length > 0) {
            // Take the largest number as it's likely the amount
            const numbers = allMatches3.map(match => parseFloat(match.replace(/[,\s]/g, '')));
            const maxNumber = Math.max(...numbers);
            if (maxNumber > 10) { // Only consider reasonable amounts
              amountStr = allMatches3[numbers.indexOf(maxNumber)];
              amount = maxNumber;
              console.log(`Pattern 5 matched: "${amountStr}" -> ${amount}`);
            }
          } else {
            // Pattern 6: Look for any sequence of digits that might be an amount
            const amountPattern6 = /\b\d{2,}\b/g;
            const allMatches4 = operationText.match(amountPattern6);
            
            if (allMatches4 && allMatches4.length > 0) {
              // Take the largest number as it's likely the amount
              const numbers = allMatches4.map(match => parseFloat(match));
              const maxNumber = Math.max(...numbers);
              if (maxNumber > 10) { // Only consider reasonable amounts
                amountStr = allMatches4[numbers.indexOf(maxNumber)];
                amount = maxNumber;
                console.log(`Pattern 6 matched: "${amountStr}" -> ${amount}`);
              }
            } else {
              console.log('No amount pattern matched in:', operationText);
              console.log('Available numbers in text:', operationText.match(/\d+/g));
            }
          }
        }
      }
    }
  }

  if (amountStr) {
    // Remove the amount from the operation text
    const amountIndex = operationText.lastIndexOf(amountStr);
    operationText = operationText.substring(0, amountIndex).trim();
    console.log(`After removing amount: "${operationText}"`);
  }

  // Clean up the operation text
  operationText = operationText
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();

  console.log(`Final operation text: "${operationText}"`);
  console.log(`Final amount: ${amount}`);
  return { operation: operationText, amount };
}

// Helper function to parse amount
function parseAmount(amountStr: string): number {
  console.log(`Parsing amount: "${amountStr}"`);
  
  // Handle different number formats: "1,234.56", "1 234,56", etc.
  let normalized = amountStr
    .replace(/\s/g, '') // Remove spaces
    .replace(/,(\d{3})/g, '$1'); // Remove thousands separators
  
  // Handle decimal comma vs decimal dot
  if (normalized.includes(',')) {
    // If there's a comma, it might be a decimal separator
    const parts = normalized.split(',');
    if (parts.length === 2 && parts[1].length === 2) {
      // Likely decimal comma format (e.g., "1234,56")
      normalized = parts[0] + '.' + parts[1];
    } else {
      // Keep as is, might be thousands separator
      normalized = normalized.replace(/,(\d{2})$/, '.$1');
    }
  }
  
  const result = parseFloat(normalized);
  console.log(`Normalized: "${normalized}" -> ${result}`);
  return result || 0;
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
    methods: ['POST', 'OPTIONS'],
    test: {
      sampleLine: '15/12 PAIEMENT CARTE 1234 5678 9012 3456 1,234.56',
      extractedAmount: parseAmount('1,234.56'),
      patterns: [
        'Pattern 1: /\\d{1,3}(?:[,\\s]\\d{3})*[,\\.]\\d{2}$/',
        'Pattern 2: /\\d+[,\\.]\\d{2}$/',
        'Pattern 3: /\\d{1,3}(?:[,\\s]\\d{3})*[,\\.]\\d{2}/g',
        'Pattern 4: /\\d+[,\\.]\\d{2}/g'
      ]
    }
  });
}
