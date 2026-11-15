import { CHALLENGE_TARGETS, slugFromName } from './targets';
import type { components } from '../../api/schema';

type SearchResult = Pick<components['schemas']['SearchSuggestion'], 'name' | 'ra' | 'dec' | 'description' | 'object_type'>;

export async function searchApi(query: string, signal: AbortSignal, request: typeof fetch = fetch): Promise<SearchResult[]> {
  const response = await request(`/api/v1/search?q=${encodeURIComponent(query)}&limit=10`, { signal });
  if (!response.ok) throw new Error(`Search failed: ${String(response.status)}`);
  const result: unknown = await response.json();
  if (!Array.isArray(result)) throw new Error('Invalid search response');
  return result.filter((item: unknown): item is SearchResult =>
    typeof item === 'object' && item !== null && 'name' in item && typeof item.name === 'string'
    && 'ra' in item && typeof item.ra === 'number' && item.ra >= 0 && item.ra < 360
    && 'dec' in item && typeof item.dec === 'number' && item.dec >= -90 && item.dec <= 90
    && (!('description' in item) || typeof item.description === 'string')
    && (!('object_type' in item) || typeof item.object_type === 'string'));
}

export type SearchQuery =
  | { readonly kind: 'empty' }
  | { readonly kind: 'target'; readonly slug: string }
  | { readonly kind: 'coords'; readonly ra: number; readonly dec: number }
  | { readonly kind: 'name'; readonly name: string }
  | { readonly kind: 'invalid'; readonly reason: string };

function parseSexagesimalRa(raw: string): number | null {
  const hms = raw.match(/^(\d+(?:\.\d+)?)h\s*(\d+(?:\.\d+)?)m\s*(\d+(?:\.\d+)?)s$/i)
    ?? raw.match(/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/);
  if (!hms) return null;
  const h = Number(hms[1]);
  const m = Number(hms[2]);
  const s = Number(hms[3]);
  if (![h, m, s].every(Number.isFinite) || h >= 24 || m >= 60 || s >= 60) return null;
  return (h + m / 60 + s / 3600) * 15;
}

function parseSexagesimalDec(raw: string): number | null {
  const dms = raw.match(/^([+-]?\d+(?:\.\d+)?)d\s*(\d+(?:\.\d+)?)m\s*(\d+(?:\.\d+)?)s$/i)
    ?? raw.match(/^([+-]?\d+(?:\.\d+)?):(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/);
  if (!dms) return null;
  const d = Number(dms[1]);
  const m = Number(dms[2]);
  const s = Number(dms[3]);
  if (![d, m, s].every(Number.isFinite) || Math.abs(d) > 90 || m >= 60 || s >= 60) return null;
  const sign = d < 0 || Object.is(d, -0) || raw.trim().startsWith('-') ? -1 : 1;
  return sign * (Math.abs(d) + m / 60 + s / 3600);
}

function validRaDec(ra: number, dec: number): boolean {
  return ra >= 0 && ra < 360 && dec >= -90 && dec <= 90;
}

export function parseSearchQuery(raw: string): SearchQuery {
  const text = raw.trim();
  if (text === '') return { kind: 'empty' };

  const slug = slugFromName(text);
  if (slug) return { kind: 'target', slug };

  const decimal = text.match(/^([+-]?\d+(?:\.\d+)?)\s*[,;\s]\s*([+-]?\d+(?:\.\d+)?)$/);
  if (decimal) {
    const ra = Number(decimal[1]);
    const dec = Number(decimal[2]);
    if (!validRaDec(ra, dec)) return { kind: 'invalid', reason: 'RA/Dec out of range' };
    return { kind: 'coords', ra, dec };
  }

  // Accept catalog-style labels, whitespace and the usual degree/arc symbols.
  const normalized = text.replace(/\b(?:ra|dec)\b/gi, ' ')
    .replace(/[°º]/g, 'd').replace(/[′']/g, 'm').replace(/[″"]/g, 's')
    .replace(/\s*([hdms])\s*/gi, '$1');
  const labelled = normalized.match(/^\s*(\d+(?:\.\d+)?h\d+(?:\.\d+)?m\d+(?:\.\d+)?s)\s*[,;]?\s*([+-]?\d+(?:\.\d+)?d\d+(?:\.\d+)?m\d+(?:\.\d+)?s)\s*$/i);
  if (labelled) {
    const ra = parseSexagesimalRa(labelled[1]);
    const dec = parseSexagesimalDec(labelled[2]);
    return ra !== null && dec !== null && validRaDec(ra, dec)
      ? { kind: 'coords', ra, dec }
      : { kind: 'invalid', reason: 'RA/Dec out of range' };
  }

  const parts = text.split(/\s+/);
  if (parts.length >= 2) {
    const raPart = parts[0];
    const decPart = parts.slice(1).join('');
    const ra = parseSexagesimalRa(raPart);
    const dec = parseSexagesimalDec(decPart);
    if (ra !== null && dec !== null) {
      if (!validRaDec(ra, dec)) return { kind: 'invalid', reason: 'RA/Dec out of range' };
      return { kind: 'coords', ra, dec };
    }
  }

  return { kind: 'name', name: text };
}

export function typeaheadSuggestions(
  query: string,
  limit = 8,
): readonly { slug: string; name: string; description: string }[] {
  const q = query.trim().toLowerCase();
  const scored = CHALLENGE_TARGETS.map(t => {
    const hay = `${t.name} ${t.slug} ${t.description}`.toLowerCase();
    const score = q === '' ? 1 : hay.includes(q) ? 2 : 0;
    return { t, score };
  }).filter(x => x.score > 0);
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(({ t }) => ({
    slug: t.slug,
    name: t.name,
    description: t.description,
  }));
}
