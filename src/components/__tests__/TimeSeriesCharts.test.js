import React from 'react';
import { render, screen } from '@testing-library/react';

// ResponsiveContainer measures layout; jsdom doesn't provide layout so
// mock it to simply render children (keeps other recharts components intact).
jest.mock('recharts', () => {
  const Actual = jest.requireActual('recharts');
  const React = require('react');
  return {
    ...Actual,
    ResponsiveContainer: ({ children }) => {
      // Provide a fake width/height so child charts render in tests.
      if (typeof children === 'function') return <div data-testid="responsive-container">{children({ width: 800, height: 240 })}</div>;
      try {
        return <div data-testid="responsive-container">{React.cloneElement(children, { width: 800, height: 240 })}</div>;
      } catch (e) {
        return <div data-testid="responsive-container">{children}</div>;
      }
    },
  };
});

const TimeSeriesCharts = require('../TimeSeriesCharts').default;

test('shows empty state when series is empty', () => {
  render(<TimeSeriesCharts series={[]} />);
  expect(screen.getByText(/No activity to show/i)).toBeInTheDocument();
});

test('renders formatted month labels for unsorted input', async () => {
  const series = [
    { month: '2025-03', commits: 3, prs: 1 },
    { month: '2025-01', commits: 5, prs: 2 },
    { month: '2025-02', commits: 2, prs: 0 },
  ];

  render(<TimeSeriesCharts series={series} />);

  // month labels should be formatted like "Jan 2025"
  expect(await screen.findByText(/Jan 2025/)).toBeInTheDocument();
  expect(await screen.findByText(/Feb 2025/)).toBeInTheDocument();
  expect(await screen.findByText(/Mar 2025/)).toBeInTheDocument();
});
