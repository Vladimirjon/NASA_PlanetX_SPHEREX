import type { Projection } from '../../src/engine/view-state';
import { maxFov } from '../../src/engine/view-state';

export const INTRO_GLOBE = {
  ra: 180,
  dec: -12,
  fov: maxFov('SIN'),
  proj: 'SIN' as Projection,
};

export const INTRO_DELAY_MS = 600;
export const INTRO_FLY_MS = 2800;

export function delay(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const id = window.setTimeout(() => {
      resolve();
    }, ms);
    const onAbort = (): void => {
      window.clearTimeout(id);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    if (signal) {
      if (signal.aborted) {
        onAbort();
        return;
      }
      signal.addEventListener('abort', onAbort, { once: true });
    }
  });
}