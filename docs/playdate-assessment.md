# Playdate Prototype Assessment — Pollen Haters

## What Lines Up

- **Resolution match**: Game canvas is already 400×240 — exact Playdate screen size. Isometric layout and HUD proportions carry over without redesign.
- **Control mapping**: D-pad = movement, A = dash, B = build menu. Crank = stinger aim (replaces right-stick/right-click — arguably better).
- **Game loop**: Resource collection → base defense → upgrade loop is a natural handheld session structure (5–10 min runs).
- **No physics engine dependency**: Custom physics in `Physics.js` is trivial Euler integration, easy to rewrite in Lua.
- **Modular entity system**: `World` registry + tag queries maps cleanly to a Lua table-based entity system.

## What Needs a Full Rewrite

| System | JS version | Playdate version |
|---|---|---|
| Language | JavaScript (ES modules) | Lua (Playdate SDK) |
| Renderer | Canvas 2D API | `playdate.graphics` (1-bit) |
| Audio | Web Audio API synth | Playdate audio (samples or synth via SDK) |
| Sprites | Color PNGs | 1-bit dithered images (Aseprite → export 1-bit) |
| Input | Keyboard + Gamepad API | `playdate.buttonJustPressed`, `playdate.getCrankPosition` |
| Build system | Vite / npm | Playdate SDK `pdc` compiler |

## Performance Reality Check

Playdate CPU: ARM Cortex-M7 at 48 MHz (normal) / 250 MHz (high-power, battery cost).  
Lua is interpreted — roughly 10–50× slower than native JS.

Current web game would crush Playdate at full fidelity:
- 800 environment features → cut to ~50 static decorations drawn once to a background image
- 6 spiders + webs → cut to 2–3 spiders, webs as static segments
- Particle system → cut or reduce to 3–5 particles max per event
- Butterflies → 2 max
- Wasp count per wave → halve

All entity AI loops must be O(n) with small n. Spatial checks by distance² (skip sqrt).

## Monochrome Visual Strategy

No color — use dithering patterns to communicate state:

| Entity | Visual |
|---|---|
| Player bee | Solid white bee sprite, black outline |
| Wasp | Dithered (50%) body |
| Hive | Solid black hexagon cluster |
| Honey | White filled circle |
| Flowers | Simple dot + petals, different shapes per type |
| Resin trap | Crosshatch fill |
| Guard post | Bold outline square |
| Nectar attractor | Fountain silhouette |
| Webs | Thin line segments (already monochrome) |
| Grass features | Single dithered tile stamp |

Isometric projection keeps working — just replace sprite draws with 1-bit images.

## Input Remap

| Action | Web | Playdate |
|---|---|---|
| Move | WASD / arrows | D-pad |
| Dash | Space / A button | A button |
| Aim stinger | Right stick / right-click | Crank angle |
| Build menu | B | B |
| Confirm build | X / left-click / A | A |
| Cancel build | B / right-click | B |

Crank for stinger aim is a natural fit — rotate crank to swing aim angle around the bee. Feels tactile in a way right-stick doesn't.

## Realistic Prototype Scope

Cut to the essential loop. One wasp type (raider), one tower type (resin trap), no butterflies/spiders/flowers.

**Milestone 1 — Core loop (1 week)**
- Player bee moves with d-pad
- Stinger fires, aim follows crank angle
- Raider wasp spawns, pathfinds to hive, steals honey, retreats
- Hive takes damage, honey counter displayed
- Basic 1-bit isometric renderer (no depth sort needed at low entity counts)

**Milestone 2 — Build system (3–4 days)**
- Build menu (B button)
- Resin trap placement (A to confirm)
- Honey cost deducted
- Trap slows wasps on contact

**Milestone 3 — Polish + card (3–4 days)**
- Wave system (wave number increases every 60s)
- Score / game over screen
- Sound effects (Playdate synth or 1-bit samples)
- Crank idle animation on bee

**Total: ~2–3 weeks** for a shippable prototype.

## Recommended Next Steps

1. Install Playdate SDK and confirm Lua toolchain works locally
2. Create new repo `pollenhaters-playdate`
3. Start with `main.lua` + bare isometric renderer drawing a single bee sprite
4. Port `World`, `Entity`, `Physics` to Lua (~1 day, straightforward)
5. Build Milestone 1 entities one at a time

## What NOT to Port Initially

- MetaUpgrade system (too complex for prototype)
- Butterflies, flowers, pollination (nice to have, not core)
- Spider webs
- Multiple hive support
- Level-up menu (just wave number for prototype)
- Particle system (placeholder flash instead)
