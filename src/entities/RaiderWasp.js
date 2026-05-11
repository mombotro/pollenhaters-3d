import Entity from '../engine/Entity.js';
import World from '../engine/World.js';
import { dist, rotateToward, angleBetween } from '../utils/math.js';
import { WASP, TOWER } from '../constants.js';
import SoundSynth from '../systems/SoundSynth.js';

export default class RaiderWasp extends Entity {
  constructor(x, y) {
    super(x, y, 'wasp');
    this.spriteScale = 1.0;
    this.tint = 0xff8866;
    this.waspType = 'raider';
    this.hp = WASP.HP;
    this.slowedUntil = 0;
    this.isRetreating = false;
    this.retreatTarget = null;
    this.honeyCarried = 0;
    this.lastHit = 0;
    this.drag = 0.015;
    this.maxSpeed = WASP.RAIDER_SPEED;
    World.add(this, 'wasp', 'raider');
  }

  setFlankWaypoint(x, y) { this._flankWaypoint = { x, y }; }

  retreat() {
    this.isRetreating = true;
    const waspHive = World.getSystem('waspHive');
    if ((this.honeyCarried > 0 || this.poisonCarried) && waspHive) {
      this.retreatTarget = { x: waspHive.hive.x, y: waspHive.hive.y };
      return;
    }
    if (waspHive) {
      this.retreatTarget = { x: waspHive.hive.x, y: waspHive.hive.y };
    } else {
      const hive = World.getByTag('hive')[0];
      const a = angleBetween(hive.x, hive.y, this.x, this.y);
      this.retreatTarget = {
        x: this.x + Math.cos(a) * 2000,
        y: this.y + Math.sin(a) * 2000,
      };
    }
  }

  update(time, dt) {
    if (this._flankWaypoint) {
      const d = dist(this.x, this.y, this._flankWaypoint.x, this._flankWaypoint.y);
      if (d <= 50) {
        this._flankWaypoint = null;
      } else {
        this._moveToward(this._flankWaypoint.x, this._flankWaypoint.y, WASP.RAIDER_SPEED, time);
        this._separate();
        return;
      }
    }

    if (this._poisonTarget && this._poisonTarget.active && !this.isRetreating) {
      this._moveToward(this._poisonTarget.x, this._poisonTarget.y, WASP.RAIDER_SPEED, time);
      this._separate();
      return;
    }

    if (this.isRetreating && this.retreatTarget) {
      this._moveToward(this.retreatTarget.x, this.retreatTarget.y, WASP.RAIDER_SPEED, time);
      this._separate();
      if (dist(this.x, this.y, this.retreatTarget.x, this.retreatTarget.y) < 50) {
        const waspHive = World.getSystem('waspHive');
        if (this.honeyCarried > 0 && waspHive) {
          World.getSystem('fx')?.burst(this.retreatTarget.x, this.retreatTarget.y, 0xffaa00, 10);
          World.getSystem('fx')?.burst(this.retreatTarget.x, this.retreatTarget.y, 0xff4400, 6);
          SoundSynth.play('deposit');
          waspHive.onHoneyStolen(this.honeyCarried);
        } else if (this.poisonCarried && waspHive) {
          World.getSystem('fx')?.burst(this.retreatTarget.x, this.retreatTarget.y, 0x44ff44, 8);
          SoundSynth.play('hive-hit');
          waspHive.onPoisonDelivered(TOWER.POISON_HONEY_DAMAGE);
        }
        this.destroy();
      }
      return;
    }

    const hive = World.getByTag('hive')[0];
    if (!this._target || !this._target.active) this._target = hive;
    if (!this._target?.active) return;

    this._moveToward(this._target.x, this._target.y, WASP.RAIDER_SPEED, time);
    this._separate();
  }

  _moveToward(tx, ty, baseSpd, time) {
    const speed = (time < this.slowedUntil ? baseSpd * TOWER.RESIN_TRAP_SLOW : baseSpd) * (this._speedMult ?? 1);
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

  _separate() {
    const RADIUS = 72, FORCE = 1200;
    let sx = 0, sy = 0;
    for (const other of World.getByTag('wasp')) {
      if (!other.active || other === this) continue;
      const dx = this.x - other.x;
      const dy = this.y - other.y;
      const d = Math.hypot(dx, dy);
      if (d === 0) {
        sx += (Math.random() - 0.5) * FORCE;
        sy += (Math.random() - 0.5) * FORCE;
      } else if (d < RADIUS) {
        const s = ((RADIUS - d) / RADIUS) * FORCE;
        sx += (dx / d) * s;
        sy += (dy / d) * s;
      }
    }
    this.ax += sx;
    this.ay += sy;
  }

  takeDamage(amount) {
    this.hp -= amount;
    this.setTint(0xffffff);
    World.after(80, () => { if (this.active) this.clearTint(); });
    if (this.hp <= 0) { this.destroy(); return true; }
    return false;
  }
}
