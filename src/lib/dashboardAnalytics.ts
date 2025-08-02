// Dashboard analytics utilities for processing transaction data

import { ParsedPDFResult, Transaction } from '@/types/transaction';

export interface DashboardOperation {
  id: number;
  date: string;
  operation: string;
  status: 'Incoming' | 'Outgoing';
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
  totalAmount?: number;
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
}

export interface DashboardStats {
  totalOperations: number;
  totalIncoming: number;
  totalOutgoing: number;
  netFlow: number;
  incomingCount: number;
  outgoingCount: number;
  averageIncoming: number;
  averageOutgoing: number;
  mostActiveDay: string;
  topIncomingCategory: string;
  topOutgoingCategory: string;
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
      filters: any;
      groupBy: string;
    };
  } {
    const operations: DashboardOperation[] = pdfResult.transactions.map((transaction, index) => ({
      id: index + 1,
      date: transaction.date,
      operation: transaction.operation,
      status: transaction.type === 'CREDIT' ? 'Incoming' : 'Outgoing',
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
   * Get display name for category using unified category system
   */
  private static getCategoryDisplayName(categoryId: string): string {
    // Import CategoryService dynamically to avoid circular dependencies
    try {
      const { CategoryService } = require('./categoryService');
      const categoryService = CategoryService.getInstance();
      const category = categoryService.getCategoryById(categoryId);
      return category ? category.name : categoryId.charAt(0).toUpperCase() + categoryId.slice(1);
    } catch (error) {
      // Fallback if CategoryService is not available
      return categoryId.charAt(0).toUpperCase() + categoryId.slice(1);
    }
  }

  /**
   * Get color for category using unified category system
   */
  private static getCategoryColor(categoryId: string): string {
    try {
      const { CategoryService } = require('./categoryService');
      const categoryService = CategoryService.getInstance();
      const category = categoryService.getCategoryById(categoryId);
      return category ? category.color : '#6B7280';
    } catch (error) {
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
    
    // Calculate most active day
    const dayCount = operations.reduce((acc, op) => {
      const date = this.normalizeDate(op.date);
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const mostActiveDay = Object.entries(dayCount)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || '';
    
    // Calculate top categories
    const incomingCategories = this.getCategoryBreakdown(incoming, 'Incoming');
    const outgoingCategories = this.getCategoryBreakdown(outgoing, 'Outgoing');
    
    const topIncomingCategory = incomingCategories[0]?.name || 'None';
    const topOutgoingCategory = outgoingCategories[0]?.name || 'None';
    
    return {
      totalOperations: operations.length,
      totalIncoming,
      totalOutgoing,
      netFlow: totalIncoming - totalOutgoing,
      incomingCount: totalIncoming,
      outgoingCount: totalOutgoing,
      averageIncoming: totalIncoming > 0 ? totalIncoming / this.getUniqueDays(incoming).length : 0,
      averageOutgoing: totalOutgoing > 0 ? totalOutgoing / this.getUniqueDays(outgoing).length : 0,
      mostActiveDay,
      topIncomingCategory,
      topOutgoingCategory
    };
  }

  /**
   * Get category breakdown for operations using unified category system
   */
  static getCategoryBreakdown(operations: DashboardOperation[], type: 'Incoming' | 'Outgoing'): CategoryStats[] {
    const categoryMap = new Map<string, {
      count: number;
      name: string;
      color: string;
    }>();

    operations.forEach(op => {
      const categoryKey = op.category || 'unknown';
      let categoryName = 'Unknown';
      let categoryColor = '#6B7280';

      // Try to get category info from CategoryService
      try {
        const { CategoryService } = require('./categoryService');
        const categoryService = CategoryService.getInstance();
        const category = categoryService.getCategoryById(categoryKey);
        if (category) {
          categoryName = category.name;
          categoryColor = category.color;
        }
      } catch (error) {
        // Fallback to categoryInfo if available
        categoryName = op.categoryInfo?.name || categoryKey || 'Unknown';
        categoryColor = op.categoryInfo?.color || '#6B7280';
      }

      if (categoryMap.has(categoryKey)) {
        categoryMap.get(categoryKey)!.count++;
      } else {
        categoryMap.set(categoryKey, {
          count: 1,
          name: categoryName,
          color: categoryColor
        });
      }
    });

    const total = operations.length;
    
    return Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        name: data.name,
        count: data.count,
        percentage: (data.count / total) * 100,
        color: data.color,
        type
      }))
      .sort((a, b) => b.count - a.count);
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
    }>();

    operations.forEach(op => {
      const date = this.normalizeDate(op.date);
      
      if (!dateMap.has(date)) {
        dateMap.set(date, {
          incoming: 0,
          outgoing: 0,
          incomingCount: 0,
          outgoingCount: 0
        });
      }

      const dayData = dateMap.get(date)!;
      if (op.status === 'Incoming') {
        dayData.incoming++;
        dayData.incomingCount++;
      } else {
        dayData.outgoing++;
        dayData.outgoingCount++;
      }
    });

    return Array.from(dateMap.entries())
      .map(([date, data]) => ({
        date,
        incoming: data.incoming,
        outgoing: data.outgoing,
        net: data.incoming - data.outgoing,
        incomingCount: data.incomingCount,
        outgoingCount: data.outgoingCount
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
  }> {
    const dailyMap = new Map<string, {
      count: number;
      incoming: number;
      outgoing: number;
    }>();

    operations.forEach(op => {
      const date = this.normalizeDate(op.date);
      
      if (!dailyMap.has(date)) {
        dailyMap.set(date, { count: 0, incoming: 0, outgoing: 0 });
      }

      const dayData = dailyMap.get(date)!;
      dayData.count++;
      
      if (op.status === 'Incoming') {
        dayData.incoming++;
      } else {
        dayData.outgoing++;
      }
    });

    return Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date,
        ...data
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

    operations.forEach(op => {
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
      
      const opCategory = op.status === 'Incoming' ? op.incomingCategory : op.outgoingCategory;
      return opCategory === category;
    });
  }
}
