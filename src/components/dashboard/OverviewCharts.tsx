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

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Stats cards data
  const statsCards = [
    {
      title: 'Total Operations',
      value: stats.totalOperations,
      icon: Activity,
      color: 'blue',
      change: null
    },
    {
      title: 'Incoming',
      value: stats.totalIncoming,
      icon: TrendingUp,
      color: 'green',
      change: `${((stats.totalIncoming / stats.totalOperations) * 100).toFixed(1)}%`
    },
    {
      title: 'Outgoing',
      value: stats.totalOutgoing,
      icon: TrendingDown,
      color: 'red',
      change: `${((stats.totalOutgoing / stats.totalOperations) * 100).toFixed(1)}%`
    },
    {
      title: 'Net Flow',
      value: stats.netFlow,
      icon: DollarSign,
      color: stats.netFlow >= 0 ? 'green' : 'red',
      change: stats.netFlow >= 0 ? 'Positive' : 'Negative'
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
                  <p className="text-2xl font-bold text-gray-900">{stat.value.toLocaleString()}</p>
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
        {/* Daily Activity Line Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Activity</h3>
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
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="incoming" 
                stroke="#10B981" 
                strokeWidth={2}
                name="Incoming"
              />
              <Line 
                type="monotone" 
                dataKey="outgoing" 
                stroke="#EF4444" 
                strokeWidth={2}
                name="Outgoing"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Incoming vs Outgoing Bar Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Incoming vs Outgoing</h3>
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
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="incoming" fill="#10B981" name="Incoming" />
              <Bar dataKey="outgoing" fill="#EF4444" name="Outgoing" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Incoming Categories Pie Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Incoming Categories</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={incomingCategories}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name} (${percentage.toFixed(1)}%)`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="count"
              >
                {incomingCategories.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Outgoing Categories Pie Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Outgoing Categories</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={outgoingCategories}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name} (${percentage.toFixed(1)}%)`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="count"
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

      {/* Net Flow Area Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Net Flow Trend</h3>
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
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey="net" 
              stroke="#8B5CF6" 
              fill="#8B5CF6" 
              fillOpacity={0.3}
              name="Net Flow"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-sm text-gray-600">Most Active Day</p>
            <p className="text-lg font-semibold text-gray-900">{stats.mostActiveDay || 'N/A'}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Top Incoming Category</p>
            <p className="text-lg font-semibold text-green-600">{stats.topIncomingCategory}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Top Outgoing Category</p>
            <p className="text-lg font-semibold text-red-600">{stats.topOutgoingCategory}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
