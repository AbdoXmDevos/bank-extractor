export interface Transaction {
  id: string;
  date: string;
  operation: string;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
  category: string;
  rawText: string;
}

export interface Category {
  id: string;
  name: string;
  keywords: string[];
  color: string;
  description?: string;
  applicableFor?: ('DEBIT' | 'CREDIT')[];
}

export interface CategoryConfig {
  categories: Category[];
  defaultCategories: {
    DEBIT: string;
    CREDIT: string;
  };
  otherCategories: Category[];
}

export interface ParsedPDFResult {
  transactions: Transaction[];
  totalPages: number;
  fileName: string;
  parseDate: string;
  summary: {
    totalTransactions: number;
    totalDebits: number;
    totalCredits: number;
    balance: number;
  };
}

export interface UploadResponse {
  success: boolean;
  data?: ParsedPDFResult;
  error?: string;
}

export interface FilterOptions {
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  type?: 'DEBIT' | 'CREDIT' | 'ALL';
  searchText?: string;
}

export interface CategoryStats {
  category: string;
  count: number;
  totalAmount: number;
  percentage: number;
  color: string;
}
