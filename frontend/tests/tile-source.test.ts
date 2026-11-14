import { describe, expect, it } from 'vitest';
import { createBackendTileSource, createIrsaTileSource } from '../src/engine/tile-source';

describe('tile sources', () => {
  it('uses the documented HiPS frame naming and directory', () => {
    const source = createIrsaTileSource();
    expect(source.url(5, 10226, 0)).toContain('/Norder5/Dir10000/Npix10226.png');
    expect(source.url(5, 10226, 20)).toContain('/Norder5/Dir10000/Npix10226_20.png');
  });
  it('uses the backend contract', () => {
    expect(createBackendTileSource().url(5, 10226, 20)).toBe('/api/v1/hips/5/10000/10226?plane=20');
  });
  it.each([[6, 0, 0], [0, 12, 0], [1, -1, 0], [1, 0, 102], [1, 1.5, 0]])('rejects out-of-range tile coordinates', (order, npix, plane) => {
    expect(() => createIrsaTileSource().url(order, npix, plane)).toThrow(RangeError);
  });
});
