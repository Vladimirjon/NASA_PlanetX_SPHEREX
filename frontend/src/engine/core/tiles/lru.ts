export interface CacheEntry { readonly key:string; readonly used:number }
/** Select keys to evict without mutating the cache. */
export function evictions(entries: readonly CacheEntry[], capacity:number): string[] {
  const excess=Math.max(0,entries.length-Math.max(0,capacity));
  return [...entries].sort((a,b)=>a.used-b.used).slice(0,excess).map(entry=>entry.key);
}
