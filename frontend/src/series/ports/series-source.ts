import type { GuidedPairMeasurement } from '../core/guided-pair';
import type { components } from '../../api/schema';

export type Series = components['schemas']['Series'];
export type ResolvedName = components['schemas']['ResolvedName'];

export type LoadedSeries = {
  readonly series: Series;
  /** Decoded Float32 science arrays (FITS orientation: row 0 = south), one per frame. */
  readonly frames: readonly Float32Array[];
  readonly sourceKind: 'demo' | 'api';
  readonly resolve?: ResolvedName;
  readonly demoSlug?: string;
  readonly notice?: string;
  readonly guidedPair?: GuidedPairMeasurement;
};

export type SeriesLookup =
  | { readonly kind: 'name'; readonly name: string }
  | {
      readonly kind: 'coords';
      readonly ra: number;
      readonly dec: number;
      readonly fov: number;
      readonly motion?: components['schemas']['Motion'];
    };

export class SeriesSourceError extends Error {
  readonly status: number;
  readonly type: string;
  readonly title: string;
  readonly detail?: string;

  constructor(opts: { status: number; type: string; title: string; detail?: string }) {
    super(opts.detail ?? opts.title);
    this.name = 'SeriesSourceError';
    this.status = opts.status;
    this.type = opts.type;
    this.title = opts.title;
    this.detail = opts.detail;
  }
}

export interface SeriesSource {
  load(lookup: SeriesLookup, signal?: AbortSignal): Promise<LoadedSeries>;
}
