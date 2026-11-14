import type { ViewState } from '../../view-state';
export function pan(view: Readonly<ViewState>, dx: number, dy: number, width: number): ViewState {
  const degreesPerPixel = Math.min(180, view.fov) / Math.max(1, width);
  const dec = Math.max(-89.9999, Math.min(89.9999, view.dec + dy * degreesPerPixel));
  const ra = ((view.ra + dx * degreesPerPixel / Math.max(0.1, Math.cos(view.dec * Math.PI / 180))) % 360 + 360) % 360;
  return { ...view, ra, dec };
}
export function zoom(view: Readonly<ViewState>, factor: number): ViewState {
  return { ...view, fov: Math.max(0.05, Math.min(360, view.fov * factor)) };
}
