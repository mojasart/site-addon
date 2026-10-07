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

// Base de um caminho ELEVADO em perspectiva 3/4 (mesmo ângulo do servidor):
// sombra no chão + parede lateral aparecendo embaixo do traçado. O tema
// desenha o topo depois, no lugar de sempre (onde os inimigos andam).
//   depth → altura da parede     side/sideDark → cor da parede (topo → base)
export function raisedPathBase(g, path, { depth, side, sideDark, outline, shadow = 'rgba(10,20,40,0.28)' }) {
  const w = path.width;
  g.save();
  g.translate(6, depth + 6);
  strokePath(g, path, w + 12, shadow);
  g.restore();
  // contorno da peça inteira (parede + topo)
  for (let k = depth; k >= 0; k -= 2) {
    g.save();
    g.translate(0, k);
    strokePath(g, path, w + 8, outline);
    g.restore();
  }
  // parede: escurece de cima pra baixo
  for (let k = depth; k >= 1; k--) {
    g.save();
    g.translate(0, k);
    strokePath(g, path, w, mix(side, sideDark, k / depth));
    g.restore();
  }
  // emendas verticais nas paredes dos trechos horizontais (lê como painéis)
  g.strokeStyle = 'rgba(10,15,30,0.35)';
  g.lineWidth = 2;
  g.beginPath();
  for (const line of lines(path)) {
    const pts = line.points;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      if (Math.abs(a.y - b.y) > 1) continue;
      const y = a.y + w / 2;
      const [x0, x1] = a.x < b.x ? [a.x, b.x] : [b.x, a.x];
      for (let x = x0 + w / 2 + 14; x < x1 - w / 2 - 4; x += 28) {
        g.moveTo(x, y + 4);
        g.lineTo(x, y + depth);
      }
    }
  }
  g.stroke();
  // filete escuro onde a parede encontra o topo
  g.save();
  g.translate(0, 2);
  strokePath(g, path, w + 8, outline);
  g.restore();
}

// Mistura duas cores #rrggbb (t=0 → a, t=1 → b)
function mix(a, b, t) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (s) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
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
