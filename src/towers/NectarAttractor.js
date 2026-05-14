import Entity from '../engine/Entity.js';
import World from '../engine/World.js';
import { NECTAR_ATTRACTOR } from '../constants.js';

export default class NectarAttractor extends Entity {
  constructor(x, y) {
    super(x, y, 'butterfly-fountain');
    this.spriteScale = 0.7;
    this.spriteFrame = 0;
    this.drag = 1;
    this.maxSpeed = 0;
    this.towerType = 'nectar-attractor';
    this.nectar = NECTAR_ATTRACTOR.NECTAR;
    this.maxNectar = NECTAR_ATTRACTOR.NECTAR;
    this._lastStealAt = 0;
    this.claimedBy = null;
    World.add(this, 'tower', 'nectar-attractor');
  }

  get hasNectar() { return this.nectar > 0; }

  stealNectar(amount, time) {
    if (!this.hasNectar || time - this._lastStealAt < NECTAR_ATTRACTOR.STEAL_COOLDOWN) return 0;
    this._lastStealAt = time;
    const stolen = Math.min(this.nectar, amount);
    this.nectar -= stolen;
    this.alpha = 0.35 + 0.65 * (this.nectar / this.maxNectar);
    if (this.nectar <= 0) {
      this.spriteFrame = 1;
      World.after(500, () => { if (this.active) this.destroy(); });
    }
    return stolen;
  }
}
