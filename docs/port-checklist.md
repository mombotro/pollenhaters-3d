# Port Checklist (2D → Isometric)

## Scenes

- [x] **LevelUpMenu** — ported to vanilla canvas. Shows 3 random upgrade cards, pauses game, click/keyboard/gamepad to choose.
- [ ] **MetaUpgradeScene** — `src/scenes/MetaUpgradeScene.js` still uses Phaser. Full rewrite needed: scrollable upgrade list, buy with royal jelly, refund/reset buttons, back to menu.
- [ ] **PauseScene** — `src/scenes/PauseScene.js` is an empty Phaser stub. No pause at all. Needs Escape/Start to pause, resume, and quit-to-menu.

## UI / HUD

- [ ] **src/ui/HUD.js** — old Phaser HUD, unused. Delete (working version is `src/renderer/HUD.js`).
- [ ] **MetaUpgrade accessible from GameOver** — `GameOverScene._goMenu()` goes straight to MenuScene, skipping MetaUpgradeScene. Route through MetaUpgradeScene after run ends.

## Input / Controls

- [ ] **TouchControls** — `src/ui/TouchControls.js` exists but not instantiated anywhere. Needed for mobile/touch support.
- [ ] **Pause input** — no key/button mapped to pause.

## Dead Code / Cleanup

- [ ] Delete `src/scenes/PlacementScene.js` (not needed — hive fixed at center).
- [ ] Delete `src/scenes/PauseScene.js` stub and replace with real implementation.
- [ ] Delete `src/ui/HUD.js` (Phaser version).
- [ ] Delete `src/scenes/MetaUpgradeScene.js` (Phaser version) after porting.
