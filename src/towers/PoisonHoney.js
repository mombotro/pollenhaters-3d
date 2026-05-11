import Entity from '../engine/Entity.js';
import World from '../engine/World.js';
import { TOWER } from '../constants.js';

export default class PoisonHoney extends Entity {
  constructor(x, y) {
    super(x, y, 'misc');
    this.spriteScale = 0.08;
    this.drag = 1;
    this.maxSpeed = 0;
    this.towerType = 'poison-honey';
    this._uses = TOWER.POISON_HONEY_USES;
    World.add(this, 'tower');
  }

  consume() {
    this._uses--;
    this.alpha = 0.3 + 0.7 * (this._uses / TOWER.POISON_HONEY_USES);
    if (this._uses <= 0) this._deplete();
  }

  _deplete() {
    this.active = false;
    World.after(400, () => this.destroy());
  }
}
