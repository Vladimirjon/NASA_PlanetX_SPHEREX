import { describe, expect, it, vi } from 'vitest';
import { PrefetchingSeriesSource } from '../../copernix/src/prefetch-source';
import type { LoadedSeries, SeriesLookup, SeriesSource } from '../../src/series/ports/series-source';

const lookup: SeriesLookup = { kind: 'coords', ra: 10, dec: -5, fov: 3 };
const fake = (impl: () => Promise<LoadedSeries>): SeriesSource & { calls: number } => {
  const s = { calls: 0, load: () => { s.calls += 1; return impl(); } };
  return s;
};
const result = { series: {}, frames: [], sourceKind: 'demo' } as unknown as LoadedSeries;

describe('PrefetchingSeriesSource', () => {
  it('reuses a prefetched load instead of fetching again', async () => {
    const inner = fake(() => Promise.resolve(result));
    const src = new PrefetchingSeriesSource(inner);
    src.prefetch(lookup);
    await expect(src.load({ ...lookup })).resolves.toBe(result);
    expect(inner.calls).toBe(1);
  });

  it('a caller abort does not cancel the shared download', async () => {
    let resolve: (v: LoadedSeries) => void = () => undefined;
    const inner = fake(() => new Promise(r => { resolve = r; }));
    const src = new PrefetchingSeriesSource(inner);
    const ac = new AbortController();
    const first = src.load(lookup, ac.signal);
    ac.abort();
    await expect(first).rejects.toThrow(/abort/i);
    resolve(result);
    await expect(src.load(lookup)).resolves.toBe(result);
    expect(inner.calls).toBe(1);
  });

  it('forgets failures so the next load retries', async () => {
    const impl = vi.fn<() => Promise<LoadedSeries>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(result);
    const inner = fake(impl);
    const src = new PrefetchingSeriesSource(inner);
    await expect(src.load(lookup)).rejects.toThrow('offline');
    await expect(src.load(lookup)).resolves.toBe(result);
    expect(inner.calls).toBe(2);
  });

  it('keeps a bounded number of entries', async () => {
    const inner = fake(() => Promise.resolve(result));
    const src = new PrefetchingSeriesSource(inner, 2);
    for (const ra of [1, 2, 3]) src.prefetch({ ...lookup, ra });
    await src.load({ ...lookup, ra: 1 });
    expect(inner.calls).toBe(4);
  });
});
