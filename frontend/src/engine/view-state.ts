export type Projection = 'SIN' | 'TAN' | 'AIT';
export interface ViewState {
  ra: number;
  dec: number;
  fov: number;
  plane: number;
  proj: Projection;
}

export const DEFAULT_VIEW: Readonly<ViewState> = Object.freeze({
  ra: 180, dec: -57.99462, fov: 359.62, plane: 0, proj: 'SIN',
});

/** Parse the complete view atomically: a malformed known parameter resets it. */
export function parseViewState(query: string): { view: ViewState; invalid: boolean } {
  const params = new URLSearchParams(query);
  const view: ViewState = { ...DEFAULT_VIEW };
  const keys = ['ra', 'dec', 'fov', 'plane', 'proj'] as const;
  for (const key of keys) {
    const values = params.getAll(key);
    if (values.length === 0) continue;
    if (values.length !== 1 || values[0].trim() === '') return { view: { ...DEFAULT_VIEW }, invalid: true };
    const raw = values[0];
    if (key === 'proj') {
      if (raw !== 'SIN' && raw !== 'TAN' && raw !== 'AIT') return { view: { ...DEFAULT_VIEW }, invalid: true };
      view.proj = raw;
      continue;
    }
    const value = Number(raw);
    const valid = Number.isFinite(value) && (
      key === 'ra' ? value >= 0 && value < 360 :
      key === 'dec' ? value >= -90 && value <= 90 :
      key === 'fov' ? value > 0 && value <= 360 :
      Number.isInteger(value) && value >= 0 && value < 102
    );
    if (!valid) return { view: { ...DEFAULT_VIEW }, invalid: true };
    view[key] = value;
  }
  return { view, invalid: false };
}
