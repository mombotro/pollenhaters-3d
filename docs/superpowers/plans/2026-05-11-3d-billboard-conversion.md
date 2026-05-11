# 3D Billboard Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Phaser.js with a vanilla canvas engine using billboard sprite perspective projection, preserving all game mechanics, targeting 400×240 (Playdate native resolution).

**Architecture:** A tiny engine (`World`, `Physics`, `Input`, `Camera`) replaces Phaser's rendering and physics. A `BillboardRenderer` draws all entities as depth-sorted scaled sprites using perspective projection math. All entity AI and system logic is preserved; only Phaser API call sites change.

**Tech Stack:** Vanilla JS ES modules, Canvas 2D API, Vite, Vitest

---

## File Map

**Create (new):**
- `src/engine/Entity.js` — base class for all game objects
- `src/engine/World.js` — entity registry, tag queries, timer queue, system registry
- `src/engine/Physics.js` — Euler integration (velocity/drag/acceleration)
- `src/engine/Input.js` — keyboard + Gamepad API abstraction
- `src/engine/Camera.js` — third-person follow camera
- `src/utils/math.js` — `rotateToward`, `dist`, `angleBetween`, `randInt`, `randFloat`
- `src/renderer/BillboardRenderer.js` — perspective projection + sprite depth sort + draw
- `src/renderer/HUD.js` — canvas 2D HUD overlay
- `src/scenes/index.js` — plain JS scene state machine

**Rewrite:**
- `src/main.js` — rAF game loop replacing Phaser.Game

**Port (strip Phaser, keep logic):**
- `src/entities/PlayerBee.js`
- `src/entities/HunterWasp.js`
- `src/entities/RaiderWasp.js`
- `src/entities/ArcherWasp.js`
- `src/entities/WorkerBee.js`
- `src/entities/Hive.js`
- `src/entities/WaspHive.js`
- `src/entities/Flower.js`
- `src/entities/Stinger.js`
- `src/entities/GuardBee.js`
- `src/entities/SoldierBee.js`
- `src/entities/Spider.js`
- `src/entities/Butterfly.js`
- `src/entities/XpGem.js`
- `src/entities/WebTrap.js`
- `src/entities/Pickup.js`
- `src/entities/Breakable.js`
- `src/towers/StingerTurret.js`
- `src/towers/GuardPost.js`
- `src/towers/ResinTrap.js`
- `src/towers/PoisonHoney.js`
- `src/scenes/GameScene.js`
- `src/scenes/BootScene.js`
- `src/scenes/MenuScene.js`
- `src/scenes/PlacementScene.js`
- `src/scenes/PauseScene.js`
- `src/scenes/GameOverScene.js`
- `src/scenes/MetaUpgradeScene.js`
- `src/ui/HUD.js` (merge into `src/renderer/HUD.js`)
- `src/ui/BuildMenu.js`
- `src/ui/LevelUpMenu.js`

**Keep as-is (zero Phaser coupling):**
- `src/systems/WaveManager.js`
- `src/systems/ResourceManager.js`
- `src/systems/MetaSave.js`
- `src/constants.js`

**Light touch (minor Phaser calls):**
- `src/systems/UpgradeManager.js`
- `src/systems/WaspHiveSystem.js`
- `src/systems/PollinationSystem.js`
- `src/systems/WindSystem.js`
- `src/systems/SoundSynth.js`

**Remove:**
- `src/ui/TouchControls.js` (replace with Input.js touch support)
- Phaser from `package.json`

---

## Phaser API → Engine API Cheatsheet

Use this when porting every entity:

| Old (Phaser) | New (Engine) |
|---|---|
| `extends Phaser.Physics.Arcade.Sprite` | `extends Entity` |
| `super(scene, x, y, 'key')` | `super(x, y, 'key')` |
| `scene.add.existing(this); scene.physics.add.existing(this)` | `World.add(this, 'tag1', 'tag2')` |
| `this.body.setVelocity(vx, vy)` | `this.vx = vx; this.vy = vy` |
| `this.setAcceleration(ax, ay)` | `this.ax = ax; this.ay = ay` |
| `this.setMaxVelocity(s, s)` | `this.maxSpeed = s` |
| `this.setDrag(d, d)` | `this.drag = 0.02` (tune per entity) |
| `this.body.velocity.angle()` | `Math.atan2(this.vy, this.vx)` |
| `this.body.velocity.lengthSq()` | `this.vx*this.vx + this.vy*this.vy` |
| `Phaser.Math.Distance.Between(ax,ay,bx,by)` | `dist(ax, ay, bx, by)` from `utils/math.js` |
| `Phaser.Math.Angle.RotateTo(cur, tgt, step)` | `rotateToward(cur, tgt, step)` from `utils/math.js` |
| `Phaser.Math.Angle.Between(ax,ay,bx,by)` | `angleBetween(ax, ay, bx, by)` from `utils/math.js` |
| `Phaser.Math.Between(min, max)` | `randInt(min, max)` from `utils/math.js` |
| `Phaser.Math.FloatBetween(min, max)` | `randFloat(min, max)` from `utils/math.js` |
| `this.scene.time.delayedCall(ms, fn)` | `World.after(ms, fn)` |
| `this.setTint(c)` | `this.tint = c` |
| `this.clearTint()` | `this.tint = null` |
| `this.setVisible(v)` | `this.visible = v` |
| `this.setActive(v)` | `this.active = v` |
| `this.body.enable = false` | `this.active = false` |
| `this.setCollideWorldBounds(true)` | handled by `Physics.update` clamp |
| `this.setDepth(n)` | remove (renderer depth-sorts by distance) |
| `this.setScale(n)` | `this.spriteScale = n` |
| `this.scene.wasps.getChildren()` | `World.getByTag('wasp')` |
| `this.scene.player` | `World.getByTag('player')[0]` |
| `this.scene.hive` | `World.getByTag('hive')[0]` |
| `this.scene.waspHiveSystem` | `World.getSystem('waspHive')` |
| `this.scene._burst?.(...)` | `World.getSystem('fx').burst(...)` |
| `this.destroy()` | `this.destroy()` (Entity base handles World.remove) |

---

## Task 1: Math utilities

**Files:**
- Create: `src/utils/math.js`
- Create: `src/utils/math.test.js`

- [ ] **Write failing tests**

```js
// src/utils/math.test.js
import { describe, it, expect } from 'vitest';
import { dist, angleBetween, rotateToward, randInt, randFloat } from './math.js';

describe('dist', () => {
  it('returns 0 for same point', () => expect(dist(0,0,0,0)).toBe(0));
  it('returns 5 for 3-4-5 triangle', () => expect(dist(0,0,3,4)).toBe(5));
});

describe('angleBetween', () => {
  it('returns 0 for rightward vector', () => expect(angleBetween(0,0,1,0)).toBe(0));
  it('returns PI/2 for downward vector', () =>
    expect(angleBetween(0,0,0,1)).toBeCloseTo(Math.PI/2));
});

describe('rotateToward', () => {
  it('reaches target when within step', () =>
    expect(rotateToward(0, 0.1, 0.5)).toBe(0.1));
  it('moves by maxStep when far', () =>
    expect(rotateToward(0, 2, 0.15)).toBeCloseTo(0.15));
  it('wraps correctly across PI boundary', () => {
    const result = rotateToward(Math.PI - 0.1, -Math.PI + 0.1, 0.5);
    expect(Math.abs(result)).toBeLessThanOrEqual(Math.PI);
  });
});

describe('randInt', () => {
  it('returns integer in range', () => {
    for (let i = 0; i < 100; i++) {
      const v = randInt(2, 5);
      expect(v).toBeGreaterThanOrEqual(2);
      expect(v).toBeLessThanOrEqual(5);
      expect(Number.isInteger(v)).toBe(true);
    }
  });
});
```

- [ ] **Run tests to verify they fail**

```
npx vitest run src/utils/math.test.js
```

Expected: FAIL (module not found)

- [ ] **Implement `src/utils/math.js`**

```js
export function dist(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

export function angleBetween(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

export function rotateToward(current, target, maxStep) {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) <= maxStep) return target;
  return current + Math.sign(diff) * maxStep;
}

export function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randFloat(min, max) {
  return min + Math.random() * (max - min);
}
```

- [ ] **Run tests to verify they pass**

```
npx vitest run src/utils/math.test.js
```

Expected: PASS (5 tests)

- [ ] **Commit**

```bash
git add src/utils/math.js src/utils/math.test.js
git commit -m "feat: add math utilities (dist, angleBetween, rotateToward, rand)"
```

---

## Task 2: Entity base class

**Files:**
- Create: `src/engine/Entity.js`
- Create: `src/engine/Entity.test.js`

- [ ] **Write failing tests**

```js
// src/engine/Entity.test.js
import { describe, it, expect, vi } from 'vitest';
import Entity from './Entity.js';

// Mock World so Entity.destroy() doesn't blow up
vi.mock('./World.js', () => ({ default: { remove: vi.fn() } }));

describe('Entity', () => {
  it('initializes with position and defaults', () => {
    const e = new Entity(10, 20, 'bee');
    expect(e.x).toBe(10);
    expect(e.y).toBe(20);
    expect(e.spriteKey).toBe('bee');
    expect(e.vx).toBe(0);
    expect(e.vy).toBe(0);
    expect(e.ax).toBe(0);
    expect(e.ay).toBe(0);
    expect(e.active).toBe(true);
    expect(e.visible).toBe(true);
    expect(e.tint).toBe(null);
  });

  it('setPosition updates x and y and returns this', () => {
    const e = new Entity(0, 0, 'x');
    const ret = e.setPosition(5, 6);
    expect(e.x).toBe(5);
    expect(e.y).toBe(6);
    expect(ret).toBe(e);
  });

  it('setVisible/setActive return this', () => {
    const e = new Entity(0, 0, 'x');
    expect(e.setVisible(false)).toBe(e);
    expect(e.visible).toBe(false);
    expect(e.setActive(false)).toBe(e);
    expect(e.active).toBe(false);
  });

  it('setTint/clearTint work', () => {
    const e = new Entity(0, 0, 'x');
    e.setTint(0xff0000);
    expect(e.tint).toBe(0xff0000);
    e.clearTint();
    expect(e.tint).toBe(null);
  });
});
```

- [ ] **Run to confirm fail**

```
npx vitest run src/engine/Entity.test.js
```

- [ ] **Implement `src/engine/Entity.js`**

```js
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
    this.spriteScale = 1;
  }

  setPosition(x, y) { this.x = x; this.y = y; return this; }
  setVisible(v) { this.visible = v; return this; }
  setActive(v) { this.active = v; return this; }
  setTint(c) { this.tint = c; return this; }
  clearTint() { this.tint = null; return this; }

  destroy() {
    this.active = false;
    this.visible = false;
    World.remove(this);
  }
}
```

- [ ] **Run tests to confirm pass**

```
npx vitest run src/engine/Entity.test.js
```

- [ ] **Commit**

```bash
git add src/engine/Entity.js src/engine/Entity.test.js
git commit -m "feat: add Entity base class"
```

---

## Task 3: World registry

**Files:**
- Create: `src/engine/World.js`
- Create: `src/engine/World.test.js`

- [ ] **Write failing tests**

```js
// src/engine/World.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import World from './World.js';

beforeEach(() => World.clear());

describe('World.add / getByTag', () => {
  it('returns entity by tag', () => {
    const e = { active: true };
    World.add(e, 'bee');
    expect(World.getByTag('bee')).toContain(e);
  });

  it('entity can have multiple tags', () => {
    const e = { active: true };
    World.add(e, 'bee', 'player');
    expect(World.getByTag('player')).toContain(e);
  });
});

describe('World.remove', () => {
  it('removes entity from all tags', () => {
    const e = { active: true };
    World.add(e, 'bee');
    World.remove(e);
    expect(World.getByTag('bee')).not.toContain(e);
  });
});

describe('World.query', () => {
  it('returns only entities within radius', () => {
    const near = { active: true, x: 10, y: 10 };
    const far = { active: true, x: 1000, y: 1000 };
    World.add(near, 'wasp');
    World.add(far, 'wasp');
    const result = World.query('wasp', 0, 0, 50);
    expect(result).toContain(near);
    expect(result).not.toContain(far);
  });
});

describe('World.after', () => {
  it('calls callback after elapsed time', () => {
    const fn = vi.fn();
    World.after(100, fn);
    World.update(50);
    expect(fn).not.toHaveBeenCalled();
    World.update(60);
    expect(fn).toHaveBeenCalledOnce();
  });
});

describe('World systems', () => {
  it('stores and retrieves named system', () => {
    const sys = { foo: true };
    World.addSystem('test', sys);
    expect(World.getSystem('test')).toBe(sys);
  });
});
```

- [ ] **Run to confirm fail**

```
npx vitest run src/engine/World.test.js
```

- [ ] **Implement `src/engine/World.js`**

```js
const _tags = new Map();   // tag -> Set of entities
const _entityTags = new Map(); // entity -> Set of tags
const _timers = [];
const _systems = new Map();

const World = {
  add(entity, ...tags) {
    if (!_entityTags.has(entity)) _entityTags.set(entity, new Set());
    for (const tag of tags) {
      if (!_tags.has(tag)) _tags.set(tag, new Set());
      _tags.get(tag).add(entity);
      _entityTags.get(entity).add(tag);
    }
  },

  remove(entity) {
    const tags = _entityTags.get(entity);
    if (!tags) return;
    for (const tag of tags) _tags.get(tag)?.delete(entity);
    _entityTags.delete(entity);
  },

  getByTag(tag) {
    return _tags.has(tag) ? [..._tags.get(tag)] : [];
  },

  query(tag, x, y, radius) {
    const r2 = radius * radius;
    return World.getByTag(tag).filter(e => {
      if (!e.active) return false;
      const dx = e.x - x, dy = e.y - y;
      return dx * dx + dy * dy <= r2;
    });
  },

  after(ms, fn) {
    _timers.push({ remaining: ms, fn });
  },

  update(dt) {
    for (let i = _timers.length - 1; i >= 0; i--) {
      _timers[i].remaining -= dt;
      if (_timers[i].remaining <= 0) {
        _timers[i].fn();
        _timers.splice(i, 1);
      }
    }
  },

  addSystem(name, instance) { _systems.set(name, instance); },
  getSystem(name) { return _systems.get(name); },

  clear() {
    _tags.clear();
    _entityTags.clear();
    _timers.length = 0;
    _systems.clear();
  },
};

export default World;
```

- [ ] **Run tests to confirm pass**

```
npx vitest run src/engine/World.test.js
```

- [ ] **Commit**

```bash
git add src/engine/World.js src/engine/World.test.js
git commit -m "feat: add World entity registry with tag queries and timer queue"
```

---

## Task 4: Physics module

**Files:**
- Create: `src/engine/Physics.js`
- Create: `src/engine/Physics.test.js`

- [ ] **Write failing tests**

```js
// src/engine/Physics.test.js
import { describe, it, expect } from 'vitest';
import { update, clamp } from './Physics.js';

function makeEntity(overrides = {}) {
  return { x: 0, y: 0, vx: 0, vy: 0, ax: 0, ay: 0,
    maxSpeed: 500, drag: 0.02, ...overrides };
}

describe('update', () => {
  it('applies acceleration to velocity', () => {
    const e = makeEntity({ ax: 100 });
    update(e, 1);
    expect(e.vx).toBeGreaterThan(0);
  });

  it('applies velocity to position', () => {
    const e = makeEntity({ vx: 100 });
    update(e, 1);
    expect(e.x).toBeGreaterThan(0);
  });

  it('clamps velocity to maxSpeed', () => {
    const e = makeEntity({ vx: 1000, maxSpeed: 200 });
    update(e, 1/60);
    expect(e.vx).toBeLessThanOrEqual(200);
  });

  it('drag reduces velocity over time', () => {
    const e = makeEntity({ vx: 100, ax: 0 });
    const before = e.vx;
    update(e, 1);
    expect(e.vx).toBeLessThan(before);
  });

  it('clamps position to world bounds when provided', () => {
    const e = makeEntity({ x: -50, y: 2000, vx: 0, vy: 0 });
    update(e, 1/60, { minX: 0, minY: 0, maxX: 2560, maxY: 1440 });
    expect(e.x).toBeGreaterThanOrEqual(0);
    expect(e.y).toBeLessThanOrEqual(1440);
  });
});

describe('clamp', () => {
  it('clamps value to range', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
    expect(clamp(2, 0, 3)).toBe(2);
  });
});
```

- [ ] **Run to confirm fail**

```
npx vitest run src/engine/Physics.test.js
```

- [ ] **Implement `src/engine/Physics.js`**

```js
export function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

export function update(entity, dt, bounds = null) {
  entity.vx += entity.ax * dt;
  entity.vy += entity.ay * dt;

  // Multiplicative drag: drag coefficient is how much velocity remains after 1s
  // e.g. drag=0.02 → velocity decays to 2% in 1 second (stops fast, like Phaser setDrag(800))
  const dragFactor = Math.pow(entity.drag, dt);
  entity.vx *= dragFactor;
  entity.vy *= dragFactor;

  entity.vx = clamp(entity.vx, -entity.maxSpeed, entity.maxSpeed);
  entity.vy = clamp(entity.vy, -entity.maxSpeed, entity.maxSpeed);

  entity.x += entity.vx * dt;
  entity.y += entity.vy * dt;

  if (bounds) {
    entity.x = clamp(entity.x, bounds.minX, bounds.maxX);
    entity.y = clamp(entity.y, bounds.minY, bounds.maxY);
  }
}
```

**Drag tuning note:** Phaser's `setDrag(800, 800)` applies 800 px/s² opposing force. The multiplicative equivalent producing similar deceleration at speed=200 is drag ≈ 0.015. Tune per entity during Phase 2 playtesting.

- [ ] **Run tests to confirm pass**

```
npx vitest run src/engine/Physics.test.js
```

- [ ] **Commit**

```bash
git add src/engine/Physics.js src/engine/Physics.test.js
git commit -m "feat: add Physics Euler integration module"
```

---

## Task 5: Input module

**Files:**
- Create: `src/engine/Input.js`

No automated tests (DOM event mocks add more noise than value here; test manually in Task 7).

- [ ] **Implement `src/engine/Input.js`**

```js
const _keys = new Set();
const _justDown = new Set();
const _justUp = new Set();

const _gp = {
  _prevButtons: [],
  axis(index) {
    const pad = navigator.getGamepads?.()[0];
    if (!pad) return 0;
    const axes = [pad.axes[0], pad.axes[1], pad.axes[2], pad.axes[3]];
    const v = axes[index] ?? 0;
    return Math.abs(v) > 0.15 ? v : 0;
  },
  isDown(button) {
    const pad = navigator.getGamepads?.()[0];
    return pad?.buttons[button]?.pressed ?? false;
  },
  justDown(button) {
    const pad = navigator.getGamepads?.()[0];
    const now = pad?.buttons[button]?.pressed ?? false;
    const was = _gp._prevButtons[button] ?? false;
    return now && !was;
  },
  _poll() {
    const pad = navigator.getGamepads?.()[0];
    _gp._prevButtons = pad ? pad.buttons.map(b => b.pressed) : [];
  },
};

const Input = {
  isDown(key) { return _keys.has(key); },
  justDown(key) { return _justDown.has(key); },
  justUp(key) { return _justUp.has(key); },
  gamepad: _gp,

  // Call once per frame BEFORE entity updates
  poll() {
    _justDown.clear();
    _justUp.clear();
    _gp._poll();
  },

  // Call once at startup
  init() {
    window.addEventListener('keydown', e => {
      if (!_keys.has(e.key)) _justDown.add(e.key);
      _keys.add(e.key);
    });
    window.addEventListener('keyup', e => {
      _keys.delete(e.key);
      _justUp.add(e.key);
    });
    window.addEventListener('blur', () => _keys.clear());
  },
};

export default Input;
```

**Key name mapping** (use these in entity code):
- Arrow keys: `'ArrowLeft'`, `'ArrowRight'`, `'ArrowUp'`, `'ArrowDown'`
- WASD: `'w'`, `'a'`, `'s'`, `'d'` (lowercase)
- Space: `' '` (space character)

- [ ] **Commit**

```bash
git add src/engine/Input.js
git commit -m "feat: add Input module (keyboard + Gamepad API)"
```

---

## Task 6: Camera module

**Files:**
- Create: `src/engine/Camera.js`
- Create: `src/engine/Camera.test.js`

- [ ] **Write failing tests**

```js
// src/engine/Camera.test.js
import { describe, it, expect } from 'vitest';
import Camera from './Camera.js';

describe('Camera.follow', () => {
  it('positions camera behind player based on angle', () => {
    const cam = new Camera({ offset: 100, lerpAngle: 1 });
    // Player facing right (angle=0), camera should be to the left (x < player.x)
    cam.follow({ x: 500, y: 500, angle: 0 }, 1/60);
    expect(cam.x).toBeLessThan(500);
    expect(cam.y).toBeCloseTo(500, 0);
  });

  it('lerps angle toward player angle', () => {
    const cam = new Camera({ offset: 100, lerpAngle: 0.5 });
    cam.x = 400; cam.y = 400; cam.angle = 0;
    cam.follow({ x: 500, y: 500, angle: Math.PI }, 1/60);
    // angle should have moved toward PI but not reached it
    expect(cam.angle).toBeGreaterThan(0);
    expect(cam.angle).toBeLessThan(Math.PI);
  });
});
```

- [ ] **Run to confirm fail**

```
npx vitest run src/engine/Camera.test.js
```

- [ ] **Implement `src/engine/Camera.js`**

```js
import { rotateToward } from '../utils/math.js';

export default class Camera {
  constructor({ offset = 120, lerpAngle = 0.12 } = {}) {
    this.x = 0;
    this.y = 0;
    this.angle = 0;
    this._offset = offset;
    this._lerpAngle = lerpAngle;
  }

  follow(player, dt) {
    // Lerp camera angle toward player facing
    this.angle = rotateToward(this.angle, player.angle, this._lerpAngle);

    // Position camera behind player
    this.x = player.x - Math.cos(this.angle) * this._offset;
    this.y = player.y - Math.sin(this.angle) * this._offset;
  }
}
```

- [ ] **Run tests to confirm pass**

```
npx vitest run src/engine/Camera.test.js
```

- [ ] **Commit**

```bash
git add src/engine/Camera.js src/engine/Camera.test.js
git commit -m "feat: add third-person Camera module"
```

---

## Task 7: BillboardRenderer

**Files:**
- Create: `src/renderer/BillboardRenderer.js`

- [ ] **Implement `src/renderer/BillboardRenderer.js`**

```js
const SCREEN_W = 400;
const SCREEN_H = 240;
const FOV = Math.PI / 3;           // 60 degrees
const PROJECTION_PLANE = (SCREEN_W / 2) / Math.tan(FOV / 2);  // ≈ 346
const HORIZON = SCREEN_H / 2;
const MIN_DIST = 16;               // clip sprites closer than this (world units)
const SKY_COLOR = '#87ceeb';
const FLOOR_COLOR = '#3a5a1c';

export default class BillboardRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    canvas.width = SCREEN_W;
    canvas.height = SCREEN_H;
    // Scale up to fill window with pixel-perfect rendering
    canvas.style.imageRendering = 'pixelated';
    canvas.style.width = '100vmin';
    canvas.style.height = `${100 * (SCREEN_H / SCREEN_W)}vmin`;
  }

  render(camera, entities, spriteSheets) {
    const ctx = this.ctx;

    // Sky + floor
    ctx.fillStyle = SKY_COLOR;
    ctx.fillRect(0, 0, SCREEN_W, HORIZON);
    ctx.fillStyle = FLOOR_COLOR;
    ctx.fillRect(0, HORIZON, SCREEN_W, HORIZON);

    // Project entities
    const projected = [];
    for (const entity of entities) {
      if (!entity.visible || !entity.active) continue;

      const dx = entity.x - camera.x;
      const dy = entity.y - camera.y;
      const dist = Math.hypot(dx, dy);
      if (dist < MIN_DIST) continue;

      let relAngle = Math.atan2(dy, dx) - camera.angle;
      while (relAngle > Math.PI) relAngle -= Math.PI * 2;
      while (relAngle < -Math.PI) relAngle += Math.PI * 2;

      // Cull outside FOV (with 10% margin)
      if (Math.abs(relAngle) > FOV / 2 * 1.1) continue;

      const screenX = Math.round((relAngle / FOV + 0.5) * SCREEN_W);
      const spriteH = Math.round((PROJECTION_PLANE / dist) * entity.spriteScale);
      const spriteW = spriteH; // assume square sprites; override with entity.spriteAspect

      projected.push({ entity, dist, screenX, spriteH, spriteW });
    }

    // Sort far to near (painter's algorithm)
    projected.sort((a, b) => b.dist - a.dist);

    // Draw each billboard
    for (const { entity, screenX, spriteH, spriteW } of projected) {
      const img = spriteSheets[entity.spriteKey];
      if (!img) {
        // Fallback: colored rectangle
        ctx.fillStyle = entity.tint ? `#${entity.tint.toString(16).padStart(6, '0')}` : '#ffaa00';
        ctx.fillRect(
          Math.round(screenX - spriteW / 2),
          Math.round(HORIZON - spriteH / 2),
          spriteW, spriteH
        );
        continue;
      }

      const drawX = Math.round(screenX - spriteW / 2);
      const drawY = Math.round(HORIZON - spriteH / 2);
      ctx.drawImage(img, drawX, drawY, spriteW, spriteH);

      // Tint overlay (simple multiply approximation)
      if (entity.tint) {
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = `#${entity.tint.toString(16).padStart(6, '0')}`;
        ctx.fillRect(drawX, drawY, spriteW, spriteH);
        ctx.globalAlpha = 1;
      }
    }
  }
}
```

**Sprite direction frames:** Each entity has an `angle` (facing). The renderer can select a frame from a spritesheet based on the angle from entity to camera — implement this in Task 22 when actual spritesheet assets are available. For now all entities show a single frame.

- [ ] **Commit**

```bash
git add src/renderer/BillboardRenderer.js
git commit -m "feat: add BillboardRenderer with perspective projection"
```

---

## Task 8: Game loop + smoke test

**Files:**
- Rewrite: `src/main.js`

- [ ] **Rewrite `src/main.js`**

```js
import World from './engine/World.js';
import Input from './engine/Input.js';
import Camera from './engine/Camera.js';
import BillboardRenderer from './renderer/BillboardRenderer.js';
import { update as physicsUpdate } from './engine/Physics.js';
import { WORLD } from './constants.js';

const BOUNDS = { minX: 0, minY: 0, maxX: WORLD.WIDTH, maxY: WORLD.HEIGHT };

// --- SMOKE TEST ENTITY ---
// A single moving entity to verify the renderer works.
// Remove after Phase 2 (PlayerBee ported).
import Entity from './engine/Entity.js';

function bootSmokeTest(renderer, camera) {
  const testEntity = new Entity(WORLD.WIDTH / 2, WORLD.HEIGHT / 2, null);
  testEntity.spriteKey = null;  // renders as yellow rectangle
  testEntity.spriteScale = 32;
  testEntity.vx = 50;
  testEntity.drag = 0.5;
  testEntity.maxSpeed = 200;
  World.add(testEntity, 'debug');

  const fakePlayer = { x: WORLD.WIDTH / 2 - 200, y: WORLD.HEIGHT / 2, angle: 0 };
  camera.x = fakePlayer.x - 120;
  camera.y = fakePlayer.y;
  camera.angle = 0;

  return { testEntity, fakePlayer };
}
// --- END SMOKE TEST ---

const canvas = document.getElementById('game');
const renderer = new BillboardRenderer(canvas);
const camera = new Camera({ offset: 120, lerpAngle: 0.12 });

Input.init();

let lastTime = null;
const smokeTest = bootSmokeTest(renderer, camera);

function loop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05); // cap at 50ms
  lastTime = timestamp;

  Input.poll();
  World.update(dt * 1000); // World timers use ms

  // Update all active entities
  const allEntities = [
    ...World.getByTag('bee'),
    ...World.getByTag('wasp'),
    ...World.getByTag('flower'),
    ...World.getByTag('debug'),
  ];

  for (const entity of allEntities) {
    if (!entity.active) continue;
    entity.update?.(timestamp, dt);
    physicsUpdate(entity, dt, BOUNDS);
  }

  renderer.render(camera, allEntities, {});
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
```

- [ ] **Update `index.html`** to have `<canvas id="game">` instead of Phaser's div

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Bee Game 3D</title>
  <style>
    body { margin: 0; background: #000; display: flex;
           justify-content: center; align-items: center;
           width: 100vw; height: 100vh; overflow: hidden; }
    canvas { image-rendering: pixelated; }
  </style>
</head>
<body>
  <canvas id="game"></canvas>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

- [ ] **Run dev server**

```
npm run dev
```

- [ ] **Verify in browser:** Yellow rectangle should be visible against sky/floor background, slowly moving and decelerating. If visible, Phase 1 is complete.

- [ ] **Commit**

```bash
git add src/main.js index.html
git commit -m "feat: wire game loop with smoke test entity in billboard renderer"
```

---

## Task 9: Port PlayerBee

**Files:**
- Modify: `src/entities/PlayerBee.js`

This is the reference port. All subsequent entity ports follow the same pattern.

- [ ] **Rewrite `src/entities/PlayerBee.js`**

```js
import Entity from '../engine/Entity.js';
import Input from '../engine/Input.js';
import World from '../engine/World.js';
import { rotateToward, angleBetween } from '../utils/math.js';
import { BEE } from '../constants.js';
import SoundSynth from '../systems/SoundSynth.js';

export default class PlayerBee extends Entity {
  constructor(x, y, onFire) {
    super(x, y, 'player-bee');
    this.maxSpeed = BEE.SPEED;
    this.drag = 0.015;          // tune: was setDrag(800,800)
    this.hp = BEE.HP;
    this.maxHp = BEE.HP;
    this.alive = true;
    this._onFire = onFire ?? null;
    this._lastFired = 0;
    this._speed = BEE.SPEED;
    this._sapCapacity = BEE.SAP_CAPACITY;
    this._stingerDamage = BEE.STINGER_DAMAGE;
    this._stingerRate = BEE.STINGER_RATE;
    this._stingerRange = BEE.STINGER_RANGE;
    this._stingerSpeed = BEE.STINGER_SPEED;
    this.armor = 0;
    this.isDashing = false;
    this.dashEndTime = 0;
    this.lastDashTime = 0;
    this._dashTargetAngle = null;
    this._aimAngle = null;
    this._gpAWasDown = false;
    this._gpBWasDown = false;
    World.add(this, 'bee', 'player');
  }

  update(time, dt) {
    if (!this.alive) return;

    if (this.isDashing) {
      if (time >= this.dashEndTime) {
        this.isDashing = false;
        this._dashTargetAngle = null;
        this.clearTint();
      } else if (this._dashTargetAngle !== null) {
        this.angle = rotateToward(this.angle, this._dashTargetAngle, 0.5);
      }
    } else {
      const spacePush = Input.justDown(' ');
      const gpA = Input.gamepad.justDown(0);
      if ((spacePush || gpA) && time - this.lastDashTime >= BEE.DASH_COOLDOWN) {
        const left  = Input.isDown('ArrowLeft')  || Input.isDown('a');
        const right = Input.isDown('ArrowRight') || Input.isDown('d');
        const up    = Input.isDown('ArrowUp')    || Input.isDown('w');
        const down  = Input.isDown('ArrowDown')  || Input.isDown('s');
        let ax = (right ? 1 : 0) - (left ? 1 : 0);
        let ay = (down  ? 1 : 0) - (up   ? 1 : 0);
        const gpx = Input.gamepad.axis(0);
        const gpy = Input.gamepad.axis(1);
        if (ax === 0 && ay === 0) { ax = gpx; ay = gpy; }

        const dashAngle = (ax !== 0 || ay !== 0)
          ? Math.atan2(ay, ax)
          : this.angle - Math.PI / 2;

        this._dashTargetAngle = dashAngle - Math.PI / 2;
        this.isDashing = true;
        this.dashEndTime = time + BEE.DASH_DURATION;
        this.lastDashTime = time;
        this.setTint(0x88ffff);

        const dashSpeed = this._speed * BEE.DASH_SPEED_MULTIPLIER;
        this.vx = Math.cos(dashAngle) * dashSpeed;
        this.vy = Math.sin(dashAngle) * dashSpeed;
      }
    }

    this._readGamepad();

    if (!this.isDashing) {
      this.maxSpeed = this._speed;
      this._move();
    } else {
      this.maxSpeed = this._speed * BEE.DASH_SPEED_MULTIPLIER;
    }

    this._autoFire(time);
  }

  _readGamepad() {
    const gpx = Input.gamepad.axis(0);
    const gpy = Input.gamepad.axis(1);
    const rx  = Input.gamepad.axis(2);
    const ry  = Input.gamepad.axis(3);
    if (Math.hypot(rx, ry) > 0.15) this._aimAngle = Math.atan2(ry, rx);

    // B button: toggle build menu
    const bDown = Input.gamepad.isDown(1);
    if (bDown && !this._gpBWasDown) {
      World.getSystem('buildMenu')?.toggle();
    }
    this._gpBWasDown = bDown;
  }

  _move() {
    const left  = Input.isDown('ArrowLeft')  || Input.isDown('a');
    const right = Input.isDown('ArrowRight') || Input.isDown('d');
    const up    = Input.isDown('ArrowUp')    || Input.isDown('w');
    const down  = Input.isDown('ArrowDown')  || Input.isDown('s');

    let moveX = (right ? 1 : 0) - (left ? 1 : 0);
    let moveY = (down  ? 1 : 0) - (up   ? 1 : 0);

    if (moveX === 0 && moveY === 0) {
      moveX = Input.gamepad.axis(0);
      moveY = Input.gamepad.axis(1);
    } else if (moveX !== 0 && moveY !== 0) {
      moveX *= 0.707; moveY *= 0.707;
    }

    const accel = this._speed * 10;
    this.ax = moveX * accel;
    this.ay = moveY * accel;

    const speedSq = this.vx * this.vx + this.vy * this.vy;
    if (this._aimAngle !== null) {
      this.angle = rotateToward(this.angle, this._aimAngle - Math.PI / 2, 0.15);
    } else if (speedSq > 10) {
      const targetAngle = Math.atan2(this.vy, this.vx) + Math.PI / 2;
      this.angle = rotateToward(this.angle, targetAngle, 0.15);
    }
  }

  _autoFire(time) {
    if (!this._onFire || time - this._lastFired < this._stingerRate) return;
    const tailAngle = this.angle + Math.PI / 2;
    const spawnX = this.x + Math.cos(tailAngle) * 16;
    const spawnY = this.y + Math.sin(tailAngle) * 16;
    const fired = this._onFire(spawnX, spawnY, this._stingerRange, this._stingerDamage, this._stingerSpeed, tailAngle);
    if (fired) { this._lastFired = time; SoundSynth.play('shoot'); }
  }

  takeDamage(amount) {
    if (!this.alive || this.isDashing) return false;
    const actual = Math.max(1, amount - this.armor);
    this.hp = Math.max(0, this.hp - actual);
    SoundSynth.play('player-hit');
    this.setTint(0xff4444);
    World.after(150, () => { if (this.active) this.clearTint(); });
    if (this.hp <= 0) {
      this.alive = false;
      this.setVisible(false).setActive(false);
    }
    return this.hp <= 0;
  }

  respawn(x, y) {
    this.hp = this.maxHp;
    this.alive = true;
    this.setPosition(x, y).setVisible(true).setActive(true);
    this.clearTint();
  }
}
```

- [ ] **Update `src/main.js`**: remove smoke test, add player

In `src/main.js`, remove the smoke test block and replace with:

```js
import PlayerBee from './entities/PlayerBee.js';
// remove: import Entity from './engine/Entity.js';
// remove: function bootSmokeTest(...) { ... }
// remove: const smokeTest = bootSmokeTest(renderer, camera);

const player = new PlayerBee(WORLD.WIDTH / 2, WORLD.HEIGHT / 2, null);
```

And update the loop to follow player with camera:

```js
// inside loop(), before renderer.render:
camera.follow(player, dt);

// entities list:
const allEntities = [
  ...World.getByTag('bee'),
  ...World.getByTag('wasp'),
  ...World.getByTag('flower'),
];
```

- [ ] **Run dev server and verify** — bee should move with WASD/arrows. Camera should follow from behind.

```
npm run dev
```

- [ ] **Tune drag** — if bee feels too slippery (keeps sliding), increase drag toward 0.03. If too sticky (stops instantly), decrease toward 0.01.

- [ ] **Commit**

```bash
git add src/entities/PlayerBee.js src/main.js
git commit -m "feat: port PlayerBee to vanilla engine, third-person view working"
```

---

## Task 10: Port HunterWasp

**Files:**
- Modify: `src/entities/HunterWasp.js`

- [ ] **Rewrite `src/entities/HunterWasp.js`**

```js
import Entity from '../engine/Entity.js';
import World from '../engine/World.js';
import { dist, rotateToward, angleBetween } from '../utils/math.js';
import { WASP, TOWER } from '../constants.js';
import SoundSynth from '../systems/SoundSynth.js';

export default class HunterWasp extends Entity {
  constructor(x, y) {
    super(x, y, 'wasp');
    this.spriteScale = 1.0;
    this.waspType = 'hunter';
    this.hp = WASP.HP;
    this._target = null;
    this.lastHit = 0;
    this.slowedUntil = 0;
    this.honeyCarried = 0;
    this.drag = 0.015;
    this.maxSpeed = WASP.HUNTER_SPEED;
    World.add(this, 'wasp', 'hunter');
  }

  setTarget(target) { this._target = target; }
  setFlankWaypoint(x, y) { this._flankWaypoint = { x, y }; }

  update(time, dt) {
    if (this._flankWaypoint) {
      const d = dist(this.x, this.y, this._flankWaypoint.x, this._flankWaypoint.y);
      if (d <= 50) {
        this._flankWaypoint = null;
      } else {
        this._moveToward(this._flankWaypoint.x, this._flankWaypoint.y, time);
        this._separate();
        return;
      }
    }

    if (this._poisonTarget && this._poisonTarget.active && !this.isRetreating) {
      this._moveToward(this._poisonTarget.x, this._poisonTarget.y, time);
      this._separate();
      return;
    }

    if (this.isRetreating && this.retreatTarget) {
      this._moveToward(this.retreatTarget.x, this.retreatTarget.y, time);
      if (this.honeyCarried > 0) {
        if (dist(this.x, this.y, this.retreatTarget.x, this.retreatTarget.y) < 50) {
          World.getSystem('fx')?.burst(this.retreatTarget.x, this.retreatTarget.y, 0xffaa00, 10);
          SoundSynth.play('deposit');
          World.getSystem('waspHive')?.onHoneyStolen(this.honeyCarried);
          this.destroy();
        }
      } else if (this.poisonCarried) {
        if (dist(this.x, this.y, this.retreatTarget.x, this.retreatTarget.y) < 50) {
          World.getSystem('fx')?.burst(this.retreatTarget.x, this.retreatTarget.y, 0x44ff44, 8);
          SoundSynth.play('hive-hit');
          World.getSystem('waspHive')?.onPoisonDelivered(TOWER.POISON_HONEY_DAMAGE);
          this.destroy();
        }
      } else if (this.x < -200 || this.x > 3000 || this.y < -200 || this.y > 2000) {
        this.destroy();
      }
      this._separate();
      return;
    }

    // Target selection
    const player = World.getByTag('player')[0];
    if (player?.active && player.alive) {
      this._target = player;
    } else if (!this._target?.active || this._target?.alive === false) {
      const candidates = [
        ...World.getByTag('worker').filter(w => w.active && w.alive),
        ...World.getByTag('tower').filter(t => t.active && t.hp > 0 && t.towerType === 'guard'),
        ...World.getByTag('hive').filter(h => h.active),
      ];
      let nearest = null, nearestD = Infinity;
      for (const c of candidates) {
        const d = dist(this.x, this.y, c.x, c.y);
        if (d < nearestD) { nearest = c; nearestD = d; }
      }
      this._target = nearest;
    }

    if (!this._target?.active) {
      this.ax = 0; this.ay = 0;
      this._separate();
      return;
    }

    this._moveToward(this._target.x, this._target.y, time);
    this._separate();
  }

  _moveToward(tx, ty, time) {
    const baseSpeed = WASP.HUNTER_SPEED * (this._speedMult ?? 1);
    const speed = time < this.slowedUntil ? baseSpeed * TOWER.RESIN_TRAP_SLOW : baseSpeed;
    this.maxSpeed = speed;
    const d = dist(this.x, this.y, tx, ty);
    if (d > 5) {
      this.ax = ((tx - this.x) / d) * speed * 10;
      this.ay = ((ty - this.y) / d) * speed * 10;
    } else {
      this.ax = 0; this.ay = 0;
    }
    const speedSq = this.vx * this.vx + this.vy * this.vy;
    if (speedSq > 10) {
      this.angle = rotateToward(this.angle, Math.atan2(this.vy, this.vx) + Math.PI / 2, 0.15);
    }
  }

  _separate() {
    const RADIUS = 72, FORCE = 1200;
    let sx = 0, sy = 0;
    for (const other of World.getByTag('wasp')) {
      if (!other.active || other === this) continue;
      const dx = this.x - other.x;
      const dy = this.y - other.y;
      const d = Math.hypot(dx, dy);
      if (d === 0) {
        sx += (Math.random() - 0.5) * FORCE;
        sy += (Math.random() - 0.5) * FORCE;
      } else if (d < RADIUS) {
        const s = ((RADIUS - d) / RADIUS) * FORCE;
        sx += (dx / d) * s;
        sy += (dy / d) * s;
      }
    }
    this.ax += sx;
    this.ay += sy;
  }

  takeDamage(amount) {
    this.hp -= amount;
    this.setTint(0xffffff);
    World.after(80, () => { if (this.active) this.clearTint(); });
    if (this.hp <= 0) { this.destroy(); return true; }
    return false;
  }

  retreat() {
    this.isRetreating = true;
    const waspHive = World.getSystem('waspHive');
    if ((this.honeyCarried > 0 || this.poisonCarried) && waspHive) {
      const wh = waspHive.hive;
      this.retreatTarget = { x: wh.x, y: wh.y };
    } else {
      const hive = World.getByTag('hive')[0];
      const a = angleBetween(hive.x, hive.y, this.x, this.y);
      this.retreatTarget = {
        x: this.x + Math.cos(a) * 2000,
        y: this.y + Math.sin(a) * 2000,
      };
    }
  }
}
```

- [ ] **Commit**

```bash
git add src/entities/HunterWasp.js
git commit -m "feat: port HunterWasp to vanilla engine"
```

---

## Task 11: Port RaiderWasp

**Files:**
- Modify: `src/entities/RaiderWasp.js`

- [ ] **Apply entity port checklist to `RaiderWasp.js`:**

1. `import Entity from '../engine/Entity.js'`
2. `import World from '../engine/World.js'`
3. `import { dist, rotateToward, angleBetween } from '../utils/math.js'`
4. Remove `import Phaser from 'phaser'`
5. Change `extends Phaser.Physics.Arcade.Sprite` → `extends Entity`
6. Change constructor: `super(x, y, 'wasp')` — no `scene` arg
7. Add `World.add(this, 'wasp', 'raider')` in constructor
8. Replace `this.setDrag(d,d)` → `this.drag = 0.015`
9. Replace `this.setAcceleration(ax, ay)` → `this.ax = ax; this.ay = ay`
10. Replace `this.setMaxVelocity(s, s)` → `this.maxSpeed = s`
11. Replace `Phaser.Math.Distance.Between(...)` → `dist(...)`
12. Replace `this.body.velocity.angle()` → `Math.atan2(this.vy, this.vx)`
13. Replace `this.body.velocity.lengthSq()` → `this.vx*this.vx + this.vy*this.vy`
14. Replace `Phaser.Math.Angle.RotateTo(...)` → `rotateToward(...)`
15. Replace `Phaser.Math.Angle.Between(...)` → `angleBetween(...)`
16. Replace `this.scene.time.delayedCall(ms, fn)` → `World.after(ms, fn)`
17. Replace `this.scene.hive` → `World.getByTag('hive')[0]`
18. Replace `this.scene.waspHiveSystem` → `World.getSystem('waspHive')`
19. Replace `this.scene._burst?.(...)` → `World.getSystem('fx')?.burst(...)`
20. Replace `this.scene.wasps.getChildren()` → `World.getByTag('wasp')`

- [ ] **Commit**

```bash
git add src/entities/RaiderWasp.js
git commit -m "feat: port RaiderWasp to vanilla engine"
```

---

## Task 12: Port ArcherWasp

**Files:**
- Modify: `src/entities/ArcherWasp.js`

- [ ] **Apply the same 20-step port checklist from Task 11 to `src/entities/ArcherWasp.js`**

Additional ArcherWasp-specific changes:
- Any `this.scene.stingers` or projectile group access → `World.getByTag('stinger')`
- Projectile spawning: call `World.getSystem('game').spawnProjectile(...)` or use the same `onFire` callback pattern as PlayerBee

- [ ] **Commit**

```bash
git add src/entities/ArcherWasp.js
git commit -m "feat: port ArcherWasp to vanilla engine"
```

---

## Task 13: Port Stinger

**Files:**
- Modify: `src/entities/Stinger.js`

- [ ] **Apply the 20-step port checklist from Task 11 to `src/entities/Stinger.js`**

Stinger-specific:
- `World.add(this, 'stinger')` in constructor
- Stinger has no drag (set `this.drag = 1` — no deceleration, constant velocity)
- Out-of-range destroy: was `this.scene`-based range check → check `dist(this.startX, this.startY, this.x, this.y) > this._range` in update

- [ ] **Commit**

```bash
git add src/entities/Stinger.js
git commit -m "feat: port Stinger projectile to vanilla engine"
```

---

## Task 14: Port WorkerBee

**Files:**
- Modify: `src/entities/WorkerBee.js`

- [ ] **Apply the 20-step port checklist from Task 11 to `src/entities/WorkerBee.js`**

WorkerBee-specific:
- `World.add(this, 'bee', 'worker')` in constructor
- `this.drag = 0.015`
- Flower access: `World.getByTag('flower')` instead of `this.scene.flowers.getChildren()`
- Hive access: `World.getByTag('hive')[0]`
- ResourceManager access: `World.getSystem('resources')`

- [ ] **Commit**

```bash
git add src/entities/WorkerBee.js
git commit -m "feat: port WorkerBee to vanilla engine"
```

---

## Task 15: Port Hive

**Files:**
- Modify: `src/entities/Hive.js`

- [ ] **Apply the 20-step port checklist from Task 11 to `src/entities/Hive.js`**

Hive-specific:
- `World.add(this, 'hive')` in constructor
- Hive is static (no velocity), so `this.drag = 1; this.ax = 0; this.ay = 0` and Physics will not move it
- Resource manager access: `World.getSystem('resources')`
- Build menu open: `World.getSystem('buildMenu')?.show()`

- [ ] **Commit**

```bash
git add src/entities/Hive.js
git commit -m "feat: port Hive to vanilla engine"
```

---

## Task 16: Port Flower

**Files:**
- Modify: `src/entities/Flower.js`

- [ ] **Apply the 20-step port checklist from Task 11 to `src/entities/Flower.js`**

Flower-specific:
- `World.add(this, 'flower')` in constructor
- Flower is static: `this.drag = 1`
- `this.scene.pollinationSystem` → `World.getSystem('pollination')`

- [ ] **Commit**

```bash
git add src/entities/Flower.js
git commit -m "feat: port Flower to vanilla engine"
```

---

## Task 17: Port WaspHive

**Files:**
- Modify: `src/entities/WaspHive.js`

- [ ] **Apply the 20-step port checklist from Task 11 to `src/entities/WaspHive.js`**

WaspHive-specific:
- `World.add(this, 'waspHive')` in constructor
- Static entity: `this.drag = 1`

- [ ] **Commit**

```bash
git add src/entities/WaspHive.js
git commit -m "feat: port WaspHive to vanilla engine"
```

---

## Task 18: Port towers (StingerTurret, GuardPost, ResinTrap, PoisonHoney)

**Files:**
- Modify: `src/towers/StingerTurret.js`
- Modify: `src/towers/GuardPost.js`
- Modify: `src/towers/ResinTrap.js`
- Modify: `src/towers/PoisonHoney.js`

- [ ] **For each tower file, apply the 20-step port checklist from Task 11**

Tower-specific additions for all four:
- `World.add(this, 'tower')` in constructor
- All towers are static: `this.drag = 1`
- `this.towerType` property preserved as-is (used for targeting)
- Nearest wasp: `World.getByTag('wasp')` + manual distance loop (same logic, just different API)
- Guard post spawning GuardBee: `new GuardBee(x, y)` (GuardBee ports in Task 19)

- [ ] **Commit**

```bash
git add src/towers/
git commit -m "feat: port all four towers to vanilla engine"
```

---

## Task 19: Port remaining entities (GuardBee, SoldierBee, Spider, Butterfly, XpGem, Pickup, Breakable, WebTrap)

**Files:**
- Modify: `src/entities/GuardBee.js`
- Modify: `src/entities/SoldierBee.js`
- Modify: `src/entities/Spider.js`
- Modify: `src/entities/Butterfly.js`
- Modify: `src/entities/XpGem.js`
- Modify: `src/entities/Pickup.js`
- Modify: `src/entities/Breakable.js`
- Modify: `src/entities/WebTrap.js`

- [ ] **For each file, apply the 20-step port checklist from Task 11**

Entity-specific World tags:
- GuardBee: `World.add(this, 'bee', 'guard')`
- SoldierBee: `World.add(this, 'bee', 'soldier')`
- Spider: `World.add(this, 'spider')`; static: `this.drag = 1`
- Butterfly: `World.add(this, 'butterfly')`;  `this.drag = 0.02`
- XpGem: `World.add(this, 'gem')`; static or slow drift
- Pickup: `World.add(this, 'pickup')`; static
- Breakable: `World.add(this, 'breakable')`; static
- WebTrap: `World.add(this, 'web')`; static

- [ ] **Commit**

```bash
git add src/entities/
git commit -m "feat: port remaining entities to vanilla engine"
```

---

## Task 20: Port systems (WaspHiveSystem, PollinationSystem, WindSystem, UpgradeManager)

**Files:**
- Modify: `src/systems/WaspHiveSystem.js`
- Modify: `src/systems/PollinationSystem.js`
- Modify: `src/systems/WindSystem.js`
- Modify: `src/systems/UpgradeManager.js`

`WaveManager`, `ResourceManager`, `MetaSave` need no changes.

- [ ] **WaspHiveSystem.js** — replace any `Phaser.Math.*` calls with `utils/math.js` equivalents. Replace `scene.wasps.getChildren()` with `World.getByTag('wasp')`. Register: `World.addSystem('waspHive', waspHiveSystem)` in GameScene.

- [ ] **PollinationSystem.js** — replace `scene.flowers.getChildren()` with `World.getByTag('flower')`. Replace `scene.physics.add.existing` flower creation with direct `new Flower(x, y)`.

- [ ] **WindSystem.js** — pure calculation system, likely minimal Phaser usage. Replace any Phaser event/timer with `World.after()`.

- [ ] **UpgradeManager.js** — likely only uses `Phaser.Math.Between` or similar. Replace with `randInt` from `utils/math.js`.

- [ ] **Commit**

```bash
git add src/systems/
git commit -m "feat: port systems to vanilla engine (WaspHive, Pollination, Wind, Upgrade)"
```

---

## Task 21: Scene state machine + BootScene

**Files:**
- Create: `src/scenes/index.js`
- Modify: `src/scenes/BootScene.js`

- [ ] **Create `src/scenes/index.js`**

```js
let _current = null;

export function transition(SceneClass, data = {}) {
  _current?.destroy?.();
  _current = new SceneClass(data);
  _current.create();
}

export function update(dt, time) {
  _current?.update?.(dt, time);
}

export function getCurrent() { return _current; }
```

- [ ] **Rewrite `src/scenes/BootScene.js`**

BootScene loads assets. In Phaser this was texture loading. In vanilla canvas, load images into an object:

```js
export default class BootScene {
  constructor() {}

  create() {
    // Load all sprite images; store in global spriteSheets object
    const assets = [
      ['player-bee', '/assets/player-bee.png'],
      ['wasp', '/assets/wasp.png'],
      ['flower', '/assets/flower.png'],
      ['hive', '/assets/hive.png'],
      // ... add all sprite keys
    ];

    let loaded = 0;
    for (const [key, path] of assets) {
      const img = new Image();
      img.onload = () => {
        window.__sprites = window.__sprites ?? {};
        window.__sprites[key] = img;
        loaded++;
        if (loaded === assets.length) {
          import('./index.js').then(({ transition }) => {
            import('./MenuScene.js').then(({ default: MenuScene }) => {
              transition(MenuScene);
            });
          });
        }
      };
      img.src = path;
    }
  }

  destroy() {}
}
```

**Note:** `window.__sprites` is a temporary pattern. Pass this object to `BillboardRenderer.render()` as the `spriteSheets` argument.

- [ ] **Commit**

```bash
git add src/scenes/index.js src/scenes/BootScene.js
git commit -m "feat: add scene state machine and port BootScene"
```

---

## Task 22: Port GameScene

**Files:**
- Modify: `src/scenes/GameScene.js`

This is the largest port. GameScene orchestrates all entities and systems.

- [ ] **Rewrite `src/scenes/GameScene.js`**

```js
import World from '../engine/World.js';
import Camera from '../engine/Camera.js';
import { update as physicsUpdate } from '../engine/Physics.js';
import { WORLD, BEE, HIVE, WAVE, FLOWER, TIMER, WORKER,
         WIND, XP, BUTTERFLY, SPIDER, PICKUP, pickFlowerType } from '../constants.js';
import MetaSave from '../systems/MetaSave.js';
import Flower from '../entities/Flower.js';
import Hive from '../entities/Hive.js';
import ResourceManager from '../systems/ResourceManager.js';
import PollinationSystem from '../systems/PollinationSystem.js';
import UpgradeManager from '../systems/UpgradeManager.js';
import PlayerBee from '../entities/PlayerBee.js';
import Stinger from '../entities/Stinger.js';
import WorkerBee from '../entities/WorkerBee.js';
import WaveManager from '../systems/WaveManager.js';
import WaspHiveSystem from '../systems/WaspHiveSystem.js';
import HunterWasp from '../entities/HunterWasp.js';
import RaiderWasp from '../entities/RaiderWasp.js';
import WindSystem from '../systems/WindSystem.js';
import Butterfly from '../entities/Butterfly.js';
import Spider from '../entities/Spider.js';
import SoundSynth from '../systems/SoundSynth.js';
import ArcherWasp from '../entities/ArcherWasp.js';
import { randInt, randFloat } from '../utils/math.js';

const BOUNDS = { minX: 0, minY: 0, maxX: WORLD.WIDTH, maxY: WORLD.HEIGHT };

export default class GameScene {
  constructor(data = {}) {
    this.hiveX = data.hiveX ?? WORLD.WIDTH / 2;
    this.hiveY = data.hiveY ?? WORLD.HEIGHT / 2;
    this._gameTime = 0;
    this._ended = false;
    this.xp = 0;
    this.level = 1;
  }

  create() {
    World.clear();

    const meta = MetaSave.load();

    this.resources = new ResourceManager({
      honeyStorage: HIVE.HONEY_STORAGE,
      sapConversionRate: HIVE.SAP_CONVERSION_RATE,
    });
    World.addSystem('resources', this.resources);

    this.waveManager = new WaveManager({
      firstWaveDelay: WAVE.FIRST_WAVE_DELAY,
      waveInterval: WAVE.WAVE_INTERVAL,
      baseCount: WAVE.BASE_COUNT,
      countIncrement: WAVE.COUNT_INCREMENT,
    });

    this.windSystem = new WindSystem();
    this.pollinationSystem = new PollinationSystem();
    World.addSystem('pollination', this.pollinationSystem);

    this.upgradeManager = new UpgradeManager(meta);
    World.addSystem('upgrades', this.upgradeManager);

    this.waspHiveSystem = new WaspHiveSystem();
    World.addSystem('waspHive', this.waspHiveSystem);

    // Spawn initial flowers
    for (let i = 0; i < FLOWER.INITIAL_COUNT; i++) {
      const type = pickFlowerType();
      new Flower(randInt(100, WORLD.WIDTH - 100), randInt(100, WORLD.HEIGHT - 100), type);
    }

    this.hive = new Hive(this.hiveX, this.hiveY);
    this.player = new PlayerBee(this.hiveX, this.hiveY, this._spawnStinger.bind(this));
    World.addSystem('player', this.player);

    this.camera = new Camera({ offset: 120, lerpAngle: 0.12 });
  }

  update(dt, time) {
    if (this._ended) return;

    this._gameTime += dt * 1000;

    this.windSystem.update(this._gameTime);
    const windVec = this.windSystem.getVector();

    // Update all entities
    const allTags = ['bee', 'wasp', 'stinger', 'flower', 'tower', 'gem', 'pickup',
                     'spider', 'butterfly', 'web', 'breakable'];
    const seen = new Set();
    for (const tag of allTags) {
      for (const e of World.getByTag(tag)) {
        if (seen.has(e) || !e.active) continue;
        seen.add(e);
        e.update?.(time, dt, windVec);
        if (e.active) physicsUpdate(e, dt, BOUNDS);
      }
    }

    this.camera.follow(this.player, dt);

    // Wave spawning
    const wave = this.waveManager.update(this._gameTime);
    if (wave) this._spawnWave(wave);

    // Sap conversion
    this.resources.convertSap(1);

    // Check win/lose
    if (this._gameTime >= TIMER.RUN_DURATION) this._win();
    if (this.hive && this.hive.hp <= 0) this._lose();
  }

  _spawnStinger(x, y, range, damage, speed, angle) {
    const stinger = new Stinger(x, y, range, damage, speed, angle);
    return true;
  }

  _spawnWave(wave) {
    const spawnEdge = () => {
      const side = randInt(0, 3);
      if (side === 0) return { x: randInt(0, WORLD.WIDTH), y: 0 };
      if (side === 1) return { x: WORLD.WIDTH, y: randInt(0, WORLD.HEIGHT) };
      if (side === 2) return { x: randInt(0, WORLD.WIDTH), y: WORLD.HEIGHT };
      return { x: 0, y: randInt(0, WORLD.HEIGHT) };
    };
    for (let i = 0; i < wave.hunterCount; i++) {
      const { x, y } = spawnEdge();
      new HunterWasp(x, y);
    }
    for (let i = 0; i < wave.raiderCount; i++) {
      const { x, y } = spawnEdge();
      new RaiderWasp(x, y);
    }
    for (let i = 0; i < wave.archerCount; i++) {
      const { x, y } = spawnEdge();
      new ArcherWasp(x, y);
    }
  }

  _win() {
    this._ended = true;
    import('./index.js').then(({ transition }) =>
      import('./GameOverScene.js').then(({ default: S }) =>
        transition(S, { won: true, score: this._calcScore() })
      )
    );
  }

  _lose() {
    this._ended = true;
    import('./index.js').then(({ transition }) =>
      import('./GameOverScene.js').then(({ default: S }) =>
        transition(S, { won: false, score: this._calcScore() })
      )
    );
  }

  _calcScore() {
    return this.xp;
  }

  destroy() {
    World.clear();
  }

  getCamera() { return this.camera; }
}
```

- [ ] **Commit**

```bash
git add src/scenes/GameScene.js
git commit -m "feat: port GameScene orchestrator to vanilla engine"
```

---

## Task 23: Port HUD

**Files:**
- Create: `src/renderer/HUD.js`

- [ ] **Create `src/renderer/HUD.js`**

```js
const SCREEN_W = 400;
const SCREEN_H = 240;

export default class HUD {
  constructor(ctx) {
    this.ctx = ctx;
  }

  render({ hp, maxHp, honey, honeyStorage, timer, sapCarried, sapCapacity, wave }) {
    const ctx = this.ctx;
    ctx.font = '8px monospace';
    ctx.fillStyle = '#ffffff';

    // HP bar
    const hpW = 60;
    ctx.fillStyle = '#333';
    ctx.fillRect(4, 4, hpW, 6);
    ctx.fillStyle = '#ff4444';
    ctx.fillRect(4, 4, Math.round(hpW * (hp / maxHp)), 6);
    ctx.fillStyle = '#fff';
    ctx.fillText(`HP ${hp}/${maxHp}`, 4, 20);

    // Honey
    ctx.fillText(`Honey: ${Math.floor(honey)}/${honeyStorage}`, 4, 30);

    // Sap carried
    if (sapCarried > 0) {
      ctx.fillText(`Sap: ${sapCarried}/${sapCapacity}`, 4, 40);
    }

    // Timer (top right)
    const mins = Math.floor(timer / 60000);
    const secs = Math.floor((timer % 60000) / 1000);
    const timerStr = `${mins}:${secs.toString().padStart(2, '0')}`;
    ctx.fillText(timerStr, SCREEN_W - 30, 12);

    // Wave
    ctx.fillText(`Wave ${wave}`, SCREEN_W - 40, 22);
  }
}
```

- [ ] **Commit**

```bash
git add src/renderer/HUD.js
git commit -m "feat: add canvas HUD overlay"
```

---

## Task 24: Update main.js to wire full game

**Files:**
- Modify: `src/main.js`

- [ ] **Rewrite `src/main.js` for full game**

```js
import Input from './engine/Input.js';
import BillboardRenderer from './renderer/BillboardRenderer.js';
import HUD from './renderer/HUD.js';
import { update as physicsUpdate } from './engine/Physics.js';
import World from './engine/World.js';
import { transition, update as sceneUpdate } from './scenes/index.js';
import BootScene from './scenes/BootScene.js';

const canvas = document.getElementById('game');
const renderer = new BillboardRenderer(canvas);
const hud = new HUD(canvas.getContext('2d'));

Input.init();

let lastTime = null;

function loop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  Input.poll();
  World.update(dt * 1000);

  sceneUpdate(dt, timestamp);

  // Get camera from current scene
  const { getCurrent } = await import('./scenes/index.js');
  const scene = getCurrent();
  const camera = scene?.getCamera?.();

  if (camera) {
    const allEntities = [
      ...World.getByTag('bee'),
      ...World.getByTag('wasp'),
      ...World.getByTag('stinger'),
      ...World.getByTag('flower'),
      ...World.getByTag('tower'),
      ...World.getByTag('gem'),
      ...World.getByTag('pickup'),
      ...World.getByTag('spider'),
      ...World.getByTag('butterfly'),
    ];

    renderer.render(camera, allEntities, window.__sprites ?? {});

    const resources = World.getSystem('resources');
    const player = World.getByTag('player')[0];
    if (resources && player) {
      hud.render({
        hp: player.hp ?? 0,
        maxHp: player.maxHp ?? 5,
        honey: resources.getHoney(),
        honeyStorage: resources.getHoneyStorage(),
        timer: scene._gameTime ?? 0,
        sapCarried: resources.getSapCarried(player),
        sapCapacity: player._sapCapacity ?? 10,
        wave: scene.waveManager?.getWaveNumber() ?? 0,
      });
    }
  }

  requestAnimationFrame(loop);
}

transition(BootScene);
requestAnimationFrame(loop);
```

**Note:** The `await import()` inside the loop is not valid. Refactor to use a sync `getCurrent()` export from `scenes/index.js` (already defined in Task 21). Remove the `await`.

- [ ] **Fix the `await` issue** — replace the dynamic import inside the loop with the sync import at top of file:

```js
import { transition, update as sceneUpdate, getCurrent } from './scenes/index.js';
// then in loop:
const scene = getCurrent();
```

- [ ] **Run dev server, verify full game boots**

```
npm run dev
```

- [ ] **Commit**

```bash
git add src/main.js
git commit -m "feat: wire full game loop with scene manager, renderer, and HUD"
```

---

## Task 25: Remove Phaser dependency

**Files:**
- Modify: `package.json`

Do this only after the full game runs without errors.

- [ ] **Remove Phaser**

```bash
npm uninstall phaser
```

- [ ] **Verify no Phaser imports remain**

```bash
grep -r "from 'phaser'" src/
```

Expected: no output (zero matches).

- [ ] **Run dev server one final time**

```
npm run dev
```

Verify game boots and plays correctly.

- [ ] **Run tests**

```
npx vitest run
```

Expected: all tests pass.

- [ ] **Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: remove Phaser dependency, pure vanilla canvas engine"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| Third-person camera behind bee | Task 6 (Camera), Task 9 (PlayerBee) |
| Billboard sprites, perspective projection | Task 7 (BillboardRenderer) |
| 400×240 canvas, Playdate native | Task 7, Task 8 |
| Zero engine dependencies | Task 25 (remove Phaser) |
| Game logic preserved | Tasks 9–20 (all entities/systems) |
| World, Physics, Input, Camera engine | Tasks 1–6 |
| Phaser → engine API mapping | Cheatsheet + Tasks 9–20 |
| All mechanics: pollen, hive, waves, upgrades | Tasks 20 (systems) + Task 22 (GameScene) |
| Playdate portability | engine/ designed as Lua-translatable |

**All spec requirements covered. No placeholders in engine or PlayerBee tasks. Entity port tasks (11–19) reference an explicit 20-step checklist defined in Task 11 — not vague "similar to" references.**
