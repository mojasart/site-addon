import { OUTLINE, GOLD } from '../config.js';
import { rrect, circle, fillOutline, shadow, gloss, text } from './canvas.js';
import { TAU } from '../util.js';

/* ════════════════════════════════════════════════════════════
 *  SPRITES
 *  Tudo desenhado com formas, visto de cima, centrado em (0,0).
 *  O "look" vem de 3 coisas: contorno grosso escuro (OUTLINE), cores
 *  bem saturadas e um brilho branco no canto (gloss).
 *  Quando tiver arte de verdade, troque o conteúdo destas funções
 *  por ctx.drawImage(...) e o resto do jogo continua igual.
 * ════════════════════════════════════════════════════════════ */

// ── Cache de sprites ───────────────────────────────────────
// Vírus aparecem às dezenas; pré-desenhar cada tipo num canvas
// pequeno deixa o jogo leve no celular.
let pixelScale = 1;
const cache = new Map();

export function setPixelScale(ps) {
  if (Math.abs(ps - pixelScale) < 0.01) return;
  pixelScale = ps;
  cache.clear();
}

function cached(key, size, draw) {
  let c = cache.get(key);
  if (!c) {
    c = document.createElement('canvas');
    c.width = c.height = Math.ceil(size * pixelScale);
    const g = c.getContext('2d');
    g.scale(pixelScale, pixelScale);
    g.translate(size / 2, size / 2);
    draw(g);
    cache.set(key, c);
  }
  return c;
}

function blit(ctx, c, size) {
  ctx.drawImage(c, -size / 2, -size / 2, size, size);
}

// ════════════════════════ DEFESAS ════════════════════════
// s: { angle, recoil, pulse, t, level }

export function drawTower(ctx, type, s = {}) {
  TOWER_SPRITES[type]?.(ctx, s);
}

const TOWER_SPRITES = {
  antivirus(ctx, s) {
    basePlate(ctx, 20);
    turret(ctx, s, () => {
      const rc = (s.recoil ?? 0) * 5;
      rrect(ctx, 4 - rc, -7, 26, 14, 5);
      fillOutline(ctx, '#1e9e57');
      rrect(ctx, 22 - rc, -9, 10, 18, 4);
      fillOutline(ctx, '#157a42');
    });
    circle(ctx, 0, 0, 15);
    fillOutline(ctx, '#2fd27a');
    shieldPath(ctx, 0, -1, 8.5);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#1e9e57';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-4, 0);
    ctx.lineTo(-1, 3.5);
    ctx.lineTo(4.5, -3.5);
    ctx.stroke();
    gloss(ctx, -7, -8, 4, 2.5);
  },

  firewall(ctx, s) {
    const t = s.t ?? 0;
    shadow(ctx, 3, 6, 26, 24);
    ctx.save();
    ctx.scale(1 + (s.pulse ?? 0) * 0.1, 1 + (s.pulse ?? 0) * 0.1);
    rrect(ctx, -23, -23, 46, 46, 9);
    fillOutline(ctx, '#7a2b17');
    ctx.save();
    rrect(ctx, -23, -23, 46, 46, 9);
    ctx.clip();
    ctx.fillStyle = '#e8652f';
    for (let r = 0; r < 4; r++) {
      const y = -23 + r * 11.5;
      for (let x = -23 + (r % 2 ? -8 : 0); x < 23; x += 16) ctx.fillRect(x + 1.8, y + 1.8, 12.4, 7.9);
    }
    ctx.restore();
    rrect(ctx, -23, -23, 46, 46, 9);
    ctx.lineWidth = 3;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
    // chama no meio
    const h = 19 + Math.sin(t * 11) * 2.5;
    flame(ctx, 0, 9, h, 12);
    fillOutline(ctx, '#ff8a1f');
    flame(ctx, 0, 8, h * 0.55, 6.5);
    ctx.fillStyle = '#ffe066';
    ctx.fill();
    ctx.restore();
  },

  criptografia(ctx, s) {
    const t = s.t ?? 0;
    shadow(ctx, 3, 6, 26, 24);
    ctx.save();
    ctx.scale(1 + (s.pulse ?? 0) * 0.1, 1 + (s.pulse ?? 0) * 0.1);
    hexagon(ctx, 0, 0, 25);
    fillOutline(ctx, '#2f6fe0');
    hexagon(ctx, 0, 0, 18);
    ctx.fillStyle = '#5fa8ff';
    ctx.fill();
    // cadeado
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, -3, 7, Math.PI, 0);
    ctx.lineWidth = 7.5;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    rrect(ctx, -10, -3, 20, 15, 4);
    fillOutline(ctx, '#ffffff', 2.5);
    circle(ctx, 0, 3, 2.6);
    ctx.fillStyle = OUTLINE;
    ctx.fill();
    ctx.fillRect(-1.2, 3, 2.4, 5);
    // floquinhos de gelo girando
    for (let i = 0; i < 3; i++) {
      const a = t * 1.5 + (i * TAU) / 3;
      sparkle(ctx, Math.cos(a) * 21, Math.sin(a) * 21, 4);
    }
    ctx.restore();
  },

  scanner(ctx, s) {
    basePlate(ctx, 20);
    turret(ctx, s, () => {
      const rc = (s.recoil ?? 0) * 4;
      rrect(ctx, 4 - rc, -5, 24, 10, 4);
      fillOutline(ctx, '#3b4a66');
      circle(ctx, 28 - rc, 0, 5.5);
      fillOutline(ctx, '#ff3b5c');
      ctx.beginPath();
      ctx.ellipse(-2, 0, 11, 17, 0, 0, TAU);
      fillOutline(ctx, '#e8eef7');
      ctx.beginPath();
      ctx.ellipse(-2, 0, 6, 10, 0, 0, TAU);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#9fb0c8';
      ctx.stroke();
      circle(ctx, -2, 0, 3);
      ctx.fillStyle = '#ff3b5c';
      ctx.fill();
    });
  },

  // Pote de mel (visto meio de lado, pra ser reconhecível em cima do caminho)
  honeypot(ctx, s) {
    const k = 1 + (s.pulse ?? 0) * 0.15;
    shadow(ctx, 2, 15, 18, 6);
    ctx.save();
    ctx.scale(k, k);
    ctx.beginPath();
    ctx.moveTo(-11, -8);
    ctx.bezierCurveTo(-23, -3, -21, 16, -8, 17);
    ctx.lineTo(8, 17);
    ctx.bezierCurveTo(21, 16, 23, -3, 11, -8);
    ctx.closePath();
    fillOutline(ctx, '#f5a524');
    gloss(ctx, 9, 3, 3, 7, 0.2);
    rrect(ctx, -8, 2, 16, 10, 3);
    ctx.fillStyle = '#fff3c4';
    ctx.fill();
    hexagon(ctx, 0, 7, 3.4);
    ctx.fillStyle = '#f5a524';
    ctx.fill();
    // mel escorrendo da tampa
    ctx.fillStyle = '#ffcf4a';
    rrect(ctx, -11, -9, 5.5, 11, 2.75);
    ctx.fill();
    circle(ctx, -8.2, 2.5, 3.3);
    ctx.fill();
    rrect(ctx, -14, -16, 28, 9, 3.5);
    fillOutline(ctx, '#b8621b');
    ctx.restore();
  },

  minerador(ctx, s) {
    const t = s.t ?? 0;
    shadow(ctx, 3, 6, 26, 24);
    rrect(ctx, -24, -24, 48, 48, 9);
    fillOutline(ctx, '#2b3f73');
    rrect(ctx, -18, -19, 36, 28, 6);
    fillOutline(ctx, '#16213f', 2);
    // ventoinha girando
    ctx.save();
    ctx.translate(0, -5);
    ctx.rotate(t * 14);
    ctx.fillStyle = '#9fb3d9';
    for (let i = 0; i < 4; i++) {
      ctx.rotate(TAU / 4);
      ctx.beginPath();
      ctx.ellipse(6, 0, 7, 3.5, 0.3, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    circle(ctx, 0, -5, 3.5);
    fillOutline(ctx, GOLD, 2);
    // LEDs
    for (let i = 0; i < 4; i++) {
      const on = Math.sin(t * 6 + i * 1.3) > -0.2;
      circle(ctx, -13 + i * 8.7, 16, 2.6);
      ctx.fillStyle = on ? '#3dff9a' : '#1d5a3c';
      ctx.fill();
    }
    if (s.pulse > 0) {
      ctx.globalAlpha = s.pulse;
      circle(ctx, 0, 0, 30);
      ctx.lineWidth = 4;
      ctx.strokeStyle = GOLD;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  },
};

// Estrelinhas douradas: uma por upgrade comprado
export function drawPips(ctx, level, r) {
  for (let i = 0; i < level; i++) {
    star(ctx, (i - (level - 1) / 2) * 15, r + 9, 7);
    fillOutline(ctx, GOLD, 2);
  }
}

function star(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.48 : r;
    const a = (i / 10) * TAU - Math.PI / 2;
    if (i === 0) ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    else ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

function basePlate(ctx, r) {
  shadow(ctx, 3, 6, r + 5, r + 3);
  circle(ctx, 0, 0, r + 4);
  fillOutline(ctx, '#5a6886');
  circle(ctx, 0, 0, r - 1);
  ctx.fillStyle = '#74839f';
  ctx.fill();
}

function turret(ctx, s, draw) {
  ctx.save();
  ctx.rotate(s.angle ?? -Math.PI / 2);
  draw();
  ctx.restore();
}

function shieldPath(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.moveTo(cx - s, cy - s);
  ctx.lineTo(cx + s, cy - s);
  ctx.lineTo(cx + s, cy);
  ctx.quadraticCurveTo(cx + s, cy + s * 0.9, cx, cy + s * 1.25);
  ctx.quadraticCurveTo(cx - s, cy + s * 0.9, cx - s, cy);
  ctx.closePath();
}

function flame(ctx, x, y, h, w) {
  ctx.beginPath();
  ctx.moveTo(x, y - h);
  ctx.bezierCurveTo(x + w * 0.7, y - h * 0.45, x + w * 1.1, y - h * 0.05, x + w * 0.75, y + w * 0.45);
  ctx.quadraticCurveTo(x, y + w * 1.05, x - w * 0.75, y + w * 0.45);
  ctx.bezierCurveTo(x - w * 1.1, y - h * 0.05, x - w * 0.7, y - h * 0.45, x, y - h);
  ctx.closePath();
}

function hexagon(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + Math.PI / 6;
    if (i === 0) ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    else ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
}

function sparkle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
}

// ════════════════════════ VÍRUS ════════════════════════

export function drawEnemy(ctx, e) {
  const def = e.def;
  switch (def.kind) {
    case 'worm':
      drawWorm(ctx, e);
      break;
    case 'trojan':
      drawVirus(ctx, e.r, def.color, e.phase);
      drawHelmet(ctx, e.r, e.angle);
      break;
    case 'boss':
      drawBoss(ctx, e);
      break;
    default:
      drawVirus(ctx, e.r, def.color, e.phase);
  }
  if (e.slowTimer > 0 && !def.boss) {
    circle(ctx, 0, 0, e.r + 5);
    ctx.fillStyle = 'rgba(160,230,255,0.35)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#bff3ff';
    ctx.stroke();
  }
  if (e.flash > 0) {
    circle(ctx, 0, 0, e.r);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fill();
  }
}

export function drawVirus(ctx, r, color, phase) {
  const size = r * 3.2;
  const wob = Math.sin(phase * 7) * 0.05;
  ctx.save();
  ctx.scale(1 + wob, 1 - wob);
  ctx.save();
  ctx.rotate(phase * 0.6);
  blit(ctx, cached(`vb${color}${r}`, size, (g) => virusBody(g, r, color)), size);
  ctx.restore();
  blit(ctx, cached(`vf${r}`, size, (g) => virusFace(g, r)), size);
  ctx.restore();
}

function virusBody(g, r, color) {
  g.lineCap = 'round';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    const c = Math.cos(a);
    const s = Math.sin(a);
    g.beginPath();
    g.moveTo(c * r * 0.8, s * r * 0.8);
    g.lineTo(c * r * 1.25, s * r * 1.25);
    g.lineWidth = 6.5;
    g.strokeStyle = OUTLINE;
    g.stroke();
    g.lineWidth = 2.8;
    g.strokeStyle = color;
    g.stroke();
    circle(g, c * r * 1.32, s * r * 1.32, r * 0.22);
    fillOutline(g, color, 2.5);
  }
  circle(g, 0, 0, r);
  fillOutline(g, color, 3);
}

function virusFace(g, r) {
  // sombra embaixo e brilho em cima: dá volume de "bolinha"
  g.save();
  circle(g, 0, 0, r - 1.5);
  g.clip();
  g.fillStyle = 'rgba(0,0,0,0.16)';
  g.beginPath();
  g.ellipse(r * 0.45, r * 0.6, r * 0.95, r * 0.8, 0, 0, TAU);
  g.fill();
  g.restore();
  gloss(g, -r * 0.4, -r * 0.45, r * 0.3, r * 0.18);
  // olhos bravos
  for (const sx of [-1, 1]) {
    g.beginPath();
    g.ellipse(sx * r * 0.32, -r * 0.02, r * 0.22, r * 0.27, 0, 0, TAU);
    fillOutline(g, '#ffffff', 1.6);
    circle(g, sx * r * 0.27, r * 0.04, r * 0.11);
    g.fillStyle = OUTLINE;
    g.fill();
  }
  g.lineCap = 'round';
  g.lineWidth = Math.max(2, r * 0.15);
  g.strokeStyle = OUTLINE;
  g.beginPath();
  g.moveTo(-r * 0.6, -r * 0.42);
  g.lineTo(-r * 0.12, -r * 0.24);
  g.moveTo(r * 0.6, -r * 0.42);
  g.lineTo(r * 0.12, -r * 0.24);
  g.stroke();
  rrect(g, -r * 0.24, r * 0.38, r * 0.48, r * 0.17, r * 0.08);
  g.fillStyle = OUTLINE;
  g.fill();
}

// Capacete espartano do Trojan: cobre o vírus todo, viseira virada pra frente
function drawHelmet(ctx, r, angle) {
  ctx.save();
  ctx.rotate(angle);
  circle(ctx, 0, 0, r * 0.98);
  fillOutline(ctx, '#c9d3e0', 3);
  rrect(ctx, r * 0.28, -r * 0.55, r * 0.52, r * 1.1, r * 0.2);
  ctx.fillStyle = OUTLINE;
  ctx.fill();
  for (const sy of [-1, 1]) {
    circle(ctx, r * 0.55, sy * r * 0.24, r * 0.12);
    ctx.fillStyle = '#ff3b5c';
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(-r * 0.35, 0, r * 0.72, r * 0.24, 0, 0, TAU);
  fillOutline(ctx, '#e8344e', 2.5);
  for (const sy of [-1, 1]) {
    circle(ctx, -r * 0.4, sy * r * 0.62, r * 0.1);
    ctx.fillStyle = '#8693a8';
    ctx.fill();
  }
  ctx.restore();
  gloss(ctx, -r * 0.4, -r * 0.45, r * 0.26, r * 0.14);
}

function drawWorm(ctx, e) {
  const r = e.r;
  ctx.save();
  ctx.rotate(e.angle);
  for (let i = 3; i >= 1; i--) {
    const y = Math.sin(e.phase * 12 - i) * r * 0.3;
    circle(ctx, -i * r * 0.95, y, r * (0.9 - i * 0.08));
    fillOutline(ctx, i % 2 ? '#3f5170' : '#4d6185');
    circle(ctx, -i * r * 0.95, y, r * 0.28);
    ctx.fillStyle = '#7be04a';
    ctx.fill();
  }
  circle(ctx, 0, 0, r);
  fillOutline(ctx, '#7be04a');
  gloss(ctx, -r * 0.3, -r * 0.45, r * 0.3, r * 0.17, 0);
  for (const sy of [-1, 1]) {
    circle(ctx, r * 0.35, sy * r * 0.38, r * 0.25);
    fillOutline(ctx, '#ffffff', 1.6);
    circle(ctx, r * 0.45, sy * r * 0.38, r * 0.12);
    ctx.fillStyle = OUTLINE;
    ctx.fill();
  }
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.strokeStyle = OUTLINE;
  ctx.beginPath();
  ctx.moveTo(r * 0.8, -r * 0.3);
  ctx.lineTo(r * 1.25, -r * 0.5);
  ctx.moveTo(r * 0.8, r * 0.3);
  ctx.lineTo(r * 1.25, r * 0.5);
  ctx.stroke();
  ctx.restore();
}

// Ransomware: o "dirigível" chefão, com um cadeadão no meio
function drawBoss(ctx, e) {
  const r = e.r;
  const L = r * 1.35;
  const W = r * 0.82;
  ctx.save();
  ctx.rotate(e.angle);
  shadow(ctx, 6, 10, L + 4, W + 2);
  // aletas
  for (const sy of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(-L * 0.6, sy * W * 0.5);
    ctx.lineTo(-L - 14, sy * (W + 14));
    ctx.lineTo(-L - 4, sy * W * 0.2);
    ctx.closePath();
    fillOutline(ctx, '#4a2080', 3.5);
  }
  rrect(ctx, -L, -W, L * 2, W * 2, W);
  fillOutline(ctx, e.def.color, 4);
  rrect(ctx, -L * 0.55, -W, L * 0.35, W * 2, 4);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fill();
  gloss(ctx, -L * 0.2, -W * 0.55, L * 0.6, W * 0.18, 0);
  // olhos vermelhos na frente
  for (const sy of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(L * 0.68, sy * W * 0.38, 7, 5, sy * 0.4, 0, TAU);
    fillOutline(ctx, '#ff3b5c', 2.5);
  }
  // cadeado
  ctx.rotate(-e.angle);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, -6, 10, Math.PI, 0);
  ctx.lineWidth = 10;
  ctx.strokeStyle = OUTLINE;
  ctx.stroke();
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#d6dce8';
  ctx.stroke();
  rrect(ctx, -15, -7, 30, 24, 6);
  fillOutline(ctx, GOLD, 3);
  text(ctx, '$', 0, 6, { size: 18, color: '#7a5600', stroke: null });
  ctx.restore();
}

// ════════════════════════ OUTROS ════════════════════════

export function drawProjectile(ctx, p) {
  ctx.save();
  ctx.rotate(p.angle);
  ctx.beginPath();
  ctx.ellipse(0, 0, 11, 6, 0, 0, TAU);
  fillOutline(ctx, '#3dff9a', 2.5);
  ctx.beginPath();
  ctx.ellipse(2, -1.5, 5, 2, 0, 0, TAU);
  ctx.fillStyle = '#e9fff2';
  ctx.fill();
  ctx.restore();
}

// Moeda de bits: usada no HUD e nos pacotes do Minerador
export function drawCoin(ctx, r = 14, spin = 0) {
  const sx = Math.max(0.25, Math.abs(Math.cos(spin * 2)));
  ctx.save();
  ctx.scale(sx, 1);
  hexagon(ctx, 0, 0, r);
  fillOutline(ctx, GOLD, 3);
  hexagon(ctx, 0, 0, r * 0.62);
  ctx.fillStyle = '#ffe58a';
  ctx.fill();
  ctx.restore();
  text(ctx, '$', 0, 1, { size: Math.round(r * 1.05), color: '#b8860b', stroke: null });
}

export function drawHeart(ctx, s = 14) {
  ctx.beginPath();
  ctx.moveTo(0, s * 0.95);
  ctx.bezierCurveTo(-s * 1.4, 0, -s * 0.9, -s * 1.15, 0, -s * 0.45);
  ctx.bezierCurveTo(s * 0.9, -s * 1.15, s * 1.4, 0, 0, s * 0.95);
  ctx.closePath();
  fillOutline(ctx, '#ff4d6d', 3);
  gloss(ctx, -s * 0.5, -s * 0.4, s * 0.28, s * 0.17);
}

// O servidor que estamos protegendo (fim do caminho)
export function drawServer(ctx, t, hurt) {
  const shake = hurt > 0 ? Math.sin(t * 80) * 2 : 0;
  ctx.save();
  ctx.translate(shake, 0);
  shadow(ctx, 5, 34, 44, 12);
  rrect(ctx, -42, -30, 84, 64, 12);
  fillOutline(ctx, '#3a4f86', 4);
  rrect(ctx, -32, -22, 64, 34, 7);
  fillOutline(ctx, hurt > 0 ? '#ff5a6a' : '#58e0ff', 3);
  gloss(ctx, -20, -16, 9, 3, 0);
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.strokeStyle = OUTLINE;
  if (hurt > 0) {
    for (const sx of [-12, 12]) {
      ctx.beginPath();
      ctx.moveTo(sx - 4, -10);
      ctx.lineTo(sx + 4, -2);
      ctx.moveTo(sx + 4, -10);
      ctx.lineTo(sx - 4, -2);
      ctx.stroke();
    }
  } else {
    const blink = Math.sin(t * 1.3) > 0.97;
    for (const sx of [-12, 12]) {
      ctx.beginPath();
      if (blink) {
        ctx.moveTo(sx - 4, -6);
        ctx.lineTo(sx + 4, -6);
        ctx.stroke();
      } else {
        ctx.ellipse(sx, -6, 3, 4.5, 0, 0, TAU);
        ctx.fillStyle = OUTLINE;
        ctx.fill();
      }
    }
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }
  rrect(ctx, -32, 16, 44, 10, 3);
  ctx.fillStyle = '#26345c';
  ctx.fill();
  for (let i = 0; i < 3; i++) {
    circle(ctx, 18 + i * 6, 21, 2.5);
    ctx.fillStyle = Math.sin(t * 5 + i * 2) > 0 ? '#3dff9a' : '#1d5a3c';
    ctx.fill();
  }
  ctx.restore();
}
