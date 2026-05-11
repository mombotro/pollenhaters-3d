import Entity from '../engine/Entity.js';
import World from '../engine/World.js';
import { dist } from '../utils/math.js';
import { SPIDER } from '../constants.js';

export default class Spider extends Entity {
  constructor(x, y) {
    super(x, y, 'spider');
    this.spriteScale = 0.5;
    this.drag = 0.015;
    this.maxSpeed = SPIDER.SPEED;
    this._target = null;
    this._lastTarget = null;
    this._dwelling = false;
    this._dwellStart = 0;
    World.add(this, 'spider');
  }

  update(time, dt, anchors, onPlaceWeb) {
    if (!this._target || !this._target.active) this._findTarget(anchors);
    if (!this._target) { this.ax = 0; this.ay = 0; return; }

    const d = dist(this.x, this.y, this._target.x, this._target.y);
    if (!this._dwelling && d > 40) {
      this._moveToward(this._target.x, this._target.y);
    } else {
      this.ax = 0; this.ay = 0; this.vx = 0; this.vy = 0;
      if (!this._dwelling) {
        this._dwelling = true;
        this._dwellStart = time;
      } else if (time - this._dwellStart >= SPIDER.WEB_PLACE_TIME) {
        let f2 = null, f2Dist = Infinity;
        for (const a of anchors) {
          if (a === this._target || !a.active) continue;
          const dd = dist(this._target.x, this._target.y, a.x, a.y);
          if (dd < 400 && dd < f2Dist) { f2 = a; f2Dist = dd; }
        }
        if (f2) onPlaceWeb(this._target, f2);
        this._dwelling = false;
        this._lastTarget = this._target;
        this._target = null;
      }
    }
  }

  _findTarget(anchors) {
    const active = anchors.filter(a => a.active && a !== this._lastTarget);
    this._target = active.length ? active[Math.floor(Math.random() * active.length)] : null;
  }

  _moveToward(tx, ty) {
    const speed = SPIDER.SPEED;
    this.maxSpeed = speed;
    const d = dist(this.x, this.y, tx, ty);
    if (d > 5) {
      this.ax = ((tx - this.x) / d) * speed * 10;
      this.ay = ((ty - this.y) / d) * speed * 10;
    } else {
      this.ax = 0; this.ay = 0;
    }
  }
}
