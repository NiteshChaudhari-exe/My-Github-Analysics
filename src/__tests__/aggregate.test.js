import { aggregateDailyToMonths, aggregateDatesToMonthMap, monthMapToSeries } from '../utils/aggregate';

test('aggregateDailyToMonths groups days correctly', () => {
  const days = [
    { date: '2025-09-01', count: 2 },
    { date: '2025-09-15', count: 3 },
    { date: '2025-10-02', count: 1 }
  ];
  const res = aggregateDailyToMonths(days);
  expect(res).toEqual([{ month: '2025-09', total: 5 }, { month: '2025-10', total: 1 }]);
});

test('aggregateDatesToMonthMap counts ISO dates', () => {
  const dates = ['2025-09-01T12:00:00Z', '2025-09-02T05:00:00Z', '2025-10-01T00:00:00Z'];
  const m = aggregateDatesToMonthMap(dates);
  expect(m['2025-09']).toBe(2);
  expect(m['2025-10']).toBe(1);
});

test('monthMapToSeries merges maps into series', () => {
  const months = ['2025-09', '2025-10'];
  const commitMap = { '2025-09': 4, '2025-10': 1 };
  const prMap = { '2025-09': 1, '2025-10': 0 };
  const s = monthMapToSeries(months, commitMap, prMap);
  expect(s).toEqual([{ month: '2025-09', commits: 4, prs: 1 }, { month: '2025-10', commits: 1, prs: 0 }]);
});
