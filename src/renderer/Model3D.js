import { parseOBJ } from './OBJLoader.js';

const AMBIENT = 0.35;
const LIGHT = (() => {
  const x = 0.4, y = 0.8, z = -0.4;
  const l = Math.hypot(x, y, z);
  return [x / l, y / l, z / l];
})();

export default class Model3D {
  constructor(objText, img) {
    const { positions, uvs, faces } = parseOBJ(objText);
    this.positions = positions;
    this.uvs = uvs;
    this.faces = faces;
    this._faceColors = this._extractColors(img, uvs, faces);
  }

  _extractColors(img, uvs, faces) {
    const FALLBACK = [240, 180, 30];
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    if (!iw || !ih) return faces.map(() => FALLBACK);
    try {
      const tmp = document.createElement('canvas');
      tmp.width = iw; tmp.height = ih;
      const g = tmp.getContext('2d', { willReadFrequently: true });
      g.drawImage(img, 0, 0);
      const data = g.getImageData(0, 0, iw, ih).data;
      return faces.map(([va]) => {
        // Use first vertex UV — picocad faces map to one palette color, center-sampled.
        const u = uvs[va.ti][0];
        const v = uvs[va.ti][1];
        const px = Math.min(Math.round(u * iw - 0.5), iw - 1);
        const py = Math.min(Math.round(v * ih - 0.5), ih - 1);
        const i = (py * iw + px) * 4;
        const r = data[i], g2 = data[i + 1], b = data[i + 2];
        return (r + g2 + b < 10) ? FALLBACK : [r, g2, b];
      });
    } catch {
      return faces.map(() => FALLBACK);
    }
  }

  // Pre-render N evenly-spaced yaw angles into offscreen canvases.
  // Call once after construction. size = canvas pixels per frame.
  preRender(frameCount = 36, size = 64, pitch = Math.PI / 5) {
    this._frameCount = frameCount;
    this._frameSize = size;
    this._frames = Array.from({ length: frameCount }, (_, i) => {
      const yaw = (i / frameCount) * Math.PI * 2;
      const c = document.createElement('canvas');
      c.width = size; c.height = size;
      this.draw(c.getContext('2d'), size / 2, size / 2, size * 0.48, yaw, pitch);
      return c;
    });
  }

  // Draw nearest pre-rendered frame scaled to `size` pixels. Falls back to real-time.
  drawBillboard(ctx, cx, cy, size, yaw) {
    if (!this._frames) { this.draw(ctx, cx, cy, size, yaw); return; }
    const N = this._frameCount;
    const fi = (((Math.round(yaw / (Math.PI * 2) * N) % N) + N) % N);
    const half = size / 2;
    ctx.drawImage(this._frames[fi], Math.round(cx - half), Math.round(cy - half),
      Math.round(size), Math.round(size));
  }

  draw(ctx, cx, cy, size, yaw, pitch = 0) {
    const { positions, faces, _faceColors } = this;
    const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
    const cosP = Math.cos(pitch), sinP = Math.sin(pitch);
    const scale = size * 0.5;

    // Rotate: first yaw around Y, then pitch around X (tilt top away = view from above)
    const rotated = positions.map(([px, py, pz]) => {
      const rx = px * cosY + pz * sinY;
      const ry0 = py;
      const rz0 = -px * sinY + pz * cosY;
      return [rx, ry0 * cosP - rz0 * sinP, ry0 * sinP + rz0 * cosP];
    });

    const proj = rotated.map(([rx, ry, rz]) => [
      cx + rx * scale,
      cy - ry * scale,
      rz,
    ]);

    const tris = [];
    for (let fi = 0; fi < faces.length; fi++) {
      const [va, vb, vc] = faces[fi];
      const [x0, y0, z0] = proj[va.vi];
      const [x1, y1, z1] = proj[vb.vi];
      const [x2, y2, z2] = proj[vc.vi];

      // Face normal using rotated positions
      const [rx0, ry0, rz0] = rotated[va.vi];
      const [rx1, ry1, rz1] = rotated[vb.vi];
      const [rx2, ry2, rz2] = rotated[vc.vi];
      const ex = rx1 - rx0, ey = ry1 - ry0, ez = rz1 - rz0;
      const fx = rx2 - rx0, fy = ry2 - ry0, fz = rz2 - rz0;
      const nx = ey * fz - ez * fy;
      const ny = ez * fx - ex * fz;
      const nz = ex * fy - ey * fx;
      const nl = Math.hypot(nx, ny, nz) || 1;
      const shade = Math.max(AMBIENT,
        (nx / nl) * LIGHT[0] + (ny / nl) * LIGHT[1] + (nz / nl) * LIGHT[2]);

      const [r, g, b] = _faceColors[fi];
      tris.push({ x0, y0, x1, y1, x2, y2, depth: (z0 + z1 + z2) / 3, shade, r, g, b });
    }

    // Painter's algorithm: farthest (largest depth) first
    tris.sort((a, b) => b.depth - a.depth);

    for (const t of tris) {
      const sr = Math.round(t.r * t.shade);
      const sg = Math.round(t.g * t.shade);
      const sb = Math.round(t.b * t.shade);
      ctx.fillStyle = `rgb(${sr},${sg},${sb})`;
      ctx.beginPath();
      ctx.moveTo(t.x0, t.y0);
      ctx.lineTo(t.x1, t.y1);
      ctx.lineTo(t.x2, t.y2);
      ctx.closePath();
      ctx.fill();
    }
  }
}
