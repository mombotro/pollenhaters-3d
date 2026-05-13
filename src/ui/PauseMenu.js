import Input from '../engine/Input.js';

const ITEMS = [
  { key: 'resume',   label: 'Resume' },
  { key: 'restart',  label: 'Restart' },
  { key: 'controls', label: 'Controls' },
  { key: 'quit',     label: 'Quit to Menu' },
];

const MENU_W = 160;
const ITEM_H = 20;
const ITEM_GAP = 4;
const MENU_X = (400 - MENU_W) / 2;
const MENU_Y = 80;

export default class PauseMenu {
  constructor(canvas, onSelect) {
    this._canvas = canvas;
    this._onSelect = onSelect;
    this._visible = false;
    this._hovered = -1;
    this._gpIdx = 0;
    this._gpDirWas = false;
    this._gpAWas = false;

    this._onPointerMove = e => this._handleMove(e);
    this._onPointerDown = e => this._handleDown(e);
  }

  toggle() { this._visible ? this.hide() : this.show(); }
  get visible() { return this._visible; }

  show() {
    this._visible = true;
    this._gpIdx = 0;
    this._hovered = -1;
    this._canvas.addEventListener('pointermove', this._onPointerMove);
    this._canvas.addEventListener('pointerdown', this._onPointerDown);
  }

  hide() {
    this._visible = false;
    this._canvas.removeEventListener('pointermove', this._onPointerMove);
    this._canvas.removeEventListener('pointerdown', this._onPointerDown);
  }

  update() {
    if (!this._visible) return;

    let up = Input.justDown('ArrowUp') || Input.justDown('w');
    let down = Input.justDown('ArrowDown') || Input.justDown('s');
    let aDown = Input.justDown('Enter') || Input.justDown(' ');

    const pad = navigator.getGamepads?.()[0];
    if (pad) {
      const gpUp = (pad.axes[1] ?? 0) < -0.4 || pad.buttons[12]?.pressed;
      const gpDown = (pad.axes[1] ?? 0) > 0.4 || pad.buttons[13]?.pressed;
      const anyDir = gpUp || gpDown;
      
      if (anyDir && !this._gpDirWas) {
        if (gpUp) up = true;
        if (gpDown) down = true;
      }
      this._gpDirWas = anyDir;

      const gpA = pad.buttons[0]?.pressed ?? false;
      if (gpA && !this._gpAWas) aDown = true;
      this._gpAWas = gpA;
    }

    if (up) this._gpIdx = (this._gpIdx - 1 + ITEMS.length) % ITEMS.length;
    if (down) this._gpIdx = (this._gpIdx + 1) % ITEMS.length;

    if (aDown) {
      this._onSelect(ITEMS[this._gpIdx].key);
      if (ITEMS[this._gpIdx].key === 'resume') {
        this.hide();
      }
    }
  }

  render(ctx) {
    if (!this._visible) return;
    const totalH = ITEMS.length * (ITEM_H + ITEM_GAP) + 30;

    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#111';
    ctx.fillRect(MENU_X - 8, MENU_Y - 25, MENU_W + 16, totalH);
    ctx.globalAlpha = 1;

    ctx.textAlign = 'center';
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText('PAUSED', 200, MENU_Y - 7);

    ctx.textAlign = 'left';
    ctx.font = '8px monospace';
    for (let i = 0; i < ITEMS.length; i++) {
      const item = ITEMS[i];
      const r = this._rect(i);
      const active = i === this._hovered || i === this._gpIdx;

      if (active) {
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(r.x, r.y, r.w, r.h);
      }
      ctx.fillStyle = active ? '#fff' : '#ffd700';
      ctx.textAlign = 'center';
      ctx.fillText(item.label, 200, r.y + 14);
    }
    ctx.restore();
  }

  _rect(i) {
    return { x: MENU_X, y: MENU_Y + i * (ITEM_H + ITEM_GAP), w: MENU_W, h: ITEM_H };
  }

  _coords(e) {
    const rect = this._canvas.getBoundingClientRect();
    return {
      cx: (e.clientX - rect.left) / rect.width  * 400,
      cy: (e.clientY - rect.top)  / rect.height * 240,
    };
  }

  _handleMove(e) {
    const { cx, cy } = this._coords(e);
    this._hovered = -1;
    for (let i = 0; i < ITEMS.length; i++) {
      const r = this._rect(i);
      if (cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h) {
        this._hovered = i; break;
      }
    }
  }

  _handleDown(e) {
    e.preventDefault();
    const { cx, cy } = this._coords(e);
    for (let i = 0; i < ITEMS.length; i++) {
      const r = this._rect(i);
      if (cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h) {
        this._onSelect(ITEMS[i].key);
        if (ITEMS[i].key === 'resume') {
          this.hide();
        }
        return;
      }
    }
  }

  destroy() {
    this.hide();
  }
}
