import { expect, it } from 'vitest';
import { updateRequests, type PendingRequest } from '../src/engine/core/tiles/request-policy';
it('does not cancel transiently hidden tiles during a five-second circular drag', () => {
  let pending = new Map<string, PendingRequest>([['3/424/19', {order:3, outsideSince:null}]]);
  let aborts = 0;
  for (let t=0;t<5000;t+=50) {
    const near = t%400 < 300;
    const next=updateRequests(pending,near ? new Set(['3/424/19']) : new Set(),t);
    aborts += next.abort.length;pending=next.pending;
  }
  expect(aborts).toBe(0);
});
it('only cancels deep tiles after the grace interval outside the expanded view', () => {
  const initial=new Map([['a',{order:3,outsideSince:null}],['b',{order:2,outsideSince:null}]]);
  const outside=updateRequests(initial,new Set(),100);
  expect(updateRequests(outside.pending,new Set(),599).abort).toEqual([]);
  expect(updateRequests(outside.pending,new Set(),601).abort).toEqual(['a']);
});
