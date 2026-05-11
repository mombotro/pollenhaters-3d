import { describe, it, expect, vi } from 'vitest';
import Entity from './Entity.js';

vi.mock('./World.js', () => ({ default: { remove: vi.fn() } }));

describe('Entity', () => {
  it('initializes with position and defaults', () => {
    const e = new Entity(10, 20, 'bee');
    expect(e.x).toBe(10);
    expect(e.y).toBe(20);
    expect(e.spriteKey).toBe('bee');
    expect(e.vx).toBe(0);
    expect(e.vy).toBe(0);
    expect(e.ax).toBe(0);
    expect(e.ay).toBe(0);
    expect(e.active).toBe(true);
    expect(e.visible).toBe(true);
    expect(e.tint).toBe(null);
  });

  it('setPosition updates x and y and returns this', () => {
    const e = new Entity(0, 0, 'x');
    const ret = e.setPosition(5, 6);
    expect(e.x).toBe(5);
    expect(e.y).toBe(6);
    expect(ret).toBe(e);
  });

  it('setVisible/setActive return this', () => {
    const e = new Entity(0, 0, 'x');
    expect(e.setVisible(false)).toBe(e);
    expect(e.visible).toBe(false);
    expect(e.setActive(false)).toBe(e);
    expect(e.active).toBe(false);
  });

  it('setTint/clearTint work', () => {
    const e = new Entity(0, 0, 'x');
    e.setTint(0xff0000);
    expect(e.tint).toBe(0xff0000);
    e.clearTint();
    expect(e.tint).toBe(null);
  });
});
