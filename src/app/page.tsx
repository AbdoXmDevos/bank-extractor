'use client';

import React, { useState, useEffect } from 'react';
import { ParsedPDFResult } from '@/types/transaction';
import { FileText, Settings, History, List, Database, X, Upload, BarChart3, Download, CirclePlus, RefreshCw, Folder, Calendar, Hash, Trash2 } from 'lucide-react';

// Types for dashboard data from extract-operations
interface DashboardOperation {
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

interface SavedOperationFile {
  fileName: string;
  size: number;
  createdAt: string;
  modifiedAt: string;
  metadata: DashboardData['metadata'] | null;
  operationsCount: number;
  error?: string;
}

export default function Home() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [savedFiles, setSavedFiles] = useState<SavedOperationFile[]>([]);
  const [loadingSavedFiles, setLoadingSavedFiles] = useState(false);
  const [loadedOperationsList, setLoadedOperationsList] = useState<DashboardData[]>([]);
  const [deletingFiles, setDeletingFiles] = useState<Set<string>>(new Set());

  // Load saved operations files
  const loadSavedFiles = async () => {
    setLoadingSavedFiles(true);
    try {
      const response = await fetch('/api/load-operations');
      if (response.ok) {
        const result = await response.json();
        setSavedFiles(result.files || []);
      }
    } catch (error) {
      console.error('Failed to load saved files:', error);
    } finally {
      setLoadingSavedFiles(false);
    }
  };

  // Load specific operations file and add to list
  const loadOperationsFile = async (fileName: string) => {
    try {
      const response = await fetch(`/api/load-operations?fileName=${encodeURIComponent(fileName)}`);
      if (response.ok) {
        const result = await response.json();
        const operationData = result.data;

        // Check if already loaded
        const isAlreadyLoaded = loadedOperationsList.some(
          item => item.metadata.fileName === operationData.metadata.fileName
        );

        if (!isAlreadyLoaded) {
          setLoadedOperationsList(prev => [...prev, operationData]);
        } else {
          alert('This file is already loaded in the list');
        }
      } else {
        alert('Failed to load operations file');
      }
    } catch (error) {
      console.error('Failed to load operations file:', error);
      alert('Failed to load operations file');
    }
  };

  // Remove from loaded operations list
  const removeFromLoadedList = (fileName: string) => {
    setLoadedOperationsList(prev =>
      prev.filter(item => item.metadata.fileName !== fileName)
    );
  };

  // Clear all loaded operations
  const clearLoadedOperations = () => {
    setLoadedOperationsList([]);
  };

  // Send loaded operations to dashboard
  const viewInDashboard = () => {
    if (loadedOperationsList.length === 0) return;

    // Convert to dashboard format and store
    const dashboardFiles = loadedOperationsList.map(data => ({
      name: data.metadata.fileName,
      data: data,
      loadedAt: new Date().toISOString()
    }));

    localStorage.setItem('dashboard_preload_bulk', JSON.stringify({
      files: dashboardFiles
    }));

    // Navigate to dashboard
    window.location.href = '/dashboard';
  };

  // Delete saved operations file
  const deleteSavedFile = async (fileName: string) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${fileName}"?\n\nThis action cannot be undone and will permanently remove the file from your saved operations.`
    );

    if (!confirmDelete) return;

    // Add to deleting files set
    setDeletingFiles(prev => new Set(prev).add(fileName));

    try {
      const response = await fetch('/api/save-operations', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileName }),
      });

      if (response.ok) {
        // Remove from saved files list
        setSavedFiles(prev => prev.filter(file => file.fileName !== fileName));

        // Remove from loaded operations list if it's there
        setLoadedOperationsList(prev =>
          prev.filter(item => item.metadata.fileName !== fileName)
        );

        // Show success message
        alert('File deleted successfully');
      } else {
        const error = await response.json();
        alert(`Failed to delete file: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Failed to delete file. Please try again.');
    } finally {
      // Remove from deleting files set
      setDeletingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileName);
        return newSet;
      });
    }
  };

  // Check for dashboard data from extract-operations on mount and load saved files
  useEffect(() => {
    const savedData = localStorage.getItem('dashboardData');
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        setDashboardData(parsedData);
        // Clear the localStorage after loading to prevent stale data
        localStorage.removeItem('dashboardData');
      } catch (error) {
        console.error('Failed to parse dashboard data:', error);
      }
    }

    // Load saved files list
    loadSavedFiles();
  }, []);

  const clearDashboardData = () => {
    setDashboardData(null);
  };

  const getDashboardStats = (data: DashboardData) => {
    const incoming = data.operations.filter(op => op.status === 'Incoming').length;
    const outgoing = data.operations.filter(op => op.status === 'Outgoing').length;

    return {
      totalOperations: data.operations.length,
      incoming,
      outgoing,
      fileName: data.metadata.fileName,
      extractDate: data.metadata.extractDate,
      isFiltered: data.metadata.filteredOperations !== data.metadata.totalOperations
    };
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
                <h1 className="text-2xl font-bold text-gray-900">CIH Bank Statement Analyzer</h1>
                <p className="text-sm text-gray-600">Upload and analyze your bank statements</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <a
                href="/extract-operations"
                className="flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 focus:ring-2 focus:ring-blue-500"
              >
                <CirclePlus className="w-4 h-4 mr-2" />
                Add operations
              </a>
              <a
                href="/settings"
                className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:ring-2 focus:ring-gray-500"
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section - Only show when no saved files */}
        {!loadingSavedFiles && savedFiles.length === 0 && (
          <div className="text-center mb-12">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Welcome to CIH Bank Statement Analyzer
              </h2>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Easily extract and analyze operations from your CIH bank statements.
                Upload your PDF files to automatically categorize transactions and gain insights into your financial data.
              </p>
              <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
                <div className="flex flex-col items-center space-y-6">
                  <FileText className="w-16 h-16 text-blue-600" />
                  <div className="text-center">
                    <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                      Ready to Get Started?
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Click the button below to upload your bank statement and extract operations
                    </p>
                  </div>
                  <a
                    href="/extract-operations"
                    className="inline-flex items-center px-8 py-4 bg-blue-600 text-white text-lg font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
                  >
                    <FileText className="w-6 h-6 mr-3" />
                    Extract Operations
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Data from Extract Operations */}
        {dashboardData && (
          <div className="mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Database className="w-6 h-6 text-green-600" />
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Current Operations Data
                    </h2>
                    <p className="text-sm text-gray-600">
                      Data from {getDashboardStats(dashboardData).fileName} is ready for analysis
                    </p>
                  </div>
                </div>
                <button
                  onClick={clearDashboardData}
                  className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-red-600 border border-gray-300 rounded-md hover:border-red-300"
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear
                </button>
              </div>
              <div className="text-center">
                <p className="text-gray-600 mb-4">
                  {getDashboardStats(dashboardData).totalOperations} operations extracted
                  ({getDashboardStats(dashboardData).incoming} incoming, {getDashboardStats(dashboardData).outgoing} outgoing)
                </p>
                <a
                  href="/extract-operations"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  View Full Analysis
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Saved Operations Section - Only show if files exist */}
        {!loadingSavedFiles && savedFiles.length > 0 && (
          <div className="mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Folder className="w-6 h-6 text-blue-600" />
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Saved Operations
                    </h2>
                    <p className="text-sm text-gray-600">
                      Previously processed operations files
                      {loadedOperationsList.length > 0 && (
                        <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                          {loadedOperationsList.length} loaded
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <a
                    href="/extract-operations"
                    className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    <CirclePlus className="w-4 h-4 mr-1" />
                    New
                  </a>
                  <button
                    onClick={loadSavedFiles}
                    disabled={loadingSavedFiles}
                    className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-blue-600 border border-gray-300 rounded-md hover:border-blue-300 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 mr-1 ${loadingSavedFiles ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {savedFiles.slice(0, 5).map((file) => (
                  <div key={file.fileName} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-1">
                        <FileText className="w-4 h-4 text-blue-500" />
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {file.metadata?.fileName || file.fileName}
                        </h4>
                        {file.error && (
                          <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                            Error
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span className="flex items-center">
                          <Hash className="w-3 h-3 mr-1" />
                          {file.operationsCount} operations
                        </span>
                        <span className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {new Date(file.createdAt).toLocaleDateString()}
                        </span>
                        <span>
                          {(file.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => loadOperationsFile(file.fileName)}
                        disabled={!!file.error || loadedOperationsList.some(item => item.metadata.fileName === (file.metadata?.fileName || file.fileName))}
                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loadedOperationsList.some(item => item.metadata.fileName === (file.metadata?.fileName || file.fileName)) ? 'Loaded' : 'Add to List'}
                      </button>
                      <button
                        onClick={() => deleteSavedFile(file.fileName)}
                        disabled={deletingFiles.has(file.fileName)}
                        className="p-1 text-gray-400 hover:text-red-600 focus:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={deletingFiles.has(file.fileName) ? "Deleting..." : "Delete file"}
                      >
                        {deletingFiles.has(file.fileName) ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
                {savedFiles.length > 5 && (
                  <div className="text-center pt-2">
                    <p className="text-sm text-gray-500">
                      Showing 5 of {savedFiles.length} files
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Loaded Operations List */}
        {loadedOperationsList.length > 0 && (
          <div className="mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <List className="w-6 h-6 text-purple-600" />
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Loaded Operations ({loadedOperationsList.length})
                    </h2>
                    <p className="text-sm text-gray-600">
                      Files ready for dashboard analysis
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={viewInDashboard}
                    className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    View in Dashboard
                  </button>
                  <button
                    onClick={clearLoadedOperations}
                    className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-red-600 border border-gray-300 rounded-md hover:border-red-300"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Clear All
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {loadedOperationsList.map((data, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-1">
                        <FileText className="w-4 h-4 text-purple-500" />
                        <h4 className="text-sm font-medium text-gray-900">
                          {data.metadata.fileName}
                        </h4>
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span className="flex items-center">
                          <Hash className="w-3 h-3 mr-1" />
                          {data.operations.length} operations
                        </span>
                        <span className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {new Date(data.metadata.extractDate).toLocaleDateString()}
                        </span>
                        <span className="text-green-600 font-medium">
                          ✓ Loaded
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFromLoadedList(data.metadata.fileName)}
                      className="ml-4 p-2 text-gray-400 hover:text-red-600"
                      title="Remove from list"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    Total Operations: {loadedOperationsList.reduce((sum, data) => sum + data.operations.length, 0)}
                  </span>
                  <span className="text-gray-600">
                    Ready for analysis in dashboard
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Features Section - Only show when no saved files */}
        {!loadingSavedFiles && savedFiles.length === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="bg-white p-6 rounded-lg shadow-sm border text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Easy Upload</h3>
              <p className="text-gray-600">
                Simply drag and drop your CIH bank statement PDF file to get started
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Auto-Categorize</h3>
              <p className="text-gray-600">
                Transactions are automatically categorized and organized for easy analysis
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Download className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Export Data</h3>
              <p className="text-gray-600">
                Export your processed data in JSON or CSV format for further analysis
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
