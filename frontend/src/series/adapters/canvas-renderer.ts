import { colourComposite } from '../core/colour';
import { differenceFrame } from '../core/difference';
import {
  countHidden,
  flipMaskRows,
  HIDDEN_FILL_RGB,
  hiddenEdges,
  hiddenLayers,
  quietFillFor,
  SATURATED_FILL_RGB,
  type HiddenLayers,
  type HiddenStyle,
} from '../core/hidden';
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
  /** quiet (default): saturated centres white, other hidden pixels dark. expert: every hidden pixel hatched. */
  readonly hiddenStyle?: HiddenStyle;
};

/** Stripe and outline over hidden pixels (see core/hidden.ts). Light enough to read on black sky and on the grey difference midpoint. */
const HIDDEN_STRIPE = 'rgba(214, 219, 228, 0.55)';
const HIDDEN_OUTLINE = 'rgba(214, 219, 228, 0.9)';
const STRIPE_STEP_PX = 5;
/** Thin dark rim that keeps a white saturated centre readable as "not measured" inside a bright halo. */
const SATURATED_OUTLINE = 'rgba(10, 14, 22, 0.6)';

function fill(rgba: Uint8ClampedArray, o: number, rgb: readonly [number, number, number]): void {
  rgba[o] = rgb[0];
  rgba[o + 1] = rgb[1];
  rgba[o + 2] = rgb[2];
  rgba[o + 3] = 255;
}

/** Hidden pixels never show data: they get a fill that says what they are. */
function paintHidden(rgba: Uint8ClampedArray, layers: HiddenLayers, style: HiddenStyle, mode: ViewMode): void {
  const quiet = quietFillFor(mode);
  for (let i = 0; i < layers.hidden.length; i += 1) {
    if (layers.hidden[i] !== 1) continue;
    const rgb = style === 'expert' ? HIDDEN_FILL_RGB : layers.bright[i] === 1 ? SATURATED_FILL_RGB : quiet;
    fill(rgba, i * 4, rgb);
  }
}

function grayToRgba(norm: Float32Array): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(norm.length * 4);
  for (let i = 0; i < norm.length; i += 1) {
    const v = norm[i];
    const o = i * 4;
    if (!Number.isFinite(v)) {
      fill(rgba, o, HIDDEN_FILL_RGB);
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
      fill(rgba, o, HIDDEN_FILL_RGB);
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

    const style: HiddenStyle = input.hiddenStyle ?? 'quiet';
    const layers = hiddenLayers(mode, frames, frameIndex, limits, width, height);
    paintHidden(rgba, layers, style, mode);

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
    if (style === 'expert') {
      const hidden = flipMaskRows(layers.hidden, height, width);
      this.drawHatch(hidden, width, height, zoom);
      this.drawOutline(hidden, width, height, zoom, HIDDEN_OUTLINE);
    } else {
      this.drawOutline(flipMaskRows(layers.bright, height, width), width, height, zoom, SATURATED_OUTLINE);
    }

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

  /** Diagonal stripes clipped to the masked cells. `mask` is in display row order. */
  private drawHatch(mask: Uint8Array, width: number, height: number, zoom: number): void {
    if (countHidden(mask) === 0) return;
    const ctx = this.ctx;
    const w = width * zoom;
    const h = height * zoom;
    ctx.save();
    ctx.beginPath();
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (mask[y * width + x] === 1) ctx.rect(x * zoom, y * zoom, zoom, zoom);
      }
    }
    ctx.clip();
    ctx.beginPath();
    for (let k = -h; k < w; k += STRIPE_STEP_PX) {
      ctx.moveTo(k, h);
      ctx.lineTo(k + h, 0);
    }
    ctx.strokeStyle = HIDDEN_STRIPE;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  /** Outline of the masked cells. `mask` is in display row order. */
  private drawOutline(mask: Uint8Array, width: number, height: number, zoom: number, colour: string): void {
    if (countHidden(mask) === 0) return;
    const ctx = this.ctx;
    ctx.beginPath();
    for (const e of hiddenEdges(mask, width, height)) {
      ctx.moveTo(e.x0 * zoom, e.y0 * zoom);
      ctx.lineTo(e.x1 * zoom, e.y1 * zoom);
    }
    ctx.strokeStyle = colour;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}
