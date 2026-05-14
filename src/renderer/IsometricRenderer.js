import { WORLD } from '../constants.js';
import World from '../engine/World.js';
import * as Particles from '../systems/ParticleSystem.js';

const SCREEN_W = 400;
const SCREEN_H = 240;
const PPU = 0.25;            // pixels per world unit — change to zoom
const SPRITE_BASE = 120;     // world-unit footprint for scale=1 entity; size = SPRITE_BASE * PPU
const ANCHOR_Y = 150;        // screen Y where camera origin (bee) sits
const FLOOR_COLOR = '#3a5a1c';

export default class IsometricRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    canvas.width = SCREEN_W;
    canvas.height = SCREEN_H;
    canvas.style.imageRendering = 'pixelated';
    canvas.style.width = '100vmin';
    canvas.style.height = `${100 * (SCREEN_H / SCREEN_W)}vmin`;
  }

  render(camera, entities, sprites) {
    const ctx = this.ctx;
    const pitch = camera.pitch ?? Math.PI / 6;
    const sinP = Math.sin(pitch);
    const camCos = Math.cos(camera.angle);
    const camSin = Math.sin(camera.angle);

    // Background Void (Darker green outside playable map)
    ctx.fillStyle = '#253f12';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

    const sToW = (sx, sy) => {
      const ly = (sx - SCREEN_W / 2) / PPU;
      const lx = (ANCHOR_Y - sy) / (PPU * sinP);
      const dx = lx * camCos - ly * camSin;
      const dy = lx * camSin + ly * camCos;
      return { x: camera.x + dx, y: camera.y + dy };
    };

    const wToS = (x, y) => {
      const dx = x - camera.x;
      const dy = y - camera.y;
      const lx = dx * camCos + dy * camSin;
      const ly = -dx * camSin + dy * camCos;
      return { sx: SCREEN_W / 2 + ly * PPU, sy: ANCHOR_Y - lx * PPU * sinP };
    };

    const W = WORLD.WIDTH;
    const H = WORLD.HEIGHT;
    const c1 = wToS(0, 0);
    const c2 = wToS(W, 0);
    const c3 = wToS(W, H);
    const c4 = wToS(0, H);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(c1.sx, c1.sy);
    ctx.lineTo(c2.sx, c2.sy);
    ctx.lineTo(c3.sx, c3.sy);
    ctx.lineTo(c4.sx, c4.sy);
    ctx.closePath();
    ctx.fillStyle = FLOOR_COLOR;
    ctx.fill();
    ctx.clip();

    const tl = sToW(0, 0);
    const tr = sToW(SCREEN_W, 0);
    const bl = sToW(0, SCREEN_H);
    const br = sToW(SCREEN_W, SCREEN_H);
    const minX = Math.min(tl.x, tr.x, bl.x, br.x);
    const maxX = Math.max(tl.x, tr.x, bl.x, br.x);
    const minY = Math.min(tl.y, tr.y, bl.y, br.y);
    const maxY = Math.max(tl.y, tr.y, bl.y, br.y);

    const GRID = 100;
    const startX = Math.floor(minX / GRID) * GRID;
    const startY = Math.floor(minY / GRID) * GRID;

    ctx.beginPath();
    for (let x = Math.max(0, startX); x <= Math.min(W, maxX); x += GRID) {
      const p1 = wToS(x, 0);
      const p2 = wToS(x, H);
      ctx.moveTo(Math.round(p1.sx), Math.round(p1.sy));
      ctx.lineTo(Math.round(p2.sx), Math.round(p2.sy));
    }
    for (let y = Math.max(0, startY); y <= Math.min(H, maxY); y += GRID) {
      const p1 = wToS(0, y);
      const p2 = wToS(W, y);
      ctx.moveTo(Math.round(p1.sx), Math.round(p1.sy));
      ctx.lineTo(Math.round(p2.sx), Math.round(p2.sy));
    }
    ctx.strokeStyle = '#4b7524';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    ctx.restore();

    ctx.beginPath();
    ctx.moveTo(c1.sx, c1.sy);
    ctx.lineTo(c2.sx, c2.sy);
    ctx.lineTo(c3.sx, c3.sy);
    ctx.lineTo(c4.sx, c4.sy);
    ctx.closePath();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#1a2a0c';
    ctx.stroke();

    // Draw Webs
    const webs = World.getByTag('web');
    if (webs.length > 0) {
      ctx.save();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(220, 220, 255, 0.75)';
      ctx.beginPath();
      for (const w of webs) {
        if (!w.active) continue;
        const p1 = wToS(w.x1, w.y1);
        const p2 = wToS(w.x2, w.y2);
        ctx.moveTo(p1.sx, p1.sy);
        ctx.lineTo(p2.sx, p2.sy);
      }
      ctx.stroke();
      ctx.restore();
    }

    const projected = [];
    for (const entity of entities) {
      if (!entity.visible || !entity.active) continue;

      const dx = entity.x - camera.x;
      const dy = entity.y - camera.y;
      // lx = forward/depth component (dot with camera facing direction)
      // ly = right component (dot with camera right vector, used for screen X)
      const lx =  dx * camCos + dy * camSin;
      const ly = -dx * camSin + dy * camCos;

      const sx = SCREEN_W / 2 + ly * PPU;
      const sy = ANCHOR_Y   - lx * PPU * sinP;

      if (sx < -200 || sx > SCREEN_W + 200 || sy < -200 || sy > SCREEN_H + 200) continue;

      const size = Math.round(SPRITE_BASE * PPU * (entity.spriteScale ?? 1));
      projected.push({ entity, sx, sy, lx, size });
    }

    // Layer 0 (ground decor) always behind layer 1 (gameplay entities); within each layer: painter's sort
    projected.sort((a, b) => {
      const la = a.entity.renderLayer ?? 1;
      const lb = b.entity.renderLayer ?? 1;
      if (la !== lb) return la - lb;
      return b.lx - a.lx;
    });

    for (const { entity, sx, sy, size } of projected) {
      const groundFrac = entity.spriteGroundFrac ?? 0.6;
      const alpha = entity.alpha ?? 1;

      if (entity.model3d) {
        const mcx = Math.round(sx);
        const mcy = Math.round(sy - size * (groundFrac - 0.5));
        if (alpha < 1) ctx.globalAlpha = alpha;
        const yaw = entity.modelYaw ?? (entity.angle - camera.angle + Math.PI);
        entity.model3d.drawBillboard(ctx, mcx, mcy, size, yaw);
        if (entity.tint) {
          ctx.globalAlpha = 0.35 * alpha;
          ctx.fillStyle = `#${entity.tint.toString(16).padStart(6, '0')}`;
          ctx.fillRect(mcx - size / 2, mcy - size / 2, size, size);
        }
        if (alpha < 1 || entity.tint) ctx.globalAlpha = 1;
      } else {
        // Squash sprite height by sinP so sprites lie on the isometric ground plane
        const drawW = size;
        const drawH = Math.round(size * sinP);
        const drawX = Math.round(sx - drawW / 2);
        const drawY = Math.round(sy - drawH * groundFrac);

        const entry = sprites?.[entity.spriteKey];
        if (entry) {
          const { img, fw, fh } = entry;
          const cols = Math.max(1, Math.floor(img.naturalWidth / fw));
          const frame = entity.spriteFrame ?? 0;
          const fx = (frame % cols) * fw;
          const fy = Math.floor(frame / cols) * fh;
          if (alpha < 1) ctx.globalAlpha = alpha;
          ctx.drawImage(img, fx, fy, fw, fh, drawX, drawY, drawW, drawH);
          if (alpha < 1) ctx.globalAlpha = 1;
        } else {
          ctx.globalAlpha = alpha;
          ctx.fillStyle = '#ffaa00';
          ctx.fillRect(drawX, drawY, drawW, drawH);
          ctx.globalAlpha = 1;
        }

        if (entity.tint) {
          ctx.globalAlpha = 0.35 * alpha;
          ctx.fillStyle = `#${entity.tint.toString(16).padStart(6, '0')}`;
          ctx.fillRect(drawX, drawY, drawW, drawH);
          ctx.globalAlpha = 1;
        }
      }
    }

    Particles.render(ctx, wToS);
  }
}
