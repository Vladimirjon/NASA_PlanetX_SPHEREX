import type { Lang } from '../i18n';
import { createApiCatalogSource, type ApiCatalogOptions } from './api-source';
import { createFeaturedSource, featuredEntries } from './featured-source';
import type { CatalogEntry, CatalogSource } from './port';

export type CompositeOptions = ApiCatalogOptions & { readonly lang?: Lang };

/**
 * Featured list from the local challenge set + live search via the API.
 * Swapping in another catalog later = another adapter behind the same port.
 */
export function createCompositeCatalog(options: CompositeOptions = {}): CatalogSource {
  const lang = options.lang ?? 'es';
  const featured = createFeaturedSource(lang);
  const api = createApiCatalogSource({ ...options, lang });

  return {
    async featured(): Promise<CatalogEntry[]> {
      return featured.featured();
    },
    search(q: string, signal?: AbortSignal): Promise<CatalogEntry[]> {
      return api.search(q, signal);
    },
    resolve(entry: CatalogEntry) {
      if (entry.featured) return featured.resolve(entry);
      return api.resolve(entry);
    },
  };
}

export { featuredEntries };
