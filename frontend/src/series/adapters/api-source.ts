import type { components } from '../../api/schema';
import { decodeFloat32LE } from '../core/decode';
import type { LoadedSeries, SeriesLookup, SeriesSource } from '../ports/series-source';
import { SeriesSourceError } from '../ports/series-source';

type Series = components['schemas']['Series'];
type ResolvedName = components['schemas']['ResolvedName'];
type Problem = components['schemas']['Problem'];
type Motion = components['schemas']['Motion'];

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

function appendMotion(params: URLSearchParams, motion: Motion | undefined): void {
  if (!motion) return;
  params.set('pm_ra_masyr', String(motion.pm_ra_masyr));
  params.set('pm_dec_masyr', String(motion.pm_dec_masyr));
  params.set('ref_epoch_jyear', String(motion.ref_epoch_jyear));
  if (motion.parallax_mas !== undefined) {
    params.set('parallax_mas', String(motion.parallax_mas));
  }
}

export class ApiSeriesSource implements SeriesSource {
  constructor(private readonly base = apiBase()) {}

  async load(lookup: SeriesLookup, signal?: AbortSignal): Promise<LoadedSeries> {
    let ra: number;
    let dec: number;
    let fov = 5;
    let resolve: ResolvedName | undefined;
    let motion: Motion | undefined = lookup.kind === 'coords' ? lookup.motion : undefined;

    if (lookup.kind === 'name') {
      // Caller must pass a human/canonical name — never a slug like "barnards-star".
      const url = `${this.base}/api/v1/resolve?name=${encodeURIComponent(lookup.name)}`;
      const res = await fetch(url, { signal });
      if (!res.ok) throw await readProblem(res);
      resolve = (await res.json()) as ResolvedName;
      ra = resolve.ra;
      dec = resolve.dec;
      motion = resolve.motion;
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
    appendMotion(params, motion);

    const seriesRes = await fetch(`${this.base}/api/v1/series?${params.toString()}`, { signal });
    if (!seriesRes.ok) throw await readProblem(seriesRes);
    const series = (await seriesRes.json()) as Series;

    if (series.frames.length === 0) {
      throw new SeriesSourceError({
        status: 404,
        type: 'about:blank',
        title: 'No comparable images',
        detail: 'No SPHEREx visits passed quality and wavelength checks for this region.',
      });
    }
    if (series.frames.length === 1) {
      // Still load the single frame so the UI can explain the short baseline.
    }

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

function isTimeoutError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'TimeoutError';
}

function isNetworkError(err: unknown): boolean {
  return err instanceof TypeError || (err instanceof Error && /network|fetch|Failed to fetch/i.test(err.message));
}

/** Try API first (60 s — first analysis is 8–20 s); fall back to demo only for the five objects. */
export class FallbackSeriesSource implements SeriesSource {
  constructor(
    private readonly api: SeriesSource,
    private readonly demo: SeriesSource,
    private readonly apiTimeoutMs = 60_000,
  ) {}

  async load(lookup: SeriesLookup, signal?: AbortSignal): Promise<LoadedSeries> {
    try {
      return await this.api.load(lookup, mergeAbort(signal, this.apiTimeoutMs));
    } catch (err) {
      if (signal?.aborted && !isTimeoutError(err)) throw err;

      const status = err instanceof SeriesSourceError ? err.status : 0;
      const timeout = isTimeoutError(err);
      const serverError = status >= 500 || status === 0;
      const network = isNetworkError(err);
      const notFound = status === 404;

      if (!timeout && !serverError && !network && !notFound) {
        throw err;
      }

      try {
        const demo = await this.demo.load(lookup, signal);
        const why = timeout
          ? 'API timed out after 60 s'
          : err instanceof SeriesSourceError
            ? `API unavailable (${err.title})`
            : 'API unreachable';
        return {
          ...demo,
          notice: `${why}. Recorded data (offline).`,
        };
      } catch {
        if (notFound && err instanceof SeriesSourceError) throw err;
        throw err;
      }
    }
  }
}
