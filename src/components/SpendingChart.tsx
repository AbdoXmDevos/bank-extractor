'use client';

import React from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Transaction } from '@/types/transaction';
import { TransactionClassifier } from '@/lib/transactionClassifier';
import { TrendingDown, TrendingUp } from 'lucide-react';

interface SpendingChartProps {
  transactions: Transaction[];
  chartType?: 'pie' | 'bar';
  showCredits?: boolean;
}

export default function SpendingChart({ 
  transactions, 
  chartType = 'pie', 
  showCredits = false 
}: SpendingChartProps) {
  const classifier = new TransactionClassifier();
  
  // Get spending or income breakdown based on showCredits
  const data = showCredits 
    ? classifier.getIncomeBreakdown(transactions)
    : classifier.getSpendingBreakdown(transactions);

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <TrendingDown className="w-12 h-12 mb-2" />
        <p>No {showCredits ? 'income' : 'spending'} data available</p>
      </div>
    );
  }

  // Prepare data for charts
  const chartData = data.map(item => ({
    name: item.category,
    value: item.totalAmount,
    count: item.count,
    percentage: item.percentage,
    color: item.color
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600">
            Amount: {new Intl.NumberFormat('fr-MA', {
              style: 'currency',
              currency: 'MAD'
            }).format(data.value)}
          </p>
          <p className="text-sm text-gray-600">
            Transactions: {data.count}
          </p>
          <p className="text-sm text-gray-600">
            Percentage: {data.percentage.toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  const renderPieChart = () => (
    <ResponsiveContainer width="100%" height={400}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percentage }) => `${name} (${percentage.toFixed(1)}%)`}
          outerRadius={120}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );

  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="name" 
          angle={-45}
          textAnchor="end"
          height={100}
          fontSize={12}
        />
        <YAxis 
          tickFormatter={(value) => 
            new Intl.NumberFormat('fr-MA', {
              style: 'currency',
              currency: 'MAD',
              notation: 'compact'
            }).format(value)
          }
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          {showCredits ? (
            <TrendingUp className="w-5 h-5 text-green-500" />
          ) : (
            <TrendingDown className="w-5 h-5 text-red-500" />
          )}
          <h3 className="text-lg font-semibold text-gray-900">
            {showCredits ? 'Income' : 'Spending'} Breakdown by Category
          </h3>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={() => {}}
            className={`px-3 py-1 text-sm rounded-md ${
              chartType === 'pie' 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Pie Chart
          </button>
          <button
            onClick={() => {}}
            className={`px-3 py-1 text-sm rounded-md ${
              chartType === 'bar' 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Bar Chart
          </button>
        </div>
      </div>

      {chartType === 'pie' ? renderPieChart() : renderBarChart()}

      {/* Summary Table */}
      <div className="mt-6">
        <h4 className="text-md font-medium text-gray-900 mb-3">Category Summary</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transactions
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Percentage
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-2 whitespace-nowrap">
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <span className="text-sm font-medium text-gray-900">
                        {item.category}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                    {new Intl.NumberFormat('fr-MA', {
                      style: 'currency',
                      currency: 'MAD'
                    }).format(item.totalAmount)}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                    {item.count}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                    {item.percentage.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
