/** Which frame indices may show a date label on the timeline (≥ minGapPx between labels). */
export function timelineDateVisibility(
  frameIndices: readonly number[],
  fractions: readonly number[],
  selectedIndex: number,
  trackWidthPx: number,
  minGapPx = 72,
): Set<number> {
  const visible = new Set<number>([selectedIndex]);
  if (frameIndices.length < 2 || trackWidthPx <= 0) return visible;

  const first = frameIndices[0];
  const last = frameIndices[frameIndices.length - 1];
  const selIdx = frameIndices.indexOf(selectedIndex);
  const selX = selIdx >= 0 ? fractions[selIdx] * trackWidthPx : 0;
  const firstX = fractions[0] * trackWidthPx;
  const lastX = fractions[fractions.length - 1] * trackWidthPx;

  const placed: number[] = [selX];
  const tryAdd = (idx: number, x: number) => {
    if (idx === selectedIndex) return;
    if (placed.every(p => Math.abs(p - x) >= minGapPx)) {
      visible.add(idx);
      placed.push(x);
    }
  };

  tryAdd(first, firstX);
  tryAdd(last, lastX);
  return visible;
}