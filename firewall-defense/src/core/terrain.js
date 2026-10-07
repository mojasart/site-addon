// Terreno do mapa: 'land' (terra) ou 'water' (água).
// Cada mapa tem um terreno padrão e "zonas" com o outro tipo (data/maps.js).

export function inZone(z, x, y) {
  if (z.shape === 'ellipse') return ((x - z.x) / z.rx) ** 2 + ((y - z.y) / z.ry) ** 2 <= 1;
  if (x < z.x || x > z.x + z.w || y < z.y || y > z.y + z.h) return false;
  // cantos arredondados
  const r = z.r ?? 0;
  const cx = Math.max(z.x + r, Math.min(x, z.x + z.w - r));
  const cy = Math.max(z.y + r, Math.min(y, z.y + z.h - r));
  return Math.hypot(x - cx, y - cy) <= r;
}

export function terrainAt(map, x, y) {
  for (let i = map.zones.length - 1; i >= 0; i--) if (inZone(map.zones[i], x, y)) return map.zones[i].terrain;
  return map.terrain;
}

// O círculo inteiro (centro + 8 pontos da borda) está no terreno pedido?
export function fitsTerrain(map, x, y, r, terrain) {
  if (terrainAt(map, x, y) !== terrain) return false;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    if (terrainAt(map, x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8) !== terrain) return false;
  }
  return true;
}
