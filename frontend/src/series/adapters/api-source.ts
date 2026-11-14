import type { components } from '../../api/schema';
import { decodeFloat32LE } from '../core/decode';
import type { LoadedSeries, SeriesLookup, SeriesSource } from '../ports/series-source';
import { SeriesSourceError } from '../ports/series-source';

type Series = components['schemas']['Series'];
type ResolvedName = components['schemas']['ResolvedName'];
type Problem = components['schemas']['Problem'];

function apiBase(): string {
  const raw = import.meta.env.VITE_API_BASE as string | undefined;
  if (raw && raw.trim() !== '') return raw.replace(/\/$/, '');
  return '';
}

async function readProblem(res: Response): Promise<SeriesSourceError> {
  const fallback = new SeriesSourceError({
    status: res.status,
    type: 'about:blank',
    title: res.statusText || 'Request failed',
  });
  try {
    const body = (await res.json()) as Problem;
    return new SeriesSourceError({
      status: body.status,
      type: body.type,
      title: body.title,
      detail: body.detail,
    });
  } catch {
    return fallback;
  }
}

export class ApiSeriesSource implements SeriesSource {
  constructor(private readonly base = apiBase()) {}

  async load(lookup: SeriesLookup, signal?: AbortSignal): Promise<LoadedSeries> {
    let ra: number;
    let dec: number;
    let fov = 5;
    let resolve: ResolvedName | undefined;

    if (lookup.kind === 'name') {
      const url = `${this.base}/api/v1/resolve?name=${encodeURIComponent(lookup.name)}`;
      const res = await fetch(url, { signal });
      if (!res.ok) throw await readProblem(res);
      resolve = (await res.json()) as ResolvedName;
      ra = resolve.ra;
      dec = resolve.dec;
    } else {
      ra = lookup.ra;
      dec = lookup.dec;
      fov = lookup.fov;
    }

    const params = new URLSearchParams({
      ra: String(ra),
      dec: String(dec),
      fov_arcmin: String(fov),
    });
    if (resolve?.motion) {
      params.set('pm_ra_masyr', String(resolve.motion.pm_ra_masyr));
      params.set('pm_dec_masyr', String(resolve.motion.pm_dec_masyr));
      params.set('ref_epoch_jyear', String(resolve.motion.ref_epoch_jyear));
      if (resolve.motion.parallax_mas !== undefined) {
        params.set('parallax_mas', String(resolve.motion.parallax_mas));
      }
    }

    const seriesRes = await fetch(`${this.base}/api/v1/series?${params.toString()}`, { signal });
    if (!seriesRes.ok) throw await readProblem(seriesRes);
    const series = (await seriesRes.json()) as Series;
    const [height, width] = series.grid.shape;
    const frames: Float32Array[] = [];
    for (const frame of series.frames) {
      const dataUrl = frame.data_url.startsWith('http')
        ? frame.data_url
        : `${this.base}${frame.data_url.startsWith('/') ? '' : '/'}${frame.data_url}`;
      const fr = await fetch(dataUrl, { signal });
      if (!fr.ok) throw await readProblem(fr);
      frames.push(decodeFloat32LE(await fr.arrayBuffer(), height, width));
    }
    return { series, frames, sourceKind: 'api', resolve };
  }
}

function mergeAbort(signal: AbortSignal | undefined, timeoutMs: number): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs);
  if (!signal) return timeout;
  return AbortSignal.any([signal, timeout]);
}

/** Try API first (short timeout); on failure fall back to demo for the five objects. */
export class FallbackSeriesSource implements SeriesSource {
  constructor(
    private readonly api: SeriesSource,
    private readonly demo: SeriesSource,
    private readonly apiTimeoutMs = 2000,
  ) {}

  async load(lookup: SeriesLookup, signal?: AbortSignal): Promise<LoadedSeries> {
    try {
      return await this.api.load(lookup, mergeAbort(signal, this.apiTimeoutMs));
    } catch (err) {
      if (signal?.aborted) throw err;
      if (err instanceof SeriesSourceError && err.status > 0 && err.status < 500 && err.status !== 404) {
        throw err;
      }
      try {
        const demo = await this.demo.load(lookup, signal);
        return {
          ...demo,
          notice:
            err instanceof SeriesSourceError
              ? `API unavailable (${err.title}). Showing recorded demo data.`
              : 'API unreachable. Showing recorded demo data.',
        };
      } catch {
        throw err;
      }
    }
  }
}
