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
