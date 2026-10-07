import { VIEW_H, TILE } from '../../config.js';

// Medidas do caminho elevado: a pegada da peça (o pé da parede) é
// exatamente a dos quadrados por onde ele passa (TILE de largura, nos dois
// sentidos). Em perspectiva, o topo fica PATH_DEPTH acima da pegada, então
// ele "invade" um pouco o quadrado de cima, e a parede aparece embaixo.
export const PATH_DEPTH = 8; // altura da parede
export const PATH_EDGE = 3; // contorno escuro
export const PATH_TOP = TILE - PATH_EDGE * 2; // largura do topo (48)

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

// Caminho elevado (3/4): a pegada (pé da parede) ocupa exatamente os
// quadrados por onde passa; o topo fica PATH_DEPTH acima dela (invade um
// pouco o quadrado de cima) e a parede aparece embaixo do topo.
//   side          → cor da parede
//   rim / inner   → borda do topo e o miolo (rimW = largura da borda)
//   top(g, w)     → detalhes do tema no topo (já subido), w = largura do miolo
export function drawRaisedPath(g, path, { side, rim, inner, rimW = 5, outline, top }) {
  // contorno: a silhueta inteira, da pegada até o topo subido
  for (let k = 0; k >= -PATH_DEPTH; k -= 2) {
    g.save();
    g.translate(0, k);
    strokePath(g, path, TILE, outline);
    g.restore();
  }
  // parede (na pegada; o topo cobre a parte de cima dela)
  strokePath(g, path, PATH_TOP, side);
  // filete escuro onde o topo encontra a parede
  g.save();
  g.translate(0, -PATH_DEPTH + 2);
  strokePath(g, path, PATH_TOP, outline);
  g.restore();
  // topo
  g.save();
  g.translate(0, -PATH_DEPTH);
  strokePath(g, path, PATH_TOP, rim);
  strokePath(g, path, PATH_TOP - rimW * 2, inner);
  top?.(g, PATH_TOP - rimW * 2);
  g.restore();
}

// Linhas a desenhar: todas as rotas do mapa (sem repetir o trecho comum)
// ou uma rota só, se vier um Path simples
export function lines(path) {
  return path.lines ?? [path];
}

// Desenha o traçado do caminho (cada tema chama com suas cores). Todas as
// rotas entram no mesmo traço, então os encontros (Y, loop) ficam limpos.
export function strokePath(g, path, width, style, dash) {
  g.beginPath();
  for (const line of lines(path)) line.points.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
  g.lineJoin = 'round';
  g.lineCap = 'butt';
  g.lineWidth = width;
  g.strokeStyle = style;
  g.setLineDash(dash ?? []);
  g.stroke();
  g.setLineDash([]);
}

// Divisões do caminho nas bordas dos quadrados da grade: cada "placa" do
// caminho é exatamente um quadrado (o caminho anda pelos centros, em linha
// reta, então as bordas caem a cada TILE px no eixo do trecho)
export function tileSeams(g, path, width, style, lineWidth = 2) {
  g.beginPath();
  for (const line of lines(path)) {
    const pts = line.points;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      const horizontal = Math.abs(b.x - a.x) > Math.abs(b.y - a.y);
      const [from, to] = horizontal ? [a.x, b.x] : [a.y, b.y];
      const lo = Math.min(from, to);
      const hi = Math.max(from, to);
      for (let k = Math.ceil((lo + 1) / TILE) * TILE; k < hi - 1; k += TILE) {
        if (horizontal) {
          g.moveTo(k, a.y - width / 2);
          g.lineTo(k, a.y + width / 2);
        } else {
          g.moveTo(a.x - width / 2, k);
          g.lineTo(a.x + width / 2, k);
        }
      }
    }
  }
  g.lineCap = 'butt';
  g.lineWidth = lineWidth;
  g.strokeStyle = style;
  g.stroke();
}
