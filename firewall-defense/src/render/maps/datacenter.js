import { VIEW_H, OUTLINE } from '../../config.js';
import { rrect, circle, ellipse, fillOutline, shadow, gloss } from '../canvas.js';
import { strokePath, raisedPathBase, waterSparkles, drawSparkles } from './shared.js';

// Tema DATA CENTER: piso técnico, racks de servidores, ar-condicionado,
// cabos pelo chão e piscinas de refrigeração líquida (zona de água).

export function layout(h) {
  for (let i = 0, n = 0; i < 300 && n < 8; i++) {
    const w = h.rr(34, 42);
    const hh = h.rr(62, 84);
    const x = h.rr(h.minX, h.maxX);
    const y = h.rr(40, VIEW_H - 40);
    const rad = Math.hypot(w, hh) / 2 + 4;
    if (!h.fits(x, y, rad, 'land')) continue;
    h.add({ kind: 'rack', x, y, w, h: hh, rad, block: 'rect', seed: h.rnd() });
    n++;
  }
  for (let i = 0, n = 0; i < 300 && n < 3; i++) {
    const x = h.rr(h.minX, h.maxX);
    const y = h.rr(30, VIEW_H - 30);
    if (!h.fits(x, y, 30, 'land')) continue;
    h.add({ kind: 'ac', x, y, w: 44, h: 44, rad: 30, block: 'rect' });
    n++;
  }
  for (let i = 0, n = 0; i < 300 && n < 5; i++) {
    const x = h.rr(h.minX, h.maxX);
    const y = h.rr(20, VIEW_H - 20);
    if (!h.fits(x, y, 14, 'land')) continue;
    h.add({ kind: 'plant', x, y, rad: 14, block: 'circle' });
    n++;
  }
  const cables = [];
  const colors = ['#3d8bff', '#ffc62e', '#ff4d5e', '#2fd27a'];
  for (let i = 0; i < 40 && cables.length < 9; i++) {
    const a = [h.rr(h.minX, h.maxX), h.rr(10, VIEW_H - 10)];
    const b = [a[0] + h.rr(-160, 160), a[1] + h.rr(-120, 120)];
    const c = [(a[0] + b[0]) / 2 + h.rr(-60, 60), (a[1] + b[1]) / 2 + h.rr(-60, 60)];
    let ok = true;
    for (let t = 0; t <= 1; t += 0.1) {
      const x = (1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0];
      const y = (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1];
      if (!h.free(x, y, 6) || h.terrain(x, y) !== 'land') ok = false;
    }
    if (ok) cables.push({ a, b, c, color: colors[cables.length % colors.length] });
  }
  return { cables, sparkles: waterSparkles(h, 14) };
}

export function paint(g, { map, path, decor, W, ox }) {
  // piso técnico
  g.fillStyle = '#d3dae6';
  g.fillRect(0, 0, W, VIEW_H);
  const T = 45;
  for (let x = (ox % T) - T; x < W; x += T) {
    for (let y = 0; y < VIEW_H; y += T) {
      const k = Math.floor((x - ox) / T) + Math.floor(y / T);
      if (k % 5 === 0) {
        g.fillStyle = '#c4ccda';
        g.fillRect(x + 2, y + 2, T - 4, T - 4);
        g.fillStyle = '#aeb8c9';
        for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) g.fillRect(x + 8 + i * 9, y + 8 + j * 9, 3, 3);
      }
    }
  }
  g.strokeStyle = '#b5bfce';
  g.lineWidth = 2;
  g.beginPath();
  for (let x = ox % T; x <= W; x += T) {
    g.moveTo(x, 0);
    g.lineTo(x, VIEW_H);
  }
  for (let y = 0; y <= VIEW_H; y += T) {
    g.moveTo(0, y);
    g.lineTo(W, y);
  }
  g.stroke();

  g.save();
  g.translate(ox, 0);

  for (const c of decor.cables) {
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(...c.a);
    g.quadraticCurveTo(...c.c, ...c.b);
    g.lineWidth = 7;
    g.strokeStyle = OUTLINE;
    g.stroke();
    g.lineWidth = 3.5;
    g.strokeStyle = c.color;
    g.stroke();
  }

  for (const z of map.zones) if (z.terrain === 'water') drawPool(g, z);

  for (const p of decor.parts) {
    if (p.kind === 'rack') drawRack(g, p);
    else if (p.kind === 'ac') drawAC(g, p);
    else drawPlant(g, p);
  }

  // calha de cabos elevada (3/4), com bordas amarelas no topo
  raisedPathBase(g, path, { depth: 16, side: '#7c88a6', sideDark: '#465068', outline: OUTLINE });
  strokePath(g, path, path.width + 8, OUTLINE);
  strokePath(g, path, path.width, '#ffc72c');
  strokePath(g, path, path.width - 12, '#3a4256');
  strokePath(g, path, 3, '#5d6886', [14, 10]);
  g.restore();
}

export function animate(ctx, decor, t) {
  drawSparkles(ctx, decor.sparkles, t);
}

function drawPool(g, z) {
  shadow(g, z.x + z.w / 2 + 4, z.y + z.h / 2 + 8, z.w / 2 + 10, z.h / 2 + 8);
  rrect(g, z.x - 9, z.y - 9, z.w + 18, z.h + 18, (z.r ?? 0) + 9);
  fillOutline(g, '#8a96aa', 3);
  rrect(g, z.x - 9, z.y - 9, z.w + 18, z.h + 18, (z.r ?? 0) + 9);
  g.strokeStyle = 'rgba(255,255,255,0.35)';
  g.lineWidth = 2;
  g.stroke();
  const grad = g.createLinearGradient(0, z.y, 0, z.y + z.h);
  grad.addColorStop(0, '#6fd3ff');
  grad.addColorStop(1, '#2a86e0');
  rrect(g, z.x, z.y, z.w, z.h, z.r ?? 0);
  g.fillStyle = grad;
  g.fill();
  g.lineWidth = 3;
  g.strokeStyle = OUTLINE;
  g.stroke();
  g.save();
  rrect(g, z.x, z.y, z.w, z.h, z.r ?? 0);
  g.clip();
  g.strokeStyle = 'rgba(255,255,255,0.4)';
  g.lineWidth = 2.5;
  g.lineCap = 'round';
  for (let y = z.y + 18; y < z.y + z.h; y += 26) {
    for (let x = z.x + 10 + ((y / 26) % 2) * 14; x < z.x + z.w - 10; x += 34) {
      g.beginPath();
      g.arc(x, y, 7, Math.PI * 1.15, Math.PI * 1.85);
      g.stroke();
    }
  }
  for (let i = 0; i < 6; i++) {
    circle(g, z.x + 14 + ((i * 37) % (z.w - 24)), z.y + 16 + ((i * 53) % (z.h - 26)), 3 + (i % 3));
    g.lineWidth = 1.5;
    g.strokeStyle = 'rgba(255,255,255,0.7)';
    g.stroke();
  }
  g.restore();
}

function drawRack(g, { x, y, w, h, seed }) {
  g.save();
  g.translate(x, y);
  shadow(g, 6, h / 2 + 2, w / 2 + 6, 8);
  rrect(g, -w / 2, -h / 2, w, h, 6);
  fillOutline(g, '#2c3346', 3);
  rrect(g, -w / 2 + 3, -h / 2 + 3, w - 6, 8, 3);
  g.fillStyle = '#4a5470';
  g.fill();
  const rows = Math.floor((h - 18) / 11);
  for (let i = 0; i < rows; i++) {
    const ry = -h / 2 + 15 + i * 11;
    rrect(g, -w / 2 + 5, ry, w - 10, 8, 2);
    g.fillStyle = '#1b2030';
    g.fill();
    const colors = ['#3dff9a', '#5fb4ff', '#ffd23f', '#ff4d5e'];
    for (let k = 0; k < 3; k++) {
      circle(g, w / 2 - 9 - k * 5, ry + 4, 1.6);
      g.fillStyle = colors[Math.floor((seed * 97 + i * 7 + k * 3) % 4)];
      g.fill();
    }
  }
  g.restore();
}

function drawAC(g, { x, y, w, h }) {
  g.save();
  g.translate(x, y);
  shadow(g, 5, h / 2, w / 2 + 4, 8);
  rrect(g, -w / 2, -h / 2, w, h, 8);
  fillOutline(g, '#e9eef5', 3);
  circle(g, 0, 0, 15);
  fillOutline(g, '#b9c4d6', 2.5);
  g.strokeStyle = '#8a96aa';
  g.lineWidth = 2;
  for (const r of [5, 10]) {
    circle(g, 0, 0, r);
    g.stroke();
  }
  g.beginPath();
  g.moveTo(-15, 0);
  g.lineTo(15, 0);
  g.moveTo(0, -15);
  g.lineTo(0, 15);
  g.stroke();
  gloss(g, -12, -14, 7, 3, 0);
  g.restore();
}

function drawPlant(g, { x, y }) {
  shadow(g, x + 3, y + 10, 13, 5);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ellipse(g, x + Math.cos(a) * 8, y - 4 + Math.sin(a) * 6, 8, 4.5, a);
    fillOutline(g, i % 2 ? '#3fae6a' : '#5cc97e', 2);
  }
  circle(g, x, y + 2, 9);
  fillOutline(g, '#d9733f', 2.5);
  circle(g, x, y + 1, 5);
  g.fillStyle = '#6b4423';
  g.fill();
}
