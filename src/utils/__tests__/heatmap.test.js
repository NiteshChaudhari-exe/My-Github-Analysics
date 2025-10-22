import { generateWeeks, buildMonthLabelMap } from '../heatmap';

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

  test('buildMonthLabelMap maps the week containing YYYY-MM-01 to a month label', () => {
    // use a fixed range that includes Sept and Oct 2025
    const { today, startDate, weeks } = generateWeeks({ today: '2025-10-22T00:00:00Z', days: 60 });
    const map = buildMonthLabelMap(startDate, today, weeks, 'en-US');
    // find October 1st
    const octKey = '2025-10-01';
    const wi = weeks.findIndex(week => week.some(d => d.date === octKey));
    expect(wi).toBeGreaterThanOrEqual(0);
    expect(map[wi]).toBeDefined();
    expect(typeof map[wi]).toBe('string');
  });
});
