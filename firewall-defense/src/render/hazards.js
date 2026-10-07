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
// também a espessura do tapete.
const BAND = 7; // largura da fita listrada
const THICK = 3; // espessura do tapete (a beirada da frente)

export function drawHazards(ctx, hazards, t) {
  for (const z of hazards.zones) {
    const warn = Hazards.warning(z);
    const blink = warn > 0 && Math.sin(t * 40) > 0;
    const e = z.edges ?? { top: true, left: true, right: true, bottom: true };
    const x0 = z.x;
    const y0 = z.y;
    const x1 = z.x + z.w;
    const y1 = z.y + z.h - (e.bottom ? THICK : 0); // topo do tapete (a espessura fica embaixo)
    ctx.save();

    // espessura da frente (só com chão embaixo)
    if (e.bottom) {
      ctx.fillStyle = '#0f1424';
      ctx.fillRect(x0, y1, z.w, THICK);
    }
    // superfície de borracha escura com brilho azul fraquinho
    ctx.fillStyle = '#26304c';
    ctx.fillRect(x0, y0, z.w, y1 - y0);
    const inner = {
      x: x0 + (e.left ? BAND : 0),
      y: y0 + BAND,
      w: z.w - (e.left ? BAND : 0) - (e.right ? BAND : 0),
      h: y1 - y0 - BAND - (e.bottom ? BAND : 0),
    };
    ctx.fillStyle = `rgba(90,220,255,${0.1 + 0.05 * Math.sin(t * 2.5) + warn * 0.15})`;
    ctx.fillRect(inner.x + 3, inner.y + 3, inner.w - 6, inner.h - 6);

    // fita listrada nas bordas à mostra (pisca no aviso)
    const bands = [];
    if (e.top) bands.push([x0, y0, z.w, BAND]);
    if (e.left) bands.push([x0, y0, BAND, y1 - y0]);
    if (e.right) bands.push([x1 - BAND, y0, BAND, y1 - y0]);
    if (e.bottom) bands.push([x0, y1 - BAND, z.w, BAND]);
    ctx.beginPath();
    for (const [bx, by, bw, bh] of bands) ctx.rect(bx, by, bw, bh);
    ctx.fillStyle = blink ? '#fff59a' : '#f2c21b';
    ctx.fill();
    stripes(ctx, { x: x0, y: y0, w: z.w, h: y1 - y0 }, t);

    // raio no meio
    ctx.globalAlpha = 0.45 + warn * 0.55;
    bolt(ctx, inner.x + inner.w / 2, inner.y + inner.h / 2, Math.min(inner.w, inner.h) * 0.3, blink ? '#fff59a' : GOLD);
    ctx.globalAlpha = 1;

    // faíscas no aviso e clarão + raios na descarga
    if (warn > 0) arcs(ctx, inner, t, 1 + Math.floor(warn * 2), 0.5 + warn * 0.4);
    if (z.flash > 0) {
      ctx.fillStyle = `rgba(160,245,255,${0.55 * z.flash})`;
      ctx.fillRect(x0, y0, z.w, y1 - y0);
      arcs(ctx, inner, t, 4, z.flash);
    }

    // contorno só nas bordas à mostra (as outras encostam no caminho)
    ctx.beginPath();
    if (e.top) {
      ctx.moveTo(x0, y0 + 1);
      ctx.lineTo(x1, y0 + 1);
    }
    if (e.left) {
      ctx.moveTo(x0 + 1, y0);
      ctx.lineTo(x0 + 1, y1 + (e.bottom ? THICK : 0));
    }
    if (e.right) {
      ctx.moveTo(x1 - 1, y0);
      ctx.lineTo(x1 - 1, y1 + (e.bottom ? THICK : 0));
    }
    if (e.bottom) {
      ctx.moveTo(x0, y1 + THICK - 1);
      ctx.lineTo(x1, y1 + THICK - 1);
    }
    ctx.lineWidth = 2;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
    ctx.restore();
  }
}

// Listras pretas na diagonal sobre o amarelo, andando devagar (recortadas
// pelas faixas: o path atual)
function stripes(ctx, r, t) {
  ctx.save();
  ctx.clip();
  ctx.fillStyle = OUTLINE;
  const off = (t * 6) % 12;
  ctx.beginPath();
  for (let x = r.x - r.h - 12 + off; x < r.x + r.w; x += 12) {
    ctx.moveTo(x, r.y + r.h);
    ctx.lineTo(x + 6, r.y + r.h);
    ctx.lineTo(x + 6 + r.h, r.y);
    ctx.lineTo(x + r.h, r.y);
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
