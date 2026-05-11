import World from './engine/World.js';
import Input from './engine/Input.js';
import Camera from './engine/Camera.js';
import BillboardRenderer from './renderer/BillboardRenderer.js';
import Entity from './engine/Entity.js';
import { update as physicsUpdate } from './engine/Physics.js';
import { WORLD } from './constants.js';

const BOUNDS = { minX: 0, minY: 0, maxX: WORLD.WIDTH, maxY: WORLD.HEIGHT };

const canvas = document.getElementById('game');
const renderer = new BillboardRenderer(canvas);
const camera = new Camera({ offset: 120, lerpAngle: 0.12 });

Input.init();

// Smoke test entity — remove after PlayerBee is ported (Task 9)
const testEntity = new Entity(WORLD.WIDTH / 2, WORLD.HEIGHT / 2, null);
testEntity.spriteScale = 1;
testEntity.vx = 50;
testEntity.drag = 0.5;
testEntity.maxSpeed = 200;
World.add(testEntity, 'debug');

camera.x = testEntity.x - 200;
camera.y = testEntity.y;
camera.angle = 0;

let lastTime = null;

function loop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  Input.poll();
  World.update(dt * 1000);

  for (const e of World.getByTag('debug')) {
    if (!e.active) continue;
    physicsUpdate(e, dt, BOUNDS);
  }

  camera.x = testEntity.x - 200;

  renderer.render(camera, World.getByTag('debug'), {});
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
