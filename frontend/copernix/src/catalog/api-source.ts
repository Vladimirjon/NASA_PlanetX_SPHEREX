import type { components } from '../../../src/api/schema';
import type { Lang } from '../i18n';
import { friendlyObjectType } from './object-type';
import type { CatalogEntry, CatalogMotion, CatalogSource } from './port';

type SearchSuggestion = components['schemas']['SearchSuggestion'];

export type ApiCatalogOptions = {
  readonly fetchImpl?: typeof fetch;
  readonly baseUrl?: string;
  readonly lang?: Lang;
  readonly debounceMs?: number;
};

function mapSuggestion(s: SearchSuggestion, lang: Lang): CatalogEntry {
  const motion: CatalogMotion | undefined = s.motion
    ? {
        pm_ra_masyr: s.motion.pm_ra_masyr,
        pm_dec_masyr: s.motion.pm_dec_masyr,
        parallax_mas: s.motion.parallax_mas,
        ref_epoch_jyear: s.motion.ref_epoch_jyear,
      }
    : undefined;
  const kind = friendlyObjectType(s.object_type, lang);
  const rawDesc = s.description?.trim() ?? '';
  // API often returns the English filler "Astronomical object" — prefer our friendly kind.
  const description =
    !rawDesc || /^astronomical object$/i.test(rawDesc) ? kind : rawDesc;
  return {
    id: s.name,
    name: s.name,
    kind,
    description,
    ra: s.ra,
    dec: s.dec,
    motion,
    featured: false,
  };
}

/**
 * Search adapter against `GET /api/v1/search?q=&limit=`.
 * Debounces 250 ms by default and cancels in-flight requests via AbortController.
 */
export function createApiCatalogSource(options: ApiCatalogOptions = {}): CatalogSource {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = options.baseUrl ?? '/api/v1';
  const lang = options.lang ?? 'es';
  const debounceMs = options.debounceMs ?? 250;

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let inflight: AbortController | null = null;
  let pendingReject: ((reason: unknown) => void) | null = null;

  const clearPending = () => {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    if (pendingReject) {
      pendingReject(new DOMException('Search superseded', 'AbortError'));
      pendingReject = null;
    }
    if (inflight) {
      inflight.abort();
      inflight = null;
    }
  };

  return {
    featured(): Promise<CatalogEntry[]> {
      return Promise.resolve([]);
    },

    search(q: string, signal?: AbortSignal): Promise<CatalogEntry[]> {
      const trimmed = q.trim();
      if (!trimmed) {
        clearPending();
        return Promise.resolve([]);
      }

      clearPending();

      return new Promise<CatalogEntry[]>((resolve, reject) => {
        pendingReject = reject;

        const onOuterAbort = () => {
          clearPending();
          reject(new DOMException('Aborted', 'AbortError'));
        };
        if (signal?.aborted) {
          onOuterAbort();
          return;
        }
        signal?.addEventListener('abort', onOuterAbort, { once: true });

        debounceTimer = setTimeout(() => {
          debounceTimer = null;
          pendingReject = null;
          const ac = new AbortController();
          inflight = ac;
          if (signal) {
            signal.addEventListener('abort', () => {
              ac.abort();
            }, { once: true });
          }

          const url = `${baseUrl}/search?q=${encodeURIComponent(trimmed)}&limit=10`;
          fetchImpl(url, { signal: ac.signal })
            .then(async res => {
              if (res.status === 503) {
                throw Object.assign(new Error('catalog_unavailable'), { status: 503 });
              }
              if (!res.ok) {
                throw Object.assign(new Error(`search_failed_${String(res.status)}`), {
                  status: res.status,
                });
              }
              const data = (await res.json()) as SearchSuggestion[];
              resolve(data.map(s => mapSuggestion(s, lang)));
            })
            .catch((err: unknown) => {
              if (ac.signal.aborted || (err instanceof DOMException && err.name === 'AbortError')) {
                reject(new DOMException('Aborted', 'AbortError'));
                return;
              }
              reject(err instanceof Error ? err : new Error(String(err)));
            })
            .finally(() => {
              if (inflight === ac) inflight = null;
            });
        }, debounceMs);
      });
    },

    resolve(entry: CatalogEntry) {
      return { kind: 'name' as const, name: entry.name };
    },
  };
}

/** True when an error is a cancelled/superseded search (safe to ignore). */
export function isSearchAbort(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}
