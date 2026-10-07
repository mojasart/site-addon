import { VIEW_H, TILE } from '../../config.js';

// Medidas do caminho elevado: a pegada da peça é exatamente a dos quadrados
// por onde ele passa (TILE de largura, nos dois sentidos). O 3D fica por
// dentro: o topo sobe PATH_DEPTH e mostra a parede embaixo dele.
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

// Caminho elevado (3/4) que ocupa exatamente os quadrados por onde passa.
// Tudo é desenhado numa camada à parte e recortado pela pegada do caminho
// (traço de TILE de largura): parede embaixo, topo subido PATH_DEPTH por
// cima, e o contorno por último.
//   side          → cor da parede
//   rim / inner   → borda do topo e o miolo (rimW = largura da borda)
//   top(g, w)     → detalhes do tema no topo (já subido), w = largura do miolo
export function drawRaisedPath(g, path, { side, rim, inner, rimW = 5, outline, top }) {
  const layer = document.createElement('canvas');
  layer.width = g.canvas.width;
  layer.height = g.canvas.height;
  const l = layer.getContext('2d');
  l.setTransform(g.getTransform());
  // parede (aparece embaixo do topo subido)
  strokePath(l, path, TILE, side);
  // filete escuro onde o topo encontra a parede
  l.save();
  l.translate(0, -PATH_DEPTH + 2);
  strokePath(l, path, PATH_TOP, outline);
  l.restore();
  // topo
  l.save();
  l.translate(0, -PATH_DEPTH);
  strokePath(l, path, PATH_TOP, rim);
  strokePath(l, path, PATH_TOP - rimW * 2, inner);
  top?.(l, PATH_TOP - rimW * 2);
  l.restore();
  // contorno: o anel entre a pegada e o topo
  const ring = document.createElement('canvas');
  ring.width = layer.width;
  ring.height = layer.height;
  const r = ring.getContext('2d');
  r.setTransform(g.getTransform());
  strokePath(r, path, TILE, outline);
  r.globalCompositeOperation = 'destination-out';
  strokePath(r, path, TILE - PATH_EDGE * 2, '#000');
  l.save();
  l.setTransform(1, 0, 0, 1, 0, 0);
  l.drawImage(ring, 0, 0);
  l.restore();
  // recorta pela pegada exata (o topo subido não passa da borda de cima)
  l.globalCompositeOperation = 'destination-in';
  strokePath(l, path, TILE, '#000');
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.drawImage(layer, 0, 0);
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
