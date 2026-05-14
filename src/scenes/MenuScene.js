import Input from '../engine/Input.js';

export default class MenuScene {
  constructor() {
    this._selIdx = 0;
    this._gpAWas = true;
  }

  create() {
    this._canvas = document.getElementById('game');
    this._ctx = this._canvas.getContext('2d');

    this._splash = new Image();
    this._splash.src = `${import.meta.env.BASE_URL}splash-small.png`;

    const getIdx = (e) => {
      const rect = this._canvas.getBoundingClientRect();
      const scaleY = this._canvas.height / rect.height;
      const cy = (e.clientY - rect.top) * scaleY;
      if (cy > 115 && cy < 150) return 0; // Play
      if (cy > 150 && cy < 185) return 1; // Upgrades
      if (cy > 185 && cy < 220) return 2; // Playground
      return -1;
    };

    this._canvas.addEventListener('pointermove', this._onMove = (e) => {
      const idx = getIdx(e);
      if (idx >= 0) this._selIdx = idx;
    });

    this._canvas.addEventListener('pointerdown', this._onClick = (e) => {
      const idx = getIdx(e);
      if (idx >= 0) this._startGame(idx);
    });
  }

  update() {
    const ctx = this._ctx;
    const W = 400, H = 240;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0a1a00';
    ctx.fillRect(0, 0, W, H);

    if (this._splash?.complete && this._splash.naturalWidth > 0) {
      const ih = 108;
      const iw = Math.round(ih * this._splash.naturalWidth / this._splash.naturalHeight);
      ctx.drawImage(this._splash, Math.round((W - iw) / 2), 6, iw, ih);
    }

    ctx.textAlign = 'center';

    const items = ['[ START ]', '[ UPGRADES ]', '[ PLAYGROUND ]'];
    items.forEach((label, i) => {
      ctx.font = i === this._selIdx ? 'bold 14px monospace' : '14px monospace';
      ctx.fillStyle = i === this._selIdx ? '#ffffff' : '#ffd700';
      ctx.fillText(label, W / 2, 138 + i * 28);
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

    const pad = navigator.getGamepads?.()[0];
    if (pad) {
      const gpUp = (pad.axes[1] ?? 0) < -0.4 || pad.buttons[12]?.pressed;
      const gpDown = (pad.axes[1] ?? 0) > 0.4 || pad.buttons[13]?.pressed;
      const anyDir = gpUp || gpDown;
      
      if (anyDir && !this._gpDirWas) {
        if (gpUp) this._selIdx = (this._selIdx - 1 + items.length) % items.length;
        if (gpDown) this._selIdx = (this._selIdx + 1) % items.length;
      }
      this._gpDirWas = anyDir;

      const gpA = pad.buttons[0]?.pressed ?? false;
      if (gpA && !this._gpAWas) {
        this._startGame(this._selIdx);
      }
      this._gpAWas = gpA;
    }

    if (Input.justDown('Enter') || Input.justDown(' ')) {
      this._startGame(this._selIdx);
    }

    if (Input.mouseJustDown(0)) {
      const rect = this._canvas.getBoundingClientRect();
      const scaleY = this._canvas.height / rect.height;
      const cy = (Input.mouseClientY() - rect.top) * scaleY;
      let idx = -1;
      if (cy > 115 && cy < 150) idx = 0;
      else if (cy > 150 && cy < 185) idx = 1;
      else if (cy > 185 && cy < 220) idx = 2;
      if (idx >= 0) this._startGame(idx);
    }
  }

  _startGame(idx) {
    import('./index.js').then(({ transition }) => {
      if (idx === 1) {
        import('./MetaUpgradeScene.js').then(({ default: S }) => transition(S));
      } else {
        import('./GameScene.js').then(({ default: S }) => transition(S, { playground: idx === 2 }));
      }
    });
  }

  destroy() {
    if (this._onClick) this._canvas?.removeEventListener('pointerdown', this._onClick);
    if (this._onMove) this._canvas?.removeEventListener('pointermove', this._onMove);
  }

  getCamera() { return null; }
}
