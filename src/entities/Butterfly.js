import Entity from '../engine/Entity.js';
import World from '../engine/World.js';
import { dist, angleBetween, randInt } from '../utils/math.js';
import { BUTTERFLY, FLOWER } from '../constants.js';

export default class Butterfly extends Entity {
  constructor(x, y) {
    super(x, y, 'misc');
    this.spriteFrame = 5;
    this.spriteScale = 0.4;
    this.drag = 0.8;
    this.maxSpeed = BUTTERFLY.SPEED;
    this._angle    = Math.random() * Math.PI * 2;
    this._nextTurn = 0;
    World.add(this, 'butterfly');
  }

  update(time, dt) {
    const player     = World.getByTag('player')[0];
    const pollination = World.getSystem('pollination');
    const flowers    = World.getByTag('flower');

    if (time > this._nextTurn) {
      this._angle    = Math.random() * Math.PI * 2;
      this._nextTurn = time + BUTTERFLY.DIRECTION_CHANGE + randInt(-500, 500);
    }

    if (player?.alive) {
      const d = dist(this.x, this.y, player.x, player.y);
      if (d < BUTTERFLY.FLEE_RADIUS) {
        this._angle    = angleBetween(player.x, player.y, this.x, this.y);
        this._nextTurn = time + 1200;
      } else {
        this._seekAromatic(flowers);
      }
    } else {
      this._seekAromatic(flowers);
    }

    this.vx = Math.cos(this._angle) * BUTTERFLY.SPEED;
    this.vy = Math.sin(this._angle) * BUTTERFLY.SPEED;

    for (const flower of flowers) {
      if (!flower.active) continue;
      const d = dist(this.x, this.y, flower.x, flower.y);
      if (d < BUTTERFLY.POLLINATE_RADIUS && !flower.pollenCollected && flower.lifecycle !== 'young') {
        flower.collectPollen();
        pollination?.pollinate({ x: flower.x, y: flower.y }, time);
      }
      if (d < BUTTERFLY.BOOST_RADIUS) {
        flower.receiveButterflyBoost(dt);
      }
    }
  }

  _seekAromatic(flowers) {
    let nearest = null, nearestDist = FLOWER.AROMATIC_RADIUS;
    for (const f of flowers) {
      if (!f.active || f.flowerType !== 'AROMATIC' || f.lifecycle !== 'mature') continue;
      const d = dist(this.x, this.y, f.x, f.y);
      if (d < nearestDist) { nearest = f; nearestDist = d; }
    }
    if (nearest) this._angle = angleBetween(this.x, this.y, nearest.x, nearest.y);
  }
}
