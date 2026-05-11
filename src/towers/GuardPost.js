import Entity from '../engine/Entity.js';
import World from '../engine/World.js';
import { TOWER } from '../constants.js';
import GuardBee from '../entities/GuardBee.js';

export default class GuardPost extends Entity {
  constructor(x, y) {
    super(x, y, 'misc');
    this.spriteScale = 0.1;
    this.spriteFrame = 0;
    this.drag = 1;
    this.maxSpeed = 0;
    this.towerType = 'guard';
    this.hp = TOWER.GUARD_POST_HP;
    this.maxHp = TOWER.GUARD_POST_HP;
    this._guard = new GuardBee(x, y, this);
    World.add(this, 'tower', 'guard-post');
  }

  get guard() { return this._guard; }

  takeDamage(amount) {
    if (!this.active) return;
    this.hp = Math.max(0, this.hp - amount);
    this.setTint(0xff4444);
    World.after(150, () => {
      if (this.hp > 0) this.clearTint();
      else this.clearTint();
    });
    if (this.hp <= 0) {
      this._guard.alive = false;
      this._guard.visible = false;
      this._guard.active = false;
      this.alpha = 0.45;
      this.active = false;
    }
  }
}
