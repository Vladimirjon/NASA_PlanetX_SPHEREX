export interface PendingRequest { readonly order:number; readonly outsideSince:number|null }
export function motionOrder(order: number, coarsest: number, moving: boolean): number {
  return moving ? Math.min(order, coarsest) : order;
}
export function updateRequests(pending: ReadonlyMap<string,PendingRequest>, expanded: ReadonlySet<string>, now:number): {pending:Map<string,PendingRequest>;abort:string[]} {
  const next=new Map<string,PendingRequest>(),abort:string[]=[];
  for(const [key,state] of pending) {
    const outsideSince=expanded.has(key)?null:state.outsideSince ?? now;
    if(state.order>2 && outsideSince!==null && now-outsideSince>=500) abort.push(key);
    else next.set(key,{...state,outsideSince});
  }
  return {pending:next,abort};
}
