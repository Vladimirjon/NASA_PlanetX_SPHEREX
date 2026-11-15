import { describe, expect, it } from 'vitest';
import { placeTip, type Box } from '../../copernix/src/place-tip';

const viewport = { width: 800, height: 600 };

describe('placeTip', () => {
  it('places tooltip to the right of anchor when space allows', () => {
    const anchor: Box = { x: 20, y: 100, width: 24, height: 24 };
    const tip = { width: 260, height: 80 };
    const avoid: Box[] = [];
    const pos = placeTip(anchor, tip, viewport, avoid, { prefer: 'right' });
    expect(pos.left).toBeGreaterThan(anchor.x + anchor.width);
    expect(pos.top).toBeGreaterThanOrEqual(8);
  });

  it('does not overlap the left column', () => {
    const anchor: Box = { x: 24, y: 200, width: 24, height: 24 };
    const tip = { width: 240, height: 72 };
    const leftCol: Box = { x: 0, y: 56, width: 300, height: 500 };
    const pos = placeTip(anchor, tip, viewport, [leftCol], { prefer: 'right' });
    const placed: Box = { x: pos.left, y: pos.top, width: tip.width, height: tip.height };
    const overlap =
      placed.x + placed.width > leftCol.x + 1 &&
      placed.x < leftCol.x + leftCol.width - 1 &&
      placed.y + placed.height > leftCol.y + 1 &&
      placed.y < leftCol.y + leftCol.height - 1;
    expect(overlap).toBe(false);
  });

  it('falls back to clamped position inside viewport', () => {
    const anchor: Box = { x: 760, y: 580, width: 24, height: 24 };
    const tip = { width: 280, height: 100 };
    const dock: Box = { x: 0, y: 520, width: 800, height: 80 };
    const pos = placeTip(anchor, tip, viewport, [dock], { margin: 8 });
    expect(pos.left).toBeGreaterThanOrEqual(8);
    expect(pos.top).toBeGreaterThanOrEqual(8);
    expect(pos.left + tip.width).toBeLessThanOrEqual(viewport.width - 8);
  });
});