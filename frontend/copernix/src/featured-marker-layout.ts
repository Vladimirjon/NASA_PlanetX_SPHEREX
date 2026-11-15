export type MarkerScreen = {
  readonly id: string;
  readonly x: number;
  readonly y: number;
};

/** Hide labels when two markers are closer than minPx (spec: 90px). */
export function featuredLabelVisibility(markers: readonly MarkerScreen[], minPx = 90): ReadonlySet<string> {
  const hide = new Set<string>();
  for (let i = 0; i < markers.length; i++) {
    for (let j = i + 1; j < markers.length; j++) {
      const a = markers[i];
      const b = markers[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      if (Math.hypot(dx, dy) < minPx) {
        hide.add(b.id);
      }
    }
  }
  return hide;
}