# Bee Game — 3D Billboard Conversion Design Spec
*2026-05-11*

## Overview

Convert the existing Phaser.js top-down 2D bee survivor game to a third-person pseudo-3D view using vanilla canvas billboard sprite rendering. No 3D engine. No raycasting library. Pure perspective projection math on a 400×240 canvas — chosen to match Playdate's native resolution for eventual Lua port.

All existing game mechanics preserved: collect pollen, defend hive, wasp waves, upgrades, meta progression.

---

## Goals

- Third-person perspective: camera follows bee from behind, bee sprite fixed at screen bottom-center
- Billboard sprites: all entities (wasps, flowers, hive, towers) projected and scaled by distance
- 400×240 canvas scaled nearest-neighbor to fill browser window (Playdate native resolution)
- Zero engine dependencies for rendering/physics — vanilla JS only
- Game logic (AI state machines, resource math, wave escalation) preserved with minimal changes
- Engine layer translates 1:1 to Lua for Playdate port

---

## Architecture

```
src/
  engine/
    World.js              ← entity registry, replaces Phaser groups + scene.time
    Physics.js            ← Euler integration (velocity/drag/accel)
    Input.js              ← keyboard + Gamepad API abstraction
    Camera.js             ← third-person follow camera (x, y, angle, offset)
  renderer/
    BillboardRenderer.js  ← perspective projection + sprite draw + depth sort
    HUD.js                ← canvas 2D overlay (hp bars, honey, timer)
  entities/               ← existing files, Phaser calls stripped out
  systems/                ← existing files, mostly unchanged
  scenes/                 ← plain JS state machine (replaces Phaser scenes)
  main.js                 ← requestAnimationFrame game loop
```

### Phaser → Engine mapping

| Phaser | Replacement |
|---|---|
| `Arcade.Sprite` | `Entity` base class (x, y, vx, vy, angle, ax, ay) |
| `body.setAcceleration` | `entity.ax = value` |
| `body.setDrag` | drag coefficient on Entity, applied in Physics.update |
| `body.setMaxVelocity` | `entity.maxSpeed` clamped in Physics.update |
| `scene.physics.overlap` | distance checks via `World.query(tag, x, y, radius)` |
| Phaser groups | `World.getByTag('wasps')` etc. |
| Phaser scene camera | `Camera.js` follows player at configurable offset |
| Phaser keyboard input | `Input.isDown(key)`, `Input.justDown(key)` |
| Phaser gamepad | `Input.gamepad.axis(index)`, `Input.gamepad.justDown(button)` |
| `scene.time.delayedCall` | `World.after(ms, fn)` timer queue |
| Phaser tweens (tint flash) | simple timer + entity.tint field |

---

## Renderer

### Canvas setup
- Render target: 400×240 (Playdate native)
- Scale to fill browser window with CSS `image-rendering: pixelated`
- All draw calls use integer pixel positions

### Frame draw order
1. Fill sky rect (top half): `#87ceeb`
2. Fill floor rect (bottom half): `#3a5a1c`
3. Collect all entities from World
4. Compute distance + relative screen angle for each
5. Cull entities outside FOV (60°)
6. Sort far → near by distance
7. Draw each billboard sprite
8. Draw bee sprite fixed at screen bottom-center (not projected)
9. Draw HUD overlay

### Billboard projection math
```js
const dx = entity.x - camera.x;
const dy = entity.y - camera.y;
const dist = Math.hypot(dx, dy);
const worldAngle = Math.atan2(dy, dx);
// normalize relative angle to [-PI, PI]
let relAngle = worldAngle - camera.angle;
while (relAngle > Math.PI) relAngle -= 2 * Math.PI;
while (relAngle < -Math.PI) relAngle += 2 * Math.PI;

const screenX = (relAngle / FOV + 0.5) * SCREEN_W;
const spriteH = (PROJECTION_PLANE / dist) * entity.spriteScale;
const screenY = SCREEN_H / 2;

// draw sprite centered at (screenX, screenY), scaled to spriteH × spriteH
```

`PROJECTION_PLANE` = distance at which a unit-scale sprite fills the screen height (~120 for 400×240). Tune to taste.

### Sprite frames
Each entity has a `facing` angle. Renderer computes angle from entity to camera, picks 1 of 8 direction frames (N/NE/E/SE/S/SW/W/NW) from spritesheet. Same as DOOM enemy sprites.

### Third-person camera
- Camera position: `(player.x - cos(player.angle) * OFFSET, player.y - sin(player.angle) * OFFSET)`
- Camera angle tracks player facing with lerp factor ~0.12 per frame (adjust for feel)
- Bee sprite drawn fixed at bottom-center of screen (not billboard projected)
- Player still exists at real world x/y for all collision and AI math

### Minimum render distance
Clip sprites closer than 8px projected height to avoid extreme scaling artifacts.

---

## Physics

Pure function, no inheritance required:

```js
// Physics.js
export function update(entity, dt) {
  entity.vx += entity.ax * dt;
  entity.vy += entity.ay * dt;
  const dragFactor = Math.pow(entity.drag ?? 0.001, dt);
  entity.vx *= dragFactor;
  entity.vy *= dragFactor;
  entity.vx = clamp(entity.vx, -entity.maxSpeed, entity.maxSpeed);
  entity.vy = clamp(entity.vy, -entity.maxSpeed, entity.maxSpeed);
  entity.x += entity.vx * dt;
  entity.y += entity.vy * dt;
}
```

Entity AI calls `entity.ax = ...` / `entity.ay = ...` exactly as before (was `body.setAcceleration`). Note: Phaser drag is additive (subtracts force), this is multiplicative (coefficient). Drag values need re-tuning per entity during port — expect ~0.01–0.05 range for `entity.drag` to match current game feel.

World bounds: clamp `entity.x` / `entity.y` to map dimensions after update.

Distance collision (already manual in entity code): replace `Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y)` with `Math.hypot(b.x - a.x, b.y - a.y)`.

---

## Input

```js
// Input.js
Input.isDown('W')           // was: this._wasd.W.isDown
Input.isDown('ArrowLeft')   // was: this._cursors.left.isDown
Input.justDown('Space')     // was: Phaser.Input.Keyboard.JustDown(this._space)
Input.gamepad.axis(0)       // was: pad.leftStick.x
Input.gamepad.justDown(0)   // was: pad.buttons[0]?.pressed (rising edge)
```

Backed by `keydown`/`keyup` event listeners and browser Gamepad API (`navigator.getGamepads()`). Polled once per frame.

---

## World

```js
// World.js
World.add(entity, ...tags)          // register entity
World.remove(entity)                // deregister + cleanup
World.getByTag('wasps')             // replaces Phaser group.getChildren()
World.query('wasps', x, y, radius)  // nearby entities (for collision/targeting)
World.after(ms, fn)                 // replaces scene.time.delayedCall
World.update(dt)                    // tick all timers
```

---

## Scene State Machine

Replaces Phaser scenes. Plain JS:

```js
// scenes/index.js
let current = null;
export function transition(SceneClass) {
  current?.destroy();
  current = new SceneClass();
  current.create();
}
export function update(dt) { current?.update(dt); }
```

Scene classes: `BootScene`, `MenuScene`, `PlacementScene`, `GameScene`, `PauseScene`, `GameOverScene`, `MetaUpgradeScene`. Same names, plain JS, no Phaser.

---

## Migration Phases

### Phase 1 — Engine foundation
Build `World`, `Physics`, `Input`, `Camera`, `BillboardRenderer`. Wire `requestAnimationFrame` loop. Single moving colored rectangle visible in 3D view. No game content.

### Phase 2 — Port PlayerBee
Strip Phaser calls from `PlayerBee.js`. Wire to new engine. Bee moves in 3D view. Confirm controls + camera feel before touching other files.

### Phase 3 — Port enemies + collision
Port `HunterWasp`, `RaiderWasp`, `ArcherWasp`. Distance collision already manual — minimal changes. Waves spawn and chase.

### Phase 4 — Port systems
`WaveManager`, `ResourceManager`, `UpgradeManager` — near-zero Phaser coupling. Light touch.

### Phase 5 — Remaining entities
`WorkerBee`, `Hive`, `WaspHive`, `Flower`, `Stinger`, towers, traps.

### Phase 6 — Scenes + HUD
Replace Phaser scene system with state machine. Redraw HUD on canvas overlay.

---

## Playdate Path

After Phase 1, `engine/` files translate 1:1 to Lua:
- `Physics.update` → Lua function, identical math
- `World` → Lua table of entity tables
- `Input` → Playdate SDK button API
- `BillboardRenderer` → Playdate `drawScaledBitmap` calls

Playdate constraints to design toward:
- 1-bit sprites (no color — plan dithered palette from start)
- 400×240 resolution (already our canvas size)
- No floating point in hot path (use integers scaled ×1000 if needed)
- Sprite count budget: ~20–30 entities max visible

---

## Out of Scope (this conversion)

- Sound (SoundSynth stays as-is or is stubbed)
- Multiplayer
- New game mechanics
- Playdate port itself (engine design enables it, port is a separate project)
