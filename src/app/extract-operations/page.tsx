'use client';

import { useState, useMemo, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Download, ArrowLeft, BarChart3, Filter, Search, ChevronDown, ChevronRight, Send, X } from 'lucide-react';
import { CategoryService } from '@/lib/categoryService';

interface OperationData {
  id: number;
  date: string;
  operation: string;
  status: 'Incoming' | 'Outgoing';
  amount: number; // Add amount field
  category?: string; // Unified category ID
}

// Category display information using unified system
const getCategoryInfo = async (operation: OperationData) => {
  if (!operation.category) return null;

  const categoryService = CategoryService.getInstance();
  const category = await categoryService.getCategoryById(operation.category);

  if (!category) return null;

  return {
    name: category.name,
    color: category.color
  };
};

// Function to determine if text should be white or black based on background color
const getTextColor = (backgroundColor: string): string => {
  // Remove # if present
  const hex = backgroundColor.replace('#', '');

  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return white text for dark backgrounds, black text for light backgrounds
  return luminance > 0.5 ? '#000000' : '#ffffff';
};

// Filter and grouping types
interface FilterState {
  searchText: string;
  status: 'all' | 'Incoming' | 'Outgoing';
  category: 'all' | string; // Category ID from unified system
  dateFrom: string;
  dateTo: string;
}

type GroupByOption = 'none' | 'status' | 'category' | 'date';

// Component to handle async category loading
const CategoryDisplay = ({ categoryId }: { categoryId?: string }) => {
  const [categoryInfo, setCategoryInfo] = useState<{ name: string; color: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCategory = async () => {
      if (!categoryId) {
        setCategoryInfo(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const info = await getCategoryInfo({ category: categoryId } as OperationData);
        setCategoryInfo(info);
      } catch (error) {
        console.error('Failed to load category:', error);
        setCategoryInfo(null);
      } finally {
        setLoading(false);
      }
    };

    loadCategory();
  }, [categoryId]);

  if (loading) {
    return <span className="text-gray-400">Loading...</span>;
  }

  if (!categoryInfo) {
    return <span className="text-gray-400">-</span>;
  }

  return (
    <span
      className="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
      style={{
        backgroundColor: categoryInfo.color,
        color: getTextColor(categoryInfo.color)
      }}
    >
      {categoryInfo.name}
    </span>
  );
};

export default function ExtractOperationsPage() {
  const [operations, setOperations] = useState<OperationData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [redirectedFromMain, setRedirectedFromMain] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);

  // Filter and grouping state
  const [filters, setFilters] = useState<FilterState>({
    searchText: '',
    status: 'all',
    category: 'all',
    dateFrom: '',
    dateTo: ''
  });
  const [groupBy, setGroupBy] = useState<GroupByOption>('none');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [pendingDashboardData, setPendingDashboardData] = useState<any>(null);
  const [pendingFileName, setPendingFileName] = useState<string>('');

  // Check if user was redirected from main page
  useEffect(() => {
    const tempUploadData = localStorage.getItem('tempUploadedPDF');
    if (tempUploadData) {
      try {
        const uploadInfo = JSON.parse(tempUploadData);
        if (uploadInfo.redirectFromMain) {
          setRedirectedFromMain(true);
          setFileName(uploadInfo.fileName);
          // Clear the temporary data
          localStorage.removeItem('tempUploadedPDF');
        }
      } catch (error) {
        console.error('Failed to parse temp upload data:', error);
      }
    }
  }, []);

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setFileName(file.name);

    try {
      const formData = new FormData();
      formData.append('file', file);

      console.log('Making request to /api/extract-operations');
      const response = await fetch('/api/extract-operations', {
        method: 'POST',
        body: formData,
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        console.error('Response not OK:', response.status, response.statusText);

        // Try to get error message from response
        let errorMessage = 'Failed to process PDF';
        try {
          const errorResult = await response.json();
          errorMessage = errorResult.error || errorMessage;
        } catch (jsonError) {
          console.error('Failed to parse error response as JSON:', jsonError);
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }

        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('API response:', result);

      if (result.success && result.data) {
        setOperations(result.data.operations);
      } else {
        throw new Error('No operations found in the PDF');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Upload error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const exportToCSV = async () => {
    if (filteredOperations.length === 0) return;

    const csvContent = [
      'Date,Operation,Amount,Status,Category',
      ...await Promise.all(filteredOperations.map(async op => {
        const categoryInfo = await getCategoryInfo(op);
        const categoryName = categoryInfo ? categoryInfo.name : '';
        return `"${op.date}","${op.operation}","${op.amount || 0}","${op.status}","${categoryName}"`;
      }))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const isFiltered = filteredOperations.length !== operations.length;
    const suffix = isFiltered ? '_filtered' : '';
    a.download = `operations_${fileName.replace('.pdf', '')}${suffix}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const saveOperations = async () => {
    if (filteredOperations.length === 0) return;

    try {
      // Prepare the data to save
      const dashboardData = {
        operations: await Promise.all(filteredOperations.map(async op => ({
          ...op,
          categoryInfo: await getCategoryInfo(op)
        }))),
        metadata: {
          fileName,
          totalOperations: operations.length,
          filteredOperations: filteredOperations.length,
          extractDate: new Date().toISOString(),
          filters: filters,
          groupBy: groupBy
        }
      };

      // Save to server (public/jsons directory)
      const isFiltered = filteredOperations.length !== operations.length;
      const suffix = isFiltered ? '_filtered' : '';
      const jsonFileName = `operations_${fileName.replace('.pdf', '')}${suffix}_${Date.now()}.json`;

      const saveResponse = await fetch('/api/save-operations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: jsonFileName,
          originalFileName: fileName,
          fileSize: dashboardData.operations.length * 100, // Rough estimate
          data: dashboardData
        })
      });

      if (!saveResponse.ok) {
        throw new Error('Failed to save operations to database');
      }

      const saveResult = await saveResponse.json();
      console.log('Operations saved to database:', saveResult);

      // Store data for modal and show download confirmation
      setPendingDashboardData(dashboardData);
      setPendingFileName(jsonFileName);
      setShowDownloadModal(true);

    } catch (err) {
      console.error('Failed to save operations to database:', err);
      alert('Failed to save operations to database. Please try again.');
    }
  };

  const handleDownloadAndContinue = () => {
    if (pendingDashboardData && pendingFileName) {
      // Download JSON file
      const jsonContent = JSON.stringify(pendingDashboardData, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = pendingFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }

    // Close modal and show dashboard
    setShowDownloadModal(false);
    setPendingDashboardData(null);
    setPendingFileName('');
    setShowDashboard(true);
  };

  const handleSkipDownload = () => {
    // Close modal and show dashboard without downloading
    setShowDownloadModal(false);
    setPendingDashboardData(null);
    setPendingFileName('');
    setShowDashboard(true);
  };

  // Filtering logic
  const filteredOperations = useMemo(() => {
    return operations.filter(operation => {
      // Search text filter
      if (filters.searchText && !operation.operation.toLowerCase().includes(filters.searchText.toLowerCase())) {
        return false;
      }

      // Status filter
      if (filters.status !== 'all' && operation.status !== filters.status) {
        return false;
      }

      // Category filter
      if (filters.category !== 'all') {
        if (operation.category !== filters.category) {
          return false;
        }
      }

      // Date range filter
      if (filters.dateFrom || filters.dateTo) {
        const operationDate = operation.date;
        if (filters.dateFrom && operationDate < filters.dateFrom) {
          return false;
        }
        if (filters.dateTo && operationDate > filters.dateTo) {
          return false;
        }
      }

      return true;
    });
  }, [operations, filters]);

  // Grouping logic
  const [groupedOperations, setGroupedOperations] = useState<{ [key: string]: OperationData[] }>({ 'All Operations': [] });

  useEffect(() => {
    const groupOperations = async () => {
      if (groupBy === 'none') {
        setGroupedOperations({ 'All Operations': filteredOperations });
        return;
      }

      const groups: { [key: string]: OperationData[] } = {};

      for (const operation of filteredOperations) {
        let groupKey: string;

        switch (groupBy) {
          case 'status':
            groupKey = operation.status;
            break;
          case 'category':
            const categoryInfo = await getCategoryInfo(operation);
            groupKey = categoryInfo ? categoryInfo.name : 'Uncategorized';
            break;
          case 'date':
            groupKey = operation.date;
            break;
          default:
            groupKey = 'All Operations';
        }

        if (!groups[groupKey]) {
          groups[groupKey] = [];
        }
        groups[groupKey].push(operation);
      }

      setGroupedOperations(groups);
    };

    groupOperations();
  }, [filteredOperations, groupBy]);

  // Auto-expand groups when grouping changes
  useMemo(() => {
    if (groupBy !== 'none') {
      setExpandedGroups(new Set(Object.keys(groupedOperations)));
    }
  }, [groupBy, groupedOperations]);

  // Toggle group expansion
  const toggleGroup = (groupKey: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
  };

  // Get all available categories for filter dropdown
  const getAllCategories = () => {
    const categoryService = CategoryService.getInstance();
    // Use the cached categories (sync version)
    const allCategories = categoryService.getCachedCategories();

    return allCategories.map(category => {
      const applicableFor = category.applicableFor || ['DEBIT', 'CREDIT'];
      let typeLabel = '';

      if (applicableFor.includes('DEBIT') && applicableFor.includes('CREDIT')) {
        typeLabel = ' (Both)';
      } else if (applicableFor.includes('DEBIT')) {
        typeLabel = ' (Outgoing)';
      } else if (applicableFor.includes('CREDIT')) {
        typeLabel = ' (Incoming)';
      }

      return {
        value: category.id,
        label: `${category.name}${typeLabel}`,
        type: applicableFor.includes('DEBIT') ? 'outgoing' as const : 'incoming' as const
      };
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Extract Operations</h1>
                <p className="text-sm text-gray-600">Extract operation references from bank statements</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <a
                href="/"
                className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:ring-2 focus:ring-gray-500"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Analyzer
              </a>
              <a
                href="/"
                className="flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 focus:ring-2 focus:ring-blue-500"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Full Analysis
              </a>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!showDashboard ? (
          <>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Extract Operations from Bank Statement
              </h2>
              <p className="text-gray-600">
                Upload your CIH bank statement PDF to extract only the operation references
              </p>
              {redirectedFromMain && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-800">
                    <strong>Welcome!</strong> You were redirected here because no data was found on the main page.
                    Upload your PDF to extract operations and then navigate to the dashboard.
                  </p>
                </div>
              )}
            </div>

        {/* Upload Area */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            {isDragActive ? (
              <p className="text-blue-600">Drop the PDF file here...</p>
            ) : (
              <div>
                <p className="text-gray-600 mb-2">
                  Drag and drop your PDF file here, or click to select
                </p>
                <p className="text-sm text-gray-500">
                  PDF files only, max 10MB
                </p>
              </div>
            )}
          </div>

          {isLoading && (
            <div className="mt-4 text-center">
              <div className="inline-flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                <span className="text-gray-600">Processing PDF...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* Results */}
        {operations.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Extracted Operations
                </h2>
                <p className="text-sm text-gray-600">
                  Found {operations.length} operations from {fileName}
                  {filteredOperations.length !== operations.length && (
                    <span className="ml-2 text-blue-600">
                      ({filteredOperations.length} after filtering)
                    </span>
                  )}
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={exportToCSV}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </button>
                <button
                  onClick={saveOperations}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Save Operations
                </button>
              </div>
            </div>

            {/* Filter and Group Controls */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex flex-wrap gap-4 items-center">
                {/* Search */}
                <div className="flex-1 min-w-64">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Search operations..."
                      value={filters.searchText}
                      onChange={(e) => setFilters(prev => ({ ...prev, searchText: e.target.value }))}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                    />
                  </div>
                </div>

                {/* Status Filter */}
                <div className="min-w-32">
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as FilterState['status'] }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                  >
                    <option value="all">-- All Status --</option>
                    <option value="Incoming">Incoming</option>
                    <option value="Outgoing">Outgoing</option>
                  </select>
                </div>

                {/* Category Filter */}
                <div className="min-w-48">
                  <select
                    value={filters.category}
                    onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value as FilterState['category'] }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                  >
                    <option value="all" className="text-gray-900">-- All Categories --</option>
                    {getAllCategories().map(cat => (
                      <option key={cat.value} value={cat.value} className="text-gray-900">{cat.label}</option>
                    ))}
                  </select>
                </div>

                {/* Group By */}
                <div className="min-w-32">
                  <select
                    value={groupBy}
                    onChange={(e) => setGroupBy(e.target.value as GroupByOption)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                  >
                    <option value="none" className="text-gray-900">No Grouping</option>
                    <option value="status" className="text-gray-900">Group by Status</option>
                    <option value="category" className="text-gray-900">Group by Category</option>
                    <option value="date" className="text-gray-900">Group by Date</option>
                  </select>
                </div>

                {/* Clear Filters */}
                <button
                  onClick={() => {
                    setFilters({
                      searchText: '',
                      status: 'all',
                      category: 'all',
                      dateFrom: '',
                      dateTo: ''
                    });
                    setGroupBy('none');
                  }}
                  className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Summary Statistics */}
            {filteredOperations.length > 0 && (
              <div className="px-6 py-3 bg-blue-50 border-b border-gray-200">
                <div className="flex flex-wrap gap-6 text-sm">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-700">Total:</span>
                    <span className="text-gray-900">{filteredOperations.length}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-700">Incoming:</span>
                    <span className="text-green-600">
                      {filteredOperations.filter(op => op.status === 'Incoming').length}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-700">Outgoing:</span>
                    <span className="text-red-600">
                      {filteredOperations.filter(op => op.status === 'Outgoing').length}
                    </span>
                  </div>
                  {groupBy !== 'none' && (
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-700">Groups:</span>
                      <span className="text-blue-600">{Object.keys(groupedOperations).length}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              {Object.entries(groupedOperations).map(([groupKey, groupOperations]) => (
                <div key={groupKey} className="mb-4 last:mb-0">
                  {/* Group Header */}
                  {groupBy !== 'none' && (
                    <div
                      className="flex items-center justify-between px-6 py-3 bg-gray-100 border-b cursor-pointer hover:bg-gray-200"
                      onClick={() => toggleGroup(groupKey)}
                    >
                      <div className="flex items-center space-x-2">
                        {expandedGroups.has(groupKey) ? (
                          <ChevronDown className="h-4 w-4 text-gray-500" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-500" />
                        )}
                        <h3 className="font-medium text-gray-900">{groupKey}</h3>
                        <span className="text-sm text-gray-500">({groupOperations.length} operations)</span>
                      </div>
                    </div>
                  )}

                  {/* Group Content */}
                  {(groupBy === 'none' || expandedGroups.has(groupKey)) && (
                    <table className="min-w-full divide-y divide-gray-200">
                      {groupBy === 'none' && (
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              #
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Operation Reference
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Amount
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Category
                            </th>
                          </tr>
                        </thead>
                      )}
                      <tbody className="bg-white divide-y divide-gray-200">
                        {groupOperations.map((operation, index) => {
                          const globalIndex = operations.findIndex(op => op.id === operation.id) + 1;
                          return (
                            <tr key={operation.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {globalIndex}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {operation.date}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900">
                                {operation.operation}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {operation.amount?.toLocaleString() || '0'} DHS
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  operation.status === 'Incoming'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {operation.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                <CategoryDisplay categoryId={operation.category} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Keyword Management Section */}
        {operations.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Operation Categories & Keywords
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Manage keywords for automatic classification of incoming and outgoing operations
              </p>
            </div>

            <div className="p-6">
              {/* Outgoing Categories */}
              <div className="mb-8">
                <h3 className="text-md font-medium text-gray-900 mb-4">Outgoing Operation Categories</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Withdraw Category */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                    <h3 className="font-medium text-gray-900">Cash Withdrawal</h3>
                  </div>
                  <div className="text-xs text-gray-600 mb-2">Keywords:</div>
                  <div className="flex flex-wrap gap-1">
                    {['RETRAIT', 'ATM', 'DISTRIBUTEUR', 'CASH', 'ESPECES', 'GAB'].map((keyword) => (
                      <span key={keyword} className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Internet Category */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                    <h3 className="font-medium text-gray-900">Internet Payment</h3>
                  </div>
                  <div className="text-xs text-gray-600 mb-2">Keywords:</div>
                  <div className="flex flex-wrap gap-1">
                    {['SPOTIFY', 'NETFLIX', 'AMAZON', 'PAYPAL', 'INTERNET', 'ONLINE'].map((keyword) => (
                      <span key={keyword} className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Shopping Category */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                    <h3 className="font-medium text-gray-900">Shopping</h3>
                  </div>
                  <div className="text-xs text-gray-600 mb-2">Keywords:</div>
                  <div className="flex flex-wrap gap-1">
                    {['BIM', 'MARJANE', 'CARREFOUR', 'ZARA', 'H&M', 'ACIMA'].map((keyword) => (
                      <span key={keyword} className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Send to Friend Category */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div>
                    <h3 className="font-medium text-gray-900">Send to Friend</h3>
                  </div>
                  <div className="text-xs text-gray-600 mb-2">Keywords:</div>
                  <div className="flex flex-wrap gap-1">
                    {['VIREMENT', 'TRANSFER', 'ENVOI', 'FRIEND', 'AMI', 'FAMILLE'].map((keyword) => (
                      <span key={keyword} className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
                </div>
              </div>

              {/* Incoming Categories */}
              <div>
                <h3 className="text-md font-medium text-gray-900 mb-4">Incoming Operation Categories</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                  {/* Salary Category */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <div className="w-3 h-3 rounded-full bg-green-600 mr-2"></div>
                      <h3 className="font-medium text-gray-900">Salary</h3>
                    </div>
                    <div className="text-xs text-gray-600 mb-2">Keywords:</div>
                    <div className="flex flex-wrap gap-1">
                      {['SALAIRE', 'SALARY', 'PAIE', 'REMUNERATION', 'TRAITEMENT'].map((keyword) => (
                        <span key={keyword} className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Transfer Received Category */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div>
                      <h3 className="font-medium text-gray-900">Transfer Received</h3>
                    </div>
                    <div className="text-xs text-gray-600 mb-2">Keywords:</div>
                    <div className="flex flex-wrap gap-1">
                      {['VIREMENT', 'TRANSFER', 'RECEPTION', 'RECU', 'FRIEND', 'AMI'].map((keyword) => (
                        <span key={keyword} className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Refund Category */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                      <h3 className="font-medium text-gray-900">Refund</h3>
                    </div>
                    <div className="text-xs text-gray-600 mb-2">Keywords:</div>
                    <div className="flex flex-wrap gap-1">
                      {['REMBOURSEMENT', 'REFUND', 'RETOUR', 'CREDIT', 'RESTITUTION'].map((keyword) => (
                        <span key={keyword} className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Investment Category */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
                      <h3 className="font-medium text-gray-900">Investment Income</h3>
                    </div>
                    <div className="text-xs text-gray-600 mb-2">Keywords:</div>
                    <div className="flex flex-wrap gap-1">
                      {['DIVIDENDE', 'DIVIDEND', 'INTERET', 'INTEREST', 'PLACEMENT'].map((keyword) => (
                        <span key={keyword} className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Other Income Category */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <div className="w-3 h-3 rounded-full bg-gray-500 mr-2"></div>
                      <h3 className="font-medium text-gray-900">Other Income</h3>
                    </div>
                    <div className="text-xs text-gray-600 mb-2">Keywords:</div>
                    <div className="flex flex-wrap gap-1">
                      <span className="text-xs text-gray-500 italic">Default category</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-500">
                  Keywords are used to automatically classify incoming and outgoing operations.
                  You can manage these keywords through the Settings page.
                </p>
              </div>
            </div>
          </div>
        )}
          </>
        ) : (
          /* Dashboard View */
          <div className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Operations Dashboard
              </h2>
              <p className="text-gray-600">
                Your extracted operations from {fileName}
              </p>
            </div>

            {/* Dashboard Stats */}
            <div className="space-y-6 mb-8">
              {/* First Row - Operation Counts */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-blue-50 p-6 rounded-lg">
                  <div className="flex items-center">
                    <FileText className="w-8 h-8 text-blue-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-blue-600">Total Operations</p>
                      <p className="text-2xl font-bold text-blue-900">
                        {filteredOperations.length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 p-6 rounded-lg">
                  <div className="flex items-center">
                    <BarChart3 className="w-8 h-8 text-green-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-600">Incoming</p>
                      <p className="text-2xl font-bold text-green-900">
                        {filteredOperations.filter(op => op.status === 'Incoming').length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 p-6 rounded-lg">
                  <div className="flex items-center">
                    <Download className="w-8 h-8 text-red-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-red-600">Outgoing</p>
                      <p className="text-2xl font-bold text-red-900">
                        {filteredOperations.filter(op => op.status === 'Outgoing').length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 p-6 rounded-lg">
                  <div className="flex items-center">
                    <FileText className="w-8 h-8 text-purple-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-purple-600">File</p>
                      <p className="text-sm font-bold text-purple-900 truncate">
                        {fileName}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Second Row - Amounts */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-green-100 p-6 rounded-lg">
                  <div className="flex items-center">
                    <BarChart3 className="w-8 h-8 text-green-700" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-700">Total Received</p>
                      <p className="text-2xl font-bold text-green-900">
                        {filteredOperations
                          .filter(op => op.status === 'Incoming')
                          .reduce((sum, op) => sum + (op.amount || 0), 0)
                          .toLocaleString()} DHS
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-red-100 p-6 rounded-lg">
                  <div className="flex items-center">
                    <Download className="w-8 h-8 text-red-700" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-red-700">Total Spent</p>
                      <p className="text-2xl font-bold text-red-900">
                        {filteredOperations
                          .filter(op => op.status === 'Outgoing')
                          .reduce((sum, op) => sum + (op.amount || 0), 0)
                          .toLocaleString()} DHS
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-100 p-6 rounded-lg">
                  <div className="flex items-center">
                    <BarChart3 className="w-8 h-8 text-blue-700" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-blue-700">Net Flow</p>
                      <p className={`text-2xl font-bold ${
                        (filteredOperations
                          .filter(op => op.status === 'Incoming')
                          .reduce((sum, op) => sum + (op.amount || 0), 0) -
                        filteredOperations
                          .filter(op => op.status === 'Outgoing')
                          .reduce((sum, op) => sum + (op.amount || 0), 0)) >= 0 
                          ? 'text-green-900' : 'text-red-900'
                      }`}>
                        {(filteredOperations
                          .filter(op => op.status === 'Incoming')
                          .reduce((sum, op) => sum + (op.amount || 0), 0) -
                        filteredOperations
                          .filter(op => op.status === 'Outgoing')
                          .reduce((sum, op) => sum + (op.amount || 0), 0))
                          .toLocaleString()} DHS
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Operations Summary Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Operations Summary
                  </h2>
                  <p className="text-sm text-gray-600">
                    Overview of all extracted operations
                  </p>
                </div>
                <div className="flex space-x-3">
                  <a
                    href="/"
                    className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to main page
                  </a>
                  <button
                    onClick={exportToCSV}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </button>
                </div>
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
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredOperations.slice(0, 20).map((operation, index) => {
                      return (
                        <tr key={operation.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {operation.date}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {operation.operation}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {operation.amount?.toLocaleString() || '0'} DHS
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              operation.status === 'Incoming'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {operation.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <CategoryDisplay categoryId={operation.category} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filteredOperations.length > 20 && (
                  <div className="px-6 py-3 bg-gray-50 text-center">
                    <p className="text-sm text-gray-600">
                      Showing first 20 of {filteredOperations.length} operations
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Download Confirmation Modal */}
      {showDownloadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <FileText className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Operations Saved Successfully!
                    </h3>
                  </div>
                </div>
                <button
                  onClick={handleSkipDownload}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-6">
                <p className="text-gray-600 mb-2">
                  {filteredOperations.length} operations have been saved to the server.
                </p>
                <p className="text-sm text-gray-500">
                  Would you like to download a backup copy of the JSON file?
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleSkipDownload}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Skip Download
                </button>
                <button
                  onClick={handleDownloadAndContinue}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download & Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
