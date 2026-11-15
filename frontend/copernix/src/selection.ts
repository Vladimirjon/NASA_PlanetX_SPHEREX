/** Selection state machine for the Copernix viewer map marker.
 *
 * The target/custom marker is anchored to sky coordinates and never moves on
 * a map click. Clicks only create/clear a candidate until "Analyze this point".
 */

export type SkyCoords = {
  readonly ra: number;
  readonly dec: number;
};

export type SelectionState = {
  /** Featured catalog entry, named search hit, or user-analyzed custom point. */
  readonly mode: 'target' | 'named' | 'custom';
  /** Featured slug when mode === 'target'; else null. */
  readonly slug: string | null;
  /** Canonical name when mode === 'named' (URL `?name=`). */
  readonly catalogName: string | null;
  /** Friendly kind / one-line description for the title block. */
  readonly catalogKind: string | null;
  readonly catalogDescription: string | null;
  /** Sky coordinates of the anchored marker. */
  readonly coords: SkyCoords;
  /** Last featured slug for "Return to …". */
  readonly lastTargetSlug: string | null;
  /** Ephemeral map pick; not written to the URL. */
  readonly candidate: SkyCoords | null;
};

export type SelectionAction =
  | { readonly type: 'select_target'; readonly slug: string; readonly coords: SkyCoords }
  | {
      readonly type: 'select_named';
      readonly name: string;
      readonly coords: SkyCoords;
      readonly kind?: string | null;
      readonly description?: string | null;
    }
  | { readonly type: 'set_candidate'; readonly coords: SkyCoords }
  | { readonly type: 'clear_candidate' }
  | { readonly type: 'analyze_candidate' }
  | { readonly type: 'set_custom'; readonly coords: SkyCoords }
  | { readonly type: 'return_to_target'; readonly slug: string; readonly coords: SkyCoords };

const SAME_POINT_EPS_DEG = 1e-4;

export function samePoint(a: SkyCoords, b: SkyCoords, epsDeg: number = SAME_POINT_EPS_DEG): boolean {
  return Math.abs(a.ra - b.ra) <= epsDeg && Math.abs(a.dec - b.dec) <= epsDeg;
}

export function angularSeparationDeg(a: SkyCoords, b: SkyCoords): number {
  const toRad = Math.PI / 180;
  const ra1 = a.ra * toRad;
  const dec1 = a.dec * toRad;
  const ra2 = b.ra * toRad;
  const dec2 = b.dec * toRad;
  const cos =
    Math.sin(dec1) * Math.sin(dec2) + Math.cos(dec1) * Math.cos(dec2) * Math.cos(ra1 - ra2);
  return (Math.acos(Math.min(1, Math.max(-1, cos))) * 180) / Math.PI;
}

/** Offer "Return to …" when the view centre is farther than ~1.5× FOV from the anchor. */
export function shouldOfferReturn(
  anchor: SkyCoords,
  viewCenter: SkyCoords,
  fovDeg: number,
  multiplier = 1.5,
): boolean {
  const threshold = Math.max(fovDeg, 1e-6) * multiplier;
  return angularSeparationDeg(anchor, viewCenter) > threshold;
}

export function createSelection(input: {
  readonly mode: 'target' | 'named' | 'custom';
  readonly slug: string | null;
  readonly coords: SkyCoords;
  readonly catalogName?: string | null;
  readonly catalogKind?: string | null;
  readonly catalogDescription?: string | null;
  readonly lastTargetSlug?: string | null;
  readonly candidate?: SkyCoords | null;
}): SelectionState {
  return {
    mode: input.mode,
    slug: input.mode === 'target' ? input.slug : null,
    catalogName: input.mode === 'named' ? (input.catalogName ?? null) : null,
    catalogKind: input.catalogKind ?? null,
    catalogDescription: input.catalogDescription ?? null,
    coords: input.coords,
    lastTargetSlug: input.lastTargetSlug ?? (input.mode === 'target' ? input.slug : null),
    candidate: input.candidate ?? null,
  };
}

export function reduceSelection(state: SelectionState, action: SelectionAction): SelectionState {
  switch (action.type) {
    case 'select_target':
      return {
        mode: 'target',
        slug: action.slug,
        catalogName: null,
        catalogKind: null,
        catalogDescription: null,
        coords: action.coords,
        lastTargetSlug: action.slug,
        candidate: null,
      };
    case 'select_named':
      return {
        mode: 'named',
        slug: null,
        catalogName: action.name,
        catalogKind: action.kind ?? null,
        catalogDescription: action.description ?? null,
        coords: action.coords,
        lastTargetSlug: state.lastTargetSlug ?? state.slug,
        candidate: null,
      };
    case 'set_candidate': {
      if (state.candidate && samePoint(state.candidate, action.coords)) {
        return { ...state, candidate: null };
      }
      return { ...state, candidate: action.coords };
    }
    case 'clear_candidate':
      return state.candidate === null ? state : { ...state, candidate: null };
    case 'analyze_candidate': {
      if (!state.candidate) return state;
      return {
        mode: 'custom',
        slug: null,
        catalogName: null,
        catalogKind: null,
        catalogDescription: null,
        coords: state.candidate,
        lastTargetSlug: state.lastTargetSlug ?? state.slug,
        candidate: null,
      };
    }
    case 'set_custom':
      return {
        mode: 'custom',
        slug: null,
        catalogName: null,
        catalogKind: null,
        catalogDescription: null,
        coords: action.coords,
        lastTargetSlug: state.lastTargetSlug ?? state.slug,
        candidate: null,
      };
    case 'return_to_target':
      return {
        mode: 'target',
        slug: action.slug,
        catalogName: null,
        catalogKind: null,
        catalogDescription: null,
        coords: action.coords,
        lastTargetSlug: action.slug,
        candidate: null,
      };
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}
