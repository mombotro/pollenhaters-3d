import Entity from '../engine/Entity.js';
import World from '../engine/World.js';

export default class EnvironmentFeature extends Entity {
  constructor(x, y) {
    super(x, y, 'grass');
    // Random frame from grass-sheet.png (0, 1, 4, 5)
    const frames = [0, 1, 4, 5];
    this.spriteFrame = frames[Math.floor(Math.random() * frames.length)];
    this.spriteGroundFrac = 0.8;
    this.spriteScale = 0.6 + Math.random() * 0.6; // Random scale
    this.active = true;
    World.add(this, 'environment');
  }
}
