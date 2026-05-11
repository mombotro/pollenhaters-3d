import World from './World.js';

export default class Entity {
  constructor(x, y, spriteKey = null) {
    this.x = x;
    this.y = y;
    this.spriteKey = spriteKey;
    this.vx = 0;
    this.vy = 0;
    this.ax = 0;
    this.ay = 0;
    this.angle = 0;
    this.maxSpeed = 300;
    this.drag = 0.02;
    this.active = true;
    this.visible = true;
    this.tint = null;
    this.alpha = 1;
    this.spriteScale = 1;
  }

  setPosition(x, y) { this.x = x; this.y = y; return this; }
  setVisible(v) { this.visible = v; return this; }
  setActive(v) { this.active = v; return this; }
  setTint(c) { this.tint = c; return this; }
  clearTint() { this.tint = null; return this; }
  setAlpha(a) { this.alpha = a; return this; }

  destroy() {
    this.active = false;
    this.visible = false;
    World.remove(this);
  }
}
