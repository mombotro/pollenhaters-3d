const SCREEN_W = 400;
const SCREEN_H = 240;
const FOV = Math.PI / 3;
const PROJECTION_PLANE = (SCREEN_W / 2) / Math.tan(FOV / 2);
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
    // Pitch shifts horizon up (looking down) or down (looking up).
    // pitchPixels > 0 = camera tilted down = horizon above screen center.
    const pitchPixels = Math.round(PROJECTION_PLANE * Math.tan(camera.pitch ?? 0));
    const horizon = Math.round(SCREEN_H / 2 - pitchPixels);

    ctx.fillStyle = SKY_COLOR;
    ctx.fillRect(0, 0, SCREEN_W, horizon);
    ctx.fillStyle = FLOOR_COLOR;
    ctx.fillRect(0, horizon, SCREEN_W, SCREEN_H - horizon);

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

    const camHeight = camera.height ?? 0;
    for (const { entity, dist, screenX, spriteH } of projected) {
      const drawX = Math.round(screenX - spriteH / 2);
      // Ground-projected Y: entities near horizon when far, lower on screen when close.
      const groundY = camHeight > 0
        ? horizon + Math.round(PROJECTION_PLANE * camHeight / dist)
        : horizon;
      const drawY = Math.round(groundY - spriteH * (entity.spriteGroundFrac ?? 0.6));
      const alpha = entity.alpha ?? 1;
      const cx = drawX + spriteH / 2;
      const cy = drawY + spriteH / 2;

      if (entity.model3d) {
        if (alpha < 1) ctx.globalAlpha = alpha;
        const yaw = entity.modelYaw ?? (entity.angle - camera.angle + Math.PI);
        entity.model3d.drawBillboard(ctx, cx, cy, spriteH, yaw);
        if (alpha < 1) ctx.globalAlpha = 1;
      } else {
        const entry = sprites?.[entity.spriteKey];
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
          ctx.globalAlpha = alpha;
          ctx.fillStyle = '#ffaa00';
          ctx.fillRect(drawX, drawY, spriteH, spriteH);
          ctx.globalAlpha = 1;
        }
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
