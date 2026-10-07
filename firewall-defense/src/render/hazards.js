import { OUTLINE, GOLD } from '../config.js';
import { rrect, circle, text } from './canvas.js';
import { star } from './characters.js';
import { Hazards } from '../systems/Hazards.js';

/* ════════════════════════════════════════════════════════════
 *  ZONAS ELETRIFICADAS
 *  drawHazards(ctx, hazards, t) → placas no chão (coords do mapa)
 *  drawStunned(ctx, t)          → raios + estrelinhas numa defesa
 *                                 atordoada (origem no centro da base)
 *  Parado fica discreto; pisca antes da descarga e clareia no choque.
 * ════════════════════════════════════════════════════════════ */

export function drawHazards(ctx, hazards, t) {
  for (const z of hazards.zones) {
    const warn = Hazards.warning(z);
    const blink = warn > 0 && Math.sin(t * 40) > 0;
    ctx.save();

    // placa escura com brilho azul fraquinho
    rrect(ctx, z.x, z.y, z.w, z.h, 10);
    ctx.fillStyle = 'rgba(30,38,60,0.78)';
    ctx.fill();
    rrect(ctx, z.x + 6, z.y + 6, z.w - 12, z.h - 12, 7);
    ctx.fillStyle = `rgba(90,220,255,${0.08 + 0.05 * Math.sin(t * 2.5) + warn * 0.15})`;
    ctx.fill();

    // borda listrada amarela e preta (pisca no aviso)
    rrect(ctx, z.x, z.y, z.w, z.h, 10);
    ctx.lineWidth = 6;
    ctx.strokeStyle = blink ? '#fff59a' : '#f2c21b';
    ctx.stroke();
    ctx.setLineDash([9, 9]);
    ctx.lineDashOffset = -t * 6;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
    ctx.setLineDash([]);
    rrect(ctx, z.x - 3, z.y - 3, z.w + 6, z.h + 6, 12);
    ctx.lineWidth = 2;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();

    // raio no meio
    ctx.globalAlpha = 0.45 + warn * 0.55;
    bolt(ctx, z.x + z.w / 2, z.y + z.h / 2, Math.min(z.w, z.h) * 0.22, blink ? '#fff59a' : GOLD);
    ctx.globalAlpha = 1;

    // faíscas no aviso e clarão + raios na descarga
    if (warn > 0) arcs(ctx, z, t, 1 + Math.floor(warn * 2), 0.5 + warn * 0.4);
    if (z.flash > 0) {
      rrect(ctx, z.x, z.y, z.w, z.h, 10);
      ctx.fillStyle = `rgba(160,245,255,${0.55 * z.flash})`;
      ctx.fill();
      arcs(ctx, z, t, 4, z.flash);
    }
    ctx.restore();
  }
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
