export function coordinates(ra: number, dec: number): string {
  const hours = ra / 15, h = Math.floor(hours), m = Math.floor((hours-h)*60), s = ((hours-h)*60-m)*60;
  const abs = Math.abs(dec), d = Math.floor(abs), dm = Math.floor((abs-d)*60), ds = ((abs-d)*60-dm)*60;
  return `${h}h ${String(m).padStart(2,'0')}m ${s.toFixed(1)}s  ${dec < 0 ? '−' : '+'}${d}° ${String(dm).padStart(2,'0')}′ ${ds.toFixed(1)}″  (${ra.toFixed(5)}°, ${dec.toFixed(5)}°)`;
}
