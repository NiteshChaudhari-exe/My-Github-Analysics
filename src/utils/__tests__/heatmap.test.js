import { generateWeeks } from '../heatmap';

describe('heatmap utils', () => {
  test('generateWeeks returns weeks that start on Monday and each week has 7 days', () => {
    const { weeks } = generateWeeks({ today: '2025-10-22T00:00:00Z', days: 13 });
    expect(weeks.length).toBeGreaterThan(0);
    weeks.forEach(week => {
      expect(week.length).toBe(7);
    });
    // first day of first week should be Monday
    const first = new Date(weeks[0][0].date + 'T00:00:00Z');
    expect(first.getUTCDay()).toBe(1); // Monday
  });

  // month label mapping tests removed — month labels are rendered in the component UI
});
