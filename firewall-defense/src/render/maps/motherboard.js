import { VIEW_H, OUTLINE, GOLD } from '../../config.js';
import { rrect, circle, fillOutline } from '../canvas.js';
import { strokePath, raisedPathBase } from './shared.js';

// Tema PLACA-MÃE: placa verde, trilhas de cobre, resistores e LEDs.

export function layout(h) {
  const traces = [];
  for (let i = 0; i < 60; i++) {
    let x = h.rr(h.minX, h.maxX);
    let y = h.rr(10, VIEW_H - 10);
    const pts = [[x, y]];
    let horizontal = h.rnd() < 0.5;
    for (let k = 0; k < 3; k++) {
      const len = h.rr(40, 130) * (h.rnd() < 0.5 ? -1 : 1);
      if (horizontal) x += len;
      else y += len;
      pts.push([x, y]);
      horizontal = !horizontal;
    }
    if (segmentsFree(pts, h.free)) traces.push(pts);
  }

  for (let i = 0, n = 0; i < 300 && n < 10; i++) {
    const x = h.rr(h.minX, h.maxX);
    const y = h.rr(14, VIEW_H - 14);
    if (!h.fits(x, y, 14)) continue;
    h.add({ kind: 'resistor', x, y, rad: 14, block: 'circle', vertical: h.rnd() < 0.5 });
    n++;
  }
  for (let i = 0, n = 0; i < 300 && n < 12; i++) {
    const x = h.rr(h.minX, h.maxX);
    const y = h.rr(10, VIEW_H - 10);
    if (!h.fits(x, y, 7)) continue;
    h.add({ kind: 'led', x, y, rad: 7, color: ['#ff4d5e', '#3dff9a', '#ffd23f', '#5fb4ff'][n % 4] });
    n++;
  }
  return { traces };
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
  raisedPathBase(g, path, { depth: 14, side: '#9aa9c0', sideDark: '#5d6b85', outline: OUTLINE, shadow: 'rgba(0,30,10,0.3)' });
  strokePath(g, path, path.width + 8, OUTLINE);
  strokePath(g, path, path.width, '#7f92ad');
  strokePath(g, path, path.width - 8, '#c8d4e4', [30, 4]);
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
