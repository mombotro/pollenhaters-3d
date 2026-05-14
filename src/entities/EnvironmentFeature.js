import Entity from '../engine/Entity.js';
import World from '../engine/World.js';

export default class EnvironmentFeature extends Entity {
  constructor(x, y) {
    super(x, y, 'grass');
    this.spriteFrame = Math.floor(Math.random() * 12);
    this.spriteGroundFrac = 0.8;
    this.spriteScale = 1.0 + Math.random() * 1.2;
    this.renderLayer = 0;
    this.active = true;
    World.add(this, 'environment');
  }
}
