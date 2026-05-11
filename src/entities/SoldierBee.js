import Entity from '../engine/Entity.js';
import World from '../engine/World.js';
import { dist, rotateToward } from '../utils/math.js';
import { SOLDIER } from '../constants.js';
import Stinger from './Stinger.js';

export default class SoldierBee extends Entity {
  constructor(x, y) {
    super(x, y, 'player-bee');
    this.spriteScale = 0.55;
    this.tint = 0xff8800;
    this.alive = true;
    this.hp = SOLDIER.HP;
    this.maxHp = SOLDIER.HP;
    this.damage = SOLDIER.DAMAGE;
    this.range = SOLDIER.RANGE;
    this.fireRate = SOLDIER.FIRE_RATE;
    this._lastFired = 0;
    this._phaseOffset = Math.random() * Math.PI * 2;
    this.drag = 0.015;
    this.maxSpeed = SOLDIER.SPEED;
    World.add(this, 'bee', 'soldier');
  }

  update(time, dt) {
    const player = World.getByTag('player')[0];
    if (!this.alive || !player?.alive) return;

    const angle = (time / 2000) * Math.PI * 2 + this._phaseOffset;
    const tx = player.x + Math.cos(angle) * SOLDIER.ORBIT_RADIUS;
    const ty = player.y + Math.sin(angle) * SOLDIER.ORBIT_RADIUS;
    this._moveToward(tx, ty);

    if (time - this._lastFired < this.fireRate) return;

    let target = null, targetDist = this.range;
    for (const w of World.getByTag('wasp')) {
      if (!w.active) continue;
      const d = dist(this.x, this.y, w.x, w.y);
      if (d < targetDist) { target = w; targetDist = d; }
    }
    for (const b of World.getByTag('breakable')) {
      if (!b.active) continue;
      const d = dist(this.x, this.y, b.x, b.y);
      if (d < targetDist) { target = b; targetDist = d; }
    }
    if (!target) return;
    new Stinger(this.x, this.y, this.damage, this.range, null, target.x, target.y);
    this._lastFired = time;
  }

  takeDamage(amount) {
    if (!this.alive) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.setTint(0xff4444);
    World.after(150, () => { if (this.active) this.setTint(0xff8800); });
    if (this.hp <= 0) {
      this.alive = false;
      this.setVisible(false).setActive(false);
      return true;
    }
    return false;
  }

  _moveToward(tx, ty) {
    const speed = SOLDIER.SPEED;
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
