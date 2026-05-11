import { describe, it, expect } from 'vitest';
import { update, clamp } from './Physics.js';

function makeEntity(overrides = {}) {
  return { x: 0, y: 0, vx: 0, vy: 0, ax: 0, ay: 0,
    maxSpeed: 500, drag: 0.02, ...overrides };
}

describe('update', () => {
  it('applies acceleration to velocity', () => {
    const e = makeEntity({ ax: 100 });
    update(e, 1);
    expect(e.vx).toBeGreaterThan(0);
  });

  it('applies velocity to position', () => {
    const e = makeEntity({ vx: 100 });
    update(e, 1);
    expect(e.x).toBeGreaterThan(0);
  });

  it('clamps velocity to maxSpeed', () => {
    const e = makeEntity({ vx: 1000, maxSpeed: 200 });
    update(e, 1/60);
    expect(e.vx).toBeLessThanOrEqual(200);
  });

  it('drag reduces velocity over time', () => {
    const e = makeEntity({ vx: 100, ax: 0 });
    const before = e.vx;
    update(e, 1);
    expect(e.vx).toBeLessThan(before);
  });

  it('clamps position to world bounds when provided', () => {
    const e = makeEntity({ x: -50, y: 2000 });
    update(e, 1/60, { minX: 0, minY: 0, maxX: 2560, maxY: 1440 });
    expect(e.x).toBeGreaterThanOrEqual(0);
    expect(e.y).toBeLessThanOrEqual(1440);
  });
});

describe('clamp', () => {
  it('clamps value to range', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
    expect(clamp(2, 0, 3)).toBe(2);
  });
});
