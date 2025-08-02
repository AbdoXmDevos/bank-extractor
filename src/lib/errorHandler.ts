export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class FileProcessingError extends AppError {
  constructor(message: string) {
    super(message, 422);
  }
}

export class FileUploadError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class PDFParsingError extends AppError {
  constructor(message: string) {
    super(message, 422);
  }
}

export class ErrorHandler {
  public static handleError(error: Error): { message: string; statusCode: number } {
    if (error instanceof AppError) {
      return {
        message: error.message,
        statusCode: error.statusCode
      };
    }

    // Handle specific error types
    if (error.message.includes('PDF')) {
      return {
        message: 'Failed to process PDF file. Please ensure it\'s a valid CIH bank statement.',
        statusCode: 422
      };
    }

    if (error.message.includes('network') || error.message.includes('fetch')) {
      return {
        message: 'Network error. Please check your connection and try again.',
        statusCode: 503
      };
    }

    if (error.message.includes('storage') || error.message.includes('localStorage')) {
      return {
        message: 'Storage error. Please clear your browser cache and try again.',
        statusCode: 507
      };
    }

    // Default error
    console.error('Unexpected error:', error);
    return {
      message: 'An unexpected error occurred. Please try again.',
      statusCode: 500
    };
  }

  public static validateFile(file: File): void {
    if (!file) {
      throw new FileUploadError('No file provided');
    }

    if (file.type !== 'application/pdf') {
      throw new FileUploadError('Only PDF files are allowed');
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new FileUploadError('File size too large. Maximum 10MB allowed.');
    }

    if (file.size === 0) {
      throw new FileUploadError('File is empty');
    }

    // Check file name for basic validation
    if (!file.name || file.name.length < 4) {
      throw new FileUploadError('Invalid file name');
    }
  }

  public static validatePDFContent(text: string): void {
    if (!text || text.trim().length === 0) {
      throw new PDFParsingError('PDF appears to be empty or unreadable');
    }

    if (text.length < 100) {
      throw new PDFParsingError('PDF content is too short to be a valid bank statement');
    }

    // Check for CIH bank statement indicators
    const cihIndicators = [
      'CIH',
      'CREDIT IMMOBILIER',
      'RELEVE',
      'COMPTE',
      'SOLDE'
    ];

    const hasIndicator = cihIndicators.some(indicator => 
      text.toUpperCase().includes(indicator)
    );

    if (!hasIndicator) {
      console.warn('PDF may not be a CIH bank statement - no CIH indicators found');
      // Don't throw error, just warn - allow processing of other bank statements
    }
  }

  public static validateTransactionData(transactions: unknown[]): void {
    if (!Array.isArray(transactions)) {
      throw new ValidationError('Invalid transaction data format');
    }

    if (transactions.length === 0) {
      throw new ValidationError('No transactions found in the PDF');
    }

    // Validate each transaction has required fields
    for (let i = 0; i < transactions.length; i++) {
      const transaction = transactions[i];

      // Type guard to check if transaction is an object
      if (!transaction || typeof transaction !== 'object') {
        throw new ValidationError(`Transaction ${i + 1} is not a valid object`);
      }

      const txn = transaction as Record<string, unknown>;

      if (!txn.id) {
        throw new ValidationError(`Transaction ${i + 1} is missing ID`);
      }

      if (!txn.date) {
        throw new ValidationError(`Transaction ${i + 1} is missing date`);
      }

      if (!txn.operation) {
        throw new ValidationError(`Transaction ${i + 1} is missing operation description`);
      }

      if (typeof txn.amount !== 'number' || isNaN(txn.amount)) {
        throw new ValidationError(`Transaction ${i + 1} has invalid amount`);
      }

      if (!['DEBIT', 'CREDIT'].includes(txn.type as string)) {
        throw new ValidationError(`Transaction ${i + 1} has invalid type`);
      }
    }
  }

  public static sanitizeInput(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }
    
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .substring(0, 1000); // Limit length
  }

  public static logError(error: Error, context?: string): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      context: context || 'Unknown',
      message: error.message,
      stack: error.stack,
      name: error.name
    };
    
    console.error('Application Error:', logEntry);
    
    // In production, you might want to send this to a logging service
    // Example: sendToLoggingService(logEntry);
  }

  public static createUserFriendlyMessage(error: Error): string {
    if (error instanceof FileUploadError) {
      return `Upload Error: ${error.message}`;
    }
    
    if (error instanceof PDFParsingError) {
      return `PDF Processing Error: ${error.message}`;
    }
    
    if (error instanceof ValidationError) {
      return `Validation Error: ${error.message}`;
    }
    
    if (error instanceof FileProcessingError) {
      return `File Processing Error: ${error.message}`;
    }
    
    return 'An unexpected error occurred. Please try again or contact support if the problem persists.';
  }
}
