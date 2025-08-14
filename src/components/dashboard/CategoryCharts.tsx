'use client';

import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
  ComposedChart,
  Line
} from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, Filter, ChevronUp, ChevronDown } from 'lucide-react';
import { DashboardOperation, DashboardAnalytics } from '@/lib/dashboardAnalytics';

interface CategoryChartsProps {
  operations: DashboardOperation[];
}

export default function CategoryCharts({ operations }: CategoryChartsProps) {
  const [selectedType, setSelectedType] = useState<'All' | 'Incoming' | 'Outgoing'>('All');
  const [chartType, setChartType] = useState<'pie' | 'bar' | 'radial' | 'donut'>('pie');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Filter operations based on selected type
  const filteredOperations = selectedType === 'All' 
    ? operations 
    : operations.filter(op => op.status === selectedType);

  const incomingCategories = DashboardAnalytics.getCategoryBreakdown(
    operations.filter(op => op.status === 'Incoming'), 
    'Incoming'
  );
  
  const outgoingCategories = DashboardAnalytics.getCategoryBreakdown(
    operations.filter(op => op.status === 'Outgoing'), 
    'Outgoing'
  );

  // Combined categories for comparison
  const combinedCategories = [...incomingCategories, ...outgoingCategories]
    .reduce((acc, cat) => {
      const existing = acc.find(c => c.name === cat.name);
      if (existing) {
        existing.count += cat.count;
        existing.totalAmount += cat.totalAmount;
        existing.incoming = (existing.incoming || 0) + (cat.type === 'Incoming' ? cat.totalAmount : 0);
        existing.outgoing = (existing.outgoing || 0) + (cat.type === 'Outgoing' ? cat.totalAmount : 0);
      } else {
        acc.push({
          ...cat,
          incoming: cat.type === 'Incoming' ? cat.totalAmount : 0,
          outgoing: cat.type === 'Outgoing' ? cat.totalAmount : 0
        });
      }
      return acc;
    }, [] as any[])
    .sort((a, b) => b.totalAmount - a.totalAmount);

  // Data for current selection
  const currentData = selectedType === 'Incoming' 
    ? incomingCategories 
    : selectedType === 'Outgoing' 
    ? outgoingCategories 
    : combinedCategories;

  // Format currency helper
  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} DHS`;
  };

  // Custom tooltip with currency formatting
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {formatCurrency(entry.value)} ({((entry.value / filteredOperations.reduce((sum, op) => sum + op.amount, 0)) * 100).toFixed(1)}%)
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const toggleCategoryExpansion = (categoryName: string) => {
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

  // Render different chart types
  const renderChart = () => {
    switch (chartType) {
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={currentData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, totalAmount, percentage }) => `${name} (${formatCurrency(totalAmount)})`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="totalAmount"
              >
                {currentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={currentData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={12}
              />
              <YAxis tickFormatter={(value) => `${value.toLocaleString()} DHS`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="totalAmount" radius={[4, 4, 0, 0]}>
                {currentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );

      case 'radial':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RadialBarChart cx="50%" cy="50%" innerRadius="10%" outerRadius="80%" data={currentData}>
              <RadialBar
                background
                dataKey="totalAmount"
              >
                {currentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </RadialBar>
              <Tooltip content={<CustomTooltip />} />
            </RadialBarChart>
          </ResponsiveContainer>
        );

      case 'donut':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={currentData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, totalAmount, percentage }) => `${name} (${formatCurrency(totalAmount)})`}
                outerRadius={120}
                innerRadius={60}
                fill="#8884d8"
                dataKey="totalAmount"
              >
                {currentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      {/* Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <Filter className="w-5 h-5 text-gray-400" />
            <div className="flex space-x-2">
              {['All', 'Incoming', 'Outgoing'].map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type as any)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    selectedType === type
                      ? 'bg-purple-100 text-purple-700 border border-purple-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex space-x-2">
            {['pie', 'bar', 'radial', 'donut'].map((type) => (
              <button
                key={type}
                onClick={() => setChartType(type as any)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors capitalize ${
                  chartType === type
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            {selectedType === 'All' ? 'All Categories' : `${selectedType} Categories`}
          </h3>
          <div className="text-sm text-gray-600">
            {currentData.length} categories • {formatCurrency(filteredOperations.reduce((sum, op) => sum + op.amount, 0))} total
          </div>
        </div>
        {renderChart()}
      </div>

      {/* Category Comparison (only for 'All' view) */}
      {selectedType === 'All' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Money Received vs Spent by Category</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={combinedCategories} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={12}
              />
              <YAxis tickFormatter={(value) => `${value.toLocaleString()} DHS`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="incoming" fill="#10B981" name="Money Received" />
              <Bar dataKey="outgoing" fill="#EF4444" name="Money Spent" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Category Details Table */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Category Details</h3>
        
        {/* Category Accordion */}
        <div className="space-y-3">
          {currentData.map((category, index) => (
            <div key={index} className="border border-gray-200 rounded-lg">
              <button
                onClick={() => toggleCategoryExpansion(category.name)}
                className="w-full p-4 text-left hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-inset"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">{category.name}</h4>
                      <p className="text-sm text-gray-500">
                        {formatCurrency(category.totalAmount)} • {category.count} operations
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">
                      {category.percentage.toFixed(1)}%
                    </span>
                    {expandedCategories.has(category.name) ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>
              </button>
              
              {expandedCategories.has(category.name) && (
                <div className="border-t border-gray-200 p-4 bg-gray-50">
                  <div className="space-y-2">
                    {operations
                      .filter(op => {
                        const opCategory = op.categoryInfo?.name || 'Unknown';
                        return opCategory === category.name;
                      })
                      .map((op, opIndex) => (
                        <div key={opIndex} className="flex items-center justify-between py-2 px-3 bg-white rounded border">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {op.operation}
                            </p>
                            <p className="text-xs text-gray-500">
                              {op.date} • {op.status}
                            </p>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className="text-sm font-medium text-gray-900">
                              {formatCurrency(op.amount)}
                            </span>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              op.status === 'Incoming' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {op.status}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Top Categories Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <TrendingUp className="w-5 h-5 text-green-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Top Receiving Categories</h3>
          </div>
          <div className="space-y-3">
            {incomingCategories.slice(0, 5).map((category, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-3"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="text-sm text-gray-900">{category.name}</span>
                </div>
                <div className="text-sm font-medium text-gray-900">
                  {formatCurrency(category.totalAmount)} ({category.percentage.toFixed(1)}%)
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <TrendingDown className="w-5 h-5 text-red-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Top Spending Categories</h3>
          </div>
          <div className="space-y-3">
            {outgoingCategories.slice(0, 5).map((category, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-3"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="text-sm text-gray-900">{category.name}</span>
                </div>
                <div className="text-sm font-medium text-gray-900">
                  {formatCurrency(category.totalAmount)} ({category.percentage.toFixed(1)}%)
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
