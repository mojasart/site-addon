import { circle, fillOutline, shadow } from './canvas.js';

/* ════════════════════════════════════════════════════════════
 *  INIMIGOS (Etapa 3)
 *
 *  drawEnemy(ctx, e, t) → origem (0,0) = ponto do caminho (os pés/base do
 *     inimigo ficam ali; o corpo desenha pra cima).
 *     e = { type, r, phase (relógio de andar), face (1/-1), angle,
 *           flash (>0 logo após levar dano), kick (1→0 tranco do dano),
 *           stun (>0 travado pelo Firewall), hp, maxHp, def.boss }
 *  DEATH_COLORS[type] → cores dos pedaços quando o inimigo é derrotado
 *
 *  VISUAL PROVISÓRIO — será refeito na Etapa 3.
 * ════════════════════════════════════════════════════════════ */

const COLORS = { virus: '#e8414e', worm: '#8cd03c', trojan: '#b5773a', ransomware: '#4b5568' };

export const DEATH_COLORS = {
  virus: ['#e8414e'],
  worm: ['#8cd03c'],
  trojan: ['#b5773a', '#9aa6b2'],
  ransomware: ['#4b5568', '#f7c843'],
};

export function drawEnemy(ctx, e) {
  shadow(ctx, 0, 2, e.r, e.r * 0.35);
  circle(ctx, 0, -e.r, e.r);
  fillOutline(ctx, e.flash > 0 ? '#ffffff' : COLORS[e.type], 3);
}
