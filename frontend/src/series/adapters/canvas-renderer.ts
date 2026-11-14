import { colourComposite } from '../core/colour';
import { differenceFrame } from '../core/difference';
import { differenceAbsLimit, stretchDifference, stretchFrame, type StretchLimits } from '../core/stretch';
import { fitsToDisplay, worldToPixel, type TanGrid } from '../core/tan';

export type ViewMode = 'loop' | 'difference' | 'colour';

export type RenderInput = {
  readonly mode: ViewMode;
  readonly frameIndex: number;
  readonly frames: readonly Float32Array[];
  readonly height: number;
  readonly width: number;
  readonly limits: StretchLimits;
  readonly grid: TanGrid;
  readonly predicted?: { readonly ra: number; readonly dec: number } | null;
  readonly zoom?: number;
};

function grayToRgba(norm: Float32Array): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(norm.length * 4);
  for (let i = 0; i < norm.length; i += 1) {
    const v = norm[i];
    const o = i * 4;
    if (!Number.isFinite(v)) {
      rgba[o] = 0;
      rgba[o + 1] = 0;
      rgba[o + 2] = 0;
      rgba[o + 3] = 255;
      continue;
    }
    const g = Math.round(v * 255);
    rgba[o] = g;
    rgba[o + 1] = g;
    rgba[o + 2] = g;
    rgba[o + 3] = 255;
  }
  return rgba;
}

function divergingToRgba(normSigned: Float32Array): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(normSigned.length * 4);
  for (let i = 0; i < normSigned.length; i += 1) {
    const v = normSigned[i];
    const o = i * 4;
    if (!Number.isFinite(v)) {
      rgba[o] = 0;
      rgba[o + 1] = 0;
      rgba[o + 2] = 0;
      rgba[o + 3] = 255;
      continue;
    }
    // Blue (negative) ↔ gray (0) ↔ orange (positive) — not jet
    if (v >= 0) {
      const t = v;
      rgba[o] = Math.round(128 + 127 * t);
      rgba[o + 1] = Math.round(128 + 64 * t);
      rgba[o + 2] = Math.round(128 - 128 * t);
    } else {
      const t = -v;
      rgba[o] = Math.round(128 - 128 * t);
      rgba[o + 1] = Math.round(128 - 64 * t);
      rgba[o + 2] = Math.round(128 + 127 * t);
    }
    rgba[o + 3] = 255;
  }
  return rgba;
}

function flipRgbaRows(rgba: Uint8ClampedArray, height: number, width: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(rgba.length);
  const rowBytes = width * 4;
  for (let row = 0; row < height; row += 1) {
    const src = row * rowBytes;
    const dst = (height - 1 - row) * rowBytes;
    out.set(rgba.subarray(src, src + rowBytes), dst);
  }
  return out;
}

export class CanvasSeriesRenderer {
  private readonly ctx: CanvasRenderingContext2D;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas2D unavailable');
    this.ctx = ctx;
    this.canvas.style.imageRendering = 'pixelated';
  }

  render(input: RenderInput): void {
    const { height, width, frames, limits, mode, frameIndex } = input;
    const zoom = Math.min(8, Math.max(4, input.zoom ?? 6));
    let rgba: Uint8ClampedArray;

    if (mode === 'colour') {
      const first = stretchFrame(frames[0], limits);
      const last = stretchFrame(frames[frames.length - 1], limits);
      rgba = colourComposite(first, last);
    } else if (mode === 'difference') {
      const a = frames[0];
      const b = frames[Math.min(frameIndex, frames.length - 1)];
      const diff = differenceFrame(b, a);
      const signed = stretchDifference(diff, differenceAbsLimit(diff));
      rgba = divergingToRgba(signed);
    } else {
      const frame = frames[Math.min(frameIndex, frames.length - 1)];
      rgba = grayToRgba(stretchFrame(frame, limits));
    }

    const flipped = flipRgbaRows(rgba, height, width);
    const pixels = new Uint8ClampedArray(flipped);
    const image = new ImageData(pixels, width, height);

    this.canvas.width = Math.round(width * zoom);
    this.canvas.height = Math.round(height * zoom);
    const tmp = document.createElement('canvas');
    tmp.width = width;
    tmp.height = height;
    const tctx = tmp.getContext('2d');
    if (!tctx) throw new Error('temp canvas failed');
    tctx.putImageData(image, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(tmp, 0, 0, this.canvas.width, this.canvas.height);

    if (input.predicted) {
      const fits = worldToPixel(input.predicted.ra, input.predicted.dec, input.grid);
      const disp = fitsToDisplay(fits, height);
      const cx = (disp.x + 0.5) * zoom;
      const cy = (disp.y + 0.5) * zoom;
      const r = Math.max(6, zoom * 1.2);
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
      this.ctx.strokeStyle = '#c4a035';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }
  }
}
