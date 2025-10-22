import { formatMonthLabel } from '../heatmap';

describe('formatMonthLabel', () => {
  test('includes year for January by default', () => {
    const d = new Date(Date.UTC(2025, 0, 1)); // Jan 1 2025
    expect(formatMonthLabel(d)).toBe('Jan 2025');
  });
  test('omits year for non-January unless requested', () => {
    const d = new Date(Date.UTC(2025, 9, 1)); // Oct 1 2025
    expect(formatMonthLabel(d)).toBe('Oct');
    expect(formatMonthLabel(d, undefined, true)).toBe('Oct 2025');
  });
});
