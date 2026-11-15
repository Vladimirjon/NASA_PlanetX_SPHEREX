import type { components } from '../../api/schema';
import { expectedMotionPixels, type TanGrid } from './tan';

type Series = components['schemas']['Series'];
type Frame = components['schemas']['Frame'];

export function formatVisitLabel(frameIndex: number, frameCount: number, tMid: string): string {
  const date = tMid.slice(0, 10);
  return `Visit ${String(frameIndex + 1)} of ${String(frameCount)} · ${date}`;
}

export function timeSpanYears(frames: readonly Frame[]): number | null {
  if (frames.length < 2) return null;
  const first = Date.parse(frames[0].t_mid);
  const last = Date.parse(frames[frames.length - 1].t_mid);
  if (!Number.isFinite(first) || !Number.isFinite(last)) return null;
  return Math.abs(last - first) / (365.25 * 24 * 3600 * 1000);
}

export function motionProvenanceLabel(slug: string | null | undefined): string {
  if (slug === 'wise-0855') return 'expected position (Luhman & Esplin 2016)';
  return 'expected position (Gaia DR3 proper motion)';
}

export function describeWavelength(series: Series): string {
  const frame0 = series.frames.length > 0 ? series.frames[0] : undefined;
  const det = series.detector ?? frame0?.detector;
  const lam = series.reference_wavelength_um ?? frame0?.wavelength_um;
  const tol = series.wavelength_tolerance_nm;
  const detLabel = det === undefined ? 'unknown detector' : `detector D${String(det)}`;
  const lamLabel = lam === undefined ? 'unknown wavelength' : `${lam.toFixed(3)} µm`;
  const tolLabel = tol === undefined ? 'its tolerance' : `${tol.toFixed(1)} nm`;
  return `Infrared light at ${lamLabel} (${detLabel}), the same colour in every frame within ${tolLabel}`;
}

export function describeTimeSpan(frames: readonly Frame[]): string {
  const years = timeSpanYears(frames);
  if (years === null) return 'Single visit — no time baseline yet.';
  return `${years.toFixed(1)} year${years === 1 ? '' : 's'} between first and last image`;
}

export function describeExpectedMotion(series: Series): string | null {
  const frames = series.frames;
  if (frames.length < 2) return null;
  const first = frames[0].predicted_position;
  const last = frames[frames.length - 1].predicted_position;
  if (!first || !last) return null;
  const grid: TanGrid = {
    shape: [series.grid.shape[0], series.grid.shape[1]],
    crval_deg: [series.grid.crval_deg[0], series.grid.crval_deg[1]],
    pixel_scale_arcsec: series.grid.pixel_scale_arcsec,
  };
  const px = expectedMotionPixels(first, last, grid);
  const arcsec = px * series.grid.pixel_scale_arcsec;
  return `Expected motion ≈ ${px.toFixed(1)} px (${arcsec.toFixed(1)}″); SPHEREx pixel = ${series.grid.pixel_scale_arcsec.toFixed(2)}″`;
}

export const DIAGONAL_MASK_NOTE =
  'colour drifts beyond tolerance there, hidden on purpose';
