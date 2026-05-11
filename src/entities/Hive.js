import Entity from '../engine/Entity.js';
import World from '../engine/World.js';
import { HIVE } from '../constants.js';

export default class Hive extends Entity {
  constructor(x, y) {
    super(x, y, 'hive');
    this.spriteScale = 1.5;
    this.drag = 1;
    this.maxSpeed = 0;
    this.hp = HIVE.HP;
    this.maxHp = HIVE.HP;
    World.add(this, 'hive');
  }

  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
    this.setTint(0xff4444);
    World.after(150, () => { if (this.active) this.clearTint(); });
    return this.hp <= 0;
  }
}
