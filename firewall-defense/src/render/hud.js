import { VIEW_H, INK } from '../config.js';
import { DEFENDERS, DEFENDER_ORDER } from '../data/defenders.js';
import { rrect, circle, fillOutline, text } from './canvas.js';
import { drawDefenderIcon } from './defenders.js';
import { roundButton, uiButton, ICONS } from './ui.js';

/* ════════════════════════════════════════════════════════════
 *  HUD DA PARTIDA (Etapa 4)
 *
 *  hudLayout(game) → posições em coordenadas de TELA (largura game.viewW):
 *     stats   → vida e dinheiro (topo esquerdo)
 *     money   → ponto pra onde as moedas voam
 *     wavePill→ "ONDA x/10" (topo centro)
 *     pause   → botão de pausa (topo direito), círculo {x,y,r}
 *     dock    → 6 botões de defensor (embaixo), {type, x, y, r}
 *     waveBtn → iniciar onda (canto inferior direito), círculo {x,y,r}
 *  drawHud(ctx, game)          → desenha tudo isso
 *  sellLayout(game, defender)  → botão "vender" perto do defensor selecionado
 *  drawSellBubble(ctx, game, defender)
 *
 *  VISUAL PROVISÓRIO — será refeito na Etapa 4.
 * ════════════════════════════════════════════════════════════ */

export function hudLayout(game) {
  const W = game.viewW;
  const gap = 84;
  const dock = DEFENDER_ORDER.map((type, i) => ({ type, x: W / 2 + (i - (DEFENDER_ORDER.length - 1) / 2) * gap, y: VIEW_H - 54, r: 34 }));
  return {
    stats: { x: 14, y: 12, w: 236, h: 46 },
    money: { x: 150, y: 35 },
    wavePill: { x: W / 2 - 72, y: 12, w: 144, h: 38 },
    pause: { x: W - 44, y: 38, r: 28 },
    dock,
    waveBtn: { x: W - 66, y: VIEW_H - 66, r: 46 },
  };
}

export function drawHud(ctx, game) {
  const L = hudLayout(game);
  rrect(ctx, L.stats.x, L.stats.y, L.stats.w, L.stats.h, 23);
  fillOutline(ctx, 'rgba(255,255,255,0.92)', 3);
  ctx.save();
  ctx.translate(L.stats.x + 26, L.stats.y + 24);
  ICONS.heart(ctx, 12);
  ctx.restore();
  text(ctx, String(Math.max(0, game.lives)), L.stats.x + 46, L.stats.y + 24, { size: 24, color: INK, stroke: null, align: 'left' });
  ctx.save();
  ctx.translate(L.money.x - 24, L.money.y + 1);
  ICONS.coin(ctx, 12);
  ctx.restore();
  text(ctx, String(game.money), L.money.x - 6, L.money.y + 1, { size: 24, color: INK, stroke: null, align: 'left' });

  rrect(ctx, L.wavePill.x, L.wavePill.y, L.wavePill.w, L.wavePill.h, 19);
  fillOutline(ctx, 'rgba(255,255,255,0.92)', 3);
  const n = Math.min(game.waves.index + (game.waves.active ? 1 : 0), game.waves.total) || 0;
  text(ctx, `ONDA ${n}/${game.waves.total}`, L.wavePill.x + L.wavePill.w / 2, L.wavePill.y + 20, { size: 18, color: INK, stroke: null });

  roundButton(ctx, L.pause, '#7f8fa8', 'pause');

  for (const b of L.dock) {
    const def = DEFENDERS[b.type];
    const selected = game.selectedType === b.type;
    const afford = game.money >= def.cost;
    ctx.save();
    const shake = game.denied?.type === b.type ? Math.sin(game.denied.t * 60) * 5 : 0;
    ctx.translate(b.x + shake, b.y - (selected ? 6 : 0));
    circle(ctx, 0, 0, b.r);
    fillOutline(ctx, selected ? '#ffe08a' : '#ffffff', selected ? 4 : 3);
    ctx.save();
    if (!afford) ctx.globalAlpha = 0.45;
    drawDefenderIcon(ctx, b.type, game.anim);
    ctx.restore();
    rrect(ctx, -28, b.r - 14, 56, 24, 12);
    fillOutline(ctx, afford ? '#ffc83d' : '#d9dde5', 2.5);
    text(ctx, `$${def.cost}`, 0, b.r - 2, { size: 15, color: INK, stroke: null });
    ctx.restore();
  }

  const canStart = !game.waves.active && game.state === 'build';
  roundButton(ctx, L.waveBtn, canStart ? '#45c36b' : '#9aa6b8', 'play');
}

export function sellLayout(game, d) {
  return { x: d.x + game.offsetX - 62, y: d.y - 116, w: 124, h: 44 };
}

export function drawSellBubble(ctx, game, d) {
  uiButton(ctx, sellLayout(game, d), `VENDER $${d.sellValue}`, '#ff6b6b', { size: 16 });
}
