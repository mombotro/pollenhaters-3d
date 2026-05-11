import Input from '../engine/Input.js';

export default class MenuScene {
  constructor() {
    this._selIdx = 0;
  }

  create() {
    this._canvas = document.getElementById('game');
    this._ctx = this._canvas.getContext('2d');
    this._canvas.addEventListener('pointerdown', this._onClick = (e) => {
      const rect = this._canvas.getBoundingClientRect();
      const scaleY = this._canvas.height / rect.height;
      const cy = (e.clientY - rect.top) * scaleY;
      if (cy > 148 && cy < 168) this._startGame(false);
      else if (cy > 176 && cy < 196) this._startGame(true);
    });
  }

  update() {
    const ctx = this._ctx;
    const W = 400, H = 240;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0a1a00';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = '#ffd700';
    ctx.fillText('POLLEN HATERS 3D', W / 2, 55);

    ctx.font = '9px monospace';
    ctx.fillStyle = '#aaaaaa';
    ctx.fillText('Protect the hive. Survive.', W / 2, 78);

    const items = ['[ START ]', '[ PLAYGROUND ]'];
    items.forEach((label, i) => {
      ctx.font = i === this._selIdx ? 'bold 14px monospace' : '14px monospace';
      ctx.fillStyle = i === this._selIdx ? '#ffffff' : '#ffd700';
      ctx.fillText(label, W / 2, 158 + i * 28);
    });

    ctx.font = '8px monospace';
    ctx.fillStyle = '#555';
    ctx.fillText('Up/Down: navigate   Enter/Space: select', W / 2, 225);
    ctx.textAlign = 'left';

    if (Input.justDown('ArrowDown') || Input.justDown('s') || Input.justDown('S')) {
      this._selIdx = (this._selIdx + 1) % items.length;
    }
    if (Input.justDown('ArrowUp') || Input.justDown('w') || Input.justDown('W')) {
      this._selIdx = (this._selIdx - 1 + items.length) % items.length;
    }
    if (Input.justDown('Enter') || Input.justDown(' ')) {
      this._startGame(this._selIdx === 1);
    }
  }

  _startGame(playground) {
    import('./index.js').then(({ transition }) =>
      import('./GameScene.js').then(({ default: GameScene }) =>
        transition(GameScene, { playground })
      )
    );
  }

  destroy() {
    if (this._onClick) this._canvas?.removeEventListener('pointerdown', this._onClick);
  }

  getCamera() { return null; }
}
