import { expect, it, vi } from 'vitest';
import { EngineMapController } from '../../src/app/adapters/engine-map-controller';
import type { SkyEngine } from '../../src/engine/engine';

it('delegates navigation to the engine flight', async () => {
  const flyTo = vi.fn().mockResolvedValue(undefined);
  const controller = new EngineMapController({ flyTo } as unknown as SkyEngine);
  const target = { ra: 10, dec: -20, fov: 1 };
  await controller.flyTo(target, { durationMs: 700 });
  expect(flyTo).toHaveBeenCalledWith(target, { durationMs: 700 });
});
