import type { SkyEngine } from '../../engine/engine';
import type { Projection } from '../../engine/view-state';
import type { FlyToOptions, MapController, MapView } from '../ports/map-controller';

export class EngineMapController implements MapController {
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
    await this.engine.flyTo(target, { durationMs: options.reducedMotion ? 0 : (options.durationMs ?? 1200) });
  }

  destroy(): void {
    // The owning app destroys the engine and cancels its flight.
  }
}
