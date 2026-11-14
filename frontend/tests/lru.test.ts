import { expect, it } from 'vitest';
import { evictions } from '../src/engine/core/tiles/lru';
it('selects least recently used entries without mutating input', () => {
 const entries=[{key:'a',used:4},{key:'b',used:1},{key:'c',used:3}];
 expect(evictions(entries,1)).toEqual(['b','c']);expect(entries[0].key).toBe('a');
});
