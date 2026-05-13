export function parseOBJ(text) {
  const positions = [];
  const uvs = [];
  const faces = [];

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line.startsWith('v ')) {
      const [, x, y, z] = line.split(/\s+/);
      positions.push([parseFloat(x), parseFloat(y), parseFloat(z)]);
    } else if (line.startsWith('vt ')) {
      const [, u, v] = line.split(/\s+/);
      uvs.push([parseFloat(u), 1 - parseFloat(v)]);
    } else if (line.startsWith('f ')) {
      const verts = line.slice(2).trim().split(/\s+/).map(tok => {
        const parts = tok.split('/');
        return {
          vi: parseInt(parts[0]) - 1,
          ti: parseInt(parts[1]) - 1,
        };
      });
      // Fan triangulation for quads and polygons
      for (let i = 1; i < verts.length - 1; i++) {
        faces.push([verts[0], verts[i], verts[i + 1]]);
      }
    }
  }

  return { positions, uvs, faces };
}
