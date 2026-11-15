/**
 * Copernix-only URL helpers for `?name=` (canonical object name).
 * Does not touch `app/core/url-state.ts`.
 */

export type NameUrlParse =
  | { readonly kind: 'none' }
  | { readonly kind: 'ok'; readonly name: string }
  | { readonly kind: 'invalid'; readonly reason: string };

/** Read and decode `?name=` from a search string. */
export function parseNameParam(search: string): NameUrlParse {
  const q = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(q);
  if (!params.has('name')) return { kind: 'none' };
  const raw = params.get('name');
  if (raw === null || raw.trim() === '') {
    return { kind: 'invalid', reason: 'name must be non-empty' };
  }
  let decoded = raw.trim();
  try {
    decoded = decodeURIComponent(decoded.replace(/\+/g, ' ')).trim();
  } catch {
    return { kind: 'invalid', reason: 'name is not valid URI encoding' };
  }
  if (!decoded) return { kind: 'invalid', reason: 'name must be non-empty' };
  if (decoded.length > 64) return { kind: 'invalid', reason: 'name too long' };
  return { kind: 'ok', name: decoded };
}

/** Encode a canonical name for `?name=`. */
export function encodeNameParam(name: string): string {
  return encodeURIComponent(name.trim());
}

/** Merge `name` into an existing query string (drops `target` when name is set). */
export function withNameParam(search: string, name: string | null): string {
  const q = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(q);
  if (name && name.trim()) {
    params.set('name', name.trim());
    params.delete('target');
    params.delete('ra');
    params.delete('dec');
  } else {
    params.delete('name');
  }
  const s = params.toString();
  return s ? `?${s}` : '';
}
