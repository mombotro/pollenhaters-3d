import Entity from '../engine/Entity.js';
import World from '../engine/World.js';
import { WASP_HIVE } from '../constants.js';

export default class WaspHive extends Entity {
  constructor(x, y) {
    super(x, y, 'hive');
    this.spriteScale = 1.2;
    this.tint = 0xff6600;
    this.drag = 1;
    this.maxSpeed = 0;
    this.hp = WASP_HIVE.HP;
    this.maxHp = WASP_HIVE.HP;
    World.add(this, 'waspHive');
  }

  takeDamage(amount) {
    if (this.hp <= 0) return true;
    this.hp = Math.max(0, this.hp - amount);
    this.setTint(0xff4444);
    World.after(150, () => { if (this.active) this.setTint(0xff6600); });
    if (this.onDamaged) this.onDamaged();
    return this.hp <= 0;
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }
}
