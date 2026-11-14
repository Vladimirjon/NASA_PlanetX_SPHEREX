export type TanGrid = {
  readonly shape: readonly [number, number];
  readonly crval_deg: readonly [number, number];
  readonly pixel_scale_arcsec: number;
};

export type PixelPos = { readonly x: number; readonly y: number };

/**
 * TAN world→pixel on the common grid.
 * East is left (CDELT1 < 0). Row 0 is the south edge (FITS); north has larger y.
 * CRVAL sits at the geometric centre ((W-1)/2, (H-1)/2).
 */
export function worldToPixel(raDeg: number, decDeg: number, grid: TanGrid): PixelPos {
  const [height, width] = grid.shape;
  const [crvalRa, crvalDec] = grid.crval_deg;
  const scale = grid.pixel_scale_arcsec;
  const decMidRad = ((decDeg + crvalDec) / 2) * (Math.PI / 180);
  const deltaRaArcsec = (raDeg - crvalRa) * Math.cos(decMidRad) * 3600;
  const deltaDecArcsec = (decDeg - crvalDec) * 3600;
  const x0 = (width - 1) / 2;
  const y0 = (height - 1) / 2;
  return {
    x: x0 - deltaRaArcsec / scale,
    y: y0 + deltaDecArcsec / scale,
  };
}

/** Convert FITS pixel (row 0 = south) to display pixel after north-up flip. */
export function fitsToDisplay(pos: PixelPos, height: number): PixelPos {
  return { x: pos.x, y: height - 1 - pos.y };
}

export function expectedMotionPixels(
  first: { readonly ra: number; readonly dec: number },
  last: { readonly ra: number; readonly dec: number },
  grid: TanGrid,
): number {
  const a = worldToPixel(first.ra, first.dec, grid);
  const b = worldToPixel(last.ra, last.dec, grid);
  return Math.hypot(b.x - a.x, b.y - a.y);
}
