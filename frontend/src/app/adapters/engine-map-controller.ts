import type { SkyEngine } from '../../engine/engine';
import type { Projection } from '../../engine/view-state';
import type { FlyToOptions, MapController, MapView } from '../ports/map-controller';

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function lerpAngle(a: number, b: number, t: number): number {
  const d = ((b - a + 540) % 360) - 180;
  return (a + d * t + 360) % 360;
}

export class EngineMapController implements MapController {
  private raf = 0;
  private cancelled = false;

  constructor(private readonly engine: SkyEngine) {}

  getView(): MapView {
    const v = this.engine.getView();
    return { ra: v.ra, dec: v.dec, fov: v.fov, plane: v.plane, proj: v.proj };
  }

  setPlane(plane: number): void {
    this.engine.setPlane(plane);
  }

  setProjection(proj: Projection): void {
    this.engine.setProjection(proj);
  }

  async flyTo(
    target: { ra: number; dec: number; fov: number },
    options: FlyToOptions = {},
  ): Promise<void> {
    const duration = options.reducedMotion ? 0 : (options.durationMs ?? 1200);
    this.cancelled = true;
    if (this.raf) cancelAnimationFrame(this.raf);
    const from = this.engine.getView();
    if (duration <= 0) {
      this.engine.setView({ ra: target.ra, dec: target.dec, fov: target.fov });
      this.cancelled = false;
      return;
    }
    this.cancelled = false;
    const start = performance.now();
    await new Promise<void>(resolve => {
      const step = (now: number): void => {
        if (this.cancelled) {
          resolve();
          return;
        }
        const t = Math.min(1, (now - start) / duration);
        const e = easeInOutCubic(t);
        this.engine.setView({
          ra: lerpAngle(from.ra, target.ra, e),
          dec: from.dec + (target.dec - from.dec) * e,
          fov: from.fov + (target.fov - from.fov) * e,
        });
        if (t < 1) {
          this.raf = requestAnimationFrame(step);
        } else {
          this.raf = 0;
          resolve();
        }
      };
      this.raf = requestAnimationFrame(step);
    });
  }

  destroy(): void {
    this.cancelled = true;
    if (this.raf) cancelAnimationFrame(this.raf);
  }
}
