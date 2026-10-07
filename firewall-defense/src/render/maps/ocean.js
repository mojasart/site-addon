import { VIEW_H, OUTLINE } from '../../config.js';
import { circle, ellipse, rrect, fillOutline, shadow, gloss } from '../canvas.js';
import { strokePath, raisedPathBase, waterSparkles, drawSparkles, lines } from './shared.js';

// Tema CABO SUBMARINO: mar aberto, ilhas de areia com coqueiros,
// pedras na água e o caminho como um píer de madeira.

export function layout(h) {
  for (let i = 0, n = 0; i < 400 && n < 9; i++) {
    const x = h.rr(h.minX, h.maxX);
    const y = h.rr(20, VIEW_H - 20);
    if (!h.fits(x, y, 13, 'land')) continue;
    h.add({ kind: 'palm', x, y, rad: 13, block: 'circle', rot: h.rr(0, 6) });
    n++;
  }
  for (let i = 0, n = 0; i < 300 && n < 7; i++) {
    const x = h.rr(h.minX, h.maxX);
    const y = h.rr(20, VIEW_H - 20);
    const r = h.rr(9, 14);
    if (!h.fits(x, y, r + 6, 'water')) continue;
    h.add({ kind: 'rock', x, y, r, rad: r + 4, block: 'circle' });
    n++;
  }
  for (let i = 0, n = 0; i < 300 && n < 10; i++) {
    const x = h.rr(h.minX, h.maxX);
    const y = h.rr(20, VIEW_H - 20);
    if (!h.fits(x, y, 8, 'land')) continue;
    h.add({ kind: 'bush', x, y, rad: 8 });
    n++;
  }
  const waves = [];
  for (let i = 0; i < 400 && waves.length < 45; i++) {
    const x = h.rr(h.minX, h.maxX);
    const y = h.rr(10, VIEW_H - 10);
    if (h.terrain(x, y) === 'water' && h.free(x, y, 10)) waves.push({ x, y, s: h.rr(6, 11) });
  }
  return { waves, sparkles: waterSparkles(h, 24) };
}

export function paint(g, { map, path, decor, W, ox }) {
  const grad = g.createLinearGradient(0, 0, 0, VIEW_H);
  grad.addColorStop(0, '#52c8f2');
  grad.addColorStop(1, '#2a8ed2');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, VIEW_H);

  g.save();
  g.translate(ox, 0);

  g.strokeStyle = 'rgba(255,255,255,0.45)';
  g.lineWidth = 2.5;
  g.lineCap = 'round';
  for (const w of decor.waves) {
    g.beginPath();
    g.arc(w.x - w.s, w.y, w.s, Math.PI * 1.15, Math.PI * 1.85);
    g.arc(w.x + w.s, w.y, w.s, Math.PI * 1.15, Math.PI * 1.85);
    g.stroke();
  }

  const islands = map.zones.filter((z) => z.terrain === 'land');
  for (const z of islands) {
    island(g, z, 14, 0, 0);
    g.fillStyle = 'rgba(170,240,255,0.55)';
    g.fill();
  }
  for (const z of islands) {
    island(g, z, 0, 3, 6);
    g.fillStyle = 'rgba(0,40,80,0.25)';
    g.fill();
    island(g, z, 0, 0, 0);
    fillOutline(g, '#f2d38a', 3);
    island(g, z, -7, 0, -3);
    g.fillStyle = '#6cc24a';
    g.fill();
    g.lineWidth = 3;
    g.strokeStyle = '#4fa53a';
    g.stroke();
  }

  for (const p of decor.parts) {
    if (p.kind === 'rock') drawRock(g, p);
    else if (p.kind === 'bush') drawBush(g, p);
  }

  // píer de madeira elevado (3/4), com estacas na frente da lateral
  raisedPathBase(g, path, { depth: 12, side: '#9a6533', sideDark: '#5e3b1c', outline: OUTLINE, shadow: 'rgba(0,40,80,0.25)' });
  g.fillStyle = '#5a3a1e';
  for (const line of lines(path)) for (let d = 20; d < line.length; d += 46) {
    const p = line.pointAt(d);
    const nx = -Math.sin(p.angle);
    const ny = Math.cos(p.angle);
    for (const s of [-1, 1]) {
      circle(g, p.x + nx * s * (path.width / 2 + 2), p.y + ny * s * (path.width / 2 + 2) + 4, 5);
      fillOutline(g, '#6b4423', 2.5);
    }
  }
  strokePath(g, path, path.width + 8, OUTLINE);
  strokePath(g, path, path.width, '#7a4b22');
  strokePath(g, path, path.width - 6, '#c98b4f', [10, 3]);
  strokePath(g, path, 2, 'rgba(90,58,30,0.5)', [2, 18]);

  for (const p of decor.parts) if (p.kind === 'palm') drawPalm(g, p);
  g.restore();
}

export function animate(ctx, decor, t) {
  drawSparkles(ctx, decor.sparkles, t);
}

function drawRock(g, { x, y, r }) {
  ellipse(g, x, y + 3, r + 6, r * 0.7 + 4);
  g.fillStyle = 'rgba(255,255,255,0.45)';
  g.fill();
  ellipse(g, x, y, r, r * 0.8);
  fillOutline(g, '#8e9bb0', 2.5);
  gloss(g, x - r * 0.35, y - r * 0.35, r * 0.3, r * 0.15);
}

function drawBush(g, { x, y }) {
  for (const [dx, dy, r] of [[-5, 1, 6], [5, 1, 6], [0, -4, 7]]) {
    circle(g, x + dx, y + dy, r);
    fillOutline(g, '#3f9a35', 2);
  }
}

function drawPalm(g, { x, y, rot }) {
  shadow(g, x + 10, y + 8, 18, 7);
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(x, y + 6);
  g.quadraticCurveTo(x + 6, y - 6, x + 2, y - 18);
  g.lineWidth = 9;
  g.strokeStyle = OUTLINE;
  g.stroke();
  g.lineWidth = 5;
  g.strokeStyle = '#a86b35';
  g.stroke();
  for (let i = 0; i < 5; i++) {
    const a = rot + (i / 5) * Math.PI * 2;
    g.save();
    g.translate(x + 2, y - 18);
    g.rotate(a);
    g.beginPath();
    g.moveTo(0, 0);
    g.quadraticCurveTo(10, -9, 22, -2);
    g.quadraticCurveTo(10, 3, 0, 0);
    fillOutline(g, i % 2 ? '#3fae4a' : '#5cc95a', 2.5);
    g.restore();
  }
  circle(g, x + 2, y - 18, 3.5);
  fillOutline(g, '#7a4b22', 2);
}

// Contorno de uma ilha: elipse (mapas antigos) ou retângulo arredondado
// (mapas gerados). grow > 0 aumenta, < 0 encolhe; dx/dy deslocam.
function island(g, z, grow, dx, dy) {
  if (z.shape === 'ellipse') {
    const k = grow < 0 ? 0.78 : 1;
    ellipse(g, z.x + dx, z.y + dy, z.rx * k + Math.max(grow, 0), z.ry * k + Math.max(grow, 0));
    return;
  }
  rrect(g, z.x - grow + dx, z.y - grow + dy, z.w + grow * 2, z.h + grow * 2, Math.max(4, (z.r ?? 0) + grow));
}
