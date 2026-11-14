import { describe, expect, it, vi } from 'vitest';
import { createBackendTileSource, createIrsaTileSource } from '../src/engine/tile-source';
import { selectTileSource } from '../src/engine/adapters/tile-source';

describe('tile sources', () => {
  it('selects the backend when health responds and IRSA only when unreachable', async () => {
    expect(await selectTileSource(vi.fn().mockResolvedValue(new Response(null, { status: 503 })))).toBe('backend');
    expect(await selectTileSource(vi.fn().mockRejectedValue(new TypeError('offline')))).toBe('irsa');
  });
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
