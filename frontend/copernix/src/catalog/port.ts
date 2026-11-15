import type { SeriesLookup } from '../../../src/series/ports/series-source';

/** Proper motion when the catalog entry carries Gaia/Luhman motion. */
export type CatalogMotion = {
  readonly pm_ra_masyr: number;
  readonly pm_dec_masyr: number;
  readonly parallax_mas?: number;
  readonly ref_epoch_jyear: number;
};

/**
 * One sky object the viewer can select.
 * `kind` is always a friendly, localized-ready label (not a SIMBAD code).
 */
export type CatalogEntry = {
  readonly id: string;
  readonly name: string;
  readonly kind: string;
  readonly description: string;
  readonly ra: number;
  readonly dec: number;
  readonly motion?: CatalogMotion;
  readonly featured: boolean;
  /** Challenge slug when this entry is featured; never shown as such in the UI. */
  readonly slug?: string;
};

export type CatalogSource = {
  featured(): Promise<CatalogEntry[]>;
  search(q: string, signal?: AbortSignal): Promise<CatalogEntry[]>;
  resolve(entry: CatalogEntry): SeriesLookup;
};
