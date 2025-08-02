import { Transaction, ParsedPDFResult } from '@/types/transaction';
import { CategoryService } from './categoryService';
import { ErrorHandler, PDFParsingError } from './errorHandler';

export class PDFProcessor {
  private categoryService: CategoryService;

  constructor() {
    this.categoryService = CategoryService.getInstance();
  }

  public async processPDF(buffer: Buffer, fileName: string): Promise<ParsedPDFResult> {
    try {
      if (!buffer || buffer.length === 0) {
        throw new PDFParsingError('PDF buffer is empty');
      }

      console.log('Processing PDF buffer of size:', buffer.length);

      // Import the core pdf-parse library directly to avoid debug mode
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdf = require('pdf-parse/lib/pdf-parse.js');
      const data = await pdf(buffer);

      if (!data.text) {
        throw new PDFParsingError('Could not extract text from PDF');
      }

      // Validate PDF content
      ErrorHandler.validatePDFContent(data.text);

      // Debug: Log the extracted text to understand the format
      console.log('Extracted PDF text (first 1000 chars):', data.text.substring(0, 1000));
      console.log('Total text length:', data.text.length);

      const transactions = this.extractTransactions(data.text);

      if (transactions.length === 0) {
        console.log('No transactions found. Extracted text sample:', data.text.substring(0, 2000));
        throw new PDFParsingError('No transactions found in the PDF. Please ensure this is a valid CIH bank statement.');
      }

      const summary = this.calculateSummary(transactions);

      return {
        transactions,
        totalPages: data.numpages,
        fileName: ErrorHandler.sanitizeInput(fileName),
        parseDate: new Date().toISOString(),
        summary
      };
    } catch (error) {
      if (error instanceof PDFParsingError) {
        throw error;
      }

      ErrorHandler.logError(error as Error, 'PDF Processing');
      throw new PDFParsingError(`Failed to process PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private extractTransactions(text: string): Transaction[] {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const transactions: Transaction[] = [];

    // Transaction type keywords for your PDF format - be more inclusive
    const transactionKeywords = [
      'PAIEMENT', 'VIREMENT', 'VIRT', 'RETRAIT',
      'FACTURE', 'CARTE', 'BIM', 'WIN', 'INWI',
      'RESTAURANT', 'STORE', 'CLUB', 'BANQUE',
      'RECU', 'EMIS', 'NATIONAL', 'INTERNATIONAL'
    ];

    console.log('Looking for transactions in', lines.length, 'lines');
    console.log('Sample lines (first 15):');
    lines.slice(0, 15).forEach((line, index) => {
      console.log(`  ${index + 1}: "${line}"`);
    });

    // Try multiple parsing strategies
    console.log('=== Strategy 1: Lines starting with dates ===');
    const strategy1Count = this.tryDateStartStrategy(lines, transactionKeywords, transactions);

    if (strategy1Count === 0) {
      console.log('=== Strategy 2: Lines containing dates anywhere ===');
      this.tryDateAnywhereStrategy(lines, transactionKeywords, transactions);
    }

    if (transactions.length === 0) {
      console.log('=== Strategy 3: Lines with transaction keywords (no date requirement) ===');
      this.tryKeywordOnlyStrategy(lines, transactionKeywords, transactions);
    }

    console.log('Total transactions found:', transactions.length);
    return transactions;
  }

  private tryDateStartStrategy(lines: string[], transactionKeywords: string[], transactions: Transaction[]): number {
    let count = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip header lines and non-transaction lines
      if (this.isHeaderLine(line) || this.isBalanceLine(line)) {
        console.log(`Skipping header/balance line ${i + 1}: "${line}"`);
        continue;
      }

      // Look for lines that start with a date (be more flexible with whitespace)
      const dateMatch = line.match(/^\s*(\d{2}\/\d{2}\/\d{4})/);
      if (dateMatch) {
        console.log(`Line ${i + 1} has date pattern: "${line}"`);

        // Check if this line contains transaction keywords OR has amounts (more inclusive)
        const hasTransactionKeyword = transactionKeywords.some(keyword =>
          line.toUpperCase().includes(keyword)
        );

        const hasAmount = /\d{1,3}(?:[,\s]\d{3})*[,\.]\d{2}/.test(line);

        console.log(`Line ${i + 1} has transaction keyword: ${hasTransactionKeyword}, has amount: ${hasAmount}`);

        // Accept lines with either keywords OR amounts (since some transactions might not have our keywords)
        if (hasTransactionKeyword || hasAmount) {
          console.log('Found potential transaction line:', line);
          const transaction = this.parseTableTransactionLine(line);
          if (transaction) {
            transactions.push(transaction);
            console.log('Successfully parsed transaction:', transaction.operation);
            count++;
          } else {
            console.log('Failed to parse transaction line:', line);
          }
        }
      }
    }
    return count;
  }

  private tryDateAnywhereStrategy(lines: string[], transactionKeywords: string[], transactions: Transaction[]): void {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (this.isHeaderLine(line) || this.isBalanceLine(line)) {
        continue;
      }

      // Look for dates anywhere in the line
      const dateMatch = line.match(/(\d{2}\/\d{2}\/\d{4})/);
      if (dateMatch) {
        const hasTransactionKeyword = transactionKeywords.some(keyword =>
          line.toUpperCase().includes(keyword)
        );

        if (hasTransactionKeyword) {
          console.log('Strategy 2 - Found transaction line:', line);
          const transaction = this.parseFlexibleTransactionLine(line);
          if (transaction) {
            transactions.push(transaction);
            console.log('Strategy 2 - Successfully parsed:', transaction.operation);
          }
        }
      }
    }
  }

  private tryKeywordOnlyStrategy(lines: string[], transactionKeywords: string[], transactions: Transaction[]): void {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (this.isHeaderLine(line) || this.isBalanceLine(line)) {
        continue;
      }

      const hasTransactionKeyword = transactionKeywords.some(keyword =>
        line.toUpperCase().includes(keyword)
      );

      if (hasTransactionKeyword) {
        console.log('Strategy 3 - Found keyword line:', line);
        // Try to find a date in nearby lines
        const dateFromNearby = this.findDateInNearbyLines(lines, i);
        if (dateFromNearby) {
          const transaction = this.parseFlexibleTransactionLine(line, dateFromNearby);
          if (transaction) {
            transactions.push(transaction);
            console.log('Strategy 3 - Successfully parsed:', transaction.operation);
          }
        }
      }
    }
  }

  private parseTableTransactionLine(line: string): Transaction | null {
    try {
      console.log('Parsing table line:', line);

      // Extract date from the beginning of the line (allow some whitespace)
      const dateMatch = line.match(/^\s*(\d{2}\/\d{2}\/\d{4})/);
      if (!dateMatch) {
        console.log('No date found at start of line');
        return null;
      }

      const date = dateMatch[1];

      // Remove the date from the line to get the rest
      const remainingLine = line.substring(dateMatch[0].length).trim();

      // Try different ways to extract the operation description
      let operation = '';

      // Method 1: Split by multiple spaces or tabs
      const parts = remainingLine.split(/\s{2,}|\t+/).filter(part => part.trim().length > 0);
      console.log('Line parts after date:', parts);

      if (parts.length >= 1) {
        operation = parts[0].trim();
      } else {
        // Method 2: Take everything before the last amount as operation
        const amountMatches = remainingLine.match(/(\d{1,3}(?:[,\s]\d{3})*[,\.]\d{2})/g);
        if (amountMatches && amountMatches.length > 0) {
          const lastAmount = amountMatches[amountMatches.length - 1];
          const lastAmountIndex = remainingLine.lastIndexOf(lastAmount);
          operation = remainingLine.substring(0, lastAmountIndex).trim();
        } else {
          // Method 3: Use the whole remaining line
          operation = remainingLine;
        }
      }

      // Clean up the operation text
      operation = operation
        .replace(/\s+/g, ' ') // Normalize spaces
        .replace(/^\|+|\|+$/g, '') // Remove pipes
        .trim();

      // Find amounts in the line (could be in DEBIT or CREDIT columns)
      const amountMatches = line.match(/(\d{1,3}(?:[,\s]\d{3})*[,\.]\d{2})/g);
      if (!amountMatches || amountMatches.length === 0) {
        console.log('No amounts found in line');
        return null;
      }

      // Get the last amount (usually the transaction amount)
      const amountStr = amountMatches[amountMatches.length - 1];
      const amount = this.parseAmount(amountStr);

      // Determine transaction type based on operation keywords
      const type = this.determineTransactionType(line);

      // Classify the transaction
      const category = this.categoryService.classifyTransaction(operation, type);

      const transaction = {
        id: this.generateTransactionId(date, operation, amount),
        date,
        operation: operation.trim(),
        amount,
        type,
        category,
        rawText: line
      };

      console.log('Parsed transaction:', transaction);
      return transaction;

    } catch (error) {
      console.warn('Failed to parse table transaction line:', line, error);
      return null;
    }
  }

  private parseFlexibleTransactionLine(line: string, dateOverride?: string): Transaction | null {
    try {
      console.log('Parsing flexible line:', line);

      // Extract date from the line or use override
      let date = dateOverride;
      if (!date) {
        const dateMatch = line.match(/(\d{2}\/\d{2}\/\d{4})/);
        if (dateMatch) {
          date = dateMatch[1];
        } else {
          console.log('No date found in line');
          return null;
        }
      }

      // Extract operation description (remove date and amounts)
      const operation = line
        .replace(/\d{2}\/\d{2}\/\d{4}/g, '') // Remove dates
        .replace(/\d{1,3}(?:[,\s]\d{3})*[,\.]\d{2}/g, '') // Remove amounts
        .trim();

      // Find amounts in the line
      const amountMatches = line.match(/(\d{1,3}(?:[,\s]\d{3})*[,\.]\d{2})/g);
      if (!amountMatches || amountMatches.length === 0) {
        console.log('No amounts found in line');
        return null;
      }

      // Get the last amount (usually the transaction amount)
      const amountStr = amountMatches[amountMatches.length - 1];
      const amount = this.parseAmount(amountStr);

      // Determine transaction type
      const type = this.determineTransactionType(line);

      // Classify the transaction
      const category = this.categoryService.classifyTransaction(operation, type);

      const transaction = {
        id: this.generateTransactionId(date, operation, amount),
        date,
        operation: operation.trim() || 'Unknown Operation',
        amount,
        type,
        category,
        rawText: line
      };

      console.log('Parsed flexible transaction:', transaction);
      return transaction;

    } catch (error) {
      console.warn('Failed to parse flexible transaction line:', line, error);
      return null;
    }
  }

  private findDateInNearbyLines(lines: string[], currentIndex: number): string | null {
    // Look for dates in the 3 lines before and after current line
    const searchRange = 3;
    const start = Math.max(0, currentIndex - searchRange);
    const end = Math.min(lines.length, currentIndex + searchRange + 1);

    for (let i = start; i < end; i++) {
      const dateMatch = lines[i].match(/(\d{2}\/\d{2}\/\d{4})/);
      if (dateMatch) {
        return dateMatch[1];
      }
    }

    return null;
  }

  private parseTransactionLine(line: string, allLines: string[], index: number): Transaction | null {
    try {
      // Extract date - try multiple patterns
      let dateMatch = line.match(/(\d{2}\/\d{2}\/\d{4})/);
      if (!dateMatch) {
        // Try other date formats like DD-MM-YYYY or DD.MM.YYYY
        dateMatch = line.match(/(\d{2}[-\.]\d{2}[-\.]\d{4})/);
      }

      let date = '';
      if (dateMatch) {
        date = dateMatch[1].replace(/[-\.]/g, '/'); // Normalize to DD/MM/YYYY
      } else {
        // If no date in current line, look in previous or next lines
        for (let j = Math.max(0, index - 2); j <= Math.min(allLines.length - 1, index + 2); j++) {
          const nearbyLine = allLines[j];
          const nearbyDateMatch = nearbyLine.match(/(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/);
          if (nearbyDateMatch) {
            date = nearbyDateMatch[1].replace(/[-\.]/g, '/');
            break;
          }
        }
        if (!date) {
          console.log('No date found for line:', line);
          return null;
        }
      }

      // Extract amount - try multiple patterns
      let amountMatches = line.match(/(\d{1,3}(?:[,\s]\d{3})*[,\.]\d{2})/g);
      if (!amountMatches || amountMatches.length === 0) {
        // Try simpler patterns
        amountMatches = line.match(/(\d+[,\.]\d{2})/g);
      }
      if (!amountMatches || amountMatches.length === 0) {
        console.log('No amount found for line:', line);
        return null;
      }

      // The last amount is usually the transaction amount
      const amountStr = amountMatches[amountMatches.length - 1];
      const amount = this.parseAmount(amountStr);

      // Determine if it's debit or credit based on context
      const type = this.determineTransactionType(line);

      // Extract operation description
      let operation = this.extractOperation(line);

      // Sometimes operation continues on next line
      if (index + 1 < allLines.length && !allLines[index + 1].match(/\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4}/)) {
        const nextLine = allLines[index + 1];
        if (nextLine && !this.isHeaderLine(nextLine) && !this.isBalanceLine(nextLine)) {
          operation += ' ' + nextLine.trim();
        }
      }

      // Classify the transaction
      const category = this.categoryService.classifyTransaction(operation);

      return {
        id: this.generateTransactionId(date, operation, amount),
        date,
        operation: operation.trim(),
        amount,
        type,
        category,
        rawText: line
      };
    } catch (error) {
      console.warn('Failed to parse transaction line:', line, error);
      return null;
    }
  }

  private parseAmount(amountStr: string): number {
    // Handle different number formats: "1,234.56", "1 234,56", etc.
    const normalized = amountStr
      .replace(/\s/g, '') // Remove spaces
      .replace(/,(\d{3})/g, '$1') // Remove thousands separators
      .replace(/,(\d{2})$/, '.$1'); // Convert decimal comma to dot
    
    return parseFloat(normalized) || 0;
  }

  private determineTransactionType(line: string): 'DEBIT' | 'CREDIT' {
    const upperLine = line.toUpperCase();
    
    // Credit indicators
    if (upperLine.includes('VIREMENT RECU') || 
        upperLine.includes('DEPOT') || 
        upperLine.includes('CREDIT') ||
        upperLine.includes('SALAIRE')) {
      return 'CREDIT';
    }
    
    // Most transactions are debits by default
    return 'DEBIT';
  }

  private extractOperation(line: string): string {
    // Remove dates in various formats and amounts to get operation description
    let operation = line
      .replace(/\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4}/g, '') // Remove dates (DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY)
      .replace(/\d{1,3}(?:[,\s]\d{3})*[,\.]\d{2}/g, '') // Remove amounts
      .replace(/\d+[,\.]\d{2}/g, '') // Remove simpler amounts
      .trim();

    // Clean up extra spaces and common separators
    operation = operation.replace(/\s+/g, ' ')
                        .replace(/^\|+|\|+$/g, '') // Remove leading/trailing pipes
                        .replace(/^-+|-+$/g, '') // Remove leading/trailing dashes
                        .trim();

    return operation || 'Unknown Operation';
  }

  private isHeaderLine(line: string): boolean {

    // Be more specific about what constitutes a header line
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
      /^[\s\-=_]{5,}$/, // Lines with only separators (at least 5 chars)
    ];

    // Check if line matches any header pattern
    const isHeader = headerPatterns.some(pattern => pattern.test(line));

    // Also skip very short lines (less than 8 characters) unless they contain amounts
    const hasAmount = /\d{1,3}(?:[,\s]\d{3})*[,\.]\d{2}/.test(line);
    const tooShort = line.length < 8 && !hasAmount;

    return isHeader || tooShort;
  }

  private isBalanceLine(line: string): boolean {
    const upperLine = line.toUpperCase();
    return upperLine.includes('SOLDE') ||
           upperLine.includes('TOTAL') ||
           upperLine.includes('BALANCE');
  }

  private generateTransactionId(date: string, operation: string, amount: number): string {
    const hash = this.simpleHash(date + operation + amount.toString());
    return `txn_${hash}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private calculateSummary(transactions: Transaction[]) {
    const totalTransactions = transactions.length;
    const totalDebits = transactions
      .filter(t => t.type === 'DEBIT')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalCredits = transactions
      .filter(t => t.type === 'CREDIT')
      .reduce((sum, t) => sum + t.amount, 0);
    const balance = totalCredits - totalDebits;

    return {
      totalTransactions,
      totalDebits,
      totalCredits,
      balance
    };
  }
}
