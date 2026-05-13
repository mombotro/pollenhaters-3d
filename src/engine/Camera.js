import { rotateToward } from '../utils/math.js';

export default class Camera {
  constructor({ offset = 120, lerpAngle = 0.12, pitch = 0, height = 30, fixedAngle = null } = {}) {
    this.x = 0;
    this.y = 0;
    this.angle = 0;
    this.pitch = pitch;
    this.height = height;
    this._offset = offset;
    this._lerpAngle = lerpAngle;
    this._fixedAngle = fixedAngle;
    if (fixedAngle !== null) this.angle = fixedAngle;
  }

  follow(player, dt) {
    if (this._fixedAngle !== null) {
      this.angle = this._fixedAngle;
    } else {
      this.angle = rotateToward(this.angle, player.angle, this._lerpAngle);
    }
    this.x = player.x - Math.cos(this.angle) * this._offset;
    this.y = player.y - Math.sin(this.angle) * this._offset;
  }
}
