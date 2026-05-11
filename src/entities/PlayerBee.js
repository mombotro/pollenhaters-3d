import Entity from '../engine/Entity.js';
import Input from '../engine/Input.js';
import World from '../engine/World.js';
import { rotateToward } from '../utils/math.js';
import { BEE } from '../constants.js';
import SoundSynth from '../systems/SoundSynth.js';

export default class PlayerBee extends Entity {
  constructor(x, y, onFire) {
    super(x, y, 'bee-sheet');
    this.maxSpeed = BEE.SPEED;
    this.drag = 0.015;
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
        if (ax === 0 && ay === 0) { ax = Input.gamepad.axis(0); ay = Input.gamepad.axis(1); }

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

    // Wing-flap animation (8 frames across rows 0-1 of bee_sheet)
    const moving = Math.hypot(this.vx, this.vy) > 10;
    this.spriteFrame = moving ? Math.floor(time / 80) % 8 : 0;
  }

  _readGamepad() {
    const rx = Input.gamepad.axis(2);
    const ry = Input.gamepad.axis(3);
    if (Math.hypot(rx, ry) > 0.15) this._aimAngle = Math.atan2(ry, rx);

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
