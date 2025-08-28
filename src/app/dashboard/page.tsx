'use client';

import React, { useState, useMemo } from 'react';
import {
  FileText,
  BarChart3,
  ArrowLeft,
  X,
  TrendingUp,
  TrendingDown,
  DollarSign
} from 'lucide-react';

interface DashboardOperation {
  id: number;
  date: string;
  operation: string;
  status: 'Incoming' | 'Outgoing';
  amount: number;
  category?: string;
  categoryInfo?: {
    name: string;
    color: string;
  };
}

interface LoadedFile {
  name: string;
  data: {
    operations: DashboardOperation[];
    metadata: {
      fileName: string;
      totalOperations: number;
      extractDate: string;
    };
  };
  loadedAt: string;
}

export default function DashboardPage() {
  const [loadedFiles, setLoadedFiles] = useState<LoadedFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [selectedView, setSelectedView] = useState<'summary' | 'incoming' | 'outgoing' | 'net'>('summary');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Check for pre-loaded data from history page
  React.useEffect(() => {
    // Check for single file preload
    const preloadedData = localStorage.getItem('dashboard_preload');
    if (preloadedData) {
      try {
        const data = JSON.parse(preloadedData);
        
        // Ensure operations have amount fields
        if (data.operations) {
          data.operations = data.operations.map((op: any) => ({
            ...op,
            amount: op.amount || 0,
            categoryInfo: op.categoryInfo || {
              name: op.category || 'Unknown',
              color: '#6B7280'
            }
          }));
        }
        
        const newFile: LoadedFile = {
          name: data.fileName || 'Loaded from History',
          data: data,
          loadedAt: new Date().toISOString()
        };

        setLoadedFiles([newFile]);
        setSelectedFiles([newFile.name]);
        localStorage.removeItem('dashboard_preload');
      } catch (error) {
        console.error('Error loading preloaded data:', error);
      }
    }

    // Check for bulk file preload
    const bulkPreloadedData = localStorage.getItem('dashboard_preload_bulk');
    if (bulkPreloadedData) {
      try {
        const bulkData = JSON.parse(bulkPreloadedData);
        const newFiles: LoadedFile[] = bulkData.files.map((file: any) => ({
          ...file,
          data: {
            ...file.data,
            operations: file.data.operations?.map((op: any) => ({
              ...op,
              amount: op.amount || 0,
              categoryInfo: op.categoryInfo || {
                name: op.category || 'Unknown',
                color: '#6B7280'
              }
            })) || []
          }
        }));

        setLoadedFiles(newFiles);
        setSelectedFiles(newFiles.map(f => f.name));
        localStorage.removeItem('dashboard_preload_bulk');
      } catch (error) {
        console.error('Error loading bulk preloaded data:', error);
      }
    }
  }, []);

  // Combine data from selected files
  const combinedData = useMemo(() => {
    const selectedFileData = loadedFiles.filter(f => selectedFiles.includes(f.name));
    if (selectedFileData.length === 0) return null;

    let allOperations = selectedFileData.flatMap(f => f.data.operations);

    // Ensure operations have amount fields
    allOperations = allOperations.map(op => ({
      ...op,
      amount: op.amount || 0,
      categoryInfo: op.categoryInfo || {
        name: op.category || 'Unknown',
        color: '#6B7280'
      }
    }));

    return {
      operations: allOperations,
      totalOperations: allOperations.length
    };
  }, [loadedFiles, selectedFiles]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (!combinedData) return null;

    const incoming = combinedData.operations.filter(op => op.status === 'Incoming');
    const outgoing = combinedData.operations.filter(op => op.status === 'Outgoing');

    const totalIncoming = incoming.reduce((sum, op) => sum + op.amount, 0);
    const totalOutgoing = outgoing.reduce((sum, op) => sum + op.amount, 0);
    const netAmount = totalIncoming - totalOutgoing;

    return {
      totalIncoming,
      totalOutgoing,
      netAmount,
      incomingCount: incoming.length,
      outgoingCount: outgoing.length,
      incomingOperations: incoming,
      outgoingOperations: outgoing
    };
  }, [combinedData]);

  // Calculate category breakdown
  const categoryBreakdown = useMemo(() => {
    if (!combinedData) return [];

    const categoryMap = new Map<string, { incoming: number; outgoing: number; count: number }>();

    combinedData.operations.forEach(op => {
      const categoryName = op.categoryInfo?.name || 'Unknown';
      const current = categoryMap.get(categoryName) || { incoming: 0, outgoing: 0, count: 0 };
      
      if (op.status === 'Incoming') {
        current.incoming += op.amount;
      } else {
        current.outgoing += op.amount;
      }
      current.count += 1;
      
      categoryMap.set(categoryName, current);
    });

    return Array.from(categoryMap.entries())
      .map(([name, stats]) => ({
        name,
        incoming: stats.incoming,
        outgoing: stats.outgoing,
        net: stats.incoming - stats.outgoing,
        count: stats.count
      }))
      .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
  }, [combinedData]);

  const handleFileSelection = (fileName: string, selected: boolean) => {
    setSelectedFiles(prev => {
      if (selected) {
        return [...prev, fileName];
      } else {
        return prev.filter(name => name !== fileName);
      }
    });
  };

  const removeFile = (fileName: string) => {
    setLoadedFiles(prev => prev.filter(f => f.name !== fileName));
    setSelectedFiles(prev => prev.filter(name => name !== fileName));
  };

  const clearAllFiles = () => {
    setLoadedFiles([]);
    setSelectedFiles([]);
  };

  const getFilteredOperations = () => {
    if (!summaryStats) return [];
    
    switch (selectedView) {
      case 'incoming':
        return summaryStats.incomingOperations;
      case 'outgoing':
        return summaryStats.outgoingOperations;
      case 'net':
        return combinedData?.operations || [];
      default:
        return [];
    }
  };

  const getViewTitle = () => {
    switch (selectedView) {
      case 'incoming':
        return 'Incoming Operations';
      case 'outgoing':
        return 'Outgoing Operations';
      case 'net':
        return 'All Operations';
      default:
        return 'Dashboard Summary';
    }
  };

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryName)) {
        newSet.delete(categoryName);
      } else {
        newSet.add(categoryName);
      }
      return newSet;
    });
  };

  const getCategoryOperations = (categoryName: string) => {
    if (!combinedData) return [];
    return combinedData.operations.filter(op => 
      (op.categoryInfo?.name || 'Unknown') === categoryName
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <a
                href="/"
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back
              </a>
              <div className="h-6 w-px bg-gray-300" />
              <BarChart3 className="w-8 h-8 text-purple-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-sm text-gray-600">Money flow and categories overview</p>
              </div>
            </div>
            
            {loadedFiles.length > 0 && (
              <div className="flex items-center space-x-2">
                {selectedView !== 'summary' && (
                  <button
                    onClick={() => setSelectedView('summary')}
                    className="flex items-center px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 font-medium"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Return to Dashboard
                  </button>
                )}
                <button
                  onClick={clearAllFiles}
                  className="flex items-center px-3 py-2 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear All
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        {loadedFiles.length === 0 && (
          <div className="text-center mb-12">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Welcome to Your Simple Dashboard
              </h2>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Load your saved operations to see a clear overview of your money flow and spending categories.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-center justify-center space-x-3 mb-4">
                  <FileText className="w-8 h-8 text-blue-600" />
                  <div className="text-left">
                    <h3 className="text-lg font-semibold text-blue-900">How to get started:</h3>
                    <p className="text-blue-700">
                      1. Go to the main page<br/>
                      2. Use "Add to List" buttons on your saved operations<br/>
                      3. Click "View in Dashboard" to analyze your data
                    </p>
                  </div>
                </div>
                <a
                  href="/"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Go to Main Page
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Loaded Files Management */}
        {loadedFiles.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border mb-8 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Loaded Files</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {loadedFiles.map((file) => (
                <div key={file.name} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedFiles.includes(file.name)}
                        onChange={(e) => handleFileSelection(file.name, e.target.checked)}
                        className="mr-2"
                      />
                      <FileText className="w-4 h-4 text-blue-600 mr-2" />
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {file.name}
                      </span>
                    </div>
                    <button
                      onClick={() => removeFile(file.name)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-xs text-gray-500">
                    <p>{file.data.operations.length} operations</p>
                    <p>From: {file.data.metadata.fileName}</p>
                    <p>Loaded: {new Date(file.loadedAt).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dashboard Content */}
        {combinedData && summaryStats && (
          <div>
            {selectedView === 'summary' ? (
              <div className="space-y-8">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Total Incoming */}
                  <button
                    onClick={() => setSelectedView('incoming')}
                    className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow cursor-pointer text-left"
                  >
                    <div className="flex items-center">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <TrendingUp className="w-6 h-6 text-green-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Total Incoming</p>
                        <p className="text-2xl font-bold text-green-600">
                          ${summaryStats.totalIncoming.toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-500">{summaryStats.incomingCount} transactions</p>
                        <p className="text-xs text-green-600 mt-1">Click to view details →</p>
                      </div>
                    </div>
                  </button>

                  {/* Total Outgoing */}
                  <button
                    onClick={() => setSelectedView('outgoing')}
                    className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow cursor-pointer text-left"
                  >
                    <div className="flex items-center">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <TrendingDown className="w-6 h-6 text-red-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Total Outgoing</p>
                        <p className="text-2xl font-bold text-red-600">
                          ${summaryStats.totalOutgoing.toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-500">{summaryStats.outgoingCount} transactions</p>
                        <p className="text-xs text-red-600 mt-1">Click to view details →</p>
                      </div>
                    </div>
                  </button>

                  {/* Net Amount */}
                  <button
                    onClick={() => setSelectedView('net')}
                    className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow cursor-pointer text-left"
                  >
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <DollarSign className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Net Amount</p>
                        <p className={`text-2xl font-bold ${
                          summaryStats.netAmount >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          ${summaryStats.netAmount.toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-500">
                          {summaryStats.netAmount >= 0 ? 'Positive' : 'Negative'} balance
                        </p>
                        <p className="text-xs text-blue-600 mt-1">Click to view details →</p>
                      </div>
                    </div>
                  </button>
                </div>

                {/* Category Breakdown */}
                <div className="bg-white  rounded-lg shadow-sm border p-6">
                  <h3 className="text-lg font-semibold  text-gray-900 mb-6">Category Breakdown</h3>
                  <div className="space-y-4">
                    {categoryBreakdown.map((category, index) => {
                      const isExpanded = expandedCategories.has(category.name);
                      const categoryOperations = getCategoryOperations(category.name);
                      const categoryColor = categoryOperations[0]?.categoryInfo?.color || '#6B7280';
                      
                      return (
                        <div key={index} className="border  rounded-lg overflow-hidden">
                          {/* Category Header - Clickable */}
                          <button
                            onClick={() => toggleCategory(category.name)}
                            className="w-full p-4 cursor-pointer text-left hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div 
                                  className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                                  style={{ backgroundColor: categoryColor }}
                                />
                                <h4 className="font-medium text-gray-900">{category.name}</h4>
                              </div>
                              <div className="flex items-center space-x-4">
                                <span className="text-sm text-gray-500">{category.count} transactions</span>
                                <div className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </div>
                              </div>
                            </div>
                            
                            {/* Category Summary Stats */}
                            <div className="grid grid-cols-3 gap-4 text-sm mt-3">
                              <div>
                                <span className="text-gray-600">Incoming:</span>
                                <span className={`ml-2 ${
                                  category.incoming > 0 ? 'font-bold' : 'font-light'
                                } text-green-600`}>
                                  ${category.incoming.toLocaleString()}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600">Outgoing:</span>
                                <span className={`ml-2 ${
                                  category.outgoing > 0 ? 'font-bold' : 'font-light'
                                } text-red-600`}>
                                  ${category.outgoing.toLocaleString()}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600">Net:</span>
                                <span className={`ml-2 ${
                                  category.net !== 0 ? 'font-bold' : 'font-light'
                                } ${
                                  category.net >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  ${category.net.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </button>

                          {/* Expandable Operations List */}
                          {isExpanded && (
                            <div className="border-t bg-gray-50">
                              <div className="p-4">
                                <h5 className="text-sm font-medium text-gray-700 mb-3">Operations in {category.name}</h5>
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                  {categoryOperations.map((operation) => (
                                    <div 
                                      key={operation.id} 
                                      className="flex items-center justify-between p-3 bg-white rounded border text-sm"
                                    >
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center space-x-3">
                                          <div 
                                            className="w-2 h-2 rounded-full"
                                            style={{ backgroundColor: categoryColor }}
                                          />
                                          <span className="text-gray-900 truncate">
                                            {operation.operation}
                                          </span>
                                        </div>
                                        <div className="text-gray-500 text-xs mt-1">
                                          {new Date(operation.date).toLocaleDateString()}
                                        </div>
                                      </div>
                                      <div className={`font-medium ${
                                        operation.status === 'Incoming' ? 'text-green-600' : 'text-red-600'
                                      }`}>
                                        ${operation.amount.toLocaleString()}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Summary Info */}
                <div className="bg-gray-50 rounded-lg p-6 text-center">
                  <p className="text-gray-600">
                    Showing <span className="font-medium">{combinedData.totalOperations}</span> operations from{' '}
                    <span className="font-medium">{selectedFiles.length}</span> file(s)
                  </p>
                </div>
              </div>
            ) : (
              /* Operations Detail View */
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">{getViewTitle()}</h2>
                    <button
                      onClick={() => setSelectedView('summary')}
                      className="flex items-center px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Return to Dashboard
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Operation
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Category
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {getFilteredOperations().map((operation) => (
                          <tr key={operation.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(operation.date).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                              {operation.operation}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {operation.categoryInfo?.name || 'Unknown'}
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                              operation.status === 'Incoming' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              ${operation.amount.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 text-sm text-gray-500 text-center">
                    Showing {getFilteredOperations().length} operations
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
