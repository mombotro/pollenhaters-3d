import Entity from '../engine/Entity.js';
import World from '../engine/World.js';
import { dist } from '../utils/math.js';
import { TOWER } from '../constants.js';
import Stinger from '../entities/Stinger.js';

export default class StingerTurret extends Entity {
  constructor(x, y) {
    super(x, y, 'stinger-turret');
    this.drag = 1;
    this.maxSpeed = 0;
    this.towerType = 'stinger';
    this._lastFired = 0;
    World.add(this, 'tower');
  }

  update(time) {
    if (time - this._lastFired < TOWER.STINGER_TURRET_RATE) return;
    const wasps = World.getByTag('wasp');
    let nearest = null, nearestDist = TOWER.STINGER_TURRET_RANGE;
    for (const w of wasps) {
      if (!w.active) continue;
      const d = dist(this.x, this.y, w.x, w.y);
      if (d < nearestDist) { nearest = w; nearestDist = d; }
    }
    if (!nearest) return;
    new Stinger(this.x, this.y, TOWER.STINGER_TURRET_DAMAGE, TOWER.STINGER_TURRET_RANGE, null, nearest.x, nearest.y);
    this._lastFired = time;
  }
}
