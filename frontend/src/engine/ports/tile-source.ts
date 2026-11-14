export interface TileSource {
  fetch(order: number, npix: number, plane: number, signal: AbortSignal): Promise<ImageBitmap>;
}
