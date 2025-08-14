import { Category, CategoryConfig } from '@/types/transaction';
import categoriesConfig from '@/config/categories.json';
import { sql } from '@/lib/database';

export class CategoryService {
  private static instance: CategoryService;
  private categories: Category[] = [];
  private defaultCategories: { DEBIT: string; CREDIT: string };
  private initialized = false;

  private constructor() {
    const config = categoriesConfig as CategoryConfig;
    this.defaultCategories = config.defaultCategories;
    // Initialize with JSON fallback immediately for synchronous access
    this.categories = [...config.categories, ...config.otherCategories];
    this.initialized = false; // Will be set to true after database load
  }

  public static getInstance(): CategoryService {
    if (!CategoryService.instance) {
      CategoryService.instance = new CategoryService();
      // Try to load from database in the background, but don't wait for it
      CategoryService.instance.initializeFromDatabase().catch(error => {
        console.warn('Background database initialization failed:', error.message);
      });
    }
    return CategoryService.instance;
  }

  /**
   * Initialize categories from database
   */
  private async initializeFromDatabase(): Promise<void> {
    if (this.initialized) return;

    try {
      // Check if DATABASE_URL is available
      if (!process.env.DATABASE_URL) {
        console.warn('DATABASE_URL not available, keeping JSON fallback categories');
        this.initialized = true;
        return;
      }

      const result = await sql`
        SELECT id, name, keywords, color, description, applicable_for, is_default
        FROM categories
        ORDER BY name
      `;

      // Only update categories if we got results from database
      if (result.length > 0) {
        this.categories = result.map(row => ({
          id: row.id,
          name: row.name,
          keywords: row.keywords || [],
          color: row.color,
          description: row.description || undefined,
          applicableFor: row.applicable_for || undefined
        }));
        console.log(`Loaded ${this.categories.length} categories from database`);
        console.log('Category IDs in cache:', this.categories.map(cat => `${cat.id}: ${cat.name}`));
      } else {
        console.warn('No categories found in database, keeping JSON fallback');
      }

      this.initialized = true;
    } catch (error) {
      console.warn('Failed to load categories from database, keeping JSON fallback:', error instanceof Error ? error.message : 'Unknown error');
      // Keep the JSON fallback categories that were loaded in constructor
      this.initialized = true;
    }
  }

  public async getCategories(): Promise<Category[]> {
    await this.initializeFromDatabase();
    return this.categories;
  }

  public async getCategoryById(id: string): Promise<Category | undefined> {
    await this.initializeFromDatabase();
    const category = this.categories.find(cat => cat.id === id);
    console.log(`Looking for category ID: ${id}, found:`, category);
    return category;
  }

  public async classifyTransaction(operationText: string, transactionType?: 'DEBIT' | 'CREDIT'): Promise<string> {
    await this.initializeFromDatabase();

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

  /**
   * Synchronous version of classifyTransaction that uses in-memory categories
   */
  public classifyTransactionSync(operationText: string, transactionType?: 'DEBIT' | 'CREDIT'): string {
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

  public async addCategory(category: Omit<Category, 'id'>): Promise<Category> {
    await this.initializeFromDatabase();

    const newCategory: Category = {
      ...category,
      id: category.name.toLowerCase().replace(/\s+/g, '_')
    };

    console.log('Adding new category:', newCategory);

    try {
      // Insert into database
      await sql`
        INSERT INTO categories (
          id, name, keywords, color, description, applicable_for, is_default
        ) VALUES (
          ${newCategory.id},
          ${newCategory.name},
          ${newCategory.keywords},
          ${newCategory.color},
          ${newCategory.description || null},
          ${newCategory.applicableFor || []},
          ${false}
        )
      `;

      console.log('Category inserted into database successfully');

      // Add to in-memory cache
      this.categories.push(newCategory);
      
      // Force a refresh of the cache to ensure consistency
      this.initialized = false;
      await this.initializeFromDatabase();
      
      console.log('Cache refreshed, total categories:', this.categories.length);
      
      return newCategory;
    } catch (error) {
      console.error('Failed to add category to database:', error);
      throw new Error('Failed to add category');
    }
  }

  /**
   * Get categories applicable for a specific transaction type
   */
  public async getCategoriesForType(transactionType: 'DEBIT' | 'CREDIT'): Promise<Category[]> {
    await this.initializeFromDatabase();
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
  public async isCategoryApplicableForType(categoryId: string, transactionType: 'DEBIT' | 'CREDIT'): Promise<boolean> {
    const category = await this.getCategoryById(categoryId);
    if (!category) return false;

    return !category.applicableFor || category.applicableFor.includes(transactionType);
  }

  public async updateCategory(id: string, updates: Partial<Category>): Promise<Category | null> {
    await this.initializeFromDatabase();

    const categoryIndex = this.categories.findIndex(cat => cat.id === id);
    if (categoryIndex === -1) return null;

    const updatedCategory = { ...this.categories[categoryIndex], ...updates };

    try {
      // Update in database
      await sql`
        UPDATE categories
        SET
          name = ${updatedCategory.name},
          keywords = ${updatedCategory.keywords},
          color = ${updatedCategory.color},
          description = ${updatedCategory.description || null},
          applicable_for = ${updatedCategory.applicableFor || []},
          updated_at = NOW()
        WHERE id = ${id}
      `;

      // Update in-memory cache
      this.categories[categoryIndex] = updatedCategory;
      
      // Force a refresh of the cache to ensure consistency
      this.initialized = false;
      await this.initializeFromDatabase();
      
      return updatedCategory;
    } catch (error) {
      console.error('Failed to update category in database:', error);
      throw new Error('Failed to update category');
    }
  }

  public async deleteCategory(id: string): Promise<boolean> {
    await this.initializeFromDatabase();

    // Cannot delete default categories
    if (id === this.getDefaultCategory('DEBIT') || id === this.getDefaultCategory('CREDIT')) {
      return false;
    }

    const categoryIndex = this.categories.findIndex(cat => cat.id === id);
    if (categoryIndex === -1) return false;

    try {
      // Delete from database
      await sql`DELETE FROM categories WHERE id = ${id} AND is_default = FALSE`;

      // Remove from in-memory cache
      this.categories.splice(categoryIndex, 1);
      
      // Force a refresh of the cache to ensure consistency
      this.initialized = false;
      await this.initializeFromDatabase();
      
      return true;
    } catch (error) {
      console.error('Failed to delete category from database:', error);
      throw new Error('Failed to delete category');
    }
  }

  public async getCategoryColor(categoryId: string): Promise<string> {
    const category = await this.getCategoryById(categoryId);
    return category?.color || '#6B7280';
  }

  public async getCategoryName(categoryId: string): Promise<string> {
    const category = await this.getCategoryById(categoryId);
    return category?.name || 'Other';
  }

  /**
   * Synchronous methods for components that can't use async
   * These use the cached categories after initialization
   */
  public getCategoryByIdSync(id: string): Category | undefined {
    return this.categories.find(cat => cat.id === id);
  }

  public getCategoryNameSync(categoryId: string): string {
    const category = this.getCategoryByIdSync(categoryId);
    return category?.name || 'Other';
  }

  public getCategoryColorSync(categoryId: string): string {
    const category = this.getCategoryByIdSync(categoryId);
    return category?.color || '#6B7280';
  }

  /**
   * Get cached categories synchronously (may be empty if not initialized)
   */
  public getCachedCategories(): Category[] {
    return this.categories;
  }

  /**
   * Manually refresh the cache from database
   */
  public async refreshCache(): Promise<void> {
    this.initialized = false;
    await this.initializeFromDatabase();
  }

  /**
   * Debug method to check what's in the cache
   */
  public debugCache(): void {
    console.log('=== CategoryService Cache Debug ===');
    console.log('Initialized:', this.initialized);
    console.log('Total categories in cache:', this.categories.length);
    console.log('Categories in cache:');
    this.categories.forEach(cat => {
      console.log(`  - ${cat.id}: ${cat.name}`);
    });
    console.log('=== End Cache Debug ===');
  }
}
