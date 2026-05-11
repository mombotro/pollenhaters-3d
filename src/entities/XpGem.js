import Entity from '../engine/Entity.js';
import World from '../engine/World.js';
import { randInt } from '../utils/math.js';

export default class XpGem extends Entity {
  constructor(x, y, value) {
    super(x, y, 'pickup');
    this.spriteFrame = 1;
    this.spriteScale = 0.4;
    this.xpValue = value;
    this.vx = randInt(-30, 30);
    this.vy = randInt(-30, 30);
    this.drag = 0.05;
    this.maxSpeed = 60;
    World.add(this, 'gem');
  }
}
