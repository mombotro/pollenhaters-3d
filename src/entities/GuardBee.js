import Entity from '../engine/Entity.js';
import World from '../engine/World.js';
import { dist, rotateToward } from '../utils/math.js';
import { TOWER } from '../constants.js';
import Stinger from './Stinger.js';

export default class GuardBee extends Entity {
  constructor(x, y, post) {
    super(x, y, 'bee-sheet');
    this.spriteScale = 0.5;
    this.tint = 0x4488ff;
    this.hp = TOWER.GUARD_BEE_HP;
    this.maxHp = TOWER.GUARD_BEE_HP;
    this.alive = true;
    this._post = post;
    this._lastFired = 0;
    this.drag = 0.015;
    this.maxSpeed = TOWER.GUARD_BEE_SPEED;
    World.add(this, 'bee', 'guard');
  }

  update(time, dt) {
    if (!this.alive) return;

    const angle = (time / 2000) * Math.PI * 2;
    const tx = this._post.x + Math.cos(angle) * 44;
    const ty = this._post.y + Math.sin(angle) * 44;
    this._moveToward(tx, ty);

    if (time - this._lastFired < TOWER.GUARD_BEE_RATE) return;
    const wasps = World.getByTag('wasp');
    let nearest = null, nearestDist = TOWER.GUARD_BEE_RANGE;
    for (const w of wasps) {
      if (!w.active) continue;
      const d = dist(this.x, this.y, w.x, w.y);
      if (d < nearestDist) { nearest = w; nearestDist = d; }
    }
    if (!nearest) return;
    new Stinger(this.x, this.y, TOWER.GUARD_BEE_DAMAGE, TOWER.GUARD_BEE_RANGE, null, nearest.x, nearest.y);
    this._lastFired = time;
  }

  _moveToward(tx, ty) {
    const speed = TOWER.GUARD_BEE_SPEED;
    this.maxSpeed = speed;
    const d = dist(this.x, this.y, tx, ty);
    if (d > 5) {
      this.ax = ((tx - this.x) / d) * speed * 10;
      this.ay = ((ty - this.y) / d) * speed * 10;
    } else {
      this.ax = 0; this.ay = 0;
    }
    if (this.vx * this.vx + this.vy * this.vy > 10) {
      this.angle = rotateToward(this.angle, Math.atan2(this.vy, this.vx) + Math.PI / 2, 0.15);
    }
  }
}
