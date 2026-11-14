import type { components } from '../../api/schema';
import { decodeFloat32LE } from '../core/decode';
import type { LoadedSeries, SeriesLookup, SeriesSource } from '../ports/series-source';
import { SeriesSourceError } from '../ports/series-source';

type Series = components['schemas']['Series'];
type ResolvedName = components['schemas']['ResolvedName'];

type DemoEntry = {
  readonly slug: string;
  readonly name: string;
  readonly resolve: ResolvedName;
  readonly series: string;
  readonly frames: number;
};

const SLUG_ALIASES: Record<string, string> = {
  "barnard's star": 'barnards-star',
  'barnards star': 'barnards-star',
  'barnards-star': 'barnards-star',
  'epsilon indi b': 'epsilon-indi-b',
  'epsilon-indi-b': 'epsilon-indi-b',
  'eps indi b': 'epsilon-indi-b',
  'wise 0855-0714': 'wise-0855',
  'wise 0855': 'wise-0855',
  'wise-0855': 'wise-0855',
  'rw aurigae': 'rw-aurigae',
  'rw-aurigae': 'rw-aurigae',
  'r draconis': 'r-draconis',
  'r-draconis': 'r-draconis',
};

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/[_]+/g, ' ');
}

function resolveSlug(name: string): string | null {
  const key = normalizeName(name);
  if (SLUG_ALIASES[key]) return SLUG_ALIASES[key];
  const dashed = key.replace(/\s+/g, '-');
  if (SLUG_ALIASES[dashed]) return SLUG_ALIASES[dashed];
  return null;
}

function haversineDeg(ra1: number, dec1: number, ra2: number, dec2: number): number {
  const toRad = Math.PI / 180;
  const dDec = (dec2 - dec1) * toRad;
  const dRa = (ra2 - ra1) * toRad;
  const a =
    Math.sin(dDec / 2) ** 2 +
    Math.cos(dec1 * toRad) * Math.cos(dec2 * toRad) * Math.sin(dRa / 2) ** 2;
  return (2 * Math.asin(Math.min(1, Math.sqrt(a)))) / toRad;
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new SeriesSourceError({
      status: res.status,
      type: 'about:blank',
      title: 'Demo fetch failed',
      detail: `HTTP ${String(res.status)} for ${url}`,
    });
  }
  return (await res.json()) as T;
}

export class DemoSeriesSource implements SeriesSource {
  constructor(private readonly basePath = '/demo') {}

  async load(lookup: SeriesLookup, signal?: AbortSignal): Promise<LoadedSeries> {
    const manifest = await fetchJson<DemoEntry[]>(`${this.basePath}/manifest.json`, signal);
    let entry: DemoEntry | undefined;
    if (lookup.kind === 'name') {
      const slug = resolveSlug(lookup.name) ?? normalizeName(lookup.name).replace(/\s+/g, '-');
      entry = manifest.find(e => e.slug === slug || normalizeName(e.name) === normalizeName(lookup.name));
    } else {
      let best: DemoEntry | undefined;
      let bestDist = Infinity;
      for (const e of manifest) {
        const d = haversineDeg(lookup.ra, lookup.dec, e.resolve.ra, e.resolve.dec);
        if (d < bestDist) {
          bestDist = d;
          best = e;
        }
      }
      if (best && bestDist < 0.5) entry = best;
    }
    if (!entry) {
      throw new SeriesSourceError({
        status: 404,
        type: 'about:blank',
        title: 'Object not in demo set',
        detail: 'Demo mode only covers the five challenge objects. Start the API for arbitrary coordinates.',
      });
    }
    const seriesPath = entry.series.startsWith('/') ? entry.series : `/${entry.series}`;
    const series = await fetchJson<Series>(seriesPath, signal);
    const frames: Float32Array[] = [];
    const [height, width] = series.grid.shape;
    for (const frame of series.frames) {
      const url = frame.data_url.startsWith('/') ? frame.data_url : `/${frame.data_url}`;
      const res = await fetch(url, { signal });
      if (!res.ok) {
        throw new SeriesSourceError({
          status: res.status,
          type: 'about:blank',
          title: 'Frame fetch failed',
          detail: `HTTP ${String(res.status)} for ${url}`,
        });
      }
      const buf = await res.arrayBuffer();
      frames.push(decodeFloat32LE(buf, height, width));
    }
    return {
      series,
      frames,
      sourceKind: 'demo',
      resolve: entry.resolve,
      demoSlug: entry.slug,
      notice: 'Recorded data (offline).',
    };
  }

  listObjects(): Promise<DemoEntry[]> {
    return fetchJson<DemoEntry[]>(`${this.basePath}/manifest.json`);
  }
}
