const _particles = [];

export function emit(x, y, color, count = 3, speed = 35) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const s = speed * (0.5 + Math.random() * 0.8);
    _particles.push({
      x, y,
      vx: Math.cos(angle) * s,
      vy: Math.sin(angle) * s,
      life: 1,
      decay: 1.2 + Math.random() * 0.8,
      color,
      size: 1.5 + Math.random() * 1.5,
    });
  }
}

export function update(dt) {
  for (let i = _particles.length - 1; i >= 0; i--) {
    const p = _particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.88;
    p.vy *= 0.88;
    p.life -= p.decay * dt;
    if (p.life <= 0) _particles.splice(i, 1);
  }
}

export function render(ctx, wToS) {
  if (!_particles.length) return;
  ctx.save();
  for (const p of _particles) {
    const { sx, sy } = wToS(p.x, p.y);
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    const s = p.size;
    ctx.fillRect(sx - s / 2, sy - s / 2, s, s);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

export function clear() { _particles.length = 0; }
