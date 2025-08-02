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
import { DollarSign, TrendingUp, TrendingDown, Filter } from 'lucide-react';
import { DashboardOperation, DashboardAnalytics } from '@/lib/dashboardAnalytics';

interface CategoryChartsProps {
  operations: DashboardOperation[];
}

export default function CategoryCharts({ operations }: CategoryChartsProps) {
  const [selectedType, setSelectedType] = useState<'All' | 'Incoming' | 'Outgoing'>('All');
  const [chartType, setChartType] = useState<'pie' | 'bar' | 'radial' | 'donut'>('pie');

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
        existing.incoming = (existing.incoming || 0) + (cat.type === 'Incoming' ? cat.count : 0);
        existing.outgoing = (existing.outgoing || 0) + (cat.type === 'Outgoing' ? cat.count : 0);
      } else {
        acc.push({
          ...cat,
          incoming: cat.type === 'Incoming' ? cat.count : 0,
          outgoing: cat.type === 'Outgoing' ? cat.count : 0
        });
      }
      return acc;
    }, [] as any[])
    .sort((a, b) => b.count - a.count);

  // Data for current selection
  const currentData = selectedType === 'Incoming' 
    ? incomingCategories 
    : selectedType === 'Outgoing' 
    ? outgoingCategories 
    : combinedCategories;

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value} ({((entry.value / filteredOperations.length) * 100).toFixed(1)}%)
            </p>
          ))}
        </div>
      );
    }
    return null;
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
                label={({ name, percentage }) => `${name} (${percentage.toFixed(1)}%)`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="count"
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
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
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
                dataKey="count"
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
                label={({ name, percentage }) => `${name} (${percentage.toFixed(1)}%)`}
                outerRadius={120}
                innerRadius={60}
                fill="#8884d8"
                dataKey="count"
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
            {currentData.length} categories • {filteredOperations.length} operations
          </div>
        </div>
        {renderChart()}
      </div>

      {/* Category Comparison (only for 'All' view) */}
      {selectedType === 'All' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Incoming vs Outgoing by Category</h3>
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
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="incoming" fill="#10B981" name="Incoming" />
              <Bar dataKey="outgoing" fill="#EF4444" name="Outgoing" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Category Details Table */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Category Details</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Count
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Percentage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentData.map((category, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div 
                        className="w-4 h-4 rounded-full mr-3"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="text-sm font-medium text-gray-900">
                        {category.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {category.count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {category.percentage.toFixed(1)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      category.type === 'Incoming' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {category.type}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Categories Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <TrendingUp className="w-5 h-5 text-green-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Top Incoming Categories</h3>
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
                  {category.count} ({category.percentage.toFixed(1)}%)
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <TrendingDown className="w-5 h-5 text-red-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Top Outgoing Categories</h3>
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
                  {category.count} ({category.percentage.toFixed(1)}%)
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
