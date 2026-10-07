import { OUTLINE, GOLD } from '../config.js';
import { rrect, fillOutline, text, button } from './canvas.js';
import { ICONS } from './sprites.js';
import { star } from './characters.js';

export const inRect = (r, x, y) => !!r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

// Botão grande com texto (e ícone opcional à esquerda)
export function bigButton(ctx, r, face, label, { icon, size = 26, pressed = false, depth = 6 } = {}) {
  button(ctx, r, face, { radius: 18, depth, pressed });
  const cy = r.y + (r.h - depth) / 2 + (pressed ? depth - 1 : 0);
  if (icon) {
    ctx.save();
    ctx.translate(r.x + 32, cy);
    ICONS[icon](ctx, 11);
    ctx.restore();
    text(ctx, label, r.x + r.w / 2 + 14, cy + 1, { size });
  } else text(ctx, label, r.x + r.w / 2, cy + 1, { size });
}

// Botão quadrado só com ícone
export function iconButton(ctx, r, face, icon, arg) {
  button(ctx, r, face, { radius: 14, depth: 5 });
  ctx.save();
  ctx.translate(r.x + r.w / 2, r.y + (r.h - 5) / 2);
  ICONS[icon](ctx, r.w * 0.24, arg);
  ctx.restore();
}

// Fileira de estrelas (cheias até n), com "pulo" opcional por estrela
export function stars(ctx, cx, y, n, size = 16, gap = 36, pop = null) {
  for (let i = 0; i < 3; i++) {
    const k = pop ? pop(i) : 1;
    if (k <= 0 && i < n) continue;
    ctx.save();
    ctx.translate(cx + (i - 1) * gap, y - (i === 1 ? size * 0.4 : 0));
    ctx.scale(i < n ? k : 1, i < n ? k : 1);
    star(ctx, 0, 0, size);
    fillOutline(ctx, i < n ? GOLD : 'rgba(20,30,60,0.55)', 3);
    ctx.restore();
  }
}

// Fita de título (estilo "banner" de jogo mobile)
export function ribbon(ctx, cx, y, w, label, color = '#ff5a6a', size = 26) {
  const h = size * 1.7;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + s * (w / 2 - 6), y - h / 2 + 8);
    ctx.lineTo(cx + s * (w / 2 + 22), y - h / 2 + 8);
    ctx.lineTo(cx + s * (w / 2 + 10), y + 4);
    ctx.lineTo(cx + s * (w / 2 + 22), y + h / 2 + 8);
    ctx.lineTo(cx + s * (w / 2 - 6), y + h / 2 + 8);
    ctx.closePath();
    fillOutline(ctx, '#c23a4a', 3);
  }
  rrect(ctx, cx - w / 2, y - h / 2, w, h, 10);
  fillOutline(ctx, color, 3.5);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(cx - w / 2 + 4, y - h / 2 + 4, w - 8, h * 0.35);
  text(ctx, label, cx, y + 1, { size, stroke: OUTLINE });
}
