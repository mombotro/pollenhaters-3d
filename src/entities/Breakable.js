import Entity from '../engine/Entity.js';
import World from '../engine/World.js';
import { BREAKABLE } from '../constants.js';
import SoundSynth from '../systems/SoundSynth.js';
import Pickup from './Pickup.js';

export default class Breakable extends Entity {
  constructor(x, y) {
    super(x, y, 'breakable');
    this.spriteScale = 0.8;
    this.drag = 1;
    this.maxSpeed = 0;
    this.hp = BREAKABLE.HP;
    World.add(this, 'breakable');
  }

  takeDamage(amount) {
    if (!this.active) return false;
    this.hp -= amount;
    World.getSystem('fx')?.burst(this.x, this.y, 0x6b3a1f, this.hp <= 0 ? 8 : 4);
    this.setTint(0xffffff);
    World.after(80, () => { if (this.active) this.clearTint(); });
    if (this.hp <= 0) { this._break(); return true; }
    return false;
  }

  _break() {
    SoundSynth.play('break');
    const type = Math.random() < 0.5 ? 'health' : 'xp';
    new Pickup(this.x, this.y, type);
    World.after(400, () => this.destroy());
    this.active = false;
  }
}
