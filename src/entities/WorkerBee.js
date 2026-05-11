import Entity from '../engine/Entity.js';
import World from '../engine/World.js';
import { dist, rotateToward } from '../utils/math.js';
import { WORKER } from '../constants.js';

const STATE = { SEEK: 'seek', COLLECT: 'collect', RETURN: 'return' };

export default class WorkerBee extends Entity {
  constructor(x, y) {
    super(x, y, 'bee-sheet');
    this.spriteScale = 0.5;
    this.tint = 0x88ff44;
    this.hp = WORKER.HP;
    this.maxHp = WORKER.HP;
    this.alive = true;
    this._sap = 0;
    this._state = STATE.SEEK;
    this._target = null;
    this.drag = 0.015;
    this.maxSpeed = WORKER.SPEED;
    World.add(this, 'bee', 'worker');
  }

  update(time, dt) {
    if (!this.alive) return;
    const resources = World.getSystem('resources');
    switch (this._state) {
      case STATE.SEEK:    this._seekFlower();             break;
      case STATE.COLLECT: this._collectSap();             break;
      case STATE.RETURN:  this._returnToHive(resources);  break;
    }
  }

  _seekFlower() {
    const flowers = World.getByTag('flower');
    let nearest = null, nearestDist = Infinity;
    for (const f of flowers) {
      if (!f.active || f.sapRemaining <= 0 || f.claimedBy || f.lifecycle === 'young') continue;
      const d = dist(this.x, this.y, f.x, f.y);
      if (d < nearestDist) { nearest = f; nearestDist = d; }
    }
    if (!nearest) { this.ax = 0; this.ay = 0; return; }
    nearest.claimedBy = this;
    this._target = nearest;
    this._state = STATE.COLLECT;
    this._moveToward(this._target.x, this._target.y);
  }

  _collectSap() {
    if (!this._target || !this._target.active || this._target.sapRemaining <= 0) {
      if (this._target) this._target.claimedBy = null;
      this._target = null;
      this._state = STATE.SEEK;
      return;
    }
    const d = dist(this.x, this.y, this._target.x, this._target.y);
    if (d > 24) {
      this._moveToward(this._target.x, this._target.y);
      return;
    }
    const space = WORKER.SAP_CAPACITY - this._sap;
    if (space > 0) this._sap += this._target.collectSap(space);
    this._target.claimedBy = null;
    this._target = null;
    this._state = STATE.RETURN;
    const hive = World.getByTag('hive')[0];
    if (hive) this._moveToward(hive.x, hive.y);
  }

  _returnToHive(resources) {
    const hive = World.getByTag('hive')[0];
    if (!hive) return;
    const d = dist(this.x, this.y, hive.x, hive.y);
    if (d > 32) {
      this._moveToward(hive.x, hive.y);
      return;
    }
    resources?.addPendingSap(this._sap);
    this._sap = 0;
    this._state = STATE.SEEK;
  }

  _moveToward(tx, ty) {
    const speed = WORKER.SPEED;
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

  takeDamage(amount) {
    if (!this.alive) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.setTint(0xff4444);
    World.after(150, () => { if (this.active) this.setTint(0x88ff44); });
    if (this.hp <= 0) {
      this.alive = false;
      if (this._target) { this._target.claimedBy = null; this._target = null; }
      this.setVisible(false).setActive(false);
      return true;
    }
    return false;
  }
}
