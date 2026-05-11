export default class BootScene {
  constructor() {}

  create() {
    const assets = [
      ['player-bee',  '/bee.png'],
      ['wasp',        '/wasp.png'],
      ['flower',      '/flowers-sheet.png'],
      ['hive',        '/hives.png'],
      ['misc',        '/misc.png'],
      ['pickups',     '/pickups.png'],
    ];

    window.__sprites = window.__sprites ?? {};
    let loaded = 0;

    const done = () => {
      import('./index.js').then(({ transition }) =>
        import('./MenuScene.js').then(({ default: MenuScene }) =>
          transition(MenuScene)
        )
      );
    };

    // Generate procedural canvas textures
    const offscreen = document.createElement('canvas');
    const gctx = offscreen.getContext('2d');

    offscreen.width = 8; offscreen.height = 3;
    gctx.fillStyle = '#ffffff';
    gctx.fillRect(0, 0, 8, 3);
    const stingerImg = new Image();
    stingerImg.src = offscreen.toDataURL();
    window.__sprites['stinger'] = stingerImg;

    offscreen.width = 28; offscreen.height = 28;
    gctx.clearRect(0, 0, 28, 28);
    gctx.fillStyle = '#4488ff';
    gctx.beginPath(); gctx.arc(14, 14, 12, 0, Math.PI * 2); gctx.fill();
    const guardBeeImg = new Image();
    guardBeeImg.src = offscreen.toDataURL();
    window.__sprites['guard-bee'] = guardBeeImg;

    offscreen.width = 40; offscreen.height = 40;
    gctx.clearRect(0, 0, 40, 40);
    gctx.fillStyle = '#444444';
    gctx.beginPath(); gctx.arc(20, 20, 18, 0, Math.PI * 2); gctx.fill();
    gctx.fillStyle = '#888888';
    gctx.beginPath(); gctx.arc(20, 20, 10, 0, Math.PI * 2); gctx.fill();
    const turretImg = new Image();
    turretImg.src = offscreen.toDataURL();
    window.__sprites['stinger-turret'] = turretImg;

    offscreen.width = 8; offscreen.height = 8;
    gctx.clearRect(0, 0, 8, 8);
    gctx.fillStyle = '#ffffff';
    gctx.beginPath(); gctx.arc(4, 4, 4, 0, Math.PI * 2); gctx.fill();
    const particleImg = new Image();
    particleImg.src = offscreen.toDataURL();
    window.__sprites['particle'] = particleImg;

    offscreen.width = 48; offscreen.height = 48;
    gctx.clearRect(0, 0, 48, 48);
    gctx.strokeStyle = 'rgba(255,255,255,0.7)';
    gctx.lineWidth = 2;
    gctx.beginPath(); gctx.arc(24, 24, 22, 0, Math.PI * 2); gctx.stroke();
    gctx.beginPath(); gctx.arc(24, 24, 14, 0, Math.PI * 2); gctx.stroke();
    gctx.beginPath(); gctx.arc(24, 24, 6, 0, Math.PI * 2); gctx.stroke();
    gctx.strokeStyle = 'rgba(255,255,255,0.4)';
    gctx.lineWidth = 1;
    gctx.beginPath(); gctx.moveTo(2, 24); gctx.lineTo(46, 24); gctx.stroke();
    gctx.beginPath(); gctx.moveTo(24, 2); gctx.lineTo(24, 46); gctx.stroke();
    const webImg = new Image();
    webImg.src = offscreen.toDataURL();
    window.__sprites['web'] = webImg;

    if (assets.length === 0) { done(); return; }

    for (const [key, path] of assets) {
      const img = new Image();
      img.onload = () => {
        window.__sprites[key] = img;
        loaded++;
        if (loaded === assets.length) done();
      };
      img.onerror = () => {
        loaded++;
        if (loaded === assets.length) done();
      };
      img.src = path;
    }
  }

  destroy() {}
}
