import Entity from '../engine/Entity.js';
import World from '../engine/World.js';
import { dist, rotateToward, angleBetween } from '../utils/math.js';
import { WASP, TOWER } from '../constants.js';
import SoundSynth from '../systems/SoundSynth.js';

export default class HunterWasp extends Entity {
  constructor(x, y) {
    super(x, y, 'wasp');
    this.spriteScale = 1.0;
    this.waspType = 'hunter';
    this.hp = WASP.HP;
    this._target = null;
    this.lastHit = 0;
    this.slowedUntil = 0;
    this.honeyCarried = 0;
    this.drag = 0.015;
    this.maxSpeed = WASP.HUNTER_SPEED;
    World.add(this, 'wasp', 'hunter');
  }

  setTarget(target) { this._target = target; }
  setFlankWaypoint(x, y) { this._flankWaypoint = { x, y }; }

  update(time, dt) {
    if (this._flankWaypoint) {
      const d = dist(this.x, this.y, this._flankWaypoint.x, this._flankWaypoint.y);
      if (d <= 50) {
        this._flankWaypoint = null;
      } else {
        this._moveToward(this._flankWaypoint.x, this._flankWaypoint.y, time);
        this._separate();
        return;
      }
    }

    if (this._poisonTarget && this._poisonTarget.active && !this.isRetreating) {
      this._moveToward(this._poisonTarget.x, this._poisonTarget.y, time);
      this._separate();
      return;
    }

    if (this.isRetreating && this.retreatTarget) {
      this._moveToward(this.retreatTarget.x, this.retreatTarget.y, time);
      if (this.honeyCarried > 0) {
        if (dist(this.x, this.y, this.retreatTarget.x, this.retreatTarget.y) < 50) {
          World.getSystem('fx')?.burst(this.retreatTarget.x, this.retreatTarget.y, 0xffaa00, 10);
          SoundSynth.play('deposit');
          World.getSystem('waspHive')?.onHoneyStolen(this.honeyCarried);
          this.destroy();
        }
      } else if (this.poisonCarried) {
        if (dist(this.x, this.y, this.retreatTarget.x, this.retreatTarget.y) < 50) {
          World.getSystem('fx')?.burst(this.retreatTarget.x, this.retreatTarget.y, 0x44ff44, 8);
          SoundSynth.play('hive-hit');
          World.getSystem('waspHive')?.onPoisonDelivered(TOWER.POISON_HONEY_DAMAGE);
          this.destroy();
        }
      } else if (this.x < -200 || this.x > 3000 || this.y < -200 || this.y > 2000) {
        this.destroy();
      }
      this._separate();
      return;
    }

    const player = World.getByTag('player')[0];
    if (player?.active && player.alive) {
      this._target = player;
    } else if (!this._target?.active || this._target?.alive === false) {
      const candidates = [
        ...World.getByTag('worker').filter(w => w.active && w.alive),
        ...World.getByTag('tower').filter(t => t.active && t.hp > 0 && t.towerType === 'guard'),
        ...World.getByTag('hive').filter(h => h.active),
      ];
      let nearest = null, nearestD = Infinity;
      for (const c of candidates) {
        const d = dist(this.x, this.y, c.x, c.y);
        if (d < nearestD) { nearest = c; nearestD = d; }
      }
      this._target = nearest;
    }

    if (!this._target?.active) {
      this.ax = 0; this.ay = 0;
      this._separate();
      return;
    }

    this._moveToward(this._target.x, this._target.y, time);
    this._separate();
  }

  _moveToward(tx, ty, time) {
    const baseSpeed = WASP.HUNTER_SPEED * (this._speedMult ?? 1);
    const speed = time < this.slowedUntil ? baseSpeed * TOWER.RESIN_TRAP_SLOW : baseSpeed;
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

  retreat() {
    this.isRetreating = true;
    const waspHive = World.getSystem('waspHive');
    if ((this.honeyCarried > 0 || this.poisonCarried) && waspHive) {
      const wh = waspHive.hive;
      this.retreatTarget = { x: wh.x, y: wh.y };
    } else {
      const hive = World.getByTag('hive')[0];
      const a = angleBetween(hive.x, hive.y, this.x, this.y);
      this.retreatTarget = {
        x: this.x + Math.cos(a) * 2000,
        y: this.y + Math.sin(a) * 2000,
      };
    }
  }
}
