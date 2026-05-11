import { describe, it, expect } from 'vitest';
import Camera from './Camera.js';

describe('Camera.follow', () => {
  it('positions camera behind player based on angle', () => {
    const cam = new Camera({ offset: 100, lerpAngle: 1 });
    cam.follow({ x: 500, y: 500, angle: 0 }, 1/60);
    expect(cam.x).toBeLessThan(500);
    expect(cam.y).toBeCloseTo(500, 0);
  });

  it('lerps angle toward player angle', () => {
    const cam = new Camera({ offset: 100, lerpAngle: 0.5 });
    cam.x = 400; cam.y = 400; cam.angle = 0;
    cam.follow({ x: 500, y: 500, angle: Math.PI }, 1/60);
    expect(cam.angle).toBeGreaterThan(0);
    expect(cam.angle).toBeLessThan(Math.PI);
  });
});
