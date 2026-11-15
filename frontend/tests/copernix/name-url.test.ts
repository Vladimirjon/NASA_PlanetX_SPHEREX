import { describe, expect, it } from 'vitest';
import { encodeNameParam, parseNameParam, withNameParam } from '../../copernix/src/name-url';

describe('parseNameParam', () => {
  it('returns none when name is absent', () => {
    expect(parseNameParam('?target=wise-0855')).toEqual({ kind: 'none' });
    expect(parseNameParam('')).toEqual({ kind: 'none' });
  });

  it('decodes a canonical name', () => {
    expect(parseNameParam('?name=Proxima%20Centauri')).toEqual({
      kind: 'ok',
      name: 'Proxima Centauri',
    });
    expect(parseNameParam('?name=Sirius&lang=es')).toEqual({ kind: 'ok', name: 'Sirius' });
  });

  it('rejects empty or overlong names', () => {
    expect(parseNameParam('?name=')).toEqual({ kind: 'invalid', reason: 'name must be non-empty' });
    expect(parseNameParam(`?name=${'a'.repeat(65)}`).kind).toBe('invalid');
  });
});

describe('encodeNameParam / withNameParam', () => {
  it('encodes spaces', () => {
    expect(encodeNameParam('Proxima Centauri')).toBe('Proxima%20Centauri');
  });

  it('sets name and drops target/ra/dec', () => {
    const next = withNameParam('?target=wise-0855&ra=1&dec=2&lang=es', 'Sirius');
    const q = new URLSearchParams(next.slice(1));
    expect(q.get('name')).toBe('Sirius');
    expect(q.has('target')).toBe(false);
    expect(q.has('ra')).toBe(false);
    expect(q.get('lang')).toBe('es');
  });
});
