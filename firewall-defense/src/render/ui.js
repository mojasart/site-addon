import { INK } from '../config.js';
import { rrect, circle, fillOutline, text } from './canvas.js';
import { drawImage } from './images.js';

/* ════════════════════════════════════════════════════════════
 *  PEÇAS DE INTERFACE (Etapa 4): botões e ícones reaproveitados
 *  pela HUD, telas de pausa/fim e menus.
 *  VISUAL PROVISÓRIO — será refeito na Etapa 4.
 * ════════════════════════════════════════════════════════════ */

// Botão retangular arredondado com texto
export function uiButton(ctx, r, label, color = '#45c36b', { size = 24, pressed = false } = {}) {
  const d = pressed ? 1 : 5;
  rrect(ctx, r.x, r.y + 5, r.w, r.h - 5, r.h / 2);
  ctx.fillStyle = INK;
  ctx.fill();
  rrect(ctx, r.x, r.y + 5 - d, r.w, r.h - 5, r.h / 2);
  fillOutline(ctx, color, 3);
  text(ctx, label, r.x + r.w / 2, r.y + (r.h - 5) / 2 + 5 - d + 1, { size });
}

// Botão redondo com ícone
export function roundButton(ctx, c, color, icon) {
  circle(ctx, c.x, c.y + 3, c.r);
  ctx.fillStyle = INK;
  ctx.fill();
  circle(ctx, c.x, c.y, c.r);
  fillOutline(ctx, color, 3);
  ctx.save();
  ctx.translate(c.x, c.y);
  ICONS[icon]?.(ctx, c.r * 0.45);
  ctx.restore();
}

export const ICONS = {
  play(ctx, s) {
    ctx.beginPath();
    ctx.moveTo(-s * 0.55, -s);
    ctx.lineTo(s * 0.9, 0);
    ctx.lineTo(-s * 0.55, s);
    ctx.closePath();
    ctx.lineJoin = 'round';
    fillOutline(ctx, '#ffffff', 3);
  },
  pause(ctx, s) {
    for (const dx of [-s * 0.45, s * 0.45]) {
      rrect(ctx, dx - s * 0.25, -s * 0.8, s * 0.5, s * 1.6, 2);
      fillOutline(ctx, '#ffffff', 2.5);
    }
  },
  heart(ctx, s) {
    if (drawImage(ctx, 'heart', s * 2.6)) return;
    ctx.beginPath();
    ctx.moveTo(0, s * 0.95);
    ctx.bezierCurveTo(-s * 1.4, 0, -s * 0.9, -s * 1.15, 0, -s * 0.45);
    ctx.bezierCurveTo(s * 0.9, -s * 1.15, s * 1.4, 0, 0, s * 0.95);
    ctx.closePath();
    fillOutline(ctx, '#ff5a6e', 2.5);
  },
  coin(ctx, s) {
    if (drawImage(ctx, 'coin', s * 2.4)) return;
    circle(ctx, 0, 0, s);
    fillOutline(ctx, '#ffc83d', 2.5);
    circle(ctx, 0, 0, s * 0.62);
    ctx.fillStyle = '#ffe08a';
    ctx.fill();
  },
};
