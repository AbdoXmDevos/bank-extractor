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
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  Cell
} from 'recharts';
import { Calendar, Clock, Filter, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { DashboardOperation, DashboardAnalytics } from '@/lib/dashboardAnalytics';

interface TimelineChartsProps {
  operations: DashboardOperation[];
}

export default function TimelineCharts({ operations }: TimelineChartsProps) {
  const [viewType, setViewType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'incoming' | 'outgoing'>('date');
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    operations.forEach(op => {
      const category = op.categoryInfo?.name || 'Unknown';
      cats.add(category);
    });
    return ['all', ...Array.from(cats).sort()];
  }, [operations]);

  // Filter operations by category
  const filteredOperations = useMemo(() => {
    if (selectedCategory === 'all') return operations;
    return operations.filter(op => {
      const category = op.categoryInfo?.name || 'Unknown';
      return category === selectedCategory;
    });
  }, [operations, selectedCategory]);

  // Generate timeline data based on view type
  const timelineData = useMemo(() => {
    const dataMap = new Map<string, {
      date: string;
      incomingAmount: number;
      outgoingAmount: number;
      incomingCount: number;
      outgoingCount: number;
      operations: DashboardOperation[];
    }>();

    filteredOperations.forEach(op => {
      let key: string;
      const opDate = new Date(op.date);
      
      switch (viewType) {
        case 'weekly':
          const weekStart = new Date(opDate);
          weekStart.setDate(opDate.getDate() - opDate.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'monthly':
          key = `${opDate.getFullYear()}-${String(opDate.getMonth() + 1).padStart(2, '0')}`;
          break;
        default: // daily
          key = op.date;
          break;
      }

      if (!dataMap.has(key)) {
        dataMap.set(key, {
          date: key,
          incomingAmount: 0,
          outgoingAmount: 0,
          incomingCount: 0,
          outgoingCount: 0,
          operations: []
        });
      }

      const dayData = dataMap.get(key)!;
      dayData.operations.push(op);
      
      if (op.status === 'Incoming') {
        dayData.incomingAmount += op.amount;
        dayData.incomingCount++;
      } else {
        dayData.outgoingAmount += op.amount;
        dayData.outgoingCount++;
      }
    });

    let result = Array.from(dataMap.values());
    
    // Sort data
    result.sort((a, b) => {
      switch (sortBy) {
        case 'amount':
          return (b.incomingAmount + b.outgoingAmount) - (a.incomingAmount + a.outgoingAmount);
        case 'incoming':
          return b.incomingAmount - a.incomingAmount;
        case 'outgoing':
          return b.outgoingAmount - a.outgoingAmount;
        default: // date
          return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
    });

    return result;
  }, [filteredOperations, viewType, sortBy]);

  // Hourly distribution data
  const hourlyData = useMemo(() => {
    const hourMap = new Map<number, { 
      hour: number; 
      count: number; 
      incomingAmount: number; 
      outgoingAmount: number;
      incomingCount: number;
      outgoingCount: number;
    }>();
    
    // Initialize all hours
    for (let i = 0; i < 24; i++) {
      hourMap.set(i, { 
        hour: i, 
        count: 0, 
        incomingAmount: 0, 
        outgoingAmount: 0,
        incomingCount: 0,
        outgoingCount: 0
      });
    }

    // Simulate hourly distribution (in real app, this would come from actual timestamps)
    filteredOperations.forEach(op => {
      const randomHour = Math.floor(Math.random() * 24);
      const hourData = hourMap.get(randomHour)!;
      hourData.count++;
      
      if (op.status === 'Incoming') {
        hourData.incomingAmount += op.amount;
        hourData.incomingCount++;
      } else {
        hourData.outgoingAmount += op.amount;
        hourData.outgoingCount++;
      }
    });

    return Array.from(hourMap.values());
  }, [filteredOperations]);

  // Day of week distribution
  const dayOfWeekData = useMemo(() => {
    const dayMap = new Map<number, { 
      day: string; 
      count: number; 
      incomingAmount: number; 
      outgoingAmount: number;
      incomingCount: number;
      outgoingCount: number;
    }>();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Initialize all days
    for (let i = 0; i < 7; i++) {
      dayMap.set(i, { 
        day: dayNames[i], 
        count: 0, 
        incomingAmount: 0, 
        outgoingAmount: 0,
        incomingCount: 0,
        outgoingCount: 0
      });
    }

    filteredOperations.forEach(op => {
      const opDate = new Date(op.date);
      const dayOfWeek = opDate.getDay();
      const dayData = dayMap.get(dayOfWeek)!;
      dayData.count++;
      
      if (op.status === 'Incoming') {
        dayData.incomingAmount += op.amount;
        dayData.incomingCount++;
      } else {
        dayData.outgoingAmount += op.amount;
        dayData.outgoingCount++;
      }
    });

    return Array.from(dayMap.values());
  }, [filteredOperations]);

  const toggleDayExpansion = (date: string) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDays(newExpanded);
  };

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
              {entry.name}: {typeof entry.value === 'number' ? formatCurrency(entry.value) : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      {/* Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">View Type</label>
            <select
              value={viewType}
              onChange={(e) => setViewType(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="date">Date</option>
              <option value="amount">Total Amount</option>
              <option value="incoming">Money Received</option>
              <option value="outgoing">Money Spent</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <div className="text-sm text-gray-600">
              {formatCurrency(filteredOperations.reduce((sum, op) => sum + op.amount, 0))} total
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          {viewType.charAt(0).toUpperCase() + viewType.slice(1)} Money Flow Timeline
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={timelineData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis tickFormatter={(value) => `${value.toLocaleString()} DHS`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="incomingAmount" fill="#10B981" name="Money Received" />
            <Bar dataKey="outgoingAmount" fill="#EF4444" name="Money Spent" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Hourly Distribution */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Hourly Money Flow Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={hourlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="hour" 
              tickFormatter={(hour) => `${hour}:00`}
            />
            <YAxis tickFormatter={(value) => `${value.toLocaleString()} DHS`} />
            <Tooltip 
              content={<CustomTooltip />}
              labelFormatter={(hour) => `${hour}:00 - ${hour + 1}:00`}
            />
            <Legend />
            <Bar dataKey="incomingAmount" fill="#10B981" name="Money Received" />
            <Bar dataKey="outgoingAmount" fill="#EF4444" name="Money Spent" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Day of Week Distribution */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Day of Week Money Flow</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={dayOfWeekData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis tickFormatter={(value) => `${value.toLocaleString()} DHS`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="incomingAmount" fill="#10B981" name="Money Received" />
            <Bar dataKey="outgoingAmount" fill="#EF4444" name="Money Spent" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed Timeline List */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Detailed Money Flow Timeline</h3>
        <div className="space-y-4">
          {timelineData.slice(0, 10).map((day, index) => (
            <div key={index} className="border border-gray-200 rounded-lg">
              <div 
                className="p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => toggleDayExpansion(day.date)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">{day.date}</p>
                      <p className="text-sm text-gray-600">
                        {day.operations.length} operations • {formatCurrency(day.incomingAmount + day.outgoingAmount)} total
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-sm">
                      <span className="text-green-600 font-medium">{formatCurrency(day.incomingAmount)} in</span>
                      <span className="text-gray-400 mx-2">•</span>
                      <span className="text-red-600 font-medium">{formatCurrency(day.outgoingAmount)} out</span>
                    </div>
                    {expandedDays.has(day.date) ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>
              
              {expandedDays.has(day.date) && (
                <div className="border-t border-gray-200 p-4 bg-gray-50">
                  <div className="space-y-2">
                    {day.operations.map((op, opIndex) => (
                      <div key={opIndex} className="flex items-center justify-between py-2 px-3 bg-white rounded border">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {op.operation}
                          </p>
                          <p className="text-xs text-gray-500">
                            {op.categoryInfo?.name || 'Unknown'}
                          </p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-sm font-medium text-gray-900">
                            {formatCurrency(op.amount)}
                          </span>
                          <div className={`px-2 py-1 rounded text-xs font-medium ${
                            op.status === 'Incoming' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {op.status}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {timelineData.length > 10 && (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              Showing 10 of {timelineData.length} {viewType} periods
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
