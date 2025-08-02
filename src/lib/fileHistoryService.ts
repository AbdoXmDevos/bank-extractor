import { ParsedPDFResult } from '@/types/transaction';

export interface FileHistoryEntry {
  id: string;
  fileName: string;
  uploadDate: string;
  fileSize: number;
  totalTransactions: number;
  totalDebits: number;
  totalCredits: number;
  balance: number;
  data: ParsedPDFResult;
}

export class FileHistoryService {
  private static instance: FileHistoryService;
  private storageKey = 'cih_bank_statement_history';

  private constructor() {}

  public static getInstance(): FileHistoryService {
    if (!FileHistoryService.instance) {
      FileHistoryService.instance = new FileHistoryService();
    }
    return FileHistoryService.instance;
  }

  public saveFile(pdfResult: ParsedPDFResult, fileSize: number): FileHistoryEntry {
    const entry: FileHistoryEntry = {
      id: this.generateId(),
      fileName: pdfResult.fileName,
      uploadDate: new Date().toISOString(),
      fileSize,
      totalTransactions: pdfResult.summary.totalTransactions,
      totalDebits: pdfResult.summary.totalDebits,
      totalCredits: pdfResult.summary.totalCredits,
      balance: pdfResult.summary.balance,
      data: pdfResult
    };

    const history = this.getHistory();
    history.unshift(entry); // Add to beginning of array

    // Keep only last 10 files to avoid localStorage size issues
    const limitedHistory = history.slice(0, 10);
    
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(limitedHistory));
    } catch (error) {
      console.warn('Failed to save file to history:', error);
      // If localStorage is full, try to save with fewer entries
      try {
        const reducedHistory = history.slice(0, 5);
        localStorage.setItem(this.storageKey, JSON.stringify(reducedHistory));
      } catch (retryError) {
        console.error('Failed to save file history even with reduced entries:', retryError);
      }
    }

    return entry;
  }

  public getHistory(): FileHistoryEntry[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load file history:', error);
      return [];
    }
  }

  public getFileById(id: string): FileHistoryEntry | null {
    const history = this.getHistory();
    return history.find(entry => entry.id === id) || null;
  }

  public deleteFile(id: string): boolean {
    try {
      const history = this.getHistory();
      const filteredHistory = history.filter(entry => entry.id !== id);
      localStorage.setItem(this.storageKey, JSON.stringify(filteredHistory));
      return true;
    } catch (error) {
      console.error('Failed to delete file from history:', error);
      return false;
    }
  }

  public clearHistory(): boolean {
    try {
      localStorage.removeItem(this.storageKey);
      return true;
    } catch (error) {
      console.error('Failed to clear file history:', error);
      return false;
    }
  }

  public getStorageUsage(): { used: number; total: number; percentage: number } {
    try {
      const stored = localStorage.getItem(this.storageKey);
      const used = stored ? new Blob([stored]).size : 0;
      const total = 5 * 1024 * 1024; // Assume 5MB localStorage limit
      const percentage = (used / total) * 100;
      
      return { used, total, percentage };
    } catch {
      return { used: 0, total: 0, percentage: 0 };
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  public formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  public exportHistory(): string {
    const history = this.getHistory();
    return JSON.stringify(history, null, 2);
  }

  public importHistory(jsonData: string): boolean {
    try {
      const importedHistory = JSON.parse(jsonData);
      
      // Validate the imported data structure
      if (!Array.isArray(importedHistory)) {
        throw new Error('Invalid history format');
      }
      
      // Validate each entry has required fields
      for (const entry of importedHistory) {
        if (!entry.id || !entry.fileName || !entry.data) {
          throw new Error('Invalid history entry format');
        }
      }
      
      localStorage.setItem(this.storageKey, JSON.stringify(importedHistory));
      return true;
    } catch (error) {
      console.error('Failed to import history:', error);
      return false;
    }
  }
}
