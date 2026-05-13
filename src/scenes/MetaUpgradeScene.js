import Input from '../engine/Input.js';
import MetaSave from '../systems/MetaSave.js';

const UPGRADES = [
  { key: 'BEE_SPEED_META',    label: 'Bee Speed',      cost: 50,  max: 3, desc: '+20 speed per level' },
  { key: 'BEE_HP_META',       label: 'Bee Health',     cost: 75,  max: 3, desc: '+2 max HP per level' },
  { key: 'HIVE_HP_META',      label: 'Hive Health',    cost: 75,  max: 3, desc: '+5 hive max HP per level' },
  { key: 'HIVE_STORAGE_META', label: 'Honey Storage',  cost: 100, max: 3, desc: '+50 storage per level' },
  { key: 'START_WORKER',      label: 'Start: Worker',  cost: 100, max: 1, desc: 'Begin each run with 1 worker bee' },
  { key: 'START_ARMOR',       label: 'Start: Armor',   cost: 150, max: 1, desc: 'Begin with 1 armor' },
  { key: 'START_HONEY',       label: 'Start: Honey',   cost: 80,  max: 1, desc: 'Begin with 30 honey' },
  { key: 'START_GUARD',       label: 'Start: Guard',   cost: 200, max: 1, desc: 'Begin with 1 guard post' },
  { key: 'START_SOLDIER',     label: 'Start: Soldier', cost: 120, max: 1, desc: 'Begin with 1 soldier bee escort' },
  { key: 'SOLDIER_DMG_META',  label: 'Soldier Damage', cost: 100, max: 3, desc: '+1 soldier damage per level' },
  { key: 'QUICK_RUN_META',    label: 'Quick Run',      cost: 50,  max: 3, desc: 'Survive 1 min less per level (min 7)' },
  { key: 'LONG_RUN_META',     label: 'Longer Run',     cost: 75,  max: 99, desc: 'Survive 5 min more per level' },
  { key: 'HARD_MODE_META',    label: 'Hard Mode',      cost: 75,  max: 3,  desc: '+2 wasps per wave per level' },
  { key: 'EXTRA_HIVES_META',  label: 'Extra Hive',     cost: 200, max: 2,  desc: '+1 enemy wasp hive per level' },
];

const W = 400, H = 240;
const SCROLL_TOP = 50;
const SCROLL_BOTTOM = 205;
const SCROLL_H = SCROLL_BOTTOM - SCROLL_TOP;
const ROW_H = 26;
const MAX_SCROLL = Math.max(0, UPGRADES.length * ROW_H - SCROLL_H);

export default class MetaUpgradeScene {
  constructor(data = {}) {
    this._fromGameOver = data.fromGameOver ?? false;
    this._scrollY = 0;
    this._hoveredIdx = -1;
    this._gpIdx = 0;
    this._jelly = MetaSave.load().jellyBalance;
    this._pendingReset = false;
    this._pendingResetTimer = 0;

    this._gpAWas = true;
    this._gpBWas = true;
    this._gpDirWas = true;
  }

  create() {
    this._canvas = document.getElementById('game');
    this._ctx = this._canvas.getContext('2d');
    
    this._onMove = (e) => {
      const rect = this._canvas.getBoundingClientRect();
      const scaleY = this._canvas.height / rect.height;
      const cy = (e.clientY - rect.top) * scaleY;
      
      this._hoveredIdx = -1;
      if (cy >= SCROLL_TOP && cy <= SCROLL_BOTTOM) {
        const listY = cy - SCROLL_TOP + this._scrollY;
        const rowIdx = Math.floor(listY / ROW_H);
        if (rowIdx >= 0 && rowIdx < UPGRADES.length) {
          this._hoveredIdx = rowIdx;
          this._gpIdx = rowIdx;
        }
      } else if (cy > 210) {
        const scaleX = this._canvas.width / rect.width;
        const cx = (e.clientX - rect.left) * scaleX;
        if (cx < 100) this._hoveredIdx = 100; // Refund
        else if (cx > 300) this._hoveredIdx = 101; // Reset
        else this._hoveredIdx = 102; // Back
        this._gpIdx = UPGRADES.length + (this._hoveredIdx - 100);
      }
    };

    this._onClick = (e) => {
      this._onMove(e);
      this._doAction(this._hoveredIdx);
    };

    this._onWheel = (e) => {
      this._scrollY = Math.max(0, Math.min(MAX_SCROLL, this._scrollY + (e.deltaY > 0 ? 30 : -30)));
    };

    this._canvas.addEventListener('pointermove', this._onMove);
    this._canvas.addEventListener('pointerdown', this._onClick);
    this._canvas.addEventListener('wheel', this._onWheel);
  }

  update(dt, time) {
    if (this._pendingResetTimer > 0 && time > this._pendingResetTimer) {
      this._pendingReset = false;
      this._pendingResetTimer = 0;
    }

    if (Input.justDown('Escape')) {
      this._goBack();
      return;
    }

    if (Input.justDown('ArrowDown') || Input.justDown('s') || Input.justDown('S')) {
      this._gpIdx = (this._gpIdx + 1) % (UPGRADES.length + 3);
      this._ensureVisible(this._gpIdx);
    }
    if (Input.justDown('ArrowUp') || Input.justDown('w') || Input.justDown('W')) {
      this._gpIdx = (this._gpIdx - 1 + UPGRADES.length + 3) % (UPGRADES.length + 3);
      this._ensureVisible(this._gpIdx);
    }
    if (Input.justDown('Enter') || Input.justDown(' ')) {
      this._doAction(this._gpIdx < UPGRADES.length ? this._gpIdx : 100 + (this._gpIdx - UPGRADES.length));
    }

    const pad = navigator.getGamepads?.()[0];
    if (pad) {
      const gpUp = (pad.axes[1] ?? 0) < -0.4 || pad.buttons[12]?.pressed;
      const gpDown = (pad.axes[1] ?? 0) > 0.4 || pad.buttons[13]?.pressed;
      const anyDir = gpUp || gpDown;
      
      if (anyDir && !this._gpDirWas) {
        if (gpUp) this._gpIdx = (this._gpIdx - 1 + UPGRADES.length + 3) % (UPGRADES.length + 3);
        if (gpDown) this._gpIdx = (this._gpIdx + 1) % (UPGRADES.length + 3);
        this._ensureVisible(this._gpIdx);
      }
      this._gpDirWas = anyDir;

      const gpA = pad.buttons[0]?.pressed ?? false;
      if (gpA && !this._gpAWas) {
        this._doAction(this._gpIdx < UPGRADES.length ? this._gpIdx : 100 + (this._gpIdx - UPGRADES.length));
      }
      this._gpAWas = gpA;

      const gpB = pad.buttons[1]?.pressed ?? false;
      if (gpB && !this._gpBWas) {
        this._goBack();
        return;
      }
      this._gpBWas = gpB;
    }

    this._render();
  }

  _ensureVisible(idx) {
    if (idx >= UPGRADES.length) return;
    const itemTop = idx * ROW_H;
    const itemBot = itemTop + ROW_H;
    if (itemTop < this._scrollY) {
      this._scrollY = itemTop;
    } else if (itemBot > this._scrollY + SCROLL_H) {
      this._scrollY = itemBot - SCROLL_H;
    }
  }

  _doAction(idx) {
    if (idx < 0) return;
    if (idx < UPGRADES.length) {
      const def = UPGRADES[idx];
      const s = MetaSave.load();
      const current = s.upgrades[def.key] ?? 0;
      if (current < def.max && s.jellyBalance >= def.cost) {
        MetaSave.purchaseUpgrade(def.key, def.cost);
        this._jelly = MetaSave.load().jellyBalance;
        import('../systems/SoundSynth.js').then(({ default: S }) => S.play('spawn'));
      } else {
        import('../systems/SoundSynth.js').then(({ default: S }) => S.play('hit'));
      }
    } else if (idx === 100) { // Refund All
      const s = MetaSave.load();
      UPGRADES.forEach(def => {
        s.jellyBalance += (s.upgrades[def.key] ?? 0) * def.cost;
        s.upgrades[def.key] = 0;
      });
      MetaSave.save(s);
      this._jelly = s.jellyBalance;
      import('../systems/SoundSynth.js').then(({ default: S }) => S.play('hit'));
    } else if (idx === 101) { // Reset Save
      if (!this._pendingReset) {
        this._pendingReset = true;
        this._pendingResetTimer = Date.now() + 3000;
      } else {
        MetaSave.reset();
        this._pendingReset = false;
        this._jelly = MetaSave.load().jellyBalance;
      }
    } else if (idx === 102) { // Back
      this._goBack();
    }
  }

  _goBack() {
    import('./index.js').then(({ transition }) =>
      import('./MenuScene.js').then(({ default: MenuScene }) => transition(MenuScene))
    );
  }

  _render() {
    const ctx = this._ctx;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0a0500';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = '#ffd700';
    ctx.fillText('UPGRADES', W / 2, 20);

    ctx.font = '12px monospace';
    ctx.fillStyle = '#ffcc00';
    ctx.fillText(`Royal Jelly: ${this._jelly}`, W / 2, 38);

    // Separators
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(10, SCROLL_TOP - 1); ctx.lineTo(390, SCROLL_TOP - 1);
    ctx.moveTo(10, SCROLL_BOTTOM + 1); ctx.lineTo(390, SCROLL_BOTTOM + 1);
    ctx.stroke();

    // Arrows
    ctx.fillStyle = this._scrollY > 0 ? '#888' : '#333';
    ctx.fillText('▲', W / 2, SCROLL_TOP - 4);
    ctx.fillStyle = this._scrollY < MAX_SCROLL ? '#888' : '#333';
    ctx.fillText('▼', W / 2, SCROLL_BOTTOM + 12);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, SCROLL_TOP, W, SCROLL_H);
    ctx.clip();

    const s = MetaSave.load();

    for (let i = 0; i < UPGRADES.length; i++) {
      const def = UPGRADES[i];
      const y = SCROLL_TOP + i * ROW_H - this._scrollY;
      
      if (y + ROW_H < SCROLL_TOP || y > SCROLL_BOTTOM) continue;

      const isHovered = (this._hoveredIdx === i) || (this._gpIdx === i);
      if (isHovered) {
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(10, y, 380, ROW_H);
      }

      ctx.textAlign = 'left';
      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = '#fff';
      ctx.fillText(def.label, 15, y + 10);
      
      ctx.font = '7px monospace';
      ctx.fillStyle = '#888';
      ctx.fillText(def.desc, 15, y + 20);

      const level = s.upgrades[def.key] ?? 0;
      ctx.textAlign = 'center';
      ctx.font = '10px monospace';
      ctx.fillStyle = '#ccc';
      ctx.fillText(`${level}/${def.max}`, 260, y + 14);

      const maxed = level >= def.max;
      const canAfford = s.jellyBalance >= def.cost;
      
      ctx.fillStyle = maxed ? '#555' : canAfford ? (isHovered ? '#fff' : '#ffd700') : '#555';
      ctx.font = isHovered && !maxed && canAfford ? 'bold 10px monospace' : '10px monospace';
      ctx.fillText(maxed ? 'MAXED' : `[ ${def.cost}j ]`, 340, y + 14);
    }
    ctx.restore();

    ctx.font = '10px monospace';
    const refundActive = (this._hoveredIdx === 100) || (this._gpIdx === UPGRADES.length);
    ctx.fillStyle = refundActive ? '#fff' : '#ffaa00';
    ctx.fillText('[ REFUND ALL ]', 60, 225);

    const resetActive = (this._hoveredIdx === 101) || (this._gpIdx === UPGRADES.length + 1);
    ctx.fillStyle = resetActive ? '#ff8888' : '#ff4444';
    ctx.fillText(this._pendingReset ? '[ CONFIRM? ]' : '[ RESET SAVE ]', 340, 225);

    const backActive = (this._hoveredIdx === 102) || (this._gpIdx === UPGRADES.length + 2);
    ctx.font = backActive ? 'bold 14px monospace' : '14px monospace';
    ctx.fillStyle = backActive ? '#fff' : '#ffd700';
    ctx.fillText('[ MENU ]', W / 2, 225);
  }

  destroy() {
    this._canvas.removeEventListener('pointermove', this._onMove);
    this._canvas.removeEventListener('pointerdown', this._onClick);
    this._canvas.removeEventListener('wheel', this._onWheel);
  }

  getCamera() { return null; }
}
