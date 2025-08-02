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
            <li>Check the browser console (F12) for additional debug information</li>
            <li>If any test fails, check the Network tab in developer tools for more details</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
