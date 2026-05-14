import Input from '../engine/Input.js';
import { TOWER, WORKER, SOLDIER, NECTAR_ATTRACTOR } from '../constants.js';

const ITEMS = [
  { key: 'resin-trap',        label: 'Resin Trap',       cost: TOWER.RESIN_TRAP_COST      },
  { key: 'guard-post',        label: 'Guard Post',        cost: TOWER.GUARD_POST_COST      },
  { key: 'poison-honey',      label: 'Poison Honey',      cost: TOWER.POISON_HONEY_COST    },
  { key: 'nectar-attractor',  label: 'Nectar Attractor',  cost: NECTAR_ATTRACTOR.COST      },
  { key: 'recruit-worker',    label: 'Recruit Worker',    cost: WORKER.COST                },
  { key: 'recruit-soldier',   label: 'Recruit Soldier',   cost: SOLDIER.COST               },
];

const MENU_W = 170;
const ITEM_H = 20;
const ITEM_GAP = 4;
const MENU_X = (400 - MENU_W) / 2;
const MENU_Y = 58;

export default class BuildMenu {
  constructor(canvas, resources, onSelect) {
    this._canvas = canvas;
    this._resources = resources;
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
    this._openedAt = Date.now();
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

    const bPressed = Input.justDown('b') || Input.justDown('B') || Input.gamepad.justDown(1);
    const escPressed = Input.justDown('Escape');

    if (escPressed || (bPressed && Date.now() - this._openedAt > 200)) {
      this.hide();
      return;
    }

    const pad = navigator.getGamepads?.()[0];
    if (!pad) return;

    const up   = (pad.axes[1] ?? 0) < -0.4 || pad.buttons[12]?.pressed;
    const down = (pad.axes[1] ?? 0) >  0.4 || pad.buttons[13]?.pressed;
    const anyDir = up || down;
    if (anyDir && !this._gpDirWas) {
      this._gpIdx = (this._gpIdx + (down ? 1 : -1) + ITEMS.length) % ITEMS.length;
    }
    this._gpDirWas = anyDir;

    const aDown = pad.buttons[0]?.pressed ?? false;
    if (aDown && !this._gpAWas) {
      this._onSelect(ITEMS[this._gpIdx].key);
      this.hide();
    }
    this._gpAWas = aDown;
  }

  render(ctx) {
    if (!this._visible) return;
    const honey = this._resources.getHoney();
    const totalH = ITEMS.length * (ITEM_H + ITEM_GAP) + 20;

    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#111';
    ctx.fillRect(MENU_X - 8, MENU_Y - 20, MENU_W + 16, totalH);
    ctx.globalAlpha = 1;

    ctx.textAlign = 'center';
    ctx.font = 'bold 8px monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText('BUILD  [B] close', 200, MENU_Y - 7);

    ctx.textAlign = 'left';
    ctx.font = '8px monospace';
    for (let i = 0; i < ITEMS.length; i++) {
      const item = ITEMS[i];
      const r = this._rect(i);
      const canAfford = honey >= item.cost;
      const active = i === this._hovered || i === this._gpIdx;

      if (active) {
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(r.x, r.y, r.w, r.h);
      }
      ctx.fillStyle = !canAfford ? '#555' : active ? '#fff' : '#ffd700';
      ctx.fillText(`${item.label}  ${item.cost}h`, r.x + 5, r.y + 14);
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
        this.hide();
        return;
      }
    }
    this.hide();
  }

  destroy() {
    this.hide();
  }
}
