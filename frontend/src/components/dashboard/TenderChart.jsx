import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend 
} from 'recharts';

export const TenderChart = ({ data }) => {
  // Mock data if none provided (legacy usage)
  const chartData = data || [
    { month: 'Jan', published: 12, awarded: 8 },
    { month: 'Feb', published: 15, awarded: 10 },
    { month: 'Mar', published: 18, awarded: 12 },
    { month: 'Apr', published: 14, awarded: 11 },
    { month: 'May', published: 20, awarded: 15 },
    { month: 'Jun', published: 22, awarded: 18 },
  ];
  // Live API data is `[{ month, published }]` — only render the awarded
  // line when that series is actually present.
  const hasAwardedSeries = chartData.some((d) => d.awarded !== undefined);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(253,241,225,0.1)" />
        <XAxis 
          dataKey="month" 
          stroke="var(--text-muted)"
          style={{ fontSize: '12px' }}
        />
        <YAxis 
          stroke="var(--text-muted)"
          style={{ fontSize: '12px' }}
        />
        <Tooltip 
          contentStyle={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-light)',
            borderRadius: '8px',
            fontSize: '12px'
          }}
        />
        <Legend 
          wrapperStyle={{ fontSize: '12px' }}
        />
        <Line 
          type="monotone" 
          dataKey="published" 
          stroke="var(--primary)" 
          strokeWidth={2}
          name="Published"
        />
        {hasAwardedSeries && (
          <Line
            type="monotone"
            dataKey="awarded"
            stroke="var(--success)"
            strokeWidth={2}
            name="Awarded"
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
};
