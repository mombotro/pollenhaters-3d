import Entity from '../engine/Entity.js';
import World from '../engine/World.js';
import { angleBetween } from '../utils/math.js';
import { BEE } from '../constants.js';

export default class Stinger extends Entity {
  constructor(x, y, damage, maxDist, speed, targetX, targetY, isEnemy = false) {
    super(x, y, 'stinger');
    this.spriteScale = 0.3;
    this.damage = damage ?? BEE.STINGER_DAMAGE;
    this.isEnemy = isEnemy;

    const spd = speed ?? BEE.STINGER_SPEED;
    const angleRad = angleBetween(x, y, targetX, targetY);
    this.angle = angleRad;
    this.vx = Math.cos(angleRad) * spd;
    this.vy = Math.sin(angleRad) * spd;
    this.drag = 1;       // no drag — constant velocity
    this.maxSpeed = spd * 1.1;

    const lifetime = ((maxDist ?? BEE.STINGER_RANGE) / spd) * 1000;
    World.after(lifetime, () => this.destroy());
    World.add(this, 'stinger', isEnemy ? 'enemy-stinger' : 'player-stinger');
  }
}
