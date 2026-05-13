import Input from '../engine/Input.js';

const LABELS = {
  BEE_SPEED:          'Bee Speed',
  BEE_CAPACITY:       'Bee Capacity',
  BEE_STINGER_DMG:    'Stinger Damage',
  BEE_STINGER_RATE:   'Attack Speed',
  BEE_STINGER_DIST:   'Stinger Range',
  BEE_STINGER_SPEED:  'Stinger Speed',
  BEE_HP:             'Bee Max HP',
  BEE_ARMOR:          'Bee Armor',
  HIVE_STORAGE:       'Hive Storage',
  HIVE_PRODUCTION:    'Honey Rate',
  HIVE_HP:            'Hive Max HP',
  HIVE_WORKERS:       'Free Worker',
  SOLDIER_DMG:        'Soldier Damage',
  SOLDIER_RATE:       'Soldier Attack Speed',
};

const CARD_X = 40;
const CARD_W = 320;
const CARD_H = 36;
const CARD_GAP = 8;
const CARDS_Y = 110;

export default class LevelUpMenu {
  constructor(onSelect) {
    this._onSelect = onSelect;
    this._visible = false;
    this._options = [];
    this._upgMgr = null;
    this._selIdx = 0;
    this._gpAWas = false;
    this._gpDirWas = false;
    this._onPointerDown = e => this._handleClick(e);
  }

  show(upgradeManager) {
    this._upgMgr = upgradeManager;
    const available = upgradeManager.getAvailableUpgrades();
    for (let i = available.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [available[i], available[j]] = [available[j], available[i]];
    }
    this._options = available.slice(0, 3);
    this._selIdx = 0;
    this._visible = true;
    this._gpAWas = true;
    document.getElementById('game').addEventListener('pointerdown', this._onPointerDown);
  }

  hide() {
    this._visible = false;
    document.getElementById('game').removeEventListener('pointerdown', this._onPointerDown);
  }

  get visible() { return this._visible; }

  update() {
    if (!this._visible) return;

    if (Input.justDown('ArrowUp') || Input.justDown('w') || Input.justDown('W')) {
      this._selIdx = (this._selIdx - 1 + this._options.length) % this._options.length;
    }
    if (Input.justDown('ArrowDown') || Input.justDown('s') || Input.justDown('S')) {
      this._selIdx = (this._selIdx + 1) % this._options.length;
    }
    if (Input.justDown('Enter') || Input.justDown(' ')) {
      this._select(this._selIdx);
      return;
    }

    const pad = navigator.getGamepads?.()[0];
    const up   = pad?.buttons[12]?.pressed || (pad?.axes[1] ?? 0) < -0.4;
    const dn   = pad?.buttons[13]?.pressed || (pad?.axes[1] ?? 0) >  0.4;
    if ((up || dn) && !this._gpDirWas) {
      this._selIdx = (this._selIdx + (dn ? 1 : -1) + this._options.length) % this._options.length;
    }
    this._gpDirWas = up || dn;

    const aDown = pad?.buttons[0]?.pressed ?? false;
    if (aDown && !this._gpAWas) this._select(this._selIdx);
    this._gpAWas = aDown;
  }

  _select(idx) {
    if (!this._visible || !this._options[idx]) return;
    this._onSelect(this._options[idx]);
    this.hide();
  }

  _cardRect(i) {
    return { x: CARD_X, y: CARDS_Y + i * (CARD_H + CARD_GAP), w: CARD_W, h: CARD_H };
  }

  _handleClick(e) {
    const canvas = document.getElementById('game');
    const rect = canvas.getBoundingClientRect();
    const cx = (e.clientX - rect.left) / rect.width  * canvas.width;
    const cy = (e.clientY - rect.top)  / rect.height * canvas.height;
    for (let i = 0; i < this._options.length; i++) {
      const r = this._cardRect(i);
      if (cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h) {
        this._select(i);
        return;
      }
    }
  }

  render(ctx) {
    if (!this._visible) return;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.80)';
    ctx.fillRect(0, 0, 400, 240);

    ctx.textAlign = 'center';
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#ffd700';
    ctx.fillText('LEVEL UP!', 200, 82);

    ctx.font = '7px monospace';
    ctx.fillStyle = '#666';
    ctx.fillText('↑↓ navigate   A / Enter choose', 200, 94);

    for (let i = 0; i < this._options.length; i++) {
      const key = this._options[i];
      const r   = this._cardRect(i);
      const sel = i === this._selIdx;
      const lvl = this._upgMgr?.getLevel(key) ?? 0;

      ctx.fillStyle = sel ? '#664400' : '#1a1a1a';
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = sel ? '#ffd700' : '#444';
      ctx.lineWidth = 1;
      ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);

      ctx.textAlign = 'left';
      ctx.font = `${sel ? 'bold ' : ''}9px monospace`;
      ctx.fillStyle = sel ? '#fff' : '#ffd700';
      ctx.fillText(LABELS[key] ?? key, r.x + 8, r.y + 14);

      ctx.font = '7px monospace';
      ctx.fillStyle = '#888';
      ctx.fillText(`Lv ${lvl} → ${lvl + 1}`, r.x + 8, r.y + 28);

      ctx.textAlign = 'right';
      ctx.font = '7px monospace';
      ctx.fillStyle = sel ? '#ffd700' : '#555';
      ctx.fillText(`${lvl + 1} / 5`, r.x + r.w - 8, r.y + 14);
    }
    ctx.restore();
  }
}
