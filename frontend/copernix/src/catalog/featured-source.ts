import { canonicalNameForSlug, CHALLENGE_TARGETS } from '../../../src/app/core/targets';
import { targetDescription, type Lang } from '../i18n';
import { friendlyObjectType } from './object-type';
import type { CatalogEntry, CatalogSource } from './port';

/** Infer a friendly kind for the five challenge targets (local featured list). */
function featuredKind(slug: string, lang: Lang): string {
  if (slug === 'epsilon-indi-b' || slug === 'wise-0855') {
    return friendlyObjectType('BD*', lang);
  }
  if (slug === 'rw-aurigae' || slug === 'r-draconis') {
    return friendlyObjectType('Mi*', lang);
  }
  return friendlyObjectType('BY*', lang);
}

export function featuredEntries(lang: Lang = 'es'): CatalogEntry[] {
  return CHALLENGE_TARGETS.map(t => ({
    id: t.slug,
    name: t.name,
    kind: featuredKind(t.slug, lang),
    description: targetDescription(lang, t.slug) || t.description,
    ra: t.ra,
    dec: t.dec,
    featured: true,
    slug: t.slug,
  }));
}

/** Local featured catalog — the five challenge objects as `featured` only. */
export function createFeaturedSource(lang: Lang = 'es'): Pick<CatalogSource, 'featured' | 'resolve'> {
  return {
    featured(): Promise<CatalogEntry[]> {
      return Promise.resolve(featuredEntries(lang));
    },
    resolve(entry: CatalogEntry) {
      const slug = entry.slug ?? entry.id;
      const canonical = canonicalNameForSlug(slug) ?? entry.name;
      return { kind: 'name' as const, name: canonical };
    },
  };
}
