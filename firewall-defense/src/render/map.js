import { VIEW_H, OUTLINE, GOLD } from '../config.js';
import { MAP } from '../data/map.js';
import { rrect, circle, fillOutline, shadow, gloss, setFont } from './canvas.js';
import { seeded } from '../util.js';

// O mapa (placa-mãe + caminho + decoração) não muda durante o jogo, então
// é desenhado uma vez num canvas separado e só "colado" a cada frame.
export class MapRenderer {
  constructor() {
    this.canvas = null;
    this.key = '';
  }

  draw(ctx, game) {
    const key = `${game.mapW}:${game.pixelScale.toFixed(3)}`;
    if (key !== this.key) {
      this.canvas = build(game);
      this.key = key;
    }
    ctx.drawImage(this.canvas, 0, 0, game.mapW, VIEW_H);
  }
}

function build(game) {
  const ps = game.pixelScale;
  const c = document.createElement('canvas');
  c.width = Math.ceil(game.mapW * ps);
  c.height = Math.ceil(VIEW_H * ps);
  const g = c.getContext('2d');
  g.scale(ps, ps);
  paint(g, game);
  return c;
}

// Sorteia (sempre igual, pela semente) onde ficam trilhas e componentes.
// Chips, capacitores e resistores bloqueiam a construção, como as árvores do Bloons.
export function layoutDecor(game) {
  const W = game.mapW;
  const ox = game.offsetX;
  const path = game.path;
  const rnd = seeded(MAP.seed);
  const rr = (a, b) => a + rnd() * (b - a);
  const minX = -ox + 8;
  const maxX = W - ox - 8;
  const sp = serverPos(path);
  const free = (x, y, pad) => path.distanceTo(x, y) > path.width / 2 + pad && Math.hypot(x - sp.x, y - sp.y) > 50 + pad;

  const traces = [];
  for (let i = 0; i < 60; i++) {
    let x = rr(minX, maxX);
    let y = rr(10, VIEW_H - 10);
    const pts = [[x, y]];
    let horizontal = rnd() < 0.5;
    for (let k = 0; k < 3; k++) {
      const len = rr(40, 130) * (rnd() < 0.5 ? -1 : 1);
      if (horizontal) x += len;
      else y += len;
      pts.push([x, y]);
      horizontal = !horizontal;
    }
    if (pts.every(([px, py]) => free(px, py, 14)) && segmentsFree(pts, free)) traces.push(pts);
  }

  const parts = [];
  const fits = (x, y, rad) =>
    x - rad > minX && x + rad < maxX && y - rad > 4 && y + rad < VIEW_H - 4 &&
    free(x, y, rad + 6) && parts.every((p) => Math.hypot(p.x - x, p.y - y) > p.rad + rad + 6);

  const labels = ['CPU', 'RAM', 'ROM', 'NET', 'I/O', 'GPU', 'BIOS'];
  for (let i = 0, n = 0; i < 200 && n < 9; i++) {
    const w = rr(46, 74);
    const h = rr(32, 50);
    const x = rr(minX, maxX);
    const y = rr(20, VIEW_H - 20);
    const rad = Math.hypot(w, h) / 2 + 6;
    if (!fits(x, y, rad)) continue;
    parts.push({ kind: 'chip', x, y, w, h, rad, label: labels[n % labels.length] });
    n++;
  }
  for (let i = 0, n = 0; i < 300 && n < 14; i++) {
    const r = rr(7, 11);
    const x = rr(minX, maxX);
    const y = rr(14, VIEW_H - 14);
    if (!fits(x, y, r + 4)) continue;
    parts.push({ kind: 'cap', x, y, r, rad: r + 4, color: rnd() < 0.5 ? '#2f6fe0' : '#f08c2b' });
    n++;
  }
  for (let i = 0, n = 0; i < 300 && n < 10; i++) {
    const x = rr(minX, maxX);
    const y = rr(14, VIEW_H - 14);
    if (!fits(x, y, 16)) continue;
    parts.push({ kind: 'resistor', x, y, rad: 16, vertical: rnd() < 0.5 });
    n++;
  }
  for (let i = 0, n = 0; i < 300 && n < 12; i++) {
    const x = rr(minX, maxX);
    const y = rr(10, VIEW_H - 10);
    if (!fits(x, y, 7)) continue;
    parts.push({ kind: 'led', x, y, rad: 7, color: ['#ff4d5e', '#3dff9a', '#ffd23f', '#5fb4ff'][n % 4] });
    n++;
  }
  return { traces, parts };
}

// Um componente impede uma torre de raio r em (x, y)?
export function blocksTower(part, x, y, r) {
  switch (part.kind) {
    case 'chip': {
      const dx = Math.max(Math.abs(x - part.x) - part.w / 2, 0);
      const dy = Math.max(Math.abs(y - part.y) - part.h / 2, 0);
      return Math.hypot(dx, dy) < r - 3;
    }
    case 'cap':
      return Math.hypot(x - part.x, y - part.y) < part.r + r - 4;
    case 'resistor':
      return Math.hypot(x - part.x, y - part.y) < 10 + r - 4;
    default:
      return false;
  }
}

function paint(g, game) {
  const W = game.mapW;
  const { traces, parts } = game.decor;

  // placa verde
  g.fillStyle = '#3aa655';
  g.fillRect(0, 0, W, VIEW_H);
  g.strokeStyle = 'rgba(255,255,255,0.06)';
  g.lineWidth = 1;
  g.beginPath();
  for (let x = 0; x <= W; x += 30) {
    g.moveTo(x + 0.5, 0);
    g.lineTo(x + 0.5, VIEW_H);
  }
  for (let y = 0; y <= VIEW_H; y += 30) {
    g.moveTo(0, y + 0.5);
    g.lineTo(W, y + 0.5);
  }
  g.stroke();

  g.save();
  g.translate(game.offsetX, 0);

  // trilhas de cobre (em ângulo reto, com pads dourados nas pontas)
  g.lineJoin = 'round';
  g.lineCap = 'round';
  for (const pts of traces) {
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

  for (const p of parts) {
    if (p.kind === 'chip') drawChip(g, p.x, p.y, p.w, p.h, p.label);
    else if (p.kind === 'cap') drawCapacitor(g, p.x, p.y, p.r, p.color);
    else if (p.kind === 'resistor') drawResistor(g, p.x, p.y, p.vertical);
    else drawLed(g, p.x, p.y, p.color);
  }

  drawPath(g, game.path);
  g.restore();

  // vinheta nas bordas
  const grad = g.createRadialGradient(W / 2, VIEW_H / 2, 220, W / 2, VIEW_H / 2, W * 0.75);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,20,10,0.32)');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, VIEW_H);
}

function segmentsFree(pts, free) {
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1];
    const [bx, by] = pts[i];
    for (let t = 0.1; t < 1; t += 0.1) if (!free(ax + (bx - ax) * t, ay + (by - ay) * t, 10)) return false;
  }
  return true;
}

// Caminho estilo "lajota" com setinhas mostrando a direção
function drawPath(g, path) {
  const pts = path.points;
  const line = () => {
    g.beginPath();
    pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
  };
  g.lineJoin = 'round';
  g.lineCap = 'butt';

  g.save();
  g.translate(4, 7);
  line();
  g.strokeStyle = 'rgba(0,30,10,0.3)';
  g.lineWidth = path.width + 10;
  g.stroke();
  g.restore();

  line();
  g.strokeStyle = OUTLINE;
  g.lineWidth = path.width + 8;
  g.stroke();
  line();
  g.strokeStyle = '#7f92ad';
  g.lineWidth = path.width;
  g.stroke();
  line();
  g.setLineDash([30, 4]);
  g.strokeStyle = '#c8d4e4';
  g.lineWidth = path.width - 8;
  g.stroke();
  g.setLineDash([]);

  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.strokeStyle = '#9db0c9';
  g.lineWidth = 4;
  for (let d = 30; d < path.length - 40; d += 64) {
    const p = path.pointAt(d);
    g.save();
    g.translate(p.x, p.y);
    g.rotate(p.angle);
    g.beginPath();
    g.moveTo(-5, -8);
    g.lineTo(4, 0);
    g.lineTo(-5, 8);
    g.stroke();
    g.restore();
  }
}

function drawChip(g, x, y, w, h, label) {
  g.save();
  g.translate(x, y);
  shadow(g, 4, 6, w / 2 + 4, h / 2 + 2);
  g.fillStyle = '#c9ced8';
  const pins = Math.floor(w / 10);
  for (let i = 0; i < pins; i++) {
    const px = -w / 2 + 6 + i * ((w - 12) / Math.max(1, pins - 1)) - 2;
    g.fillRect(px, -h / 2 - 6, 4, 7);
    g.fillRect(px, h / 2 - 1, 4, 7);
  }
  rrect(g, -w / 2, -h / 2, w, h, 5);
  fillOutline(g, '#2b2f3a', 3);
  circle(g, -w / 2 + 7, -h / 2 + 7, 2.5);
  g.fillStyle = '#4d5466';
  g.fill();
  setFont(g, 13);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = '#8a93a6';
  g.fillText(label, 0, 1);
  g.restore();
}

function drawCapacitor(g, x, y, r, color) {
  shadow(g, x + 3, y + 5, r + 2, r);
  circle(g, x, y, r);
  fillOutline(g, color, 2.5);
  g.strokeStyle = 'rgba(255,255,255,0.55)';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(x - r * 0.5, y);
  g.lineTo(x + r * 0.5, y);
  g.moveTo(x, y - r * 0.5);
  g.lineTo(x, y + r * 0.5);
  g.stroke();
  gloss(g, x - r * 0.4, y - r * 0.45, r * 0.3, r * 0.18);
}

function drawResistor(g, x, y, vertical) {
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

function drawLed(g, x, y, color) {
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

// Exportado pro jogo saber onde fica o servidor
export function serverPos(path) {
  const end = path.points[path.points.length - 1];
  return { x: end.x, y: end.y + 30 };
}

