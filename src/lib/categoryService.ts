import { Category, CategoryConfig } from '@/types/transaction';
import categoriesConfig from '@/config/categories.json';

export class CategoryService {
  private static instance: CategoryService;
  private categories: Category[];
  private defaultCategories: { DEBIT: string; CREDIT: string };
  private otherCategories: Category[];

  private constructor() {
    const config = categoriesConfig as CategoryConfig;
    this.categories = [...config.categories, ...config.otherCategories];
    this.defaultCategories = config.defaultCategories;
    this.otherCategories = config.otherCategories;
  }

  public static getInstance(): CategoryService {
    if (!CategoryService.instance) {
      CategoryService.instance = new CategoryService();
    }
    return CategoryService.instance;
  }

  public getCategories(): Category[] {
    return this.categories;
  }

  public getCategoryById(id: string): Category | undefined {
    return this.categories.find(cat => cat.id === id);
  }

  public classifyTransaction(operationText: string, transactionType?: 'DEBIT' | 'CREDIT'): string {
    const normalizedText = operationText.toUpperCase();

    // Filter categories based on transaction type if provided
    const applicableCategories = transactionType
      ? this.categories.filter(cat =>
          !cat.applicableFor || cat.applicableFor.includes(transactionType)
        )
      : this.categories;

    for (const category of applicableCategories) {
      for (const keyword of category.keywords) {
        if (normalizedText.includes(keyword.toUpperCase())) {
          return category.id;
        }
      }
    }

    // Return appropriate default category based on transaction type
    if (transactionType) {
      return this.defaultCategories[transactionType];
    }

    // Fallback to expense default if no type specified
    return this.defaultCategories.DEBIT;
  }

  public addCategory(category: Omit<Category, 'id'>): Category {
    const newCategory: Category = {
      ...category,
      id: category.name.toLowerCase().replace(/\s+/g, '_')
    };

    this.categories.push(newCategory);
    return newCategory;
  }

  /**
   * Get categories applicable for a specific transaction type
   */
  public getCategoriesForType(transactionType: 'DEBIT' | 'CREDIT'): Category[] {
    return this.categories.filter(cat =>
      !cat.applicableFor || cat.applicableFor.includes(transactionType)
    );
  }

  /**
   * Get default category for a transaction type
   */
  public getDefaultCategory(transactionType: 'DEBIT' | 'CREDIT'): string {
    return this.defaultCategories[transactionType];
  }

  /**
   * Check if a category is applicable for a transaction type
   */
  public isCategoryApplicableForType(categoryId: string, transactionType: 'DEBIT' | 'CREDIT'): boolean {
    const category = this.getCategoryById(categoryId);
    if (!category) return false;

    return !category.applicableFor || category.applicableFor.includes(transactionType);
  }

  public updateCategory(id: string, updates: Partial<Category>): Category | null {
    const categoryIndex = this.categories.findIndex(cat => cat.id === id);
    if (categoryIndex === -1) return null;
    
    this.categories[categoryIndex] = { ...this.categories[categoryIndex], ...updates };
    return this.categories[categoryIndex];
  }

  public deleteCategory(id: string): boolean {
    // Cannot delete default categories
    if (id === this.getDefaultCategory('DEBIT') || id === this.getDefaultCategory('CREDIT')) {
      return false;
    }
    
    const categoryIndex = this.categories.findIndex(cat => cat.id === id);
    if (categoryIndex === -1) return false;
    
    this.categories.splice(categoryIndex, 1);
    return true;
  }

  public getCategoryColor(categoryId: string): string {
    const category = this.getCategoryById(categoryId);
    return category?.color || '#6B7280';
  }

  public getCategoryName(categoryId: string): string {
    const category = this.getCategoryById(categoryId);
    return category?.name || 'Other';
  }
}
