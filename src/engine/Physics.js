export function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

export function update(entity, dt, bounds = null) {
  entity.vx += entity.ax * dt;
  entity.vy += entity.ay * dt;

  const dragFactor = Math.pow(entity.drag, dt);
  entity.vx *= dragFactor;
  entity.vy *= dragFactor;

  entity.vx = clamp(entity.vx, -entity.maxSpeed, entity.maxSpeed);
  entity.vy = clamp(entity.vy, -entity.maxSpeed, entity.maxSpeed);

  entity.x += entity.vx * dt;
  entity.y += entity.vy * dt;

  if (bounds) {
    entity.x = clamp(entity.x, bounds.minX, bounds.maxX);
    entity.y = clamp(entity.y, bounds.minY, bounds.maxY);
  }
}
