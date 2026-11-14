/** HEALPix NESTED angular index, derived from the HEALPix equal-area geometry. */
export function ang2pix(order: number, ra: number, dec: number): number {
  const nside = 2 ** order;
  const z = Math.sin(dec * Math.PI / 180), za = Math.abs(z);
  const tt = ((ra % 360 + 360) % 360) / 90;
  let face: number, x: number, y: number;
  if (za <= 2 / 3) {
    const jp = Math.floor(nside * (0.5 + tt - z * 0.75));
    const jm = Math.floor(nside * (0.5 + tt + z * 0.75));
    const ifp = Math.floor(jp / nside), ifm = Math.floor(jm / nside);
    face = ifp === ifm ? ifp % 4 + 4 : ifp < ifm ? ifp % 4 : ifm % 4 + 8;
    x = jm % nside; y = nside - jp % nside - 1;
  } else {
    const ntt = Math.min(3, Math.floor(tt)), tp = tt - ntt;
    const tmp = nside * Math.sqrt(3 * (1 - za));
    const jp = Math.min(nside - 1, Math.floor(tp * tmp));
    const jm = Math.min(nside - 1, Math.floor((1 - tp) * tmp));
    if (z >= 0) { face = ntt; x = nside - jm - 1; y = nside - jp - 1; }
    else { face = ntt + 8; x = jp; y = jm; }
  }
  let nested = 0;
  for (let bit = 0; bit < order; bit++) nested += ((x >> bit) & 1) * 2 ** (2 * bit) + ((y >> bit) & 1) * 2 ** (2 * bit + 1);
  return face * nside * nside + nested;
}

/** Center of a NESTED pixel in equatorial degrees. */
export function pix2ang(order: number, pixel: number): { ra: number; dec: number } {
  const nside = 2 ** order;
  const face = Math.floor(pixel / (nside * nside));
  const intra = pixel % (nside * nside);
  let x = 0, y = 0;
  for (let bit = 0; bit < order; bit++) { x |= ((intra >> (2 * bit)) & 1) << bit; y |= ((intra >> (2 * bit + 1)) & 1) << bit; }
  const rings = [2,2,2,2,3,3,3,3,4,4,4,4];
  const positions = [1,3,5,7,0,2,4,6,1,3,5,7];
  const ring = rings[face] * nside - x - y - 1;
  let nr: number, z: number, shift: number;
  if (ring < nside) { nr = ring; z = 1 - nr * nr / (3 * nside * nside); shift = 0; }
  else if (ring > 3 * nside) { nr = 4 * nside - ring; z = -1 + nr * nr / (3 * nside * nside); shift = 0; }
  else { nr = nside; z = (2 * nside - ring) * 2 / (3 * nside); shift = (ring - nside) & 1; }
  let position = Math.floor((positions[face] * nr + x - y + 1 + shift) / 2);
  if (position > 4 * nr) position -= 4 * nr;
  if (position < 1) position += 4 * nr;
  const ra = (position - (shift + 1) / 2) * 90 / nr;
  return { ra, dec: Math.asin(z) * 180 / Math.PI };
}

/** Exact geometric vertices of a NESTED pixel, in degrees. */
export function corners(order: number, pixel: number): { ra: number; dec: number }[] {
  const nside = 2 ** order, face = Math.floor(pixel / (nside * nside));
  const intra = pixel % (nside * nside);
  let x = 0, y = 0;
  for (let bit = 0; bit < order; bit++) { x |= ((intra >> (2 * bit)) & 1) << bit; y |= ((intra >> (2 * bit + 1)) & 1) << bit; }
  const ringOffset = [2,2,2,2,3,3,3,3,4,4,4,4][face];
  const phiOffset = [1,3,5,7,0,2,4,6,1,3,5,7][face];
  return [[0,0],[1,0],[1,1],[0,1]].map(([dx,dy]) => {
    const xx = x + dx, yy = y + dy, ring = ringOffset * nside - xx - yy;
    const nr = Math.min(ring, 4 * nside - ring, nside);
    const z = ring < nside ? 1 - nr * nr / (3 * nside * nside) : ring > 3 * nside ? -1 + nr * nr / (3 * nside * nside) : (2 * nside - ring) * 2 / (3 * nside);
    const ra = nr === 0 ? phiOffset * 45 : ((phiOffset * nr + xx - yy) * 45 / nr + 360) % 360;
    return { ra, dec: Math.asin(Math.max(-1,Math.min(1,z))) * 180 / Math.PI };
  });
}
/** Adjacent cells touching the pixel edges or vertices. */
export function neighbours(order: number, pixel: number): number[] {
  const result = new Set<number>();
  for (const point of corners(order, pixel)) {
    const eps = 1e-6;
    if (Math.abs(point.dec) > 89.999999) {
      for (let ra = 0; ra < 360; ra += 45) result.add(ang2pix(order, ra, Math.sign(point.dec) * (90-eps)));
    } else {
      const raStep = eps / Math.max(1e-6,Math.cos(point.dec * Math.PI / 180));
      for (const a of [-1,0,1]) for (const d of [-1,0,1]) if (a || d) result.add(ang2pix(order, point.ra+a*raStep, point.dec+d*eps));
    }
  }
  result.delete(pixel);
  return [...result];
}
