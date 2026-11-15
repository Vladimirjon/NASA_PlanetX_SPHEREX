import { HIDDEN_FILL_RGB } from './hidden';

/** Magenta (first epoch) / green (last epoch) — colour-blind-safe pair. */
export const COLOUR_LEGEND =
  'Colour composite: magenta = first visit, green = last visit (colour-blind-safe pair). Where both overlap, tint is mixed.';

/**
 * Build RGBA from two normalised [0,1] frames. Magenta = R+B from first; green = G from last.
 * A pixel masked in either epoch gets the hidden fill: painting it as 0 in one epoch would
 * invent a colour change that was never measured.
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
    if (!Number.isFinite(f) || !Number.isFinite(l)) {
      rgba[o] = HIDDEN_FILL_RGB[0];
      rgba[o + 1] = HIDDEN_FILL_RGB[1];
      rgba[o + 2] = HIDDEN_FILL_RGB[2];
      rgba[o + 3] = 255;
      continue;
    }
    rgba[o] = Math.round(f * 255);
    rgba[o + 1] = Math.round(l * 255);
    rgba[o + 2] = Math.round(f * 255);
    rgba[o + 3] = 255;
  }
  return rgba;
}
