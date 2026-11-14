import { describe, expect, it } from 'vitest';
import {
  buildTimeline,
  TIMELINE_END_MS,
  TIMELINE_START_MS,
  timeToFraction,
} from '../../src/app/core/timeline';

describe('timeline', () => {
  it('maps 2025-04 start to 0 and 2026-11 end to 1', () => {
    expect(timeToFraction(TIMELINE_START_MS)).toBeCloseTo(0, 5);
    expect(timeToFraction(TIMELINE_END_MS)).toBeCloseTo(1, 5);
  });

  it('builds solid markers for frames and hollow for rejected', () => {
    const tl = buildTimeline(
      [
        { index: 0, t_mid: '2025-09-01T00:00:00Z' },
        { index: 1, t_mid: '2026-03-01T00:00:00Z' },
        { index: 2, t_mid: '2026-09-01T00:00:00Z' },
      ],
      [{ obs_id: 'x', reason: 'near_detector_edge', detail: 'edge', t_mid: '2025-12-01T00:00:00Z' }],
    );
    expect(tl.markers.filter(m => m.kind === 'frame')).toHaveLength(3);
    expect(tl.markers.filter(m => m.kind === 'rejected')).toHaveLength(1);
    expect(tl.markers.every(m => m.fraction >= 0 && m.fraction <= 1)).toBe(true);
  });
});
