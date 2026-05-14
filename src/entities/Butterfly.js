import Entity from '../engine/Entity.js';
import World from '../engine/World.js';
import { dist, angleBetween, randInt } from '../utils/math.js';
import { BUTTERFLY, WORLD } from '../constants.js';

export default class Butterfly extends Entity {
  constructor(x, y) {
    super(x, y, 'misc');
    this.spriteFrame = 5;
    this.spriteScale = 0.4;
    this.drag = 0.8;
    this.maxSpeed = BUTTERFLY.SPEED;
    this._angle         = Math.random() * Math.PI * 2;
    this._nextTurn      = 0;
    this._wanderTarget  = null;
    World.add(this, 'butterfly');
  }

  update(time, dt) {
    const player      = World.getByTag('player')[0];
    const pollination = World.getSystem('pollination');
    const flowers     = World.getByTag('flower');

    let steered = false;

    if (player?.alive && dist(this.x, this.y, player.x, player.y) < BUTTERFLY.FLEE_RADIUS) {
      this._angle    = angleBetween(player.x, player.y, this.x, this.y);
      this._nextTurn = time + 1200;
      steered = true;
    }

    if (!steered) steered = this._seekAttractor(time);
    if (!steered) this._wander(time);

    this.vx = Math.cos(this._angle) * BUTTERFLY.SPEED;
    this.vy = Math.sin(this._angle) * BUTTERFLY.SPEED;

    for (const flower of flowers) {
      if (!flower.active) continue;
      const d = dist(this.x, this.y, flower.x, flower.y);
      if (d < BUTTERFLY.POLLINATE_RADIUS && !flower.pollenCollected && flower.lifecycle !== 'young') {
        flower.collectPollen();
        pollination?.pollinate({ x: flower.x, y: flower.y }, time);
      }
      if (d < BUTTERFLY.BOOST_RADIUS) {
        flower.receiveButterflyBoost(dt);
      }
    }
  }

  _wander(time) {
    const margin = 400;
    // Pick a new destination anywhere on the map when close or none set
    if (!this._wanderTarget ||
        dist(this.x, this.y, this._wanderTarget.x, this._wanderTarget.y) < 200) {
      this._wanderTarget = {
        x: randInt(margin, WORLD.WIDTH  - margin),
        y: randInt(margin, WORLD.HEIGHT - margin),
      };
      this._nextTurn = time; // immediate re-steer
    }

    // Re-steer toward destination periodically with slight jitter
    if (time > this._nextTurn) {
      const base = angleBetween(this.x, this.y, this._wanderTarget.x, this._wanderTarget.y);
      this._angle    = base + (Math.random() - 0.5) * 0.6;
      this._nextTurn = time + 1200 + randInt(-300, 300);
    }
  }

  _seekAttractor(time) {
    let nearest = null, nearestDist = Infinity;
    for (const a of World.getByTag('nectar-attractor')) {
      if (!a.active || !a.hasNectar) continue;
      if (a.claimedBy !== null && a.claimedBy !== this) continue;
      const d = dist(this.x, this.y, a.x, a.y);
      if (d < nearestDist) { nearest = a; nearestDist = d; }
    }
    if (!nearest) {
      this._releaseClaim();
      return false;
    }
    // Transfer claim
    if (this._claimedAttractor && this._claimedAttractor !== nearest) this._releaseClaim();
    nearest.claimedBy   = this;
    this._claimedAttractor = nearest;

    if (nearestDist < 120) {
      if (time > (this._attractorWanderNext ?? 0)) {
        this._angle += (Math.random() - 0.5) * Math.PI * 1.2;
        this._attractorWanderNext = time + 500 + Math.random() * 900;
      }
    } else {
      this._angle = angleBetween(this.x, this.y, nearest.x, nearest.y);
    }
    this._wanderTarget = null;
    return true;
  }

  _releaseClaim() {
    if (this._claimedAttractor) {
      this._claimedAttractor.claimedBy = null;
      this._claimedAttractor = null;
    }
  }

  destroy() {
    this._releaseClaim();
    super.destroy();
  }

}
