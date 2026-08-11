import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { formatCurrency } from '../../utils/formatters';

export const BudgetChart = ({ data }) => {
  // Mock data if none provided
  const chartData = data || [
    { category: 'Infrastructure', estimated: 2500000, actual: 2300000 },
    { category: 'IT & Energy', estimated: 1800000, actual: 1950000 },
    { category: 'Civil Works', estimated: 3200000, actual: 3100000 },
    { category: 'Environmental', estimated: 1500000, actual: 1400000 },
  ];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(253,241,225,0.1)" />
        <XAxis 
          dataKey="category" 
          stroke="var(--text-muted)"
          style={{ fontSize: '12px' }}
        />
        <YAxis 
          stroke="var(--text-muted)"
          style={{ fontSize: '12px' }}
          tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
        />
        <Tooltip 
          contentStyle={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-light)',
            borderRadius: '8px',
            fontSize: '12px'
          }}
          formatter={(value) => formatCurrency(value)}
        />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        <Bar dataKey="estimated" fill="var(--primary)" name="Estimated" />
        <Bar dataKey="actual" fill="var(--success)" name="Actual" />
      </BarChart>
    </ResponsiveContainer>
  );
};
