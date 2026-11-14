export type SeriesQuery =
  | { readonly kind: 'name'; readonly name: string }
  | { readonly kind: 'coords'; readonly ra: number; readonly dec: number; readonly fov: number }
  | { readonly kind: 'invalid'; readonly reason: string }
  | { readonly kind: 'empty' };

function parseNumber(raw: string | null): number | null {
  if (raw === null || raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function parseSeriesSearch(search: string): SeriesQuery {
  const q = search.startsWith('?') ? search.slice(1) : search;
  if (q.trim() === '') return { kind: 'empty' };
  const params = new URLSearchParams(q);
  const name = params.get('name');
  if (name !== null && name.trim() !== '') {
    return { kind: 'name', name: name.trim() };
  }
  const ra = parseNumber(params.get('ra'));
  const dec = parseNumber(params.get('dec'));
  const fovRaw = parseNumber(params.get('fov'));
  const fov = fovRaw === null ? 5 : fovRaw;
  if (ra === null || dec === null) {
    if (params.has('ra') || params.has('dec')) {
      return { kind: 'invalid', reason: 'ra and dec must be finite numbers' };
    }
    return { kind: 'empty' };
  }
  if (!(ra >= 0 && ra < 360)) return { kind: 'invalid', reason: 'ra must be in [0, 360)' };
  if (!(dec >= -90 && dec <= 90)) return { kind: 'invalid', reason: 'dec must be in [-90, 90]' };
  if (!(fov > 0 && fov <= 60)) return { kind: 'invalid', reason: 'fov must be in (0, 60] arcmin' };
  return { kind: 'coords', ra, dec, fov };
}

export function toSeriesSearch(query: Extract<SeriesQuery, { kind: 'name' } | { kind: 'coords' }>): string {
  if (query.kind === 'name') {
    return `?name=${encodeURIComponent(query.name)}`;
  }
  const params = new URLSearchParams({
    ra: String(query.ra),
    dec: String(query.dec),
    fov: String(query.fov),
  });
  return `?${params.toString()}`;
}
