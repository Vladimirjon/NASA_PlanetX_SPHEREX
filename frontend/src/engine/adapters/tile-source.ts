import type { TileSource } from '../ports/tile-source';
import { createBackendTileSource, createIrsaTileSource } from '../tile-source';
function source(url: (order: number, npix: number, plane: number) => string): TileSource {
  return { async fetch(order, npix, plane, signal) {
    const response = await fetch(url(order, npix, plane), { signal });
    if (!response.ok) throw new Error(`Tile request failed: ${response.status}`);
    return createImageBitmap(await response.blob());
  } };
}
export const irsaTileSource = (): TileSource => source((order, npix, plane) => createIrsaTileSource().url(order, npix, plane));
export const backendTileSource = (): TileSource => source((order, npix, plane) => createBackendTileSource().url(order, npix, plane));
