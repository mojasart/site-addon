import { VIEW_H } from '../../config.js';

// Peças comuns aos temas de mapa

// Pontos aleatórios dentro das zonas de água (pro brilho animado)
export function waterSparkles(h, count) {
  const out = [];
  for (let i = 0; i < count * 20 && out.length < count; i++) {
    const x = h.rr(h.minX, h.maxX);
    const y = h.rr(10, VIEW_H - 10);
    if (h.terrain(x, y) === 'water' && h.free(x, y, 8)) out.push({ x, y, p: h.rr(0, 6), s: h.rr(3, 6) });
  }
  return out;
}

export function drawSparkles(ctx, list, t) {
  ctx.fillStyle = '#ffffff';
  for (const s of list) {
    const a = Math.sin(t * 2 + s.p);
    if (a < 0.3) continue;
    ctx.globalAlpha = (a - 0.3) * 1.2;
    const r = s.s * a;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y - r);
    ctx.quadraticCurveTo(s.x, s.y, s.x + r, s.y);
    ctx.quadraticCurveTo(s.x, s.y, s.x, s.y + r);
    ctx.quadraticCurveTo(s.x, s.y, s.x - r, s.y);
    ctx.quadraticCurveTo(s.x, s.y, s.x, s.y - r);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// Desenha o traçado do caminho (cada tema chama com suas cores)
export function strokePath(g, path, width, style, dash) {
  const pts = path.points;
  g.beginPath();
  pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
  g.lineJoin = 'round';
  g.lineCap = 'butt';
  g.lineWidth = width;
  g.strokeStyle = style;
  g.setLineDash(dash ?? []);
  g.stroke();
  g.setLineDash([]);
}
