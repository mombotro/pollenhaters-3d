const SCREEN_W = 400;
const SCREEN_H = 240;
const PPU = 0.25;            // pixels per world unit — change to zoom
const SPRITE_BASE = 120;     // world-unit footprint for scale=1 entity; size = SPRITE_BASE * PPU
const ANCHOR_Y = 150;        // screen Y where camera origin (bee) sits
const SKY_COLOR = '#87ceeb';
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

    const skyH = Math.round(ANCHOR_Y - SCREEN_H * sinP);
    ctx.fillStyle = SKY_COLOR;
    ctx.fillRect(0, 0, SCREEN_W, Math.max(0, skyH));
    ctx.fillStyle = FLOOR_COLOR;
    ctx.fillRect(0, Math.max(0, skyH), SCREEN_W, SCREEN_H - Math.max(0, skyH));

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

    // Painter's: largest lx (furthest forward / deepest into scene) drawn first
    projected.sort((a, b) => b.lx - a.lx);

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
  }
}
