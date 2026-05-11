const SCREEN_W = 400;
const SCREEN_H = 240;
const FOV = Math.PI / 3;
const PROJECTION_PLANE = (SCREEN_W / 2) / Math.tan(FOV / 2);
const HORIZON = SCREEN_H / 2;
const MIN_SPRITE_H = 4;
const SKY_COLOR = '#87ceeb';
const FLOOR_COLOR = '#3a5a1c';

export default class BillboardRenderer {
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

    ctx.fillStyle = SKY_COLOR;
    ctx.fillRect(0, 0, SCREEN_W, HORIZON);
    ctx.fillStyle = FLOOR_COLOR;
    ctx.fillRect(0, HORIZON, SCREEN_W, HORIZON);

    const projected = [];
    for (const entity of entities) {
      if (!entity.visible || !entity.active) continue;

      const dx = entity.x - camera.x;
      const dy = entity.y - camera.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 1) continue;

      let relAngle = Math.atan2(dy, dx) - camera.angle;
      while (relAngle >  Math.PI) relAngle -= Math.PI * 2;
      while (relAngle < -Math.PI) relAngle += Math.PI * 2;
      if (Math.abs(relAngle) > FOV * 0.55) continue;

      const screenX = Math.round((relAngle / FOV + 0.5) * SCREEN_W);
      const spriteH = Math.round((PROJECTION_PLANE / dist) * (entity.spriteScale ?? 1) * 32);
      if (spriteH < MIN_SPRITE_H) continue;

      projected.push({ entity, dist, screenX, spriteH });
    }

    projected.sort((a, b) => b.dist - a.dist);

    for (const { entity, screenX, spriteH } of projected) {
      const entry = sprites?.[entity.spriteKey];
      const drawX = Math.round(screenX - spriteH / 2);
      const drawY = Math.round(HORIZON - spriteH * 0.6);
      const alpha = entity.alpha ?? 1;

      if (entry) {
        const { img, fw, fh } = entry;
        const cols = Math.max(1, Math.floor(img.naturalWidth / fw));
        const frame = entity.spriteFrame ?? 0;
        const sx = (frame % cols) * fw;
        const sy = Math.floor(frame / cols) * fh;

        if (alpha < 1) ctx.globalAlpha = alpha;
        ctx.drawImage(img, sx, sy, fw, fh, drawX, drawY, spriteH, spriteH);
        if (alpha < 1) ctx.globalAlpha = 1;
      } else {
        // Fallback colored rect
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ffaa00';
        ctx.fillRect(drawX, drawY, spriteH, spriteH);
        ctx.globalAlpha = 1;
      }

      if (entity.tint) {
        ctx.globalAlpha = 0.35 * alpha;
        ctx.fillStyle = `#${entity.tint.toString(16).padStart(6, '0')}`;
        ctx.fillRect(drawX, drawY, spriteH, spriteH);
        ctx.globalAlpha = 1;
      }
    }
  }
}
