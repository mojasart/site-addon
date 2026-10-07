import { VIEW_H, GOLD } from '../config.js';
import { rrect, fillOutline, text, button } from './canvas.js';
import { drawTower, drawEnemy } from './sprites.js';
import { ENEMIES } from '../data/enemies.js';

// Botão grande das telas (menu, vitória, derrota). Usado pra desenhar e pro toque.
export function screenButton(game) {
  return { x: game.viewW / 2 - 130, y: VIEW_H / 2 + 92, w: 260, h: 76 };
}

export function drawBanner(ctx, game) {
  const b = game.banner;
  if (!b) return;
  const k = Math.min(1, (b.total - b.time) * 5);
  const a = Math.min(1, b.time * 2.5);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(game.mapW / 2, VIEW_H / 2 - 40);
  ctx.scale(0.6 + 0.4 * easeOutBack(k), 0.6 + 0.4 * easeOutBack(k));
  text(ctx, b.text, 0, 0, { size: b.size ?? 46, color: b.color });
  ctx.restore();
}

function easeOutBack(x) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2;
}

export function drawOverlay(ctx, game) {
  if (game.state === 'playing') return;
  const W = game.viewW;
  const cx = W / 2;
  const t = game.anim;

  ctx.fillStyle = 'rgba(10,18,40,0.62)';
  ctx.fillRect(0, 0, W, VIEW_H);

  const card = { x: cx - 300, y: 40, w: 600, h: VIEW_H - 80 };

  if (game.state === 'paused') {
    text(ctx, 'PAUSADO', cx, VIEW_H / 2 - 20, { size: 64 });
    text(ctx, 'Toque para continuar', cx, VIEW_H / 2 + 40, { size: 22, color: '#d8f5ff' });
    return;
  }

  rrect(ctx, card.x, card.y + 8, card.w, card.h, 28);
  ctx.fillStyle = 'rgba(10,16,40,0.6)';
  ctx.fill();
  rrect(ctx, card.x, card.y, card.w, card.h, 28);
  fillOutline(ctx, '#30437a', 5);

  const btn = screenButton(game);

  if (game.state === 'menu') {
    // vitrine: vírus girando em volta do título
    const showcase = ['v1', 'v2', 'v3', 'v4', 'v5'];
    showcase.forEach((type, i) => {
      const a = t * 0.6 + (i / showcase.length) * Math.PI * 2;
      ctx.save();
      ctx.translate(cx + Math.cos(a) * 250, 150 + Math.sin(a) * 60);
      drawEnemy(ctx, { def: ENEMIES[type], r: 16, phase: t + i, angle: 0, slowTimer: 0, flash: 0 });
      ctx.restore();
    });
    text(ctx, 'FIREWALL', cx, 120, { size: 76, color: '#5fd8ff', strokeWidth: 12 });
    text(ctx, 'DEFENSE', cx, 190, { size: 76, color: GOLD, strokeWidth: 12 });

    const towers = ['antivirus', 'firewall', 'criptografia', 'scanner', 'minerador'];
    towers.forEach((type, i) => {
      ctx.save();
      ctx.translate(cx + (i - 2) * 76, 288);
      drawTower(ctx, type, { t, angle: -Math.PI / 4 + Math.sin(t + i) * 0.4 });
      ctx.restore();
    });
    text(ctx, 'Proteja o servidor! Estoure os vírus antes que cheguem nele.', cx, 345, { size: 17, color: '#d8f5ff' });

    button(ctx, btn, '#3fd16b', { radius: 20, depth: 7 });
    text(ctx, 'JOGAR', cx, btn.y + (btn.h - 7) / 2 + 1, { size: 38 });
    return;
  }

  const won = game.state === 'won';
  ctx.save();
  ctx.translate(cx, 150);
  if (won) drawTower(ctx, 'antivirus', { t, angle: -Math.PI / 2 });
  else {
    ctx.scale(1.6, 1.6);
    drawEnemy(ctx, { def: ENEMIES.v1, r: 16, phase: t, angle: 0, slowTimer: 0, flash: 0 });
  }
  ctx.restore();
  text(ctx, won ? 'REDE PROTEGIDA!' : 'SERVIDOR INVADIDO', cx, 230, { size: 52, color: won ? '#3dff9a' : '#ff5a6a', strokeWidth: 10 });
  text(ctx, won ? 'Você segurou todas as rodadas!' : `Os vírus chegaram na rodada ${game.rounds.index + 1}.`, cx, 285, {
    size: 20,
    color: '#d8f5ff',
  });
  text(ctx, `Vírus estourados: ${game.stats.pops}`, cx, 318, { size: 18, color: GOLD });

  if (game.endDelay <= 0) {
    button(ctx, btn, '#3fd16b', { radius: 20, depth: 7 });
    text(ctx, won ? 'DE NOVO' : 'TENTAR DE NOVO', cx, btn.y + (btn.h - 7) / 2 + 1, { size: won ? 36 : 30 });
  }
}
