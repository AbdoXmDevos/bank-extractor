'use client';

import React, { useState, useMemo } from 'react';
import { Transaction, FilterOptions } from '@/types/transaction';
import { CategoryService } from '@/lib/categoryService';
import { Search, Filter, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import CategoryBadge from './CategoryBadge';

interface TransactionTableProps {
  transactions: Transaction[];
  onFilterChange?: (filters: FilterOptions) => void;
}

type SortField = 'date' | 'amount' | 'operation' | 'category';
type SortDirection = 'asc' | 'desc';

export default function TransactionTable({ transactions, onFilterChange }: TransactionTableProps) {
  const [filters, setFilters] = useState<FilterOptions>({
    category: '',
    dateFrom: '',
    dateTo: '',
    type: 'ALL',
    searchText: ''
  });
  
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  const categoryService = CategoryService.getInstance();
  const categories = categoryService.getCategories();

  // Filter and sort transactions
  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = transactions.filter(transaction => {
      // Category filter
      if (filters.category && transaction.category !== filters.category) {
        return false;
      }
      
      // Type filter
      if (filters.type && filters.type !== 'ALL' && transaction.type !== filters.type) {
        return false;
      }
      
      // Date range filter
      if (filters.dateFrom) {
        const transactionDate = new Date(transaction.date.split('/').reverse().join('-'));
        const fromDate = new Date(filters.dateFrom);
        if (transactionDate < fromDate) return false;
      }
      
      if (filters.dateTo) {
        const transactionDate = new Date(transaction.date.split('/').reverse().join('-'));
        const toDate = new Date(filters.dateTo);
        if (transactionDate > toDate) return false;
      }
      
      // Search text filter
      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        return transaction.operation.toLowerCase().includes(searchLower);
      }
      
      return true;
    });

    // Sort transactions
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case 'date':
          aValue = new Date(a.date.split('/').reverse().join('-'));
          bValue = new Date(b.date.split('/').reverse().join('-'));
          break;
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'operation':
          aValue = a.operation.toLowerCase();
          bValue = b.operation.toLowerCase();
          break;
        case 'category':
          aValue = categoryService.getCategoryName(a.category).toLowerCase();
          bValue = categoryService.getCategoryName(b.category).toLowerCase();
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [transactions, filters, sortField, sortDirection, categoryService]);

  const handleFilterChange = (newFilters: Partial<FilterOptions>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    onFilterChange?.(updatedFilters);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortDirection === 'asc' ? 
      <ArrowUp className="w-4 h-4 text-blue-500" /> : 
      <ArrowDown className="w-4 h-4 text-blue-500" />;
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: 'MAD'
    }).format(amount);
  };

  return (
    <div className="w-full">
      {/* Filters */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search transactions..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={filters.searchText || ''}
              onChange={(e) => handleFilterChange({ searchText: e.target.value })}
            />
          </div>
          
          {/* Category Filter */}
          <select
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={filters.category || ''}
            onChange={(e) => handleFilterChange({ category: e.target.value })}
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          
          {/* Type Filter */}
          <select
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={filters.type || 'ALL'}
            onChange={(e) => handleFilterChange({ type: e.target.value as 'DEBIT' | 'CREDIT' | 'ALL' })}
          >
            <option value="ALL">All Types</option>
            <option value="DEBIT">Debit</option>
            <option value="CREDIT">Credit</option>
          </select>
          
          {/* Date From */}
          <input
            type="date"
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={filters.dateFrom || ''}
            onChange={(e) => handleFilterChange({ dateFrom: e.target.value })}
          />
        </div>
        
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Showing {filteredAndSortedTransactions.length} of {transactions.length} transactions
          </span>
          {(filters.category || filters.type !== 'ALL' || filters.searchText || filters.dateFrom) && (
            <button
              onClick={() => handleFilterChange({ category: '', type: 'ALL', searchText: '', dateFrom: '', dateTo: '' })}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('date')}
              >
                <div className="flex items-center space-x-1">
                  <span>Date</span>
                  {getSortIcon('date')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('operation')}
              >
                <div className="flex items-center space-x-1">
                  <span>Operation</span>
                  {getSortIcon('operation')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('amount')}
              >
                <div className="flex items-center space-x-1">
                  <span>Amount</span>
                  {getSortIcon('amount')}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('category')}
              >
                <div className="flex items-center space-x-1">
                  <span>Category</span>
                  {getSortIcon('category')}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAndSortedTransactions.map((transaction) => (
              <tr key={transaction.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {transaction.date}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                  <div className="truncate" title={transaction.operation}>
                    {transaction.operation}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <span className={transaction.type === 'DEBIT' ? 'text-red-600' : 'text-green-600'}>
                    {transaction.type === 'DEBIT' ? '-' : '+'}{formatAmount(transaction.amount)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    transaction.type === 'DEBIT' 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {transaction.type}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <CategoryBadge categoryId={transaction.category} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredAndSortedTransactions.length === 0 && (
          <div className="text-center py-12">
            <Filter className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No transactions found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your filters to see more results.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
