import type { TileSource } from '../ports/tile-source';
import { createBackendTileSource, createIrsaTileSource } from '../tile-source';
function source(url: (order: number, npix: number, plane: number) => string): TileSource {
  // Keep compressed bytes for the session so GPU eviction never repeats a successful URL.
  const compressed = new Map<string, Blob>();
  return { async fetch(order, npix, plane, signal) {
    const address=url(order,npix,plane);let blob=compressed.get(address);
    if(!blob){const response=await fetch(address,{signal});if(!response.ok)throw new Error(`Tile request failed: ${response.status}`);blob=await response.blob();compressed.set(address,blob);}
    if(signal.aborted)throw new DOMException('Aborted','AbortError');
    const bitmap = await createImageBitmap(blob);
    if (bitmap.width !== 512 || bitmap.height !== 512) { bitmap.close(); throw new Error('Invalid HiPS tile dimensions'); }
    return bitmap;
  } };
}
export const irsaTileSource = (): TileSource => source((order, npix, plane) => createIrsaTileSource().url(order, npix, plane));
export const backendTileSource = (): TileSource => source((order, npix, plane) => createBackendTileSource().url(order, npix, plane));
