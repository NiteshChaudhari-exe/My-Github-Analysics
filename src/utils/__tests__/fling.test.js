import { clamp, FLING } from '../heatmap';

describe('fling and clamp utils', () => {
  test('clamp clamps values to min/max', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(20, 0, 10)).toBe(10);
  });

  test('FLING constants are present and sensible', () => {
    expect(typeof FLING.MULTIPLIER).toBe('number');
    expect(FLING.DECAY).toBeGreaterThanOrEqual(0);
    expect(FLING.MIN_VELOCITY).toBeGreaterThanOrEqual(0);
    expect(FLING.SCALE).toBeGreaterThan(0);
  });
});
