'use client';

import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart
} from 'recharts';
import { TrendingUp, TrendingDown, Calendar, Activity } from 'lucide-react';
import { DashboardOperation, DashboardAnalytics } from '@/lib/dashboardAnalytics';

interface TrendChartsProps {
  operations: DashboardOperation[];
}

export default function TrendCharts({ operations }: TrendChartsProps) {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('all');
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar' | 'composed'>('line');

  // Filter operations by time range
  const filteredOperations = useMemo(() => {
    if (timeRange === 'all') return operations;
    
    const now = new Date();
    const daysBack = timeRange === '7d' ? 7 : 30;
    const cutoffDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));
    
    return operations.filter(op => {
      const opDate = new Date(op.date);
      return opDate >= cutoffDate;
    });
  }, [operations, timeRange]);

  const timeSeriesData = DashboardAnalytics.generateTimeSeriesData(filteredOperations);
  
  // Calculate moving averages for amounts
  const dataWithMovingAverage = useMemo(() => {
    const windowSize = 7; // 7-day moving average
    return timeSeriesData.map((item, index) => {
      const start = Math.max(0, index - windowSize + 1);
      const window = timeSeriesData.slice(start, index + 1);
      
      const avgIncomingAmount = window.reduce((sum, d) => sum + d.incomingAmount, 0) / window.length;
      const avgOutgoingAmount = window.reduce((sum, d) => sum + d.outgoingAmount, 0) / window.length;
      const avgNetAmount = window.reduce((sum, d) => sum + d.netAmount, 0) / window.length;
      
      return {
        ...item,
        avgIncomingAmount: Math.round(avgIncomingAmount * 100) / 100,
        avgOutgoingAmount: Math.round(avgOutgoingAmount * 100) / 100,
        avgNetAmount: Math.round(avgNetAmount * 100) / 100
      };
    });
  }, [timeSeriesData]);

  // Calculate trend statistics for amounts
  const trendStats = useMemo(() => {
    if (timeSeriesData.length < 2) return null;
    
    const first = timeSeriesData[0];
    const last = timeSeriesData[timeSeriesData.length - 1];
    
    const incomingTrend = ((last.incomingAmount - first.incomingAmount) / Math.max(first.incomingAmount, 1)) * 100;
    const outgoingTrend = ((last.outgoingAmount - first.outgoingAmount) / Math.max(first.outgoingAmount, 1)) * 100;
    const netTrend = last.netAmount - first.netAmount;
    
    const totalIncomingAmount = timeSeriesData.reduce((sum, d) => sum + d.incomingAmount, 0);
    const totalOutgoingAmount = timeSeriesData.reduce((sum, d) => sum + d.outgoingAmount, 0);
    const avgDaily = {
      incomingAmount: totalIncomingAmount / timeSeriesData.length,
      outgoingAmount: totalOutgoingAmount / timeSeriesData.length,
      netAmount: (totalIncomingAmount - totalOutgoingAmount) / timeSeriesData.length
    };
    
    return {
      incomingTrend,
      outgoingTrend,
      netTrend,
      avgDaily
    };
  }, [timeSeriesData]);

  // Format currency helper
  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} DHS`;
  };

  // Custom tooltip with currency formatting
  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ color: string; name: string; value: number }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          {payload.map((entry, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Render different chart types
  const renderTrendChart = () => {
    switch (chartType) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={dataWithMovingAverage}>
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
                dot={{ r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="outgoingAmount" 
                stroke="#EF4444" 
                strokeWidth={2}
                name="Money Spent"
                dot={{ r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="avgIncomingAmount" 
                stroke="#10B981" 
                strokeWidth={1}
                strokeDasharray="5 5"
                name="Avg Money Received"
                dot={false}
              />
              <Line 
                type="monotone" 
                dataKey="avgOutgoingAmount" 
                stroke="#EF4444" 
                strokeWidth={1}
                strokeDasharray="5 5"
                name="Avg Money Spent"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
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
              <Legend />
              <Area 
                type="monotone" 
                dataKey="incomingAmount" 
                stackId="1"
                stroke="#10B981" 
                fill="#10B981"
                fillOpacity={0.6}
                name="Money Received"
              />
              <Area 
                type="monotone" 
                dataKey="outgoingAmount" 
                stackId="2"
                stroke="#EF4444" 
                fill="#EF4444"
                fillOpacity={0.6}
                name="Money Spent"
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
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
        );

      case 'composed':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={dataWithMovingAverage}>
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
              <Line 
                type="monotone" 
                dataKey="avgNetAmount" 
                stroke="#8B5CF6" 
                strokeWidth={3}
                name="Net Cash Flow Trend"
                dot={{ r: 6 }}
              />
            </ComposedChart>
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
            <Calendar className="w-5 h-5 text-gray-400" />
            <div className="flex space-x-2">
              {[
                { key: '7d', label: 'Last 7 Days' },
                { key: '30d', label: 'Last 30 Days' },
                { key: 'all', label: 'All Time' }
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setTimeRange(key as '7d' | '30d' | 'all')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    timeRange === key
                      ? 'bg-purple-100 text-purple-700 border border-purple-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex space-x-2">
            {[
              { key: 'line', label: 'Line' },
              { key: 'area', label: 'Area' },
              { key: 'bar', label: 'Bar' },
              { key: 'composed', label: 'Combined' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setChartType(key as 'line' | 'area' | 'bar' | 'composed')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  chartType === key
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Trend Statistics */}
      {trendStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Money Received Trend</p>
                <p className="text-2xl font-bold text-gray-900">
                  {trendStats.incomingTrend > 0 ? '+' : ''}{trendStats.incomingTrend.toFixed(1)}%
                </p>
                <p className="text-sm text-gray-500">
                  Avg: {formatCurrency(trendStats.avgDaily.incomingAmount)}/day
                </p>
              </div>
              <div className={`p-3 rounded-full ${
                trendStats.incomingTrend >= 0 ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {trendStats.incomingTrend >= 0 ? (
                  <TrendingUp className="w-6 h-6 text-green-600" />
                ) : (
                  <TrendingDown className="w-6 h-6 text-red-600" />
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Money Spent Trend</p>
                <p className="text-2xl font-bold text-gray-900">
                  {trendStats.outgoingTrend > 0 ? '+' : ''}{trendStats.outgoingTrend.toFixed(1)}%
                </p>
                <p className="text-sm text-gray-500">
                  Avg: {formatCurrency(trendStats.avgDaily.outgoingAmount)}/day
                </p>
              </div>
              <div className={`p-3 rounded-full ${
                trendStats.outgoingTrend <= 0 ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {trendStats.outgoingTrend <= 0 ? (
                  <TrendingDown className="w-6 h-6 text-green-600" />
                ) : (
                  <TrendingUp className="w-6 h-6 text-red-600" />
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Net Cash Flow</p>
                <p className="text-2xl font-bold text-gray-900">
                  {trendStats.netTrend > 0 ? '+' : ''}{formatCurrency(trendStats.netTrend)}
                </p>
                <p className="text-sm text-gray-500">
                  Avg: {formatCurrency(trendStats.avgDaily.netAmount)}/day
                </p>
              </div>
              <div className={`p-3 rounded-full ${
                trendStats.netTrend >= 0 ? 'bg-green-100' : 'bg-red-100'
              }`}>
                <Activity className={`w-6 h-6 ${
                  trendStats.netTrend >= 0 ? 'text-green-600' : 'text-red-600'
                }`} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Trend Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Money Flow Trends
          </h3>
          <div className="text-sm text-gray-600">
            {filteredOperations.length} operations • {timeSeriesData.length} days
          </div>
        </div>
        {renderTrendChart()}
      </div>

      {/* Net Cash Flow Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Net Cash Flow Analysis</h3>
        <ResponsiveContainer width="100%" height={300}>
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

      {/* Activity Heatmap Placeholder */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Money Flow Pattern</h3>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 28 }, (_, i) => {
            const activity = Math.random() * 1000;
            const intensity = Math.min(activity / 1000, 1);
            return (
              <div
                key={i}
                className="aspect-square rounded border"
                style={{
                  backgroundColor: `rgba(139, 92, 246, ${intensity})`,
                }}
                title={`Day ${i + 1}: ${formatCurrency(activity)}`}
              />
            );
          })}
        </div>
        <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
          <span>Less</span>
          <div className="flex space-x-1">
            {[0, 0.2, 0.4, 0.6, 0.8, 1].map((intensity, i) => (
              <div
                key={i}
                className="w-3 h-3 rounded border"
                style={{ backgroundColor: `rgba(139, 92, 246, ${intensity})` }}
              />
            ))}
          </div>
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
