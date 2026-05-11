import Entity from '../engine/Entity.js';
import World from '../engine/World.js';
import { dist } from '../utils/math.js';
import { TOWER } from '../constants.js';

export default class ResinTrap extends Entity {
  constructor(x, y) {
    super(x, y, 'misc');
    this.spriteScale = 0.1;
    this.spriteFrame = 8;
    this.drag = 1;
    this.maxSpeed = 0;
    this.towerType = 'resin';
    this._uses = TOWER.RESIN_TRAP_USES;
    this._inRadius = new Set();
    World.add(this, 'tower');
  }

  update(time) {
    if (!this.active) return;
    const currentInRadius = new Set();
    const wasps = World.getByTag('wasp');
    for (const wasp of wasps) {
      if (!wasp.active) continue;
      const d = dist(this.x, this.y, wasp.x, wasp.y);
      if (d <= TOWER.RESIN_TRAP_RADIUS) {
        currentInRadius.add(wasp);
        wasp.slowedUntil = time + TOWER.RESIN_TRAP_DURATION;
        if (!this._inRadius.has(wasp)) {
          this._uses--;
          this._updateVisual();
          if (this._uses <= 0) { this._break(); return; }
        }
      }
    }
    this._inRadius = currentInRadius;
  }

  _updateVisual() {
    this.alpha = 0.4 + 0.6 * (this._uses / TOWER.RESIN_TRAP_USES);
  }

  _break() {
    this._inRadius.clear();
    this.active = false;
    World.after(400, () => this.destroy());
  }
}
