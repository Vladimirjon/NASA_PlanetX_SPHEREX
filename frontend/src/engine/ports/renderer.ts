import type { ViewState } from '../view-state';
export interface Tile { readonly order: number; readonly npix: number; readonly plane: number; readonly bitmap: ImageBitmap }
export interface Renderer {
  render(view: Readonly<ViewState>, tiles: readonly Tile[]): void;
  destroy(): void;
}
