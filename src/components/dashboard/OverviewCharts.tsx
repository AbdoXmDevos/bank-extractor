'use client';

import React from 'react';
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
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Users,
  Calendar,
  DollarSign
} from 'lucide-react';
import { DashboardOperation, DashboardAnalytics, DashboardStats } from '@/lib/dashboardAnalytics';

interface OverviewChartsProps {
  operations: DashboardOperation[];
}

export default function OverviewCharts({ operations }: OverviewChartsProps) {
  const stats = DashboardAnalytics.calculateStats(operations);
  const timeSeriesData = DashboardAnalytics.generateTimeSeriesData(operations);
  const dailyActivity = DashboardAnalytics.getDailyActivity(operations);
  const incomingCategories = DashboardAnalytics.getCategoryBreakdown(
    operations.filter(op => op.status === 'Incoming'), 
    'Incoming'
  );
  const outgoingCategories = DashboardAnalytics.getCategoryBreakdown(
    operations.filter(op => op.status === 'Outgoing'), 
    'Outgoing'
  );

  // Custom tooltip for charts with currency formatting
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {typeof entry.value === 'number' ? `${entry.value.toLocaleString()} DHS` : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Format currency helper
  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} DHS`;
  };

  // Stats cards data - focus on monetary amounts
  const statsCards = [
    {
      title: 'Total Money Received',
      value: formatCurrency(stats.totalIncomingAmount),
      icon: TrendingUp,
      color: 'green',
      change: `${stats.incomingCount}  operations`
    },
    {
      title: 'Total Money Spent',
      value: formatCurrency(stats.totalOutgoingAmount),
      icon: TrendingDown,
      color: 'red',
      change: `${stats.outgoingCount} operations`
    },
    {
      title: 'Net Cash Flow',
      value: formatCurrency(stats.netAmount),
      icon: DollarSign,
      color: stats.netAmount >= 0 ? 'green' : 'red',
      change: stats.netAmount >= 0 ? 'Positive' : 'Negative'
    },
    {
      title: 'Average Transaction',
      value: formatCurrency((stats.totalIncomingAmount + stats.totalOutgoingAmount) / stats.totalOperations),
      icon: Activity,
      color: 'blue',
      change: `${stats.totalOperations} total operations`
    }
  ];

  const getColorClass = (color: string, type: 'bg' | 'text' | 'border') => {
    const colorMap = {
      blue: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' },
      green: { bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-200' },
      red: { bg: 'bg-red-100', text: 'text-red-600', border: 'border-red-200' },
      purple: { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-200' }
    };
    return colorMap[color as keyof typeof colorMap]?.[type] || colorMap.blue[type];
  };

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  {stat.change && (
                    <p className={`text-sm ${getColorClass(stat.color, 'text')}`}>
                      {stat.change}
                    </p>
                  )}
                </div>
                <div className={`p-3 rounded-full ${getColorClass(stat.color, 'bg')}`}>
                  <Icon className={`w-6 h-6 ${getColorClass(stat.color, 'text')}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Daily Money Flow Line Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Money Flow</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyActivity}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis tickFormatter={(value) => `${value.toLocaleString()} DHS`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="incomingAmount" 
                stroke="#10B981" 
                strokeWidth={2}
                name="Money Received"
              />
              <Line 
                type="monotone" 
                dataKey="outgoingAmount" 
                stroke="#EF4444" 
                strokeWidth={2}
                name="Money Spent"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Money Received vs Spent Bar Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Money Received vs Spent</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis tickFormatter={(value) => `${value.toLocaleString()} DHS`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="incomingAmount" fill="#10B981" name="Money Received" />
              <Bar dataKey="outgoingAmount" fill="#EF4444" name="Money Spent" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Incoming Categories by Amount Pie Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Money Received by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={incomingCategories}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, totalAmount, percentage }) => `${name} (${formatCurrency(totalAmount)})`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="totalAmount"
              >
                {incomingCategories.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Outgoing Categories by Amount Pie Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Money Spent by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={outgoingCategories}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, totalAmount, percentage }) => `${name} (${formatCurrency(totalAmount)})`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="totalAmount"
              >
                {outgoingCategories.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Net Cash Flow Area Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Net Cash Flow Trend</h3>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={timeSeriesData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis tickFormatter={(value) => `${value.toLocaleString()} DHS`} />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey="netAmount" 
              stroke="#8B5CF6" 
              fill="#8B5CF6" 
              fillOpacity={0.3}
              name="Net Cash Flow"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <p className="text-sm text-gray-600">Average Money Received</p>
            <p className="text-lg font-semibold text-green-600">{formatCurrency(stats.averageIncomingAmount)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Average Money Spent</p>
            <p className="text-lg font-semibold text-red-600">{formatCurrency(stats.averageOutgoingAmount)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Top Receiving Category</p>
            <p className="text-lg font-semibold text-green-600">{stats.topIncomingCategory}</p>
            <p className="text-sm text-gray-500">{formatCurrency(stats.topIncomingCategoryAmount)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Top Spending Category</p>
            <p className="text-lg font-semibold text-red-600">{stats.topOutgoingCategory}</p>
            <p className="text-sm text-gray-500">{formatCurrency(stats.topOutgoingCategoryAmount)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
