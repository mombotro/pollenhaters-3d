import Entity from '../engine/Entity.js';
import World from '../engine/World.js';
import { FLOWER, FLOWER_TYPES } from '../constants.js';

const STATE = { YOUNG: 'young', MATURE: 'mature', OLD: 'old', DEAD: 'dead' };

export default class Flower extends Entity {
  constructor(x, y, type = 'COMMON', initialBloom = false) {
    super(x, y, 'flower');
    this.drag = 1;
    this.maxSpeed = 0;

    this._type    = type;
    this._typeDef = FLOWER_TYPES[type];
    this._state   = STATE.YOUNG;
    this._matureAt = null;
    this._oldAt    = null;
    this.onDead    = null;

    this.sapRemaining    = this._typeDef.sapAmount;
    this.pollenCollected = false;
    this.claimedBy       = null;
    this.spriteScale     = initialBloom ? 1.0 : 0.5;

    if (initialBloom) this._enterMature();

    World.add(this, 'flower');
  }

  get flowerType() { return this._type; }
  get lifecycle()  { return this._state; }

  update(time, dt) {
    switch (this._state) {
      case STATE.YOUNG:
        if (this._matureAt === null) this._matureAt = time + FLOWER.YOUNG_DURATION;
        if (time >= this._matureAt) this._enterMature(time);
        break;
      case STATE.MATURE:
        if (this.sapRemaining <= 0 || time >= this._matureAt + this._typeDef.lifespan) {
          this._enterOld(time);
        }
        break;
      case STATE.OLD:
        if (time >= this._oldAt + FLOWER.OLD_DURATION) this._enterDead();
        break;
    }
  }

  collectPollen() {
    if (this._state === STATE.YOUNG || this.pollenCollected) return false;
    this.pollenCollected = true;
    return true;
  }

  receiveButterflyBoost(dt) {
    if (this._state === STATE.YOUNG && this._matureAt !== null) {
      this._matureAt -= dt * 1000;
    } else if (this._state === STATE.OLD) {
      this._oldAt += dt * 1000 * 0.5;
    }
  }

  collectSap(amount) {
    if (this._state === STATE.YOUNG) return 0;
    const taken = Math.min(this.sapRemaining, amount);
    this.sapRemaining -= taken;
    return taken;
  }

  _enterMature(time = 0) {
    this._matureAt = time;
    this._state = STATE.MATURE;
    this.spriteScale = 1.0;
    this.clearTint();
  }

  _enterOld(time) {
    this._state = STATE.OLD;
    this._oldAt = time;
    this.setTint(0x888888);
  }

  _enterDead() {
    this._state = STATE.DEAD;
    if (this.claimedBy) { this.claimedBy._target = null; this.claimedBy = null; }
    if (this.onDead) this.onDead();
    this.destroy();
  }
}
