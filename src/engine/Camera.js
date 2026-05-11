import { rotateToward } from '../utils/math.js';

export default class Camera {
  constructor({ offset = 120, lerpAngle = 0.12 } = {}) {
    this.x = 0;
    this.y = 0;
    this.angle = 0;
    this._offset = offset;
    this._lerpAngle = lerpAngle;
  }

  follow(player, dt) {
    this.angle = rotateToward(this.angle, player.angle, this._lerpAngle);
    this.x = player.x - Math.cos(this.angle) * this._offset;
    this.y = player.y - Math.sin(this.angle) * this._offset;
  }
}
