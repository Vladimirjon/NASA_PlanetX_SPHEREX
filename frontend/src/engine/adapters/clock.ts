import type { Clock } from '../ports/clock';
export function browserClock(): Clock {
  return { request: callback => requestAnimationFrame(callback), cancel: id => { cancelAnimationFrame(id); } };
}
