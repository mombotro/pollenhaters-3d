import { describe, it, expect, vi, beforeEach } from 'vitest';
import World from './World.js';

beforeEach(() => World.clear());

describe('World.add / getByTag', () => {
  it('returns entity by tag', () => {
    const e = { active: true };
    World.add(e, 'bee');
    expect(World.getByTag('bee')).toContain(e);
  });

  it('entity can have multiple tags', () => {
    const e = { active: true };
    World.add(e, 'bee', 'player');
    expect(World.getByTag('player')).toContain(e);
  });
});

describe('World.remove', () => {
  it('removes entity from all tags', () => {
    const e = { active: true };
    World.add(e, 'bee');
    World.remove(e);
    expect(World.getByTag('bee')).not.toContain(e);
  });
});

describe('World.query', () => {
  it('returns only entities within radius', () => {
    const near = { active: true, x: 10, y: 10 };
    const far = { active: true, x: 1000, y: 1000 };
    World.add(near, 'wasp');
    World.add(far, 'wasp');
    const result = World.query('wasp', 0, 0, 50);
    expect(result).toContain(near);
    expect(result).not.toContain(far);
  });
});

describe('World.after', () => {
  it('calls callback after elapsed time', () => {
    const fn = vi.fn();
    World.after(100, fn);
    World.update(50);
    expect(fn).not.toHaveBeenCalled();
    World.update(60);
    expect(fn).toHaveBeenCalledOnce();
  });
});

describe('World systems', () => {
  it('stores and retrieves named system', () => {
    const sys = { foo: true };
    World.addSystem('test', sys);
    expect(World.getSystem('test')).toBe(sys);
  });
});
