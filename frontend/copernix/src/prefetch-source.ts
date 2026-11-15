import type { LoadedSeries, SeriesLookup, SeriesSource } from '../../src/series/ports/series-source';

const keyOf = (l: SeriesLookup): string =>
  l.kind === 'name' ? `n:${l.name.trim().toLowerCase()}` : `c:${l.ra.toFixed(5)}:${l.dec.toFixed(5)}:${String(l.fov)}`;

function abortError(): DOMException {
  return new DOMException('Aborted', 'AbortError');
}

/**
 * Shares one download per lookup so the viewer can warm the featured series while the
 * visitor is still in the intro. A caller's abort only detaches that caller; the shared
 * download keeps going and lands in the cache. Failures are never cached.
 */
export class PrefetchingSeriesSource implements SeriesSource {
  private readonly cache = new Map<string, Promise<LoadedSeries>>();

  constructor(
    private readonly inner: SeriesSource,
    private readonly maxEntries = 8,
  ) {}

  prefetch(lookup: SeriesLookup): void {
    this.shared(lookup).catch(() => undefined);
  }

  load(lookup: SeriesLookup, signal?: AbortSignal): Promise<LoadedSeries> {
    if (signal?.aborted) return Promise.reject(abortError());
    const p = this.shared(lookup);
    if (!signal) return p;
    return new Promise((resolve, reject) => {
      const onAbort = (): void => {
        reject(abortError());
      };
      signal.addEventListener('abort', onAbort, { once: true });
      p.then(
        v => {
          signal.removeEventListener('abort', onAbort);
          resolve(v);
        },
        (e: unknown) => {
          signal.removeEventListener('abort', onAbort);
          reject(e instanceof Error ? e : new Error(String(e)));
        },
      );
    });
  }

  private shared(lookup: SeriesLookup): Promise<LoadedSeries> {
    const key = keyOf(lookup);
    const hit = this.cache.get(key);
    if (hit) {
      this.cache.delete(key);
      this.cache.set(key, hit); // most recent last
      return hit;
    }
    const p = this.inner.load(lookup);
    this.cache.set(key, p);
    p.catch(() => {
      if (this.cache.get(key) === p) this.cache.delete(key);
    });
    while (this.cache.size > this.maxEntries) {
      const oldest = this.cache.keys().next().value;
      if (oldest === undefined) break;
      this.cache.delete(oldest);
    }
    return p;
  }
}
