import { describe, it, expect } from 'vitest';
import { dist, angleBetween, rotateToward, randInt, randFloat } from './math.js';

describe('dist', () => {
  it('returns 0 for same point', () => expect(dist(0,0,0,0)).toBe(0));
  it('returns 5 for 3-4-5 triangle', () => expect(dist(0,0,3,4)).toBe(5));
});

describe('angleBetween', () => {
  it('returns 0 for rightward vector', () => expect(angleBetween(0,0,1,0)).toBe(0));
  it('returns PI/2 for downward vector', () =>
    expect(angleBetween(0,0,0,1)).toBeCloseTo(Math.PI/2));
});

describe('rotateToward', () => {
  it('reaches target when within step', () =>
    expect(rotateToward(0, 0.1, 0.5)).toBe(0.1));
  it('moves by maxStep when far', () =>
    expect(rotateToward(0, 2, 0.15)).toBeCloseTo(0.15));
  it('wraps correctly across PI boundary', () => {
    const result = rotateToward(Math.PI - 0.1, -Math.PI + 0.1, 0.5);
    expect(Math.abs(result)).toBeLessThanOrEqual(Math.PI);
  });
});

describe('randInt', () => {
  it('returns integer in range', () => {
    for (let i = 0; i < 100; i++) {
      const v = randInt(2, 5);
      expect(v).toBeGreaterThanOrEqual(2);
      expect(v).toBeLessThanOrEqual(5);
      expect(Number.isInteger(v)).toBe(true);
    }
  });
});
