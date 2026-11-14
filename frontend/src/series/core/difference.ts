/** Pixel-wise B − A with NaN propagation (masked stays masked). */
export function differenceFrame(b: Float32Array, a: Float32Array): Float32Array {
  if (a.length !== b.length) {
    throw new Error(`differenceFrame length mismatch: ${String(b.length)} vs ${String(a.length)}`);
  }
  const out = new Float32Array(a.length);
  for (let i = 0; i < a.length; i += 1) {
    const av = a[i];
    const bv = b[i];
    out[i] = Number.isFinite(av) && Number.isFinite(bv) ? bv - av : Number.NaN;
  }
  return out;
}
