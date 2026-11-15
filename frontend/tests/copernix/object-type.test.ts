import { describe, expect, it } from 'vitest';
import { friendlyObjectType } from '../../copernix/src/catalog/object-type';

describe('friendlyObjectType', () => {
  it('maps known SIMBAD codes to friendly ES labels', () => {
    expect(friendlyObjectType('BY*', 'es')).toBe('Estrella cercana');
    expect(friendlyObjectType('BD*', 'es')).toBe('Enana marrón');
    expect(friendlyObjectType('Mi*', 'es')).toBe('Estrella variable');
    expect(friendlyObjectType('Pl', 'es')).toBe('Planeta');
  });

  it('maps known SIMBAD codes to friendly EN labels', () => {
    expect(friendlyObjectType('BY*', 'en')).toBe('Nearby star');
    expect(friendlyObjectType('BD*', 'en')).toBe('Brown dwarf');
    expect(friendlyObjectType('Mi*', 'en')).toBe('Variable star');
    expect(friendlyObjectType('Pl', 'en')).toBe('Planet');
  });

  it('falls back for unknown or empty codes', () => {
    expect(friendlyObjectType('*', 'es')).toBe('Estrella');
    expect(friendlyObjectType('GlC', 'es')).toBe('Objeto astronómico');
    expect(friendlyObjectType(null, 'en')).toBe('Astronomical object');
    expect(friendlyObjectType('', 'en')).toBe('Astronomical object');
  });
});
