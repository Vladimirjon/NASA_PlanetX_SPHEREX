import type { Projection } from '../../engine/view-state';

export type MapView = {
  readonly ra: number;
  readonly dec: number;
  readonly fov: number;
  readonly plane: number;
  readonly proj: Projection;
};

export type FlyToOptions = {
  readonly durationMs?: number;
  readonly reducedMotion?: boolean;
};

/** Port so fly-to can later swap to a native engine.flyTo without touching the shell. */
export interface MapController {
  flyTo(target: { ra: number; dec: number; fov: number }, options?: FlyToOptions): Promise<void>;
  setPlane(plane: number): void;
  setProjection(proj: Projection): void;
  getView(): MapView;
  destroy(): void;
}
