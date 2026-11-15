export type Box = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

export type TipSize = {
  readonly width: number;
  readonly height: number;
};

export type Viewport = {
  readonly width: number;
  readonly height: number;
};

type PlacementSide = 'right' | 'left' | 'top' | 'bottom';
type PreferSide = 'left' | 'right' | 'top' | 'auto';

function edges(box: Box) {
  return {
    left: box.x,
    top: box.y,
    right: box.x + box.width,
    bottom: box.y + box.height,
  };
}

function intersects(a: Box, b: Box, tol = 0): boolean {
  const A = edges(a);
  const B = edges(b);
  return !(
    A.right - tol <= B.left ||
    A.left + tol >= B.right ||
    A.bottom - tol <= B.top ||
    A.top + tol >= B.bottom
  );
}

function fitsInViewport(tip: Box, viewport: Viewport, margin: number): boolean {
  return (
    tip.x >= margin &&
    tip.y >= margin &&
    tip.x + tip.width <= viewport.width - margin &&
    tip.y + tip.height <= viewport.height - margin
  );
}

function tipBoxAt(anchor: Box, tip: TipSize, side: PlacementSide, gap: number): Box {
  const cx = anchor.x + anchor.width / 2;
  const cy = anchor.y + anchor.height / 2;
  switch (side) {
    case 'right':
      return { x: anchor.x + anchor.width + gap, y: cy - tip.height / 2, width: tip.width, height: tip.height };
    case 'left':
      return { x: anchor.x - tip.width - gap, y: cy - tip.height / 2, width: tip.width, height: tip.height };
    case 'top':
      return {
        x: Math.max(anchor.x + anchor.width + gap, cx - tip.width / 2),
        y: anchor.y - tip.height - gap,
        width: tip.width,
        height: tip.height,
      };
    default:
      return {
        x: Math.max(anchor.x + anchor.width + gap, cx - tip.width / 2),
        y: anchor.y + anchor.height + gap,
        width: tip.width,
        height: tip.height,
      };
  }
}

function sideOrder(prefer: PreferSide): PlacementSide[] {
  if (prefer === 'top') return ['top', 'right', 'left', 'bottom'];
  if (prefer === 'right') return ['right', 'left', 'top', 'bottom'];
  if (prefer === 'left') return ['left', 'right', 'top', 'bottom'];
  return ['right', 'left', 'top', 'bottom'];
}

function nudgeAway(candidate: Box, avoidRects: readonly Box[], margin: number): Box {
  let box = candidate;
  for (let pass = 0; pass < 4; pass++) {
    let moved = false;
    for (const r of avoidRects) {
      if (!intersects(box, r, 0)) continue;
      const C = edges(box);
      const R = edges(r);
      if (C.right > R.left && C.left < R.left && R.left >= C.left) {
        const x = R.right + margin;
        box = { ...box, x };
        moved = true;
      } else if (C.left < R.right && C.right > R.right) {
        const x = R.left - margin - box.width;
        box = { ...box, x };
        moved = true;
      } else if (C.bottom > R.top && C.top < R.top) {
        const y = R.bottom + margin;
        box = { ...box, y };
        moved = true;
      } else if (C.top < R.bottom && C.bottom > R.bottom) {
        const y = R.top - margin - box.height;
        box = { ...box, y };
        moved = true;
      }
    }
    if (!moved) break;
  }
  return box;
}

/**
 * Picks the first side where the tip fits in the viewport and does not overlap avoidRects.
 */
export function placeTip(
  anchorRect: Box,
  tipRect: TipSize,
  viewport: Viewport,
  avoidRects: readonly Box[],
  options: { margin?: number; gap?: number; prefer?: PreferSide } = {},
): { left: number; top: number } {
  const margin = options.margin ?? 8;
  const gap = options.gap ?? 8;
  const order = sideOrder(options.prefer ?? 'auto');

  for (const side of order) {
    const base = tipBoxAt(anchorRect, tipRect, side, gap);
    const candidate = nudgeAway(base, avoidRects, margin);
    if (!fitsInViewport(candidate, viewport, margin)) continue;
    const hits = avoidRects.some(r => intersects(candidate, r, 1));
    if (!hits) return { left: candidate.x, top: candidate.y };
  }

  let fallback = nudgeAway(tipBoxAt(anchorRect, tipRect, order[0] ?? 'right', gap), avoidRects, margin);
  for (let i = 0; i < 24; i++) {
    const hits = avoidRects.some(r => intersects(fallback, r, 1));
    if (!hits) break;
    fallback = { ...fallback, y: Math.max(margin, fallback.y - 10) };
  }
  const clamped = {
    left: Math.min(viewport.width - tipRect.width - margin, Math.max(margin, fallback.x)),
    top: Math.min(viewport.height - tipRect.height - margin, Math.max(margin, fallback.y)),
  };
  return clamped;
}