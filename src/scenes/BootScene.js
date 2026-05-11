export default class BootScene {
  constructor() {}

  create() {
    window.__sprites = window.__sprites ?? {};

    // Sheets: { path, fw, fh, key }
    const sheets = [
      { key: 'bee-sheet',   path: '/bee_sheet.png',      fw: 48,  fh: 48  },
      { key: 'flower',      path: '/flowers-sheet.png',  fw: 400, fh: 400 },
      { key: 'hive',        path: '/hives.png',          fw: 400, fh: 400 },
      { key: 'pickup',      path: '/pickups.png',        fw: 400, fh: 400 },
      { key: 'misc',        path: '/misc.png',           fw: 400, fh: 400 },
      { key: 'wasp',        path: '/wasp.png',           fw: 52,  fh: 52  },
    ];

    let loaded = 0;
    const done = () => {
      import('./index.js').then(({ transition }) =>
        import('./MenuScene.js').then(({ default: MenuScene }) =>
          transition(MenuScene)
        )
      );
    };

    // Procedural canvas textures
    const off = document.createElement('canvas');
    const g = off.getContext('2d');

    off.width = 8; off.height = 3;
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 8, 3);
    const stingerImg = new Image();
    stingerImg.src = off.toDataURL();
    window.__sprites['stinger'] = { img: stingerImg, fw: 8, fh: 3 };

    off.width = 28; off.height = 28;
    g.clearRect(0, 0, 28, 28);
    g.fillStyle = '#4488ff';
    g.beginPath(); g.arc(14, 14, 12, 0, Math.PI * 2); g.fill();
    const guardBeeImg = new Image();
    guardBeeImg.src = off.toDataURL();
    window.__sprites['guard-bee'] = { img: guardBeeImg, fw: 28, fh: 28 };

    off.width = 40; off.height = 40;
    g.clearRect(0, 0, 40, 40);
    g.fillStyle = '#444'; g.beginPath(); g.arc(20, 20, 18, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#888'; g.beginPath(); g.arc(20, 20, 10, 0, Math.PI * 2); g.fill();
    const turretImg = new Image();
    turretImg.src = off.toDataURL();
    window.__sprites['stinger-turret'] = { img: turretImg, fw: 40, fh: 40 };

    off.width = 48; off.height = 48;
    g.clearRect(0, 0, 48, 48);
    g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 2;
    g.beginPath(); g.arc(24, 24, 22, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(24, 24, 14, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(24, 24, 6, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(2, 24); g.lineTo(46, 24); g.stroke();
    g.beginPath(); g.moveTo(24, 2); g.lineTo(24, 46); g.stroke();
    const webImg = new Image();
    webImg.src = off.toDataURL();
    window.__sprites['web'] = { img: webImg, fw: 48, fh: 48 };

    for (const { key, path, fw, fh } of sheets) {
      const img = new Image();
      img.onload  = () => { window.__sprites[key] = { img, fw, fh }; loaded++; if (loaded === sheets.length) done(); };
      img.onerror = () => { loaded++; if (loaded === sheets.length) done(); };
      img.src = path;
    }
  }

  destroy() {}
}
