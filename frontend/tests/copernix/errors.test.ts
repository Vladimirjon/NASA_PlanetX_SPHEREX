import { describe, expect, it } from 'vitest';
import { classifySeriesError, demoDoesNotCoverPoint } from '../../copernix/src/errors';
import { SeriesSourceError, type LoadedSeries } from '../../src/series/ports/series-source';

const http = (status: number) => new SeriesSourceError({ status, type: 'x', title: 'x' });

describe('classifySeriesError', () => {
  it('treats a missing service and timeouts as "cannot reach the data"', () => {
    expect(classifySeriesError(http(502))).toBe('errOffline');
    expect(classifySeriesError(http(503))).toBe('errOffline');
    expect(classifySeriesError(http(0))).toBe('errOffline');
    expect(classifySeriesError(new TypeError('Failed to fetch'))).toBe('errOffline');
  });
  it('tells "busy" and "bad position" apart', () => {
    expect(classifySeriesError(http(429))).toBe('errBusy');
    expect(classifySeriesError(http(422))).toBe('errPoint');
  });
  it('falls back to a generic message', () => {
    expect(classifySeriesError(http(418))).toBe('errGeneric');
    expect(classifySeriesError('boom')).toBe('errGeneric');
  });
});

describe('demoDoesNotCoverPoint', () => {
  const demo = { sourceKind: 'demo', resolve: { ra: 269.452, dec: 4.693 } } as unknown as LoadedSeries;
  const live = { sourceKind: 'api', resolve: { ra: 269.452, dec: 4.693 } } as unknown as LoadedSeries;
  const at = (ra: number, dec: number) => ({ kind: 'coords', ra, dec, fov: 0.08 }) as const;

  it('rejects the recorded photos for a spot 0.1° away from the featured object', () => {
    expect(demoDoesNotCoverPoint(at(269.3231, 4.7888), demo)).toBe(true);
  });
  it('keeps them for the featured object itself', () => {
    expect(demoDoesNotCoverPoint(at(269.452, 4.693), demo)).toBe(false);
  });
  it('never judges live data or name lookups', () => {
    expect(demoDoesNotCoverPoint(at(10, 10), live)).toBe(false);
    expect(demoDoesNotCoverPoint({ kind: 'name', name: 'x' }, demo)).toBe(false);
  });
});
