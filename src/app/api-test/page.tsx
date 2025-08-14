'use client';

import { useState } from 'react';

export default function ApiTestPage() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testHealthCheck = async () => {
    setIsLoading(true);
    addResult('Testing health check...');
    
    try {
      const response = await fetch('/api/extract-operations');
      const data = await response.json();
      addResult(`Health check response: ${JSON.stringify(data)}`);
    } catch (error) {
      addResult(`Health check error: ${error}`);
    }
    
    setIsLoading(false);
  };

  const testSimpleApi = async () => {
    setIsLoading(true);
    addResult('Testing simple API...');
    
    try {
      const response = await fetch('/api/test');
      const data = await response.json();
      addResult(`Simple API response: ${JSON.stringify(data)}`);
    } catch (error) {
      addResult(`Simple API error: ${error}`);
    }
    
    setIsLoading(false);
  };

  const testFileUpload = async () => {
    setIsLoading(true);
    addResult('Testing file upload with dummy data...');
    
    try {
      // Create a dummy file
      const dummyContent = 'This is a test file content';
      const file = new File([dummyContent], 'test.pdf', { type: 'application/pdf' });
      
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/extract-operations', {
        method: 'POST',
        body: formData,
      });

      addResult(`Upload response status: ${response.status}`);
      addResult(`Upload response headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`);

      if (response.ok) {
        const data = await response.json();
        addResult(`Upload response data: ${JSON.stringify(data)}`);
      } else {
        const errorText = await response.text();
        addResult(`Upload error response: ${errorText}`);
      }
    } catch (error) {
      addResult(`Upload error: ${error}`);
    }
    
    setIsLoading(false);
  };

  const debugCategoryCache = async () => {
    setIsLoading(true);
    addResult('Debugging category cache...');
    
    try {
      // Call the debug method on CategoryService
      const response = await fetch('/api/test-db');
      const result = await response.json();
      addResult(`Database status: ${JSON.stringify(result)}`);
      
      // Also check the categories API
      const catResponse = await fetch('/api/categories');
      const catResult = await catResponse.json();
      addResult(`Categories API: ${JSON.stringify(catResult)}`);
      
    } catch (error) {
      addResult(`Debug error: ${error}`);
    }
    
    setIsLoading(false);
  };

  const testCategoryBadge = async () => {
    setIsLoading(true);
    addResult('Testing CategoryBadge component...');
    
    try {
      // First, get all categories
      const getResponse = await fetch('/api/categories');
      const getData = await getResponse.json();
      
      if (getData.success && getData.data.length > 0) {
        const firstCategory = getData.data[0];
        addResult(`Testing with category: ${firstCategory.name} (ID: ${firstCategory.id})`);
        
        // Test the CategoryBadge component by creating a simple test
        addResult('CategoryBadge should display: ' + firstCategory.name);
        addResult('CategoryBadge categoryId: ' + firstCategory.id);
        addResult('CategoryBadge category data: ' + JSON.stringify(firstCategory));
      }
    } catch (error) {
      addResult(`CategoryBadge test error: ${error}`);
    }
    
    setIsLoading(false);
  };

  const testCategorySystem = async () => {
    setIsLoading(true);
    addResult('Testing category system...');
    
    try {
      // Test 1: Get all categories
      addResult('Test 1: Fetching all categories...');
      const getResponse = await fetch('/api/categories');
      const getData = await getResponse.json();
      addResult(`Categories response: ${JSON.stringify(getData)}`);

      if (getData.success) {
        addResult(`Found ${getData.data.length} categories`);
        
        // Log all category IDs for debugging
        addResult('Category IDs:');
        getData.data.forEach((cat: any) => {
          addResult(`  - ${cat.id}: ${cat.name}`);
        });
      }

      // Test 2: Add a new test category
      addResult('Test 2: Adding a new test category...');
      const testCategory = {
        name: 'Test Category',
        keywords: ['TEST', 'DEBUG'],
        color: '#FF0000',
        description: 'A test category for debugging',
        applicableFor: ['DEBIT', 'CREDIT']
      };

      const addResponse = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testCategory),
      });

      const addData = await addResponse.json();
      addResult(`Add category response: ${JSON.stringify(addData)}`);

      if (addData.success) {
        addResult(`Successfully added category: ${addData.data.name} with ID: ${addData.data.id}`);
        
        // Test 3: Verify the category was added by fetching again
        addResult('Test 3: Verifying category was added...');
        const verifyResponse = await fetch('/api/categories');
        const verifyData = await verifyResponse.json();
        
        if (verifyData.success) {
          const newCategory = verifyData.data.find((cat: any) => cat.id === addData.data.id);
          if (newCategory) {
            addResult(`✅ Category verification successful: ${newCategory.name}`);
          } else {
            addResult(`❌ Category verification failed: category not found`);
          }
          
          // Log all category IDs again to see the difference
          addResult('Updated Category IDs:');
          verifyData.data.forEach((cat: any) => {
            addResult(`  - ${cat.id}: ${cat.name}`);
          });
        }
      }

    } catch (error) {
      addResult(`Category test error: ${error}`);
    }
    
    setIsLoading(false);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">API Test Page</h1>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Test Controls</h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={testHealthCheck}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Test Health Check
            </button>
            <button
              onClick={testSimpleApi}
              disabled={isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              Test Simple API
            </button>
            <button
              onClick={testFileUpload}
              disabled={isLoading}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
            >
              Test File Upload
            </button>
            <button
              onClick={testCategorySystem}
              disabled={isLoading}
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
            >
              Test Category System
            </button>
            <button
              onClick={testCategoryBadge}
              disabled={isLoading}
              className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 disabled:opacity-50"
            >
              Test CategoryBadge
            </button>
            <button
              onClick={debugCategoryCache}
              disabled={isLoading}
              className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50"
            >
              Debug Cache
            </button>
            <button
              onClick={clearResults}
              disabled={isLoading}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
            >
              Clear Results
            </button>
          </div>
        </div>

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

        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">Instructions</h3>
          <ol className="list-decimal list-inside space-y-2 text-yellow-700">
            <li>First, test the health check to ensure the API is deployed and accessible</li>
            <li>Test the simple API to verify basic functionality</li>
            <li>Test the file upload with dummy data to see if the endpoint accepts POST requests</li>
            <li>Test the category system to verify category creation and retrieval</li>
            <li>Check the browser console (F12) for additional debug information</li>
            <li>If any test fails, check the Network tab in developer tools for more details</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
