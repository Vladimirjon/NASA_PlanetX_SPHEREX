import { useEffect, useRef } from 'react';
import { CanvasSeriesRenderer, type ViewMode } from '../../../src/series/adapters/canvas-renderer';
import { seriesStretchLimits } from '../../../src/series/core/stretch';
import type { LoadedSeries } from '../../../src/series/ports/series-source';

type Props = {
  readonly loaded: LoadedSeries;
  readonly frameIndex: number;
  readonly mode: ViewMode;
  readonly label: string;
};

export function SeriesCutout({ loaded, frameIndex, mode, label }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<CanvasSeriesRenderer | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    rendererRef.current = new CanvasSeriesRenderer(canvasRef.current);
  }, []);

  useEffect(() => {
    if (!rendererRef.current) return;
    const [h, w] = loaded.series.grid.shape;
    const limits = seriesStretchLimits(loaded.series.frames.map(f => f.stats));
    const frame = loaded.series.frames[Math.min(frameIndex, loaded.series.frames.length - 1)];
    rendererRef.current.render({
      mode,
      frameIndex,
      frames: loaded.frames,
      height: h,
      width: w,
      limits,
      grid: {
        shape: [h, w],
        crval_deg: [loaded.series.grid.crval_deg[0], loaded.series.grid.crval_deg[1]],
        pixel_scale_arcsec: loaded.series.grid.pixel_scale_arcsec,
      },
      predicted: frame.predicted_position ?? null,
      zoom: 6,
    });
  }, [loaded, frameIndex, mode]);

  return (
    <div className="cutout-wrap">
      <canvas ref={canvasRef} role="img" aria-label={label} />
    </div>
  );
}
