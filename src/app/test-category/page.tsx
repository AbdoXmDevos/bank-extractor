'use client';

import React, { useState, useEffect } from 'react';
import CategoryBadge from '@/components/CategoryBadge';
import { Category } from '@/types/transaction';

export default function TestCategoryPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState<Category | null>(null);
  const [testResults, setTestResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      const result = await response.json();
      if (result.success) {
        setCategories(result.data);
        addResult(`Fetched ${result.data.length} categories`);
      }
    } catch (error) {
      addResult(`Failed to fetch categories: ${error}`);
    }
  };

  const testAddCategory = async () => {
    try {
      addResult('Adding new test category...');
      
      const testCategory = {
        name: 'Debug Test Category',
        keywords: ['DEBUG', 'TEST'],
        color: '#FF0000',
        description: 'A test category for debugging',
        applicableFor: ['DEBIT', 'CREDIT'] as ('DEBIT' | 'CREDIT')[]
      };

      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testCategory),
      });

      const result = await response.json();
      if (result.success) {
        addResult(`✅ Category added successfully: ${result.data.name} (ID: ${result.data.id})`);
        setNewCategory(result.data);
        
        // Refresh categories list
        await fetchCategories();
      } else {
        addResult(`❌ Failed to add category: ${result.error}`);
      }
    } catch (error) {
      addResult(`❌ Error adding category: ${error}`);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Category Debug Test</h1>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Test Controls</h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={testAddCategory}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add Test Category
            </button>
            <button
              onClick={fetchCategories}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Refresh Categories
            </button>
            <button
              onClick={clearResults}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Clear Results
            </button>
          </div>
        </div>

        {/* New Category Test */}
        {newCategory && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">New Category Test</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Category Data:</h3>
                <pre className="bg-gray-100 p-4 rounded-md text-sm overflow-x-auto">
                  {JSON.stringify(newCategory, null, 2)}
                </pre>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">CategoryBadge with categoryId only:</h3>
                <CategoryBadge categoryId={newCategory.id} />
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">CategoryBadge with category data:</h3>
                <CategoryBadge categoryId={newCategory.id} category={newCategory} />
              </div>
            </div>
          </div>
        )}

        {/* All Categories */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">All Categories ({categories.length})</h2>
          <div className="space-y-2">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center space-x-4 p-2 border rounded">
                <CategoryBadge categoryId={category.id} category={category} />
                <span className="text-sm text-gray-600">ID: {category.id}</span>
                <span className="text-sm text-gray-600">Name: {category.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Test Results */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Test Results</h2>
          <div className="bg-gray-100 rounded-md p-4 max-h-96 overflow-y-auto">
            {testResults.length === 0 ? (
              <p className="text-gray-500">No test results yet. Click a test button above.</p>
            ) : (
              <div className="space-y-2">
                {testResults.map((result, index) => (
                  <div key={index} className="text-sm font-mono text-gray-800">
                    {result}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
