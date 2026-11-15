import { SeriesSourceError, type LoadedSeries, type SeriesLookup } from '../../src/series/ports/series-source';
import { angularSeparationDeg } from './selection';

export type SeriesErrorKey = 'errOffline' | 'errBusy' | 'errPoint' | 'errDemoOnly' | 'errGeneric';

/** The recorded demo matches a position within 0.5°, far wider than one cutout (≈ 0.08°). */
const DEMO_SAME_PLACE_DEG = 0.02;

/** True when the offline demo answered for a spot that is not the demo object itself: its photos would be about something else. */
export function demoDoesNotCoverPoint(lookup: SeriesLookup, result: LoadedSeries): boolean {
  if (result.sourceKind !== 'demo' || lookup.kind !== 'coords' || !result.resolve) return false;
  return angularSeparationDeg(lookup, result.resolve) > DEMO_SAME_PLACE_DEG;
}

/** Maps whatever the data source threw to one plain-language message key. The raw detail stays in the details panel. */
export function classifySeriesError(err: unknown): SeriesErrorKey {
  if (err instanceof SeriesSourceError) {
    if (err.status === 429) return 'errBusy';
    if (err.status === 400 || err.status === 422) return 'errPoint';
    if (err.status === 0 || err.status === 408 || err.status >= 500) return 'errOffline';
    return 'errGeneric';
  }
  const text = err instanceof Error ? `${err.name} ${err.message}` : String(err);
  if (/failed to fetch|networkerror|network request|load failed|timed? ?out|unreachable|offline|abort/i.test(text)) {
    return 'errOffline';
  }
  return 'errGeneric';
}
