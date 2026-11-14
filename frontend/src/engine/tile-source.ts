export interface TileSource {
  url(order: number, npix: number, plane: number): string;
}

function directory(order: number, npix: number, plane: number): number {
  if (!Number.isInteger(order) || order < 0 || order > 5 ||
      !Number.isInteger(npix) || npix < 0 || npix >= 12 * 4 ** order ||
      !Number.isInteger(plane) || plane < 0 || plane > 101) {
    throw new RangeError('Invalid HiPS tile coordinates');
  }
  return Math.floor(npix / 10000) * 10000;
}

export function createIrsaTileSource(): TileSource {
  return { url(order, npix, plane) {
    const dir = directory(order, npix, plane);
    const suffix = plane === 0 ? '' : `_${plane}`;
    return `https://irsa.ipac.caltech.edu/data/hips/SPHEREx/spherex_allsky_cube/Norder${order}/Dir${dir}/Npix${npix}${suffix}.png`;
  } };
}

export function createBackendTileSource(): TileSource {
  return { url(order, npix, plane) {
    const dir = directory(order, npix, plane);
    return `/api/v1/hips/${order}/${dir}/${npix}?plane=${plane}`;
  } };
}
