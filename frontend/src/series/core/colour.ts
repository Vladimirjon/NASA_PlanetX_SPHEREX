/** Magenta (first epoch) / green (last epoch) — colour-blind-safe pair. */
export const COLOUR_LEGEND =
  'Colour composite: magenta = first visit, green = last visit (colour-blind-safe pair). Where both overlap, tint is mixed.';

/**
 * Build RGBA from two normalised [0,1] frames (NaN → transparent black).
 * Magenta = R+B from first; green = G from last.
 */
export function colourComposite(firstNorm: Float32Array, lastNorm: Float32Array): Uint8ClampedArray {
  if (firstNorm.length !== lastNorm.length) {
    throw new Error('colourComposite length mismatch');
  }
  const rgba = new Uint8ClampedArray(firstNorm.length * 4);
  for (let i = 0; i < firstNorm.length; i += 1) {
    const f = firstNorm[i];
    const l = lastNorm[i];
    const o = i * 4;
    if (!Number.isFinite(f) && !Number.isFinite(l)) {
      rgba[o] = 0;
      rgba[o + 1] = 0;
      rgba[o + 2] = 0;
      rgba[o + 3] = 0;
      continue;
    }
    const fv = Number.isFinite(f) ? f : 0;
    const lv = Number.isFinite(l) ? l : 0;
    rgba[o] = Math.round(fv * 255);
    rgba[o + 1] = Math.round(lv * 255);
    rgba[o + 2] = Math.round(fv * 255);
    rgba[o + 3] = 255;
  }
  return rgba;
}
