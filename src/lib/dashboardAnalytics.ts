// Dashboard analytics utilities for processing transaction data

import { ParsedPDFResult } from '@/types/transaction';

export interface DashboardOperation {
  id: number;
  date: string;
  operation: string;
  status: 'Incoming' | 'Outgoing';
  amount: number; // Add amount field
  category?: string; // Unified category ID
  categoryInfo?: {
    name: string;
    color: string;
  };
}

export interface CategoryStats {
  category: string;
  name: string;
  count: number;
  totalAmount: number; // Add total amount
  percentage: number;
  color: string;
  type: 'Incoming' | 'Outgoing';
}

export interface TimeSeriesData {
  date: string;
  incoming: number;
  outgoing: number;
  net: number;
  incomingCount: number;
  outgoingCount: number;
  incomingAmount: number; // Add amount fields
  outgoingAmount: number;
  netAmount: number;
}

export interface DashboardStats {
  totalOperations: number;
  totalIncoming: number;
  totalOutgoing: number;
  netFlow: number;
  incomingCount: number;
  outgoingCount: number;
  totalIncomingAmount: number; // Add amount fields
  totalOutgoingAmount: number;
  netAmount: number;
  averageIncoming: number;
  averageOutgoing: number;
  averageIncomingAmount: number; // Add average amounts
  averageOutgoingAmount: number;
  mostActiveDay: string;
  topIncomingCategory: string;
  topOutgoingCategory: string;
  topIncomingCategoryAmount: number; // Add top category amounts
  topOutgoingCategoryAmount: number;
}

export class DashboardAnalytics {

  /**
   * Convert ParsedPDFResult to DashboardOperation format
   */
  static convertPDFResultToDashboardOperations(pdfResult: ParsedPDFResult): {
    operations: DashboardOperation[];
    metadata: {
      fileName: string;
      totalOperations: number;
      filteredOperations: number;
      extractDate: string;
      filters: Record<string, unknown>;
      groupBy: string;
    };
  } {
    const operations: DashboardOperation[] = pdfResult.transactions.map((transaction, index) => ({
      id: index + 1,
      date: transaction.date,
      operation: transaction.operation,
      status: transaction.type === 'CREDIT' ? 'Incoming' : 'Outgoing',
      amount: transaction.amount || 0, // Include amount with fallback
      category: transaction.category, // Unified category ID
      categoryInfo: {
        name: this.getCategoryDisplayName(transaction.category),
        color: this.getCategoryColor(transaction.category)
      }
    }));

    return {
      operations,
      metadata: {
        fileName: pdfResult.fileName,
        totalOperations: operations.length,
        filteredOperations: operations.length,
        extractDate: pdfResult.parseDate,
        filters: {
          searchText: "",
          status: "all",
          category: "all",
          dateFrom: "",
          dateTo: ""
        },
        groupBy: "none"
      }
    };
  }

  /**
   * Convert operations data to DashboardOperation format (for backward compatibility)
   */
  static convertOperationsToDashboardOperations(operationsData: any[]): {
    operations: DashboardOperation[];
    metadata: {
      fileName: string;
      totalOperations: number;
      filteredOperations: number;
      extractDate: string;
      filters: Record<string, unknown>;
      groupBy: string;
    };
  } {
    const operations: DashboardOperation[] = operationsData.map((op, index) => ({
      id: op.id || index + 1,
      date: op.date,
      operation: op.operation,
      status: op.status,
      amount: op.amount || 0, // Ensure amount exists with fallback
      category: op.category,
      categoryInfo: {
        name: this.getCategoryDisplayName(op.category),
        color: this.getCategoryColor(op.category)
      }
    }));

    return {
      operations,
      metadata: {
        fileName: 'Loaded Operations',
        totalOperations: operations.length,
        filteredOperations: operations.length,
        extractDate: new Date().toISOString(),
        filters: {
          searchText: "",
          status: "all",
          category: "all",
          dateFrom: "",
          dateTo: ""
        },
        groupBy: "none"
      }
    };
  }

  /**
   * Get display name for category using unified category system
   */
  private static getCategoryDisplayName(categoryId: string): string {
    // Import CategoryService dynamically to avoid circular dependencies
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { CategoryService } = require('./categoryService');
      const categoryService = CategoryService.getInstance();
      const category = categoryService.getCategoryByIdSync(categoryId);
      return category ? category.name : categoryId.charAt(0).toUpperCase() + categoryId.slice(1);
    } catch {
      // Fallback if CategoryService is not available
      return categoryId.charAt(0).toUpperCase() + categoryId.slice(1);
    }
  }

  /**
   * Get color for category using unified category system
   */
  private static getCategoryColor(categoryId: string): string {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { CategoryService } = require('./categoryService');
      const categoryService = CategoryService.getInstance();
      const category = categoryService.getCategoryById(categoryId);
      return category ? category.color : '#6B7280';
    } catch {
      // Fallback color if CategoryService is not available
      return '#6B7280';
    }
  }

  /**
   * Calculate overall statistics from operations
   */
  static calculateStats(operations: DashboardOperation[]): DashboardStats {
    const incoming = operations.filter(op => op.status === 'Incoming');
    const outgoing = operations.filter(op => op.status === 'Outgoing');
    
    const totalIncoming = incoming.length;
    const totalOutgoing = outgoing.length;
    
    // Calculate amounts
    const totalIncomingAmount = incoming.reduce((sum, op) => sum + op.amount, 0);
    const totalOutgoingAmount = outgoing.reduce((sum, op) => sum + op.amount, 0);
    const netAmount = totalIncomingAmount - totalOutgoingAmount;
    
    // Calculate most active day
    const dayCount = operations.reduce((acc, op) => {
      const date = this.normalizeDate(op.date);
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const mostActiveDay = Object.entries(dayCount)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || '';
    
    // Calculate top categories by amount
    const incomingCategories = this.getCategoryBreakdown(incoming, 'Incoming');
    const outgoingCategories = this.getCategoryBreakdown(outgoing, 'Outgoing');
    
    const topIncomingCategory = incomingCategories[0]?.name || 'None';
    const topOutgoingCategory = outgoingCategories[0]?.name || 'None';
    const topIncomingCategoryAmount = incomingCategories[0]?.totalAmount || 0;
    const topOutgoingCategoryAmount = outgoingCategories[0]?.totalAmount || 0;
    
    return {
      totalOperations: operations.length,
      totalIncoming,
      totalOutgoing,
      netFlow: totalIncoming - totalOutgoing,
      incomingCount: totalIncoming,
      outgoingCount: totalOutgoing,
      totalIncomingAmount,
      totalOutgoingAmount,
      netAmount,
      averageIncoming: totalIncoming > 0 ? totalIncoming / this.getUniqueDays(incoming).length : 0,
      averageOutgoing: totalOutgoing > 0 ? totalOutgoing / this.getUniqueDays(outgoing).length : 0,
      averageIncomingAmount: totalIncoming > 0 ? totalIncomingAmount / totalIncoming : 0,
      averageOutgoingAmount: totalOutgoing > 0 ? totalOutgoingAmount / totalOutgoing : 0,
      mostActiveDay,
      topIncomingCategory,
      topOutgoingCategory,
      topIncomingCategoryAmount,
      topOutgoingCategoryAmount
    };
  }

  /**
   * Get category breakdown for operations using unified category system
   */
  static getCategoryBreakdown(operations: DashboardOperation[], type: 'Incoming' | 'Outgoing'): CategoryStats[] {
    const categoryMap = new Map<string, {
      count: number;
      totalAmount: number;
      name: string;
      color: string;
    }>();

    operations.forEach(op => {
      const categoryKey = op.category || 'unknown';
      let categoryName = 'Unknown';
      let categoryColor = '#6B7280';

      // Try to get category info from CategoryService
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { CategoryService } = require('./categoryService');
        const categoryService = CategoryService.getInstance();
        const category = categoryService.getCategoryByIdSync(categoryKey);
        if (category) {
          categoryName = category.name;
          categoryColor = category.color;
        }
      } catch {
        // Fallback to categoryInfo if available
        categoryName = op.categoryInfo?.name || categoryKey || 'Unknown';
        categoryColor = op.categoryInfo?.color || '#6B7280';
      }

      if (categoryMap.has(categoryKey)) {
        const existing = categoryMap.get(categoryKey)!;
        existing.count++;
        existing.totalAmount += op.amount;
      } else {
        categoryMap.set(categoryKey, {
          count: 1,
          totalAmount: op.amount,
          name: categoryName,
          color: categoryColor
        });
      }
    });

    const total = operations.length;
    const totalAmount = operations.reduce((sum, op) => sum + op.amount, 0);
    
    return Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        name: data.name,
        count: data.count,
        totalAmount: data.totalAmount,
        percentage: (data.totalAmount / totalAmount) * 100, // Use amount percentage instead of count
        color: data.color,
        type
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount); // Sort by amount instead of count
  }

  /**
   * Generate time series data for trends
   */
  static generateTimeSeriesData(operations: DashboardOperation[]): TimeSeriesData[] {
    const dateMap = new Map<string, {
      incoming: number;
      outgoing: number;
      incomingCount: number;
      outgoingCount: number;
      incomingAmount: number;
      outgoingAmount: number;
    }>();

    operations.forEach(op => {
      const date = this.normalizeDate(op.date);
      
      if (!dateMap.has(date)) {
        dateMap.set(date, {
          incoming: 0,
          outgoing: 0,
          incomingCount: 0,
          outgoingCount: 0,
          incomingAmount: 0,
          outgoingAmount: 0
        });
      }

      const dayData = dateMap.get(date)!;
      if (op.status === 'Incoming') {
        dayData.incoming++;
        dayData.incomingCount++;
        dayData.incomingAmount += op.amount;
      } else {
        dayData.outgoing++;
        dayData.outgoingCount++;
        dayData.outgoingAmount += op.amount;
      }
    });

    return Array.from(dateMap.entries())
      .map(([date, data]) => ({
        date,
        incoming: data.incoming,
        outgoing: data.outgoing,
        net: data.incoming - data.outgoing,
        incomingCount: data.incomingCount,
        outgoingCount: data.outgoingCount,
        incomingAmount: data.incomingAmount,
        outgoingAmount: data.outgoingAmount,
        netAmount: data.incomingAmount - data.outgoingAmount
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  /**
   * Get daily activity data
   */
  static getDailyActivity(operations: DashboardOperation[]): Array<{
    date: string;
    count: number;
    incoming: number;
    outgoing: number;
    incomingAmount: number;
    outgoingAmount: number;
    netAmount: number;
  }> {
    const dailyMap = new Map<string, {
      count: number;
      incoming: number;
      outgoing: number;
      incomingAmount: number;
      outgoingAmount: number;
    }>();

    operations.forEach(op => {
      const date = this.normalizeDate(op.date);
      
      if (!dailyMap.has(date)) {
        dailyMap.set(date, { 
          count: 0, 
          incoming: 0, 
          outgoing: 0, 
          incomingAmount: 0, 
          outgoingAmount: 0 
        });
      }

      const dayData = dailyMap.get(date)!;
      dayData.count++;
      
      if (op.status === 'Incoming') {
        dayData.incoming++;
        dayData.incomingAmount += op.amount;
      } else {
        dayData.outgoing++;
        dayData.outgoingAmount += op.amount;
      }
    });

    return Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date,
        ...data,
        netAmount: data.incomingAmount - data.outgoingAmount
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  /**
   * Get hourly distribution (if time data is available)
   */
  static getHourlyDistribution(operations: DashboardOperation[]): Array<{
    hour: number;
    count: number;
  }> {
    const hourMap = new Map<number, number>();
    
    // Initialize all hours
    for (let i = 0; i < 24; i++) {
      hourMap.set(i, 0);
    }

    operations.forEach(() => {
      // Try to extract hour from operation text or use random distribution
      // This is a placeholder - actual implementation would depend on data format
      const randomHour = Math.floor(Math.random() * 24);
      hourMap.set(randomHour, (hourMap.get(randomHour) || 0) + 1);
    });

    return Array.from(hourMap.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour - b.hour);
  }

  /**
   * Get top operations by frequency
   */
  static getTopOperations(operations: DashboardOperation[], limit: number = 10): Array<{
    operation: string;
    count: number;
    category: string;
    type: 'Incoming' | 'Outgoing';
  }> {
    const operationMap = new Map<string, {
      count: number;
      category: string;
      type: 'Incoming' | 'Outgoing';
    }>();

    operations.forEach(op => {
      const key = op.operation.toLowerCase().trim();
      const category = op.categoryInfo?.name || 'Unknown';
      
      if (operationMap.has(key)) {
        operationMap.get(key)!.count++;
      } else {
        operationMap.set(key, {
          count: 1,
          category,
          type: op.status
        });
      }
    });

    return Array.from(operationMap.entries())
      .map(([operation, data]) => ({
        operation,
        ...data
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Normalize date format for consistent grouping
   */
  private static normalizeDate(dateStr: string): string {
    // Handle different date formats (DD/MM, DD/MM/YYYY, etc.)
    const parts = dateStr.split('/');
    if (parts.length === 2) {
      // Assume current year for DD/MM format
      const currentYear = new Date().getFullYear();
      return `${currentYear}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    } else if (parts.length === 3) {
      // DD/MM/YYYY format
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return dateStr;
  }

  /**
   * Get unique days from operations
   */
  private static getUniqueDays(operations: DashboardOperation[]): string[] {
    const uniqueDays = new Set<string>();
    operations.forEach(op => {
      uniqueDays.add(this.normalizeDate(op.date));
    });
    return Array.from(uniqueDays);
  }

  /**
   * Filter operations by date range
   */
  static filterByDateRange(
    operations: DashboardOperation[], 
    startDate: string, 
    endDate: string
  ): DashboardOperation[] {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return operations.filter(op => {
      const opDate = new Date(this.normalizeDate(op.date));
      return opDate >= start && opDate <= end;
    });
  }

  /**
   * Filter operations by category
   */
  static filterByCategory(
    operations: DashboardOperation[],
    category: string,
    type: 'Incoming' | 'Outgoing' | 'All' = 'All'
  ): DashboardOperation[] {
    return operations.filter(op => {
      if (type !== 'All' && op.status !== type) return false;

      // Use the unified category system
      const opCategory = op.category || op.categoryInfo?.name || 'Unknown';
      return opCategory === category;
    });
  }
}
