import { OUTLINE, GOLD } from '../config.js';
import { rrect, circle, text } from './canvas.js';
import { star } from './characters.js';
import { Hazards } from '../systems/Hazards.js';

/* ════════════════════════════════════════════════════════════
 *  ZONAS ELETRIFICADAS
 *  drawHazards(ctx, hazards, t) → tapetes no chão (coords do mapa)
 *  drawStunned(ctx, t)          → raios + estrelinhas numa defesa
 *                                 atordoada (origem no centro da base)
 *  Parado fica discreto; pisca antes da descarga e clareia no choque.
 * ════════════════════════════════════════════════════════════ */

// A zona é um TAPETE deitado no chão, ocupando o quadrado inteiro, na mesma
// perspectiva do mapa: a borda listrada (fita de perigo) aparece em cima
// sempre, e dos lados e embaixo só onde o vizinho é chão; onde é o caminho
// elevado ela fica escondida, porque o caminho está por cima do chão
// (z.edges vem de data/maps.js). Com a borda de baixo à mostra, aparece
// também a espessura do tapete. Zona de vários quadrados vira um tapete só:
// entre quadrados da mesma zona não tem borda, o brilho emenda e as listras
// seguem uma grade fixa da tela, então a fita continua de um pro outro.
const BAND = 4; // largura da fita listrada
const THICK = 3; // espessura do tapete (a beirada da frente)

// Desenho em camadas, todas as zonas por camada (base → brilho → fita →
// raio/choque): assim um quadrado nunca pinta por cima do vizinho da mesma
// zona. Onde o vizinho é da mesma zona, base, brilho e fita avançam meio
// pixel sobre ele, pra não sobrar fio de emenda.
export function drawHazards(ctx, hazards, t) {
  if (!hazards.zones.length) return;
  const tiles = hazards.zones.map((z) => tileShape(z, t));
  ctx.save();
  for (const k of tiles) {
    // espessura da frente (só com chão embaixo) e a borracha escura
    if (k.e.bottom) {
      ctx.fillStyle = '#0f1424';
      ctx.fillRect(k.x0, k.y1, k.z.w, THICK);
    }
    ctx.fillStyle = '#26304c';
    fillBleed(ctx, k.e, { x: k.x0, y: k.y0, w: k.z.w, h: k.y1 - k.y0 });
  }
  for (const k of tiles) {
    // brilho azul fraquinho, com margem só nas bordas de fora
    const m = (side) => (k.e[side] ? 3 : 0);
    const r = k.inner;
    ctx.fillStyle = glowColor(0.1 + 0.05 * Math.sin(t * 2.5) + k.warn * 0.15);
    fillBleed(ctx, k.e, { x: r.x + m('left'), y: r.y + m('top'), w: r.w - m('left') - m('right'), h: r.h - m('top') - m('bottom') });
  }
  // fita listrada: as faixas de todas as zonas viram uma forma só, pintada
  // e listrada de uma vez (assim não sobra fio na emenda entre quadrados)
  const b = (k, side) => (k.e[side] ? 0 : 0.5);
  for (const blinking of [false, true]) {
    ctx.beginPath();
    for (const k of tiles) {
      if (k.blink !== blinking) continue;
      const { e, x0, y0, x1, y1 } = k;
      if (e.top) ctx.rect(x0 - b(k, 'left'), y0, k.z.w + b(k, 'left') + b(k, 'right'), BAND);
      if (e.left) ctx.rect(x0, y0 - b(k, 'top'), BAND, y1 - y0 + b(k, 'top') + b(k, 'bottom'));
      if (e.right) ctx.rect(x1 - BAND, y0 - b(k, 'top'), BAND, y1 - y0 + b(k, 'top') + b(k, 'bottom'));
      if (e.bottom) ctx.rect(x0 - b(k, 'left'), y1 - BAND, k.z.w + b(k, 'left') + b(k, 'right'), BAND);
    }
    ctx.fillStyle = blinking ? '#fff59a' : '#f2c21b'; // pisca no aviso
    ctx.fill();
    stripes(ctx, bounds(tiles), t);
  }
  // contorno só nas bordas à mostra (as outras encostam no caminho ou na mesma zona)
  ctx.beginPath();
  for (const k of tiles) {
    const { e, x0, y0, x1, y1 } = k;
    if (e.top) {
      ctx.moveTo(x0 - b(k, 'left'), y0 + 1);
      ctx.lineTo(x1 + b(k, 'right'), y0 + 1);
    }
    if (e.left) {
      ctx.moveTo(x0 + 1, y0 - b(k, 'top'));
      ctx.lineTo(x0 + 1, y1 + (e.bottom ? THICK : b(k, 'bottom')));
    }
    if (e.right) {
      ctx.moveTo(x1 - 1, y0 - b(k, 'top'));
      ctx.lineTo(x1 - 1, y1 + (e.bottom ? THICK : b(k, 'bottom')));
    }
    if (e.bottom) {
      ctx.moveTo(x0 - b(k, 'left'), y1 + THICK - 1);
      ctx.lineTo(x1 + b(k, 'right'), y1 + THICK - 1);
    }
  }
  ctx.lineWidth = 2;
  ctx.strokeStyle = OUTLINE;
  ctx.stroke();
  for (const k of tiles) {
    // raio no meio, faíscas no aviso e clarão + raios na descarga
    const r = k.inner;
    ctx.globalAlpha = 0.45 + k.warn * 0.55;
    bolt(ctx, r.x + r.w / 2, r.y + r.h / 2, Math.min(r.w, r.h) * 0.3, k.blink ? '#fff59a' : GOLD);
    ctx.globalAlpha = 1;
    if (k.warn > 0) arcs(ctx, r, t, 1 + Math.floor(k.warn * 2), 0.5 + k.warn * 0.4);
    if (k.z.flash > 0) {
      ctx.fillStyle = `rgba(160,245,255,${0.55 * k.z.flash})`;
      ctx.fillRect(k.x0, k.y0, k.z.w, k.y1 - k.y0);
      arcs(ctx, r, t, 4, k.z.flash);
    }
  }
  ctx.restore();
}

// Medidas de um quadrado de zona: bordas à mostra, topo do tapete (a
// espessura fica embaixo) e a área de dentro das fitas (brilho e raio)
function tileShape(z, t) {
  const e = z.edges ?? { top: true, left: true, right: true, bottom: true };
  const warn = Hazards.warning(z);
  const x0 = z.x;
  const y0 = z.y;
  const x1 = z.x + z.w;
  const y1 = z.y + z.h - (e.bottom ? THICK : 0);
  const inner = {
    x: x0 + (e.left ? BAND : 0),
    y: y0 + (e.top ? BAND : 0),
    w: z.w - (e.left ? BAND : 0) - (e.right ? BAND : 0),
    h: y1 - y0 - (e.top ? BAND : 0) - (e.bottom ? BAND : 0),
  };
  return { z, e, warn, blink: warn > 0 && Math.sin(t * 40) > 0, x0, y0, x1, y1, inner };
}

// Retângulo que cobre todas as zonas (as listras são desenhadas nele e
// recortadas pelas faixas)
function bounds(tiles) {
  const xs = tiles.flatMap((k) => [k.x0, k.x1]);
  const ys = tiles.flatMap((k) => [k.y0, k.y1]);
  const x = Math.min(...xs) - 1;
  const y = Math.min(...ys) - 1;
  return { x, y, w: Math.max(...xs) - x + 2, h: Math.max(...ys) - y + 2 };
}

// Retângulo que avança meio pixel sobre os vizinhos sem borda à mostra
function fillBleed(ctx, e, r) {
  const b = (side) => (e[side] ? 0 : 0.5);
  ctx.fillRect(r.x - b('left'), r.y - b('top'), r.w + b('left') + b('right'), r.h + b('top') + b('bottom'));
}

// Azul do brilho já misturado com a borracha (opaco: quadrados vizinhos não
// somam transparência na emenda)
function glowColor(a) {
  const mix = (base, glow) => Math.round(base + (glow - base) * a);
  return `rgb(${mix(38, 90)},${mix(48, 220)},${mix(76, 255)})`;
}

// Listras pretas na diagonal sobre o amarelo, andando devagar (recortadas
// pelas faixas: o path atual). Cada listra é a faixa onde x + y fica entre
// c e c + 4, com c numa grade fixa da tela: quadrados vizinhos emendam
function stripes(ctx, r, t) {
  ctx.save();
  ctx.clip();
  ctx.fillStyle = OUTLINE;
  const off = (t * 4) % 8;
  const top = r.y;
  const bot = r.y + r.h;
  ctx.beginPath();
  for (let c = Math.floor((r.x + top) / 8) * 8 - 8 + off; c < r.x + r.w + bot; c += 8) {
    ctx.moveTo(c - bot, bot);
    ctx.lineTo(c + 4 - bot, bot);
    ctx.lineTo(c + 4 - top, top);
    ctx.lineTo(c - top, top);
  }
  ctx.fill();
  ctx.restore();
}

export function drawStunned(ctx, t) {
  // raiozinhos piscando em volta do corpo
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 0; i < 2; i++) {
    if (Math.sin(t * 30 + i * 2) < -0.2) continue;
    const a = Math.floor(t * 12) * 1.7 + i * Math.PI;
    const x = Math.cos(a) * 17;
    const y = -16 + Math.sin(a) * 18;
    zigzag(ctx, x, y, x + Math.cos(a + 1.2) * 12, y + Math.sin(a + 1.2) * 12, 3, i + Math.floor(t * 12));
  }
  // estrelinhas girando na cabeça (tonto)
  for (let i = 0; i < 3; i++) {
    const a = t * 5 + (i * Math.PI * 2) / 3;
    star(ctx, Math.cos(a) * 13, -50 + Math.sin(a) * 4, 4.5);
    ctx.fillStyle = '#fff59a';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
  }
  ctx.restore();
}

// Aviso ao arrastar uma defesa por cima de uma zona
export function drawHazardWarning(ctx, x, y) {
  text(ctx, '⚡ ZONA ELÉTRICA', x, y - 62, { size: 14, color: '#fff59a' });
}

function bolt(ctx, x, y, s, color) {
  ctx.beginPath();
  ctx.moveTo(x + s * 0.25, y - s);
  ctx.lineTo(x - s * 0.55, y + s * 0.15);
  ctx.lineTo(x - s * 0.05, y + s * 0.15);
  ctx.lineTo(x - s * 0.3, y + s);
  ctx.lineTo(x + s * 0.55, y - s * 0.2);
  ctx.lineTo(x + s * 0.05, y - s * 0.2);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = OUTLINE;
  ctx.stroke();
}

// Raios atravessando a zona (mudam de forma ~12x por segundo)
function arcs(ctx, z, t, n, alpha) {
  const frame = Math.floor(t * 12);
  ctx.globalAlpha = alpha;
  for (let i = 0; i < n; i++) {
    const r = rand(frame * 7 + i * 13);
    const x0 = z.x + 8 + r() * (z.w - 16);
    const y0 = z.y + 8 + r() * (z.h - 16);
    const x1 = z.x + 8 + r() * (z.w - 16);
    const y1 = z.y + 8 + r() * (z.h - 16);
    zigzag(ctx, x0, y0, x1, y1, 4, frame + i);
  }
  ctx.globalAlpha = 1;
}

function zigzag(ctx, x0, y0, x1, y1, steps, seed) {
  const r = rand(seed * 31 + 5);
  const nx = -(y1 - y0);
  const ny = x1 - x0;
  const len = Math.hypot(nx, ny) || 1;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  for (let k = 1; k < steps; k++) {
    const f = k / steps;
    const off = (r() - 0.5) * 10;
    ctx.lineTo(x0 + (x1 - x0) * f + (nx / len) * off, y0 + (y1 - y0) * f + (ny / len) * off);
  }
  ctx.lineTo(x1, y1);
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(40,120,200,0.6)';
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#e8fdff';
  ctx.stroke();
}

// Aleatório determinístico (os raios não "tremem" entre quadros iguais)
function rand(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = Math.imul(a ^ (a >>> 15), a | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
