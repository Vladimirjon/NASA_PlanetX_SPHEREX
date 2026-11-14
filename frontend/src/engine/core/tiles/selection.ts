export function selectOrder(fov: number, width: number): number {
  return Math.max(0, Math.min(5, Math.ceil(Math.log2(Math.max(1, width) * 58.63 / (512 * Math.max(fov, 0.001))))));
}
