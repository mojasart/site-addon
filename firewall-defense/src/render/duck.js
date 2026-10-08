import { OUTLINE } from '../config.js';
import { ellipse, fillOutline } from './canvas.js';

/* ════════════════════════════════════════════════════════════
 *  PATO DE BORRACHA (upgrade secreto da Dark Net)
 *  Patinho amarelo olhando pra direita, centrado na origem. s = raio do
 *  corpo. gray: apagado (ainda não comprado, na Dark Net). hop (0→1):
 *  pulinho quando acha um café.
 * ════════════════════════════════════════════════════════════ */

const COLORS = {
  body: '#ffd23f',
  wing: '#ffe680',
  beak: '#ff8a2e',
};
const GRAY = {
  body: '#6b6380',
  wing: '#7d7592',
  beak: '#8a8299',
};

export function drawDuck(ctx, s, { t = 0, gray = false, hop = 0 } = {}) {
  const c = gray ? GRAY : COLORS;
  const bob = Math.sin(t * 2.4) * s * 0.06 - Math.sin(hop * Math.PI) * s * 0.6;
  const tilt = Math.sin(t * 1.7) * 0.06 + hop * 0.25;
  ctx.save();
  ctx.translate(0, bob);
  ctx.rotate(-tilt);

  // rabinho pra cima, atrás do corpo
  ctx.beginPath();
  ctx.moveTo(-s * 0.85, -s * 0.15);
  ctx.quadraticCurveTo(-s * 1.35, -s * 0.75, -s * 1.15, -s * 0.85);
  ctx.quadraticCurveTo(-s * 0.85, -s * 0.55, -s * 0.5, -s * 0.35);
  ctx.closePath();
  fillOutline(ctx, c.body, 2.5);

  // corpo
  ellipse(ctx, 0, 0, s * 1.1, s * 0.72);
  fillOutline(ctx, c.body, 2.5);
  // asa
  ellipse(ctx, -s * 0.15, -s * 0.05, s * 0.55, s * 0.32, -0.25);
  fillOutline(ctx, c.wing, 2);

  // cabeça
  ctx.beginPath();
  ctx.arc(s * 0.55, -s * 0.85, s * 0.55, 0, Math.PI * 2);
  fillOutline(ctx, c.body, 2.5);
  // bico
  ellipse(ctx, s * 1.12, -s * 0.72, s * 0.34, s * 0.17);
  fillOutline(ctx, c.beak, 2);
  // olho
  ctx.beginPath();
  ctx.arc(s * 0.72, -s * 0.98, s * 0.11, 0, Math.PI * 2);
  ctx.fillStyle = OUTLINE;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(s * 0.75, -s * 1.01, s * 0.04, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // brilho de borracha
  if (!gray) {
    ellipse(ctx, s * 0.4, -s * 1.12, s * 0.16, s * 0.08, -0.5);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fill();
  }
  ctx.restore();
}
