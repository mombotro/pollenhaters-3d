import Entity from '../engine/Entity.js';
import World from '../engine/World.js';
import { dist, rotateToward, angleBetween } from '../utils/math.js';
import { ARCHER_WASP, TOWER } from '../constants.js';
import Stinger from './Stinger.js';

export default class ArcherWasp extends Entity {
  constructor(x, y) {
    super(x, y, 'wasp');
    this.spriteScale = 1.0;
    this.tint = 0xaa44ff;
    this.waspType = 'archer';
    this.hp = ARCHER_WASP.HP;
    this._target = null;
    this.lastHit = 0;
    this.slowedUntil = 0;
    this.honeyCarried = 0;
    this._lastFired = 0;
    this.drag = 0.015;
    this.maxSpeed = ARCHER_WASP.SPEED;
    World.add(this, 'wasp', 'archer');
  }

  setTarget(target) { this._target = target; }

  update(time, dt) {
    let target = this._target;
    const player = World.getByTag('player')[0];
    if (!target || !target.active || target.alive === false) {
      if (player?.alive) { target = player; this._target = target; }
      else { this.ax = 0; this.ay = 0; return; }
    }

    const d = dist(this.x, this.y, target.x, target.y);
    const baseSpeed = ARCHER_WASP.SPEED * (this._speedMult ?? 1);
    const speed = time < this.slowedUntil ? baseSpeed * TOWER.RESIN_TRAP_SLOW : baseSpeed;
    const angleToTarget = angleBetween(this.x, this.y, target.x, target.y);

    if (d < ARCHER_WASP.MIN_RANGE) {
      this.maxSpeed = speed;
      const ax = (this.x - target.x) / d;
      const ay = (this.y - target.y) / d;
      this.ax = ax * speed * 10;
      this.ay = ay * speed * 10;
      if (this.vx * this.vx + this.vy * this.vy > 10) {
        this.angle = rotateToward(this.angle, Math.atan2(this.vy, this.vx) + Math.PI / 2, 0.12);
      }
    } else if (d > ARCHER_WASP.ATTACK_RANGE) {
      this.maxSpeed = speed;
      const ax = (target.x - this.x) / d;
      const ay = (target.y - this.y) / d;
      this.ax = ax * speed * 10;
      this.ay = ay * speed * 10;
      if (this.vx * this.vx + this.vy * this.vy > 10) {
        this.angle = rotateToward(this.angle, Math.atan2(this.vy, this.vx) + Math.PI / 2, 0.12);
      }
    } else {
      this.ax = 0; this.ay = 0;
      const backwardRot = angleToTarget - Math.PI / 2;
      this.angle = rotateToward(this.angle, backwardRot, 0.06);

      let diff = this.angle - backwardRot;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      if (Math.abs(diff) < 0.2 && time - this._lastFired >= ARCHER_WASP.FIRE_RATE) {
        const tailAngle = this.angle + Math.PI / 2;
        const spawnX = this.x + Math.cos(tailAngle) * 12;
        const spawnY = this.y + Math.sin(tailAngle) * 12;
        new Stinger(spawnX, spawnY, ARCHER_WASP.DAMAGE, ARCHER_WASP.ATTACK_RANGE + 60,
                    ARCHER_WASP.STINGER_SPEED, target.x, target.y, true);
        this._lastFired = time;
      }
    }
    this._separate();
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
    World.after(80, () => { if (this.active) this.setTint(0xaa44ff); });
    if (this.hp <= 0) { this.destroy(); return true; }
    return false;
  }
}
