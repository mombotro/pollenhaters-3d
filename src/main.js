import World from './engine/World.js';
import Input from './engine/Input.js';
import Camera from './engine/Camera.js';
import BillboardRenderer from './renderer/BillboardRenderer.js';
import { update as physicsUpdate } from './engine/Physics.js';
import { WORLD } from './constants.js';
import PlayerBee from './entities/PlayerBee.js';

const BOUNDS = { minX: 0, minY: 0, maxX: WORLD.WIDTH, maxY: WORLD.HEIGHT };
const ALL_TAGS = ['bee', 'wasp', 'stinger', 'flower', 'tower', 'gem', 'pickup', 'spider', 'butterfly', 'web', 'breakable'];

const canvas = document.getElementById('game');
const renderer = new BillboardRenderer(canvas);
const camera = new Camera({ offset: 120, lerpAngle: 0.12 });

Input.init();

const player = new PlayerBee(WORLD.WIDTH / 2, WORLD.HEIGHT / 2, null);

let lastTime = null;

function loop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  Input.poll();
  World.update(dt * 1000);

  const seen = new Set();
  for (const tag of ALL_TAGS) {
    for (const e of World.getByTag(tag)) {
      if (seen.has(e) || !e.active) continue;
      seen.add(e);
      e.update?.(timestamp, dt);
      physicsUpdate(e, dt, BOUNDS);
    }
  }

  camera.follow(player, dt);

  const allEntities = [...seen];
  renderer.render(camera, allEntities, window.__sprites ?? {});

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
