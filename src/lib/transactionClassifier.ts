import { Transaction, CategoryStats } from '@/types/transaction';
import { CategoryService } from './categoryService';

export class TransactionClassifier {
  private categoryService: CategoryService;

  constructor() {
    this.categoryService = CategoryService.getInstance();
  }

  /**
   * Classify a single transaction based on its operation text
   */
  public async classifyTransaction(transaction: Transaction): Promise<Transaction> {
    const category = await this.categoryService.classifyTransaction(transaction.operation, transaction.type);
    return {
      ...transaction,
      category
    };
  }

  /**
   * Classify multiple transactions
   */
  public async classifyTransactions(transactions: Transaction[]): Promise<Transaction[]> {
    const classifiedTransactions = [];
    for (const transaction of transactions) {
      const classified = await this.classifyTransaction(transaction);
      classifiedTransactions.push(classified);
    }
    return classifiedTransactions;
  }

  /**
   * Re-classify transactions with updated category rules
   */
  public async reclassifyTransactions(transactions: Transaction[]): Promise<Transaction[]> {
    return await this.classifyTransactions(transactions);
  }

  /**
   * Get statistics for each category
   */
  public async getCategoryStats(transactions: Transaction[]): Promise<CategoryStats[]> {
    const categories = await this.categoryService.getCategories();
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
  public async getSpendingBreakdown(transactions: Transaction[]): Promise<CategoryStats[]> {
    const debitTransactions = transactions.filter(t => t.type === 'DEBIT');
    return await this.getCategoryStats(debitTransactions);
  }

  /**
   * Get income breakdown by category for credit transactions only
   */
  public async getIncomeBreakdown(transactions: Transaction[]): Promise<CategoryStats[]> {
    const creditTransactions = transactions.filter(t => t.type === 'CREDIT');
    return await this.getCategoryStats(creditTransactions);
  }

  /**
   * Suggest category for a transaction based on similar transactions
   */
  public async suggestCategory(operation: string, existingTransactions: Transaction[]): Promise<string> {
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
    return await this.categoryService.classifyTransaction(operation);
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
  public async getTopSpendingCategories(transactions: Transaction[], limit: number = 5): Promise<CategoryStats[]> {
    const spendingBreakdown = await this.getSpendingBreakdown(transactions);
    return spendingBreakdown.slice(0, limit);
  }

  /**
   * Validate and fix transaction categories
   */
  public async validateTransactionCategories(transactions: Transaction[]): Promise<Transaction[]> {
    const categories = await this.categoryService.getCategories();
    const validCategories = new Set(categories.map(c => c.id));

    const validatedTransactions = [];
    for (const transaction of transactions) {
      if (!validCategories.has(transaction.category)) {
        // Re-classify if category is invalid
        const reclassified = await this.classifyTransaction(transaction);
        validatedTransactions.push(reclassified);
      } else {
        validatedTransactions.push(transaction);
      }
    }
    return validatedTransactions;
  }

  /**
   * Get category distribution for visualization
   */
  public async getCategoryDistribution(transactions: Transaction[]): Promise<{ name: string; value: number; color: string }[]> {
    const stats = await this.getCategoryStats(transactions);
    return stats.map(stat => ({
      name: stat.category,
      value: stat.totalAmount,
      color: stat.color
    }));
  }
}
