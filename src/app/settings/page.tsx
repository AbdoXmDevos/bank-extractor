'use client';

import React, { useState, useEffect } from 'react';
import { Category } from '@/types/transaction';
import { Settings, Plus, Edit2, Trash2, Save, X, Target, Info, ArrowDown, ArrowUp, Filter, Database, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import CategoryBadge from '@/components/CategoryBadge';

export default function SettingsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [filterType, setFilterType] = useState<'ALL' | 'DEBIT' | 'CREDIT'>('ALL');
  const [dbStatus, setDbStatus] = useState<{
    connected: boolean;
    operationsCount: number;
    loading: boolean;
    error: string | null;
  }>({
    connected: false,
    operationsCount: 0,
    loading: true,
    error: null
  });
  const [newCategory, setNewCategory] = useState({
    name: '',
    keywords: '',
    color: '#6B7280',
    description: '',
    applicableFor: ['DEBIT'] as ('DEBIT' | 'CREDIT')[]
  });

  useEffect(() => {
    fetchCategories();
    checkDatabaseStatus();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      const result = await response.json();
      if (result.success) {
        console.log('Fetched categories:', result.data);
        setCategories(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const checkDatabaseStatus = async () => {
    try {
      setDbStatus(prev => ({ ...prev, loading: true, error: null }));
      const response = await fetch('/api/test-db');
      const result = await response.json();

      if (result.success) {
        setDbStatus({
          connected: true,
          operationsCount: result.operationsCount || 0,
          loading: false,
          error: null
        });
      } else {
        setDbStatus({
          connected: false,
          operationsCount: 0,
          loading: false,
          error: result.error || 'Unknown error'
        });
      }
    } catch (error) {
      setDbStatus({
        connected: false,
        operationsCount: 0,
        loading: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      });
    }
  };

  const handleAddCategory = async () => {
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newCategory.name,
          keywords: newCategory.keywords.split(',').map(k => k.trim()).filter(k => k),
          color: newCategory.color,
          description: newCategory.description,
          applicableFor: newCategory.applicableFor
        }),
      });

      const result = await response.json();
      if (result.success) {
        console.log('Category added successfully:', result.data);
        // Refresh the categories list to ensure we have the latest data
        await fetchCategories();
        setNewCategory({ name: '', keywords: '', color: '#6B7280', description: '', applicableFor: ['DEBIT'] });
        setIsAddingNew(false);
      }
    } catch (error) {
      console.error('Failed to add category:', error);
    }
  };

  const handleUpdateCategory = async (category: Category) => {
    try {
      const response = await fetch('/api/categories', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(category),
      });

      const result = await response.json();
      if (result.success) {
        setCategories(categories.map(c => c.id === category.id ? result.data : c));
        setEditingCategory(null);
      }
    } catch (error) {
      console.error('Failed to update category:', error);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;

    try {
      const response = await fetch(`/api/categories?id=${categoryId}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (result.success) {
        setCategories(categories.filter(c => c.id !== categoryId));
      }
    } catch (error) {
      console.error('Failed to delete category:', error);
    }
  };

  // Filter categories based on type
  const getFilteredCategories = () => {
    if (filterType === 'ALL') return categories;
    return categories.filter(cat =>
      !cat.applicableFor || cat.applicableFor.includes(filterType)
    );
  };





  const CategoryForm = ({ category, onSave, onCancel }: {
    category: Category;
    onSave: (category: Category) => void;
    onCancel: () => void;
  }) => {
    const [formData, setFormData] = useState({
      ...category,
      keywords: category.keywords.join(', '),
      applicableFor: category.applicableFor || ['DEBIT']
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSave({
        ...formData,
        keywords: formData.keywords.split(',').map(k => k.trim()).filter(k => k)
      });
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category Name
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Keywords (comma-separated)
          </label>
          <textarea
            value={formData.keywords}
            onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
            placeholder="BIM, MARJANE, CARREFOUR"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Color
          </label>
          <input
            type="color"
            value={formData.color}
            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            className="w-20 h-10 border border-gray-300 rounded-md"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <input
            type="text"
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Optional description"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Applicable For
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.applicableFor.includes('DEBIT')}
                onChange={(e) => {
                  if (e.target.checked) {
                    setFormData({ ...formData, applicableFor: [...formData.applicableFor, 'DEBIT'] });
                  } else {
                    setFormData({ ...formData, applicableFor: formData.applicableFor.filter(t => t !== 'DEBIT') });
                  }
                }}
                className="mr-2"
              />
              <ArrowDown className="w-4 h-4 text-red-500 mr-1" />
              <span className="text-sm">Outgoing Transactions (Expenses)</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.applicableFor.includes('CREDIT')}
                onChange={(e) => {
                  if (e.target.checked) {
                    setFormData({ ...formData, applicableFor: [...formData.applicableFor, 'CREDIT'] });
                  } else {
                    setFormData({ ...formData, applicableFor: formData.applicableFor.filter(t => t !== 'CREDIT') });
                  }
                }}
                className="mr-2"
              />
              <ArrowUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-sm">Incoming Transactions (Income)</span>
            </label>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <button
            type="submit"
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
          >
            <Save className="w-4 h-4 mr-2" />
            Save
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:ring-2 focus:ring-gray-500"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </button>
        </div>
      </form>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Settings className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Category Settings</h1>
                <p className="text-sm text-gray-600">Manage transaction categories and keywords</p>
              </div>
            </div>
            <a
              href="/"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
            >
              Back to Dashboard
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <div className="flex items-start space-x-3">
            <Info className="w-6 h-6 text-blue-600 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Unified Category System</h3>
              <p className="text-blue-800 mb-3">
                This system manages all transaction categories in one place. Categories can be configured to apply to:
              </p>
              <div className="space-y-2 text-sm text-blue-700">
                <div className="flex items-center">
                  <ArrowDown className="w-4 h-4 text-red-500 mr-2" />
                  <span><strong>Outgoing Transactions (DEBIT):</strong> Expenses like shopping, utilities, transfers sent</span>
                </div>
                <div className="flex items-center">
                  <ArrowUp className="w-4 h-4 text-green-500 mr-2" />
                  <span><strong>Incoming Transactions (CREDIT):</strong> Income like salary, transfers received, refunds</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Database Status */}
        <div className="bg-white rounded-lg shadow-sm border mb-8">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Database className="w-5 h-5 mr-2 text-blue-600" />
                Database Status
              </h3>
              <button
                onClick={checkDatabaseStatus}
                disabled={dbStatus.loading}
                className="flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${dbStatus.loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-3">
                {dbStatus.loading ? (
                  <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />
                ) : dbStatus.connected ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900">Connection</p>
                  <p className={`text-sm ${dbStatus.connected ? 'text-green-600' : 'text-red-600'}`}>
                    {dbStatus.loading ? 'Checking...' : dbStatus.connected ? 'Connected' : 'Disconnected'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-blue-600">#</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Operations Stored</p>
                  <p className="text-sm text-gray-600">
                    {dbStatus.loading ? 'Loading...' : dbStatus.operationsCount.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-5 h-5 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-purple-600">DB</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Storage</p>
                  <p className="text-sm text-gray-600">Neon Database</p>
                </div>
              </div>
            </div>

            {dbStatus.error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">
                  <strong>Error:</strong> {dbStatus.error}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Add New Category */}
        <div className="bg-white rounded-lg shadow-sm border mb-8">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Add New Category</h3>
              {!isAddingNew && (
                <button
                  onClick={() => setIsAddingNew(true)}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Category
                </button>
              )}
            </div>
          </div>
          
          {isAddingNew && (
            <div className="p-6">
              <CategoryForm
                category={{
                  id: '',
                  name: newCategory.name,
                  keywords: newCategory.keywords.split(',').map(k => k.trim()).filter(k => k),
                  color: newCategory.color,
                  description: newCategory.description,
                  applicableFor: newCategory.applicableFor
                }}
                onSave={(category) => {
                  setNewCategory({
                    name: category.name,
                    keywords: category.keywords.join(', '),
                    color: category.color,
                    description: category.description || '',
                    applicableFor: category.applicableFor || ['DEBIT']
                  });
                  handleAddCategory();
                }}
                onCancel={() => {
                  setIsAddingNew(false);
                  setNewCategory({ name: '', keywords: '', color: '#6B7280', description: '', applicableFor: ['DEBIT'] });
                }}
              />
            </div>
          )}
        </div>

        {/* Existing Categories */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Transaction Categories</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Manage your transaction categories and their keywords
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as 'ALL' | 'DEBIT' | 'CREDIT')}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="ALL">All Categories</option>
                  <option value="DEBIT">Outgoing Only</option>
                  <option value="CREDIT">Incoming Only</option>
                </select>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              Showing {getFilteredCategories().length} of {categories.length} categories
            </div>
          </div>
          
          <div className="divide-y divide-gray-200">
            {getFilteredCategories().map((category) => (
              <div key={category.id} className="p-6">
                {editingCategory?.id === category.id ? (
                  <CategoryForm
                    category={editingCategory}
                    onSave={handleUpdateCategory}
                    onCancel={() => setEditingCategory(null)}
                  />
                ) : (
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <CategoryBadge categoryId={category.id} category={category} />
                        <span className="text-sm text-gray-500">
                          ({category.keywords.length} keywords)
                        </span>
                        <div className="flex items-center space-x-1">
                          {(!category.applicableFor || category.applicableFor.includes('DEBIT')) && (
                            <div className="flex items-center px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">
                              <ArrowDown className="w-3 h-3 mr-1" />
                              Outgoing
                            </div>
                          )}
                          {(!category.applicableFor || category.applicableFor.includes('CREDIT')) && (
                            <div className="flex items-center px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                              <ArrowUp className="w-3 h-3 mr-1" />
                              Incoming
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mb-2">
                        <span className="text-sm font-medium text-gray-700">Keywords: </span>
                        <span className="text-sm text-gray-600">
                          {category.keywords.length > 0 ? category.keywords.join(', ') : 'No keywords (default category)'}
                        </span>
                      </div>

                      {category.description && (
                        <p className="text-sm text-gray-600">{category.description}</p>
                      )}
                    </div>

                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => setEditingCategory(category)}
                        className="p-2 text-gray-400 hover:text-blue-600 focus:text-blue-600"
                        title="Edit category"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {!category.id.includes('other') && (
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className="p-2 text-gray-400 hover:text-red-600 focus:text-red-600"
                          title="Delete category"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>




      </main>
    </div>
  );
}
