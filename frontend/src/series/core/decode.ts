/** Decode little-endian Float32 pixel buffers and FITS row orientation helpers. */

export function decodeFloat32LE(buffer: ArrayBuffer, height: number, width: number): Float32Array {
  const expected = height * width * 4;
  if (buffer.byteLength !== expected) {
    throw new Error(`Float32 byte length ${String(buffer.byteLength)} != ${String(expected)} for shape ${String(height)}×${String(width)}`);
  }
  return new Float32Array(buffer.slice(0));
}

/** FITS row 0 is the south edge; flip so display row 0 is north. */
export function flipRowsNorthUp(data: Float32Array, height: number, width: number): Float32Array {
  if (data.length !== height * width) {
    throw new Error(`data length ${String(data.length)} != ${String(height * width)}`);
  }
  const out = new Float32Array(data.length);
  for (let row = 0; row < height; row += 1) {
    const src = row * width;
    const dst = (height - 1 - row) * width;
    out.set(data.subarray(src, src + width), dst);
  }
  return out;
}
