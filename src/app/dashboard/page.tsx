'use client';

import React, { useState, useMemo } from 'react';
import {
  FileText,
  BarChart3,
  PieChart,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  Activity,
  Users,
  ArrowLeft,
  Download,
  Filter,
  RefreshCw,
  X
} from 'lucide-react';
import OverviewCharts from '@/components/dashboard/OverviewCharts';
import CategoryCharts from '@/components/dashboard/CategoryCharts';
import TrendCharts from '@/components/dashboard/TrendCharts';
import TimelineCharts from '@/components/dashboard/TimelineCharts';

// Import types from dashboardAnalytics to ensure consistency
import { DashboardOperation, DashboardAnalytics } from '@/lib/dashboardAnalytics';

interface DashboardData {
  operations: DashboardOperation[];
  metadata: {
    fileName: string;
    totalOperations: number;
    filteredOperations: number;
    extractDate: string;
    filters: any;
    groupBy: string;
  };
}

interface LoadedFile {
  name: string;
  data: DashboardData;
  loadedAt: string;
}

export default function DashboardPage() {
  const [loadedFiles, setLoadedFiles] = useState<LoadedFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [activeView, setActiveView] = useState<'overview' | 'categories' | 'trends' | 'timeline'>('overview');

  const [dateFilter, setDateFilter] = useState({ from: '', to: '' });
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Incoming' | 'Outgoing'>('all');

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
        localStorage.removeItem('dashboard_preload'); // Clean up
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
        localStorage.removeItem('dashboard_preload_bulk'); // Clean up
      } catch (error) {
        console.error('Error loading bulk preloaded data:', error);
      }
    }
  }, []);



  // Combine and filter data from selected files
  const combinedData = useMemo(() => {
    const selectedFileData = loadedFiles.filter(f => selectedFiles.includes(f.name));
    if (selectedFileData.length === 0) return null;

    let allOperations = selectedFileData.flatMap(f => f.data.operations);

    // Convert operations to ensure they have amount fields
    allOperations = allOperations.map(op => ({
      ...op,
      amount: op.amount || 0, // Ensure amount exists
      categoryInfo: op.categoryInfo || {
        name: op.category || 'Unknown',
        color: '#6B7280'
      }
    }));

    // Apply filters
    if (statusFilter !== 'all') {
      allOperations = allOperations.filter(op => op.status === statusFilter);
    }

    if (categoryFilter !== 'all') {
      allOperations = allOperations.filter(op => {
        const category = op.categoryInfo?.name || 'Unknown';
        return category === categoryFilter;
      });
    }

    if (dateFilter.from || dateFilter.to) {
      allOperations = allOperations.filter(op => {
        const opDate = new Date(op.date);
        const fromDate = dateFilter.from ? new Date(dateFilter.from) : null;
        const toDate = dateFilter.to ? new Date(dateFilter.to) : null;

        if (fromDate && opDate < fromDate) return false;
        if (toDate && opDate > toDate) return false;
        return true;
      });
    }

    const totalOperations = allOperations.length;

    return {
      operations: allOperations,
      files: selectedFileData.map(f => ({
        name: f.data.metadata.fileName,
        operations: f.data.operations.length,
        extractDate: f.data.metadata.extractDate
      })),
      totalOperations,
      totalFiles: selectedFileData.length,
      filteredCount: totalOperations,
      originalCount: selectedFileData.reduce((sum, f) => sum + f.data.operations.length, 0)
    };
  }, [loadedFiles, selectedFiles, statusFilter, categoryFilter, dateFilter]);

  // Get unique categories for filter
  const availableCategories = useMemo(() => {
    if (!combinedData) return [];
    const categories = new Set<string>();
    loadedFiles
      .filter(f => selectedFiles.includes(f.name))
      .flatMap(f => f.data.operations)
      .forEach(op => {
        const category = op.categoryInfo?.name || 'Unknown';
        categories.add(category);
      });
    return Array.from(categories).sort();
  }, [loadedFiles, selectedFiles]);

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

  const exportData = (format: 'json' | 'csv') => {
    if (!combinedData) return;

    const data = combinedData.operations;
    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === 'json') {
      content = JSON.stringify({
        operations: data,
        metadata: {
          exportDate: new Date().toISOString(),
          totalOperations: data.length,
          filters: {
            status: statusFilter,
            category: categoryFilter,
            dateRange: dateFilter
          },
          files: combinedData.files
        }
      }, null, 2);
      filename = `dashboard-export-${new Date().toISOString().split('T')[0]}.json`;
      mimeType = 'application/json';
    } else {
      // CSV format
      const headers = ['Date', 'Operation', 'Status', 'Category', 'Category Color'];
      const rows = data.map(op => [
        op.date,
        `"${op.operation.replace(/"/g, '""')}"`,
        op.status,
        op.categoryInfo?.name || 'Unknown',
        op.categoryInfo?.color || '#6B7280'
      ]);

      content = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
      filename = `dashboard-export-${new Date().toISOString().split('T')[0]}.csv`;
      mimeType = 'text/csv';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setDateFilter({ from: '', to: '' });
    setCategoryFilter('all');
    setStatusFilter('all');
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
                <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
                <p className="text-sm text-gray-600">Visualize your transaction data</p>
              </div>
            </div>
            
            {loadedFiles.length > 0 && (
              <div className="flex items-center space-x-2">
                {combinedData && (
                  <>
                    <button
                      onClick={() => exportData('json')}
                      className="flex items-center px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Export JSON
                    </button>
                    <button
                      onClick={() => exportData('csv')}
                      className="flex items-center px-3 py-2 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Export CSV
                    </button>
                  </>
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
                Welcome to Your Analytics Dashboard
              </h2>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Load your saved operations from the main page to visualize your transaction data with comprehensive charts and analytics.
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
        {combinedData && (
          <div>
            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm border mb-8 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Filter className="w-5 h-5 text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
                  <div className="text-sm text-gray-600">
                    {combinedData.filteredCount} of {combinedData.originalCount} operations
                  </div>
                </div>
                <button
                  onClick={clearFilters}
                  className="text-sm text-purple-600 hover:text-purple-800"
                >
                  Clear Filters
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="all">All</option>
                    <option value="Incoming">Incoming</option>
                    <option value="Outgoing">Outgoing</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="all">All Categories</option>
                    {availableCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
                  <input
                    type="date"
                    value={dateFilter.from}
                    onChange={(e) => setDateFilter(prev => ({ ...prev, from: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
                  <input
                    type="date"
                    value={dateFilter.to}
                    onChange={(e) => setDateFilter(prev => ({ ...prev, to: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="bg-white rounded-lg shadow-sm border mb-8">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6">
                  {[
                    { id: 'overview', label: 'Overview', icon: Activity },
                    { id: 'categories', label: 'Categories', icon: PieChart },
                    { id: 'trends', label: 'Trends', icon: TrendingUp },
                    { id: 'timeline', label: 'Timeline', icon: Calendar }
                  ].map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setActiveView(id as any)}
                      className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                        activeView === id
                          ? 'border-purple-500 text-purple-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {label}
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Dashboard Views */}
            <div>
              {activeView === 'overview' && (
                <OverviewCharts operations={combinedData.operations} />
              )}
              {activeView === 'categories' && (
                <CategoryCharts operations={combinedData.operations} />
              )}
              {activeView === 'trends' && (
                <TrendCharts operations={combinedData.operations} />
              )}
              {activeView === 'timeline' && (
                <TimelineCharts operations={combinedData.operations} />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
