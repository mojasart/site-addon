import { VIEW_H, OUTLINE, GOLD, TILE } from '../../config.js';
import { rrect, circle, fillOutline } from '../canvas.js';
import { strokePath, drawRaisedPath, lines, tileSeams, PATH_DEPTH } from './shared.js';
import { tileOf, tileKey } from '../../core/grid.js';

// Tema PLACA-MÃE: placa verde, trilhas de cobre, resistores e LEDs.

// Os detalhes são espalhados por uma grade: cada célula recebe no máximo
// uma trilha (e as peças respeitam distância mínima entre si), pra não
// amontoar tudo nos espaços livres maiores.
const CELL_W = 150;
const CELL_H = 135;
const TRACE_GAP = 22; // distância mínima entre trilhas diferentes
const PART_GAP = { resistor: 90, led: 70 }; // distância mínima entre peças do mesmo tipo

export function layout(h) {
  const cells = gridCells(h);
  const traces = [];
  const tracePts = []; // pontos de todas as trilhas já aceitas (pra checar distância)

  for (const c of cells) {
    for (let tries = 0; tries < 25; tries++) {
      let x = h.rr(c.x0 + 10, c.x1 - 10);
      let y = h.rr(c.y0 + 10, c.y1 - 10);
      const pts = [[x, y]];
      let horizontal = h.rnd() < 0.5;
      for (let k = 0; k < 3; k++) {
        const len = h.rr(30, 85) * (h.rnd() < 0.5 ? -1 : 1);
        if (horizontal) x += len;
        else y += len;
        pts.push([x, y]);
        horizontal = !horizontal;
      }
      if (!segmentsFree(pts, h.free)) continue;
      const samples = sample(pts);
      if (samples.some(([sx, sy]) => tracePts.some(([tx, ty]) => Math.hypot(sx - tx, sy - ty) < TRACE_GAP))) continue;
      traces.push(pts);
      tracePts.push(...samples);
      break;
    }
  }

  // resistores bloqueiam a construção: cada um ocupa um quadrado da grade
  // (no centro), sem dois vizinhos
  const res = [];
  for (const [c, r] of h.freeTiles()) {
    if (res.length >= 8) break;
    if (res.some(([rc, rr]) => Math.abs(rc - c) <= 1 && Math.abs(rr - r) <= 1)) continue;
    const { x, y } = h.tileCenter(c, r);
    h.add({ kind: 'resistor', x, y, rad: 14, tile: [c, r], vertical: h.rnd() < 0.5 });
    res.push([c, r]);
  }
  let led = 0;
  placeSpread(h, cells, 'led', 12, (x, y) => ({ kind: 'led', x, y, rad: 7, color: ['#ff4d5e', '#3dff9a', '#ffd23f', '#5fb4ff'][led++ % 4] }), 7);
  return { traces };
}

// Células da grade em ordem embaralhada (com a semente do mapa)
function gridCells(h) {
  const cols = Math.max(1, Math.round((h.maxX - h.minX) / CELL_W));
  const rows = Math.max(1, Math.round(VIEW_H / CELL_H));
  const cw = (h.maxX - h.minX) / cols;
  const ch = VIEW_H / rows;
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({ x0: h.minX + c * cw, x1: h.minX + (c + 1) * cw, y0: r * ch, y1: (r + 1) * ch });
    }
  }
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(h.rnd() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  return cells;
}

// Uma peça por célula (dando a volta na grade), longe das outras do mesmo tipo
function placeSpread(h, cells, kind, count, make, rad) {
  const placed = [];
  for (let i = 0; i < cells.length * 3 && placed.length < count; i++) {
    const c = cells[i % cells.length];
    for (let tries = 0; tries < 12; tries++) {
      const x = h.rr(c.x0 + rad, c.x1 - rad);
      const y = h.rr(Math.max(c.y0, 10) + rad, Math.min(c.y1, VIEW_H - 10) - rad);
      if (!h.fits(x, y, rad)) continue;
      if (placed.some((q) => Math.hypot(q.x - x, q.y - y) < PART_GAP[kind])) continue;
      const part = make(x, y);
      h.add(part);
      placed.push(part);
      break;
    }
  }
}

// Pontos a cada ~10px ao longo da trilha
function sample(pts) {
  const out = [];
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1];
    const [bx, by] = pts[i];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 10));
    for (let k = 0; k <= n; k++) out.push([ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n]);
  }
  return out;
}

function segmentsFree(pts, free) {
  if (!pts.every(([x, y]) => free(x, y, 14))) return false;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1];
    const [bx, by] = pts[i];
    for (let t = 0.1; t < 1; t += 0.1) if (!free(ax + (bx - ax) * t, ay + (by - ay) * t, 10)) return false;
  }
  return true;
}

export function paint(g, { path, decor, W, ox }) {
  g.fillStyle = '#3aa655';
  g.fillRect(0, 0, W, VIEW_H);
  g.strokeStyle = 'rgba(255,255,255,0.06)';
  g.lineWidth = 1;
  g.beginPath();
  // linhas a cada meio quadrado, alinhadas à grade do mapa
  const step = TILE / 2;
  for (let x = (ox % step) - step; x <= W; x += step) {
    g.moveTo(x + 0.5, 0);
    g.lineTo(x + 0.5, VIEW_H);
  }
  for (let y = 0; y <= VIEW_H; y += step) {
    g.moveTo(0, y + 0.5);
    g.lineTo(W, y + 0.5);
  }
  g.stroke();

  g.save();
  g.translate(ox, 0);
  g.lineJoin = 'round';
  g.lineCap = 'round';
  for (const pts of decor.traces) {
    g.beginPath();
    pts.forEach(([px, py], j) => (j ? g.lineTo(px, py) : g.moveTo(px, py)));
    g.lineWidth = 6;
    g.strokeStyle = '#2b8a45';
    g.stroke();
    g.lineWidth = 3;
    g.strokeStyle = '#7ad98a';
    g.stroke();
    for (const [px, py] of [pts[0], pts[pts.length - 1]]) {
      circle(g, px, py, 5);
      fillOutline(g, GOLD, 2);
      circle(g, px, py, 1.8);
      g.fillStyle = '#2b8a45';
      g.fill();
    }
  }
  for (const p of decor.parts) {
    if (p.kind === 'resistor') drawResistor(g, p);
    else drawLed(g, p);
  }

  // caminho de lajotas elevado (3/4) com setinhas
  drawRaisedPath(g, path, {
    side: '#6f7f9c',
    rim: '#7f92ad',
    inner: '#c8d4e4',
    outline: OUTLINE,
    top: (l, w) => tileSeams(l, path, w, '#9fb0c8', 3), // uma placa por quadrado da grade
  });
  // setinhas do sentido dos vírus: uma no meio de cada placa (quadrado) do
  // topo da rua, escuras com um brilho claro embaixo (parecem gravadas no
  // piso); nas curvas, apontando pra saída
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.lineWidth = 4.5;
  for (const { x, y, angle } of plateCenters(path)) {
    for (const [dy, color] of [[1.5, '#f2f6fb'], [0, '#5f7393']]) {
      g.save();
      g.translate(x, y - PATH_DEPTH + dy);
      g.rotate(angle);
      g.beginPath();
      g.moveTo(-4, -7);
      g.lineTo(4, 0);
      g.lineTo(-4, 7);
      g.strokeStyle = color;
      g.stroke();
      g.restore();
    }
  }
  g.restore();
}

function drawResistor(g, { x, y, vertical }) {
  g.save();
  g.translate(x, y);
  if (vertical) g.rotate(Math.PI / 2);
  g.strokeStyle = '#9aa3b5';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(-16, 0);
  g.lineTo(16, 0);
  g.stroke();
  rrect(g, -10, -4.5, 20, 9, 4);
  fillOutline(g, '#e8d5a6', 2);
  ['#c0392b', '#2c3e50', '#d4a017'].forEach((c, i) => {
    g.fillStyle = c;
    g.fillRect(-6 + i * 4.5, -3.5, 2.2, 7);
  });
  g.restore();
}

function drawLed(g, { x, y, color }) {
  g.fillStyle = color;
  g.globalAlpha = 0.3;
  circle(g, x, y, 9);
  g.fill();
  g.globalAlpha = 1;
  circle(g, x, y, 4.5);
  fillOutline(g, color, 2);
  circle(g, x - 1.5, y - 1.5, 1.5);
  g.fillStyle = 'rgba(255,255,255,0.8)';
  g.fill();
}

// Centro de cada placa (quadrado) da rua, com o sentido dos vírus. Os pontos
// das rotas caem no centro dos quadrados, então anda de TILE em TILE a partir
// do fim de cada trecho (o primeiro trecho vem de fora da tela). O fim da rota
// (servidor) fica sem seta; a curva no começo de um trecho usa o sentido dele.
// Uma seta por quadrado: onde a rua passa mais de uma vez (cruzamento do loop,
// encontro de entradas), vale a da passagem mais perto do fim do caminho,
// que é a que aponta pro servidor
function plateCenters(path) {
  const best = new Map(); // quadrado → placa que fica
  for (const route of path.routes ?? lines(path)) {
    const pts = route.points;
    // quanto falta até o fim da rota, a partir de cada ponto
    const rest = new Array(pts.length).fill(0);
    for (let i = pts.length - 1; i > 0; i--) rest[i - 1] = rest[i] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      if (len < 1) continue;
      const dx = (b.x - a.x) / len;
      const dy = (b.y - a.y) / len;
      const angle = Math.atan2(dy, dx);
      for (let d = TILE; d <= len + 0.5; d += TILE) {
        if (d > len - 0.5 && i === 1) break; // ponto de fora da tela
        const x = b.x - dx * d;
        const y = b.y - dy * d;
        const left = rest[i] + d;
        const key = tileKey(...tileOf(x, y));
        if (!best.has(key) || left < best.get(key).left) best.set(key, { x, y, angle, left });
      }
    }
  }
  return [...best.values()];
}
