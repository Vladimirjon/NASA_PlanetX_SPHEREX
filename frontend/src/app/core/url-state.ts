export type ViewMode = 'loop' | 'difference' | 'colour';
export type Projection = 'SIN' | 'TAN' | 'AIT';

export type AppUrlState = {
  readonly target: string | null;
  readonly guidedPair?: boolean;
  readonly ra: number | null;
  readonly dec: number | null;
  readonly fov: number;
  readonly plane: number;
  readonly t: number;
  readonly mode: ViewMode;
  readonly proj: Projection;
};

export type ParseResult =
  | { readonly kind: 'ok'; readonly state: AppUrlState }
  | { readonly kind: 'empty'; readonly state: AppUrlState }
  | { readonly kind: 'invalid'; readonly reason: string };

const DEFAULTS: AppUrlState = {
  target: null,
  ra: null,
  dec: null,
  fov: 40,
  plane: 0,
  t: 0,
  mode: 'loop',
  proj: 'SIN',
};

function parseNum(raw: string | null): number | null {
  if (raw === null || raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function parseAppSearch(search: string): ParseResult {
  const q = search.startsWith('?') ? search.slice(1) : search;
  if (q.trim() === '') return { kind: 'empty', state: { ...DEFAULTS } };
  const params = new URLSearchParams(q);
  const modeRaw = params.get('mode');
  if (modeRaw !== null && modeRaw !== 'loop' && modeRaw !== 'difference' && modeRaw !== 'colour') {
    return { kind: 'invalid', reason: 'mode must be loop, difference, or colour' };
  }
  const projRaw = params.get('proj');
  if (projRaw !== null && projRaw !== 'SIN' && projRaw !== 'TAN' && projRaw !== 'AIT') {
    return { kind: 'invalid', reason: 'proj must be SIN, TAN, or AIT' };
  }

  const target = params.get('target');
  const ra = parseNum(params.get('ra'));
  const dec = parseNum(params.get('dec'));
  const fov = parseNum(params.get('fov')) ?? DEFAULTS.fov;
  const plane = parseNum(params.get('plane'));
  const t = parseNum(params.get('t'));

  if (params.has('ra') || params.has('dec')) {
    if (ra === null || dec === null) return { kind: 'invalid', reason: 'ra and dec must be numbers' };
    if (!(ra >= 0 && ra < 360)) return { kind: 'invalid', reason: 'ra out of range' };
    if (!(dec >= -90 && dec <= 90)) return { kind: 'invalid', reason: 'dec out of range' };
  }
  if (!(fov > 0 && fov <= 360)) return { kind: 'invalid', reason: 'fov out of range' };
  if (plane !== null && (!(Number.isInteger(plane) && plane >= 0 && plane <= 101))) {
    return { kind: 'invalid', reason: 'plane out of range' };
  }
  if (t !== null && (!(Number.isInteger(t) && t >= 0))) {
    return { kind: 'invalid', reason: 't must be a non-negative integer' };
  }

  return {
    kind: 'ok',
    state: {
      target: target && target.trim() !== '' ? target.trim() : null,
      ...(target?.trim() === 'epsilon-indi-b' && params.get('case') === 'd3' ? { guidedPair: true } : {}),
      ra,
      dec,
      fov,
      plane: plane ?? DEFAULTS.plane,
      t: t ?? DEFAULTS.t,
      mode: modeRaw === 'difference' || modeRaw === 'colour' || modeRaw === 'loop' ? modeRaw : DEFAULTS.mode,
      proj: projRaw === 'TAN' || projRaw === 'AIT' || projRaw === 'SIN' ? projRaw : DEFAULTS.proj,
    },
  };
}

export function toAppSearch(state: AppUrlState): string {
  const params = new URLSearchParams();
  if (state.target) params.set('target', state.target);
  if (state.target === 'epsilon-indi-b' && state.guidedPair) params.set('case', 'd3');
  if (state.ra !== null) params.set('ra', String(state.ra));
  if (state.dec !== null) params.set('dec', String(state.dec));
  if (state.fov !== DEFAULTS.fov) params.set('fov', String(state.fov));
  if (state.plane !== DEFAULTS.plane) params.set('plane', String(state.plane));
  if (state.t !== 0) params.set('t', String(state.t));
  if (state.mode !== 'loop') params.set('mode', state.mode);
  if (state.proj !== 'SIN') params.set('proj', state.proj);
  const s = params.toString();
  return s === '' ? '' : `?${s}`;
}
