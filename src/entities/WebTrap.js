import World from '../engine/World.js';
import { WEB } from '../constants.js';

// WebTrap is not an Entity (no physics, no sprite) — it's a line segment that slows entities.
export default class WebTrap {
  constructor(f1, f2) {
    this.x1 = f1.x; this.y1 = f1.y;
    this.x2 = f2.x; this.y2 = f2.y;
    this._f1 = f1; this._f2 = f2;
    this.active = true;
    this._contactStart = null;
    // Register so World can find it for updates
    World.add(this, 'web');
  }

  // entities: array with {active, x, y, vx, vy}
  // Returns true if the web broke.
  update(time, entities) {
    if (!this.active) return true;
    if (!this._f1.active || !this._f2.active) { this._destroy(); return true; }

    let anyContact = false;
    const l2 = (this.x2 - this.x1) ** 2 + (this.y2 - this.y1) ** 2;

    for (const entity of entities) {
      if (!entity.active) continue;
      let t = 0;
      if (l2 > 0) {
        t = ((entity.x - this.x1) * (this.x2 - this.x1) + (entity.y - this.y1) * (this.y2 - this.y1)) / l2;
        t = Math.max(0, Math.min(1, t));
      }
      const projX = this.x1 + t * (this.x2 - this.x1);
      const projY = this.y1 + t * (this.y2 - this.y1);
      const d = Math.hypot(entity.x - projX, entity.y - projY);

      if (d <= WEB.RADIUS) {
        anyContact = true;
        const ease = this._contactStart ? Math.min(1, (time - this._contactStart) / WEB.BREAK_TIME) : 0;
        const slowFactor = 0.2 + 0.8 * ease;
        entity.vx *= slowFactor;
        entity.vy *= slowFactor;
      }
    }

    if (anyContact) {
      if (this._contactStart === null) this._contactStart = time;
      else if (time - this._contactStart >= WEB.BREAK_TIME) { this._destroy(); return true; }
    } else {
      this._contactStart = null;
    }
    return false;
  }

  _destroy() {
    this.active = false;
    World.remove(this);
  }
}
