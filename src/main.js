import Input from './engine/Input.js';
import World from './engine/World.js';
import BillboardRenderer from './renderer/BillboardRenderer.js';
import HUD from './renderer/HUD.js';
import { transition, update as sceneUpdate, getCurrent } from './scenes/index.js';
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
      ...World.getByTag('breakable'),
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
  }

  requestAnimationFrame(loop);
}

transition(BootScene);
requestAnimationFrame(loop);
