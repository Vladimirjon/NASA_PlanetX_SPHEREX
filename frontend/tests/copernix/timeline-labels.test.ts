import { describe, expect, it } from 'vitest';
import { timelineDateVisibility } from '../../copernix/src/timeline-labels';

describe('timelineDateVisibility', () => {
  it('always shows the selected index', () => {
    const v = timelineDateVisibility([0, 1], [0, 1], 1, 200);
    expect(v.has(1)).toBe(true);
  });

  it('hides extremes when too close on a narrow track', () => {
    const v = timelineDateVisibility([0, 1], [0.2, 0.65], 0, 100);
    expect(v.has(0)).toBe(true);
    expect(v.has(1)).toBe(false);
  });

  it('shows both extremes when track is wide enough', () => {
    const v = timelineDateVisibility([0, 1], [0, 1], 0, 200);
    expect(v.has(0)).toBe(true);
    expect(v.has(1)).toBe(true);
  });
});