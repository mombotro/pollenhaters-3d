const SCREEN_W = 400;

export default class HUD {
  constructor(ctx) {
    this.ctx = ctx;
  }

  render({ hp, maxHp, honey, honeyStorage, timer, sapCarried, sapCapacity, wave, level, xp, reqXp }) {
    const ctx = this.ctx;
    ctx.font = '8px monospace';

    // HP bar
    const hpW = 60;
    ctx.fillStyle = '#333';
    ctx.fillRect(4, 4, hpW, 6);
    ctx.fillStyle = '#ff4444';
    ctx.fillRect(4, 4, Math.round(hpW * Math.max(0, hp / maxHp)), 6);
    ctx.fillStyle = '#fff';
    ctx.fillText(`HP ${hp}/${maxHp}`, 4, 20);

    // Honey
    ctx.fillText(`Honey: ${Math.floor(honey)}/${honeyStorage}`, 4, 30);

    // Sap carried
    if (sapCarried > 0) ctx.fillText(`Sap: ${sapCarried}/${sapCapacity}`, 4, 40);

    // Level/XP
    ctx.fillText(`Lv ${level}  XP ${xp}/${reqXp}`, 4, 50);

    // Timer (top right)
    const remaining = Math.max(0, timer);
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    const timerStr = `${mins}:${secs.toString().padStart(2, '0')}`;
    ctx.fillText(timerStr, SCREEN_W - 32, 12);

    // Wave
    ctx.fillText(`Wave ${wave}`, SCREEN_W - 40, 22);
  }
}
