import { describe, expect, it } from 'vitest';
import { DEFAULT_VIEW, parseViewState } from '../src/engine/view-state';

describe('URL view state', () => {
  it('accepts the WISE position and all supported settings', () => {
    expect(parseViewState('?ra=133.7951&dec=-7.2451&fov=1&plane=20&proj=TAN')).toEqual({
      view: { ra: 133.7951, dec: -7.2451, fov: 1, plane: 20, proj: 'TAN' }, invalid: false,
    });
  });
  it('returns defaults and a notice flag for malformed values', () => {
    expect(parseViewState('?ra=400&dec=abc')).toEqual({ view: DEFAULT_VIEW, invalid: true });
  });
  it.each(['?ra=', '?ra=360', '?dec=91', '?fov=0', '?plane=102', '?plane=1.5', '?proj=foo', '?ra=1&ra=2'])('rejects %s', (query) => {
    expect(parseViewState(query)).toEqual({ view: DEFAULT_VIEW, invalid: true });
  });
  it('uses defaults for omitted parameters', () => {
    expect(parseViewState('?plane=101').view).toEqual({ ...DEFAULT_VIEW, plane: 101 });
  });
});
