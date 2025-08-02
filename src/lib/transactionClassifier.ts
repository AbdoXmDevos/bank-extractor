import { Transaction, Category, CategoryStats } from '@/types/transaction';
import { CategoryService } from './categoryService';

export class TransactionClassifier {
  private categoryService: CategoryService;

  constructor() {
    this.categoryService = CategoryService.getInstance();
  }

  /**
   * Classify a single transaction based on its operation text
   */
  public classifyTransaction(transaction: Transaction): Transaction {
    const category = this.categoryService.classifyTransaction(transaction.operation, transaction.type);
    return {
      ...transaction,
      category
    };
  }

  /**
   * Classify multiple transactions
   */
  public classifyTransactions(transactions: Transaction[]): Transaction[] {
    return transactions.map(transaction => this.classifyTransaction(transaction));
  }

  /**
   * Re-classify transactions with updated category rules
   */
  public reclassifyTransactions(transactions: Transaction[]): Transaction[] {
    return this.classifyTransactions(transactions);
  }

  /**
   * Get statistics for each category
   */
  public getCategoryStats(transactions: Transaction[]): CategoryStats[] {
    const categories = this.categoryService.getCategories();
    const totalAmount = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    const stats: CategoryStats[] = [];
    
    for (const category of categories) {
      const categoryTransactions = transactions.filter(t => t.category === category.id);
      const categoryAmount = categoryTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const percentage = totalAmount > 0 ? (categoryAmount / totalAmount) * 100 : 0;
      
      if (categoryTransactions.length > 0) {
        stats.push({
          category: category.name,
          count: categoryTransactions.length,
          totalAmount: categoryAmount,
          percentage,
          color: category.color
        });
      }
    }
    
    // Sort by total amount descending
    return stats.sort((a, b) => b.totalAmount - a.totalAmount);
  }

  /**
   * Get spending breakdown by category for debit transactions only
   */
  public getSpendingBreakdown(transactions: Transaction[]): CategoryStats[] {
    const debitTransactions = transactions.filter(t => t.type === 'DEBIT');
    return this.getCategoryStats(debitTransactions);
  }

  /**
   * Get income breakdown by category for credit transactions only
   */
  public getIncomeBreakdown(transactions: Transaction[]): CategoryStats[] {
    const creditTransactions = transactions.filter(t => t.type === 'CREDIT');
    return this.getCategoryStats(creditTransactions);
  }

  /**
   * Suggest category for a transaction based on similar transactions
   */
  public suggestCategory(operation: string, existingTransactions: Transaction[]): string {
    const normalizedOperation = operation.toLowerCase();
    
    // Find similar transactions
    const similarTransactions = existingTransactions.filter(t => {
      const similarity = this.calculateSimilarity(normalizedOperation, t.operation.toLowerCase());
      return similarity > 0.6; // 60% similarity threshold
    });
    
    if (similarTransactions.length > 0) {
      // Return the most common category among similar transactions
      const categoryCount: { [key: string]: number } = {};
      similarTransactions.forEach(t => {
        categoryCount[t.category] = (categoryCount[t.category] || 0) + 1;
      });
      
      const mostCommonCategory = Object.entries(categoryCount)
        .sort(([,a], [,b]) => b - a)[0][0];
      
      return mostCommonCategory;
    }
    
    // Fallback to keyword-based classification
    // Note: We don't have transaction type here, so we'll use the general classification
    return this.categoryService.classifyTransaction(operation);
  }

  /**
   * Calculate similarity between two strings using Jaccard similarity
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.split(/\s+/));
    const words2 = new Set(str2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Get transactions by category
   */
  public getTransactionsByCategory(transactions: Transaction[], categoryId: string): Transaction[] {
    return transactions.filter(t => t.category === categoryId);
  }

  /**
   * Get top spending categories
   */
  public getTopSpendingCategories(transactions: Transaction[], limit: number = 5): CategoryStats[] {
    const spendingBreakdown = this.getSpendingBreakdown(transactions);
    return spendingBreakdown.slice(0, limit);
  }

  /**
   * Validate and fix transaction categories
   */
  public validateTransactionCategories(transactions: Transaction[]): Transaction[] {
    const validCategories = new Set(this.categoryService.getCategories().map(c => c.id));
    
    return transactions.map(transaction => {
      if (!validCategories.has(transaction.category)) {
        // Re-classify if category is invalid
        return this.classifyTransaction(transaction);
      }
      return transaction;
    });
  }

  /**
   * Get category distribution for visualization
   */
  public getCategoryDistribution(transactions: Transaction[]): { name: string; value: number; color: string }[] {
    const stats = this.getCategoryStats(transactions);
    return stats.map(stat => ({
      name: stat.category,
      value: stat.totalAmount,
      color: stat.color
    }));
  }
}
