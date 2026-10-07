import { circle, fillOutline, shadow, text } from './canvas.js';

/* ════════════════════════════════════════════════════════════
 *  DEFENSORES (Etapa 2)
 *
 *  drawDefender(ctx, type, s)     → personagem em pé no ponto de instalação.
 *     Origem (0,0) = centro do ponto; os pés ficam perto de y=+6.
 *     s = { t, face (1 = olhando pra direita, -1 = esquerda),
 *           attack (1 logo depois de atacar → 0), spawn (1 ao ser instalado → 0) }
 *  drawDefenderIcon(ctx, type, t) → retrato pros botões da HUD, cabe num
 *     círculo de raio ~30 centrado em (0,0).
 *  drawProjectile(ctx, p, t)      → p.kind: 'dart' | 'burst' | 'bomb'; p.angle
 *
 *  VISUAL PROVISÓRIO — será refeito na Etapa 2.
 * ════════════════════════════════════════════════════════════ */

const COLORS = {
  hacker: '#3c4a63',
  roteador: '#2fb3a5',
  firewall: '#ff7a3d',
  scanner: '#5aa9ff',
  engenheiro: '#ffc83d',
  minerador: '#a37a52',
};

export function drawDefender(ctx, type, s = {}) {
  const pop = 1 + Math.sin((s.spawn ?? 0) * Math.PI) * 0.25;
  shadow(ctx, 0, 4, 18, 7);
  ctx.save();
  ctx.scale(pop, pop);
  ctx.translate(0, -(s.attack ?? 0) * 3);
  circle(ctx, 0, -18, 17);
  fillOutline(ctx, COLORS[type], 3);
  text(ctx, type[0].toUpperCase(), 0, -18, { size: 16 });
  ctx.restore();
}

export function drawDefenderIcon(ctx, type) {
  circle(ctx, 0, 0, 22);
  fillOutline(ctx, COLORS[type], 3);
  text(ctx, type[0].toUpperCase(), 0, 1, { size: 20 });
}

export function drawProjectile(ctx, p) {
  circle(ctx, 0, 0, p.kind === 'bomb' ? 7 : 5);
  fillOutline(ctx, p.kind === 'bomb' ? '#2b2340' : '#ffffff', 2);
}
