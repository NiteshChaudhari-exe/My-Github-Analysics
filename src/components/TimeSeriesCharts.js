import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';

export default function TimeSeriesCharts({ series = [] }) {
  // series: array of { month: '2025-01', commits: n, prs: m }
  return (
    <div className="bg-gray-800/30 p-4 rounded">
      <h4 className="font-semibold mb-2">Monthly activity</h4>
      <div style={{ width: '100%', height: 240 }}>
        <ResponsiveContainer>
          <LineChart data={series}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="commits" stroke="#8884d8" />
            <Line type="monotone" dataKey="prs" stroke="#82ca9d" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
