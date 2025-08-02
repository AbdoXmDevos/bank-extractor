import { NextRequest, NextResponse } from 'next/server';
import { PDFProcessor } from '@/lib/pdfProcessor';
import { TransactionClassifier } from '@/lib/transactionClassifier';
import { ErrorHandler } from '@/lib/errorHandler';

export async function POST(request: NextRequest) {
  try {
    console.log('Upload API called');
    const formData = await request.formData();
    const file = formData.get('file') as File;

    console.log('File received:', file?.name, file?.size, file?.type);

    // Validate file
    ErrorHandler.validateFile(file);

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Process PDF
    const pdfProcessor = new PDFProcessor();
    const result = await pdfProcessor.processPDF(buffer, file.name);

    // Validate extracted data
    ErrorHandler.validateTransactionData(result.transactions);

    // Classify transactions
    const classifier = new TransactionClassifier();
    const classifiedTransactions = classifier.classifyTransactions(result.transactions);

    // Update result with classified transactions
    const finalResult = {
      ...result,
      transactions: classifiedTransactions
    };

    return NextResponse.json({
      success: true,
      data: finalResult
    });

  } catch (error) {
    ErrorHandler.logError(error as Error, 'PDF Upload API');
    const { message, statusCode } = ErrorHandler.handleError(error as Error);

    return NextResponse.json(
      {
        success: false,
        error: message
      },
      { status: statusCode }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to upload files.' },
    { status: 405 }
  );
}
