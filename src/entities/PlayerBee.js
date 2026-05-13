import Entity from '../engine/Entity.js';
import Input from '../engine/Input.js';
import World from '../engine/World.js';
import { BEE } from '../constants.js';
import SoundSynth from '../systems/SoundSynth.js';
import { rotateToward } from '../utils/math.js';

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
    this._preDashAngle = 0;
    this._preDashDrag = this.drag;
    this._dashRotTarget = null;
    this._gpBWasDown = false;
    this._dispFrame = 4;  // float frame index (0-based); 4=back, 12=front
    this._flipActive = false;
    this._aimAngle = null; // null = fire backward; set by right-click
    this._lean = 0;
    this._targetAngle = 0;
    this.modelYaw = Math.PI;
    this.spriteGroundFrac = 0.5;
    this.model3d = window.__beeModel ?? null;

    // Direct mouse tracking — bypasses Input polling order issues
    this._mouseAiming = false;
    this._mouseX = 0;
    this._mouseY = 0;
    this._onMD = e => { if (e.button === 2) { e.preventDefault(); this._mouseAiming = true; } };
    this._onMU = e => { if (e.button === 2) this._mouseAiming = false; };
    this._onMM = e => { this._mouseX = e.clientX; this._mouseY = e.clientY; };
    window.addEventListener('mousedown', this._onMD);
    window.addEventListener('mouseup',   this._onMU);
    window.addEventListener('mousemove', this._onMM);

    World.add(this, 'bee', 'player');
  }

  update(time, dt) {
    if (!this.alive) return;

    // Right-click: aim stingers toward mouse
    this._updateAim();

    if (this.isDashing) {
      const elapsed = BEE.DASH_DURATION - (this.dashEndTime - time);
      const progress = Math.min(elapsed / BEE.DASH_DURATION, 1);
      // first half: turn stinger-forward; second half: turn back
      this._dashRotTarget = progress < 0.5
        ? this._preDashAngle + Math.PI
        : this._preDashAngle;
      if (time >= this.dashEndTime) {
        this.isDashing = false;
        this._dashRotTarget = null;
        this.drag = this._preDashDrag;
      }
    } else {
      const spacePush = Input.justDown(' ');
      const gpA = Input.gamepad.justDown(0);
      const canDash = !World.getSystem('game')?.isPlacing();
      
      if ((spacePush || gpA) && canDash && time - this.lastDashTime >= BEE.DASH_COOLDOWN) {
        this.isDashing = true;
        this.dashEndTime = time + BEE.DASH_DURATION;
        this.lastDashTime = time;
        this._preDashAngle = this._targetAngle;
        this._dashRotTarget = this._preDashAngle + Math.PI;
        this._preDashDrag = this.drag;
        this.drag = 1; // no decay during dash
        const dashSpeed = this._speed * BEE.DASH_SPEED_MULTIPLIER;
        this.vx = Math.cos(this._preDashAngle) * dashSpeed;
        this.vy = Math.sin(this._preDashAngle) * dashSpeed;
      }
    }

    this._readGamepad();

    if (!this.isDashing) {
      this.maxSpeed = this._speed;
      this._move(dt);
    } else {
      this.maxSpeed = this._speed * BEE.DASH_SPEED_MULTIPLIER;
    }

    this._autoFire(time);
    this._updateFrame(dt);
  }

  _readGamepad() {
    if (Input.justDown('b') || Input.justDown('B')) {
      World.getSystem('buildMenu')?.toggle();
    }
    const bDown = Input.gamepad.isDown(1);
    if (bDown && !this._gpBWasDown) {
      World.getSystem('buildMenu')?.toggle();
    }
    this._gpBWasDown = bDown;
  }

  _move(dt) {
    const left  = Input.isDown('ArrowLeft')  || Input.isDown('a');
    const right = Input.isDown('ArrowRight') || Input.isDown('d');
    const up    = Input.isDown('ArrowUp')    || Input.isDown('w');
    const down  = Input.isDown('ArrowDown')  || Input.isDown('s');

    // Screen-space input vector
    let sdx = (right ? 1 : 0) - (left ? 1 : 0);
    let sdy = (down  ? 1 : 0) - (up   ? 1 : 0);

    // Gamepad left stick
    const gpx = Input.gamepad.axis(0);
    const gpy = Input.gamepad.axis(1);
    if (Math.abs(gpx) > 0.15) sdx += gpx;
    if (Math.abs(gpy) > 0.15) sdy += gpy;

    if (sdx !== 0 || sdy !== 0) {
      // Normalize in screen space: weight vertical by sinP (0.5) so all
      // directions have equal visual speed despite isometric compression
      const ISO_SIN_P = 0.5;
      const slen = Math.hypot(sdx, sdy * ISO_SIN_P);
      const wx = (sdx / slen) - (sdy / slen);
      const wy = (sdx / slen) + (sdy / slen);
      const targetVx = wx * this._speed;
      const targetVy = wy * this._speed;
      // Lerp toward target velocity for smooth acceleration
      const accelRate = Math.min(12 * dt, 1);
      this.vx += (targetVx - this.vx) * accelRate;
      this.vy += (targetVy - this.vy) * accelRate;
      this.ax = 0;
      this.ay = 0;
      this.maxSpeed = Math.hypot(targetVx, targetVy);
      if (this._aimAngle === null) this._targetAngle = Math.atan2(wy, wx);
    } else {
      this.ax = 0;
      this.ay = 0;
    }
  }

  _updateFrame(dt) {
    const lft = Input.isDown('ArrowLeft')  || Input.isDown('a');
    const rgt = Input.isDown('ArrowRight') || Input.isDown('d');
    const uup = Input.isDown('ArrowUp')   || Input.isDown('w');
    const dwn = Input.isDown('ArrowDown') || Input.isDown('s');
    // Lean based on net screen-horizontal movement (right-down vs left-up diagonal)
    const sdx = (rgt ? 1 : 0) - (lft ? 1 : 0);
    const sdy = (dwn ? 1 : 0) - (uup ? 1 : 0);
    const leanTarget = Math.max(-1, Math.min(1, sdx - sdy));
    this._lean += (leanTarget - this._lean) * Math.min(8 * dt, 1);
    // Sprite frames: neutral=4, right=6, left=2
    const frameTarget = 4 + this._lean * 2;
    this._dispFrame += (frameTarget - this._dispFrame) * Math.min(10 * dt, 1);
    this.spriteFrame = Math.round(this._dispFrame) % 16;
    // During dash: fast flip stinger-forward then back; otherwise normal turn
    if (this._dashRotTarget !== null) {
      this.angle = rotateToward(this.angle, this._dashRotTarget, 40 * dt);
    } else {
      this.angle = rotateToward(this.angle, this._targetAngle, 8 * dt);
    }
    const cam = World.getSystem('camera');
    const camAngle = cam?.angle ?? this.angle;
    this.modelYaw = this.angle - camAngle;
  }

  _updateAim() {
    // Right thumbstick manual aim
    const gpRx = Input.gamepad.axis(2);
    const gpRy = Input.gamepad.axis(3);
    if (Math.hypot(gpRx, gpRy) > 0.25) {
      const wx = gpRx - gpRy;
      const wy = gpRx + gpRy;
      this._aimAngle = Math.atan2(wy, wx);
      this._targetAngle = this._aimAngle + Math.PI;
      return;
    }

    // Right-click manual aim
    if (this._mouseAiming) {
      const canvas = document.getElementById('game');
      const rect = canvas.getBoundingClientRect();
      const sdx = (this._mouseX - rect.left) / rect.width * 400 - 200;
      const sdy = (this._mouseY - rect.top)  / rect.height * 240 - 150;
      if (Math.hypot(sdx, sdy) > 8) {
        this._aimAngle = Math.atan2(sdx + sdy, sdx - sdy);
        this._targetAngle = this._aimAngle + Math.PI;
      }
      return;
    }

    this._aimAngle = null;
  }

  _autoFire(time) {
    if (!this._onFire || time - this._lastFired < this._stingerRate) return;
    // Always spawn from the bee's back (stinger end, facing camera)
    const backAngle = this.angle + Math.PI;
    const spawnX = this.x + Math.cos(backAngle) * 16;
    const spawnY = this.y + Math.sin(backAngle) * 16;
    // Fire toward aim (right-click mouse) or straight back by default
    const fireAngle = this._aimAngle ?? backAngle;
    const forced = this._aimAngle !== null;
    const fired = this._onFire(spawnX, spawnY, this._stingerRange, this._stingerDamage, this._stingerSpeed, fireAngle, forced);
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

  destroy() {
    window.removeEventListener('mousedown', this._onMD);
    window.removeEventListener('mouseup',   this._onMU);
    window.removeEventListener('mousemove', this._onMM);
    super.destroy();
  }
}
