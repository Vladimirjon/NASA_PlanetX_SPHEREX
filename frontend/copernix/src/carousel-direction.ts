/** Direction of cutout slide: 1 = next frame enters from the right, -1 = from the left. */
export function carouselSlideDirection(
  fromIndex: number,
  toIndex: number,
  frameCount: number,
  wrap: boolean,
): -1 | 1 {
  if (frameCount <= 1 || fromIndex === toIndex) return 1;
  if (!wrap) return toIndex > fromIndex ? 1 : -1;
  const forward = (toIndex - fromIndex + frameCount) % frameCount;
  const backward = (fromIndex - toIndex + frameCount) % frameCount;
  if (forward === 0) return 1;
  if (backward === 0) return -1;
  return forward <= backward ? 1 : -1;
}