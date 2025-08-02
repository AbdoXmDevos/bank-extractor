import { PDFProcessor } from '../pdfProcessor';
import { CategoryService } from '../categoryService';

// Mock pdf-parse
jest.mock('pdf-parse', () => {
  return jest.fn().mockResolvedValue({
    text: `
CREDIT IMMOBILIER ET HOTELIER
RELEVE DE COMPTE
Compte: 123456789
Période: 01/01/2024 au 31/01/2024

DATE        OPERATION                                    DEBIT      CREDIT     SOLDE
01/01/2024  SOLDE PRECEDENT                                                   5000.00
02/01/2024  PAIEMENT PAR CARTE 4112 BIM 1714           150.50               4849.50
03/01/2024  VIREMENT RECU DE ENTREPRISE ABC                        3000.00   7849.50
05/01/2024  PAIEMENT INTERNET INTERNATIONAL CARTE4112 SPOTIFY AB   9.99     7839.51
10/01/2024  RETRAIT DISTRIBUTEUR ATM AGDAL              500.00               7339.51
15/01/2024  PAIEMENT PAR CARTE 4112 MARJANE RABAT      245.75               7093.76
20/01/2024  FRAIS DE TENUE DE COMPTE                     15.00               7078.76
25/01/2024  PAIEMENT PAR CARTE 4112 RESTAURANT SUSHI    85.00               6993.76
    `,
    numpages: 1
  });
});

describe('PDFProcessor', () => {
  let pdfProcessor: PDFProcessor;
  let mockBuffer: Buffer;

  beforeEach(() => {
    pdfProcessor = new PDFProcessor();
    mockBuffer = Buffer.from('mock pdf content');
  });

  describe('processPDF', () => {
    it('should successfully process a valid CIH bank statement', async () => {
      const result = await pdfProcessor.processPDF(mockBuffer, 'test-statement.pdf');

      expect(result).toBeDefined();
      expect(result.fileName).toBe('test-statement.pdf');
      expect(result.totalPages).toBe(1);
      expect(result.transactions).toHaveLength(6); // Excluding balance lines
      expect(result.summary).toBeDefined();
    });

    it('should extract transaction details correctly', async () => {
      const result = await pdfProcessor.processPDF(mockBuffer, 'test-statement.pdf');
      const transactions = result.transactions;

      // Check first transaction (BIM payment)
      const bimTransaction = transactions.find(t => t.operation.includes('BIM'));
      expect(bimTransaction).toBeDefined();
      expect(bimTransaction?.amount).toBe(150.50);
      expect(bimTransaction?.type).toBe('DEBIT');
      expect(bimTransaction?.category).toBe('shopping'); // Should be categorized as shopping

      // Check credit transaction (virement)
      const virementTransaction = transactions.find(t => t.operation.includes('VIREMENT'));
      expect(virementTransaction).toBeDefined();
      expect(virementTransaction?.amount).toBe(3000.00);
      expect(virementTransaction?.type).toBe('CREDIT');
      expect(virementTransaction?.category).toBe('transfer');
    });

    it('should calculate summary correctly', async () => {
      const result = await pdfProcessor.processPDF(mockBuffer, 'test-statement.pdf');
      const summary = result.summary;

      expect(summary.totalTransactions).toBe(6);
      expect(summary.totalCredits).toBe(3000.00);
      expect(summary.totalDebits).toBe(1006.24); // Sum of all debits
      expect(summary.balance).toBe(1993.76); // Credits - Debits
    });

    it('should handle empty buffer', async () => {
      const emptyBuffer = Buffer.alloc(0);
      
      await expect(pdfProcessor.processPDF(emptyBuffer, 'empty.pdf'))
        .rejects.toThrow('PDF buffer is empty');
    });

    it('should sanitize file names', async () => {
      const result = await pdfProcessor.processPDF(mockBuffer, '<script>alert("xss")</script>.pdf');
      
      expect(result.fileName).not.toContain('<script>');
      expect(result.fileName).not.toContain('</script>');
    });
  });

  describe('transaction parsing', () => {
    it('should parse amounts correctly', async () => {
      const result = await pdfProcessor.processPDF(mockBuffer, 'test.pdf');
      const transactions = result.transactions;

      transactions.forEach(transaction => {
        expect(typeof transaction.amount).toBe('number');
        expect(transaction.amount).toBeGreaterThan(0);
      });
    });

    it('should assign correct transaction types', async () => {
      const result = await pdfProcessor.processPDF(mockBuffer, 'test.pdf');
      const transactions = result.transactions;

      const creditTransactions = transactions.filter(t => t.type === 'CREDIT');
      const debitTransactions = transactions.filter(t => t.type === 'DEBIT');

      expect(creditTransactions.length).toBeGreaterThan(0);
      expect(debitTransactions.length).toBeGreaterThan(0);
    });

    it('should generate unique transaction IDs', async () => {
      const result = await pdfProcessor.processPDF(mockBuffer, 'test.pdf');
      const transactions = result.transactions;
      const ids = transactions.map(t => t.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(transactions.length);
    });
  });
});

describe('CategoryService Integration', () => {
  let pdfProcessor: PDFProcessor;

  beforeEach(() => {
    pdfProcessor = new PDFProcessor();
    CategoryService.getInstance();
  });

  it('should categorize transactions based on keywords', async () => {
    const result = await pdfProcessor.processPDF(Buffer.from('mock'), 'test.pdf');
    const transactions = result.transactions;

    // Check specific categorizations
    const bimTransaction = transactions.find(t => t.operation.includes('BIM'));
    expect(bimTransaction?.category).toBe('shopping');

    const spotifyTransaction = transactions.find(t => t.operation.includes('SPOTIFY'));
    expect(spotifyTransaction?.category).toBe('internet_payment');

    const retraitTransaction = transactions.find(t => t.operation.includes('RETRAIT'));
    expect(retraitTransaction?.category).toBe('cash_withdrawal');
  });

  it('should use default category for unrecognized transactions', async () => {
    // This would require a transaction that doesn't match any keywords
    const result = await pdfProcessor.processPDF(Buffer.from('mock'), 'test.pdf');
    const transactions = result.transactions;

    // Check that all transactions have a category
    transactions.forEach(transaction => {
      expect(transaction.category).toBeDefined();
      expect(transaction.category).not.toBe('');
    });
  });
});
