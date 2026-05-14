import MetaSave from '../systems/MetaSave.js';
import Input from '../engine/Input.js';

export default class GameOverScene {
  constructor(data = {}) {
    this.won = data.won ?? false;
    this.score = data.score ?? 0;
    this.waves = data.waves ?? 0;
    this.timeSurvived = data.timeSurvived ?? 0;
    this.wonByDestruction = data.wonByDestruction ?? false;

    this.playground = data.playground ?? false;
    const earned = (!this.playground && this.wonByDestruction)
      ? 300 + Math.round(200 * Math.max(0, 1 - this.timeSurvived / 600)) + Math.floor(this.score / 10)
      : this.playground ? 0 : Math.floor(this.score / 10);
    if (!this.playground) MetaSave.addJelly(earned);
    this.earned = earned;

    const s = MetaSave.load();
    if (this.score > (s.highScore ?? 0)) s.highScore = this.score;
    s.lastRun = { score: this.score, waves: this.waves, timeSurvived: this.timeSurvived, won: this.won };
    MetaSave.save(s);
    this.highScore = MetaSave.load().highScore ?? 0;
    this._clicked = false;
  }

  create() {
    this._canvas = document.getElementById('game');
    this._ctx = this._canvas.getContext('2d');
    this._gpAWasDown = true;
    this._canvas.addEventListener('pointerdown', this._onClick = () => { this._clicked = true; });
  }

  update() {
    const ctx = this._ctx;
    const W = 400, H = 240;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#1a0a00';
    ctx.fillRect(0, 0, W, H);

    const headline = this.wonByDestruction ? 'HIVE DESTROYED!' : this.won ? 'YOU WIN!' : 'HIVE LOST';
    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = (this.won || this.wonByDestruction) ? '#ffd700' : '#ff4444';
    ctx.textAlign = 'center';
    ctx.fillText(headline, W / 2, 50);

    const mins = Math.floor(this.timeSurvived / 60);
    const secs = String(this.timeSurvived % 60).padStart(2, '0');
    ctx.font = '10px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`Score: ${this.score}   Waves: ${this.waves}   Time: ${mins}:${secs}`, W / 2, 90);
    if (!this.playground) {
      ctx.fillStyle = '#ffcc00';
      ctx.fillText(`+${this.earned} Royal Jelly`, W / 2, 115);
    }
    ctx.fillStyle = '#888888';
    ctx.fillText(`High score: ${this.highScore}`, W / 2, 135);

    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('[ BACK TO MENU ]', W / 2, 185);
    ctx.textAlign = 'left';

    if (this._clicked || Input.justDown('Enter') || Input.justDown(' ') || Input.gamepad.justDown(0)) {
      this._clicked = false;
      this._goMenu();
    }
  }

  _goMenu() {
    import('./index.js').then(({ transition }) =>
      import('./MetaUpgradeScene.js').then(({ default: MetaUpgradeScene }) => transition(MetaUpgradeScene, { fromGameOver: true }))
    );
  }

  destroy() {
    if (this._onClick) this._canvas?.removeEventListener('pointerdown', this._onClick);
  }

  getCamera() { return null; }
}
