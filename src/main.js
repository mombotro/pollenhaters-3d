import Input from './engine/Input.js';
import World from './engine/World.js';
import IsometricRenderer from './renderer/IsometricRenderer.js';
import HUD from './renderer/HUD.js';
import { transition, update as sceneUpdate, getCurrent } from './scenes/index.js';
import BootScene from './scenes/BootScene.js';

const canvas = document.getElementById('game');
const renderer = new IsometricRenderer(canvas);
const hud = new HUD(canvas.getContext('2d'));

Input.init();

let lastTime = null;

function loop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  World.update(dt * 1000);
  sceneUpdate(dt, timestamp);
  Input.poll(); // poll after game reads input so justDown isn't cleared before it's seen

  const scene = getCurrent();
  const camera = scene?.getCamera?.();

  if (camera) {
    const allEntities = [
      ...World.getByTag('hive'),
      ...World.getByTag('waspHive'),
      ...World.getByTag('flower'),
      ...World.getByTag('breakable'),
      ...World.getByTag('tower'),
      ...World.getByTag('bee'),
      ...World.getByTag('wasp'),
      ...World.getByTag('spider'),
      ...World.getByTag('butterfly'),
      ...World.getByTag('gem'),
      ...World.getByTag('pickup'),
      ...World.getByTag('stinger'),
    ];

    renderer.render(camera, allEntities, window.__sprites ?? {});

    const resources = World.getSystem('resources');
    const player = World.getByTag('player')[0];
    if (resources && player) {
      const runDuration = scene._runDuration ?? 600000;
      const elapsed = scene._playTime ?? 0;
      hud.render({
        hp: player.hp ?? 0,
        maxHp: player.maxHp ?? 5,
        honey: resources.getHoney(),
        honeyStorage: resources.getHoneyStorage(),
        timer: runDuration - elapsed,
        sapCarried: resources.getSapCarried('player'),
        sapCapacity: player._sapCapacity ?? 10,
        wave: scene.waveManager?.getWaveNumber() ?? 0,
        level: scene.level ?? 1,
        xp: scene.xp ?? 0,
        reqXp: scene.reqXp ?? 100,
      });
    }
    scene.renderOverlay?.(hud.ctx);
  }

  requestAnimationFrame(loop);
}

transition(BootScene);
requestAnimationFrame(loop);
