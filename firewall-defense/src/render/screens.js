import { VIEW_H, INK } from '../config.js';
import { rrect, fillOutline, text } from './canvas.js';
import { uiButton } from './ui.js';
import { easeOutBack, clamp } from '../util.js';

/* ════════════════════════════════════════════════════════════
 *  TELAS POR CIMA DA PARTIDA (Etapa 4): pausa, vitória, derrota
 *  overlayLayout(game) → botões (coords de tela) pro toque
 *  drawOverlay(ctx, game)
 *  VISUAL PROVISÓRIO — será refeito na Etapa 4.
 * ════════════════════════════════════════════════════════════ */

export function overlayLayout(game) {
  const cx = game.viewW / 2;
  const L = { card: { x: cx - 220, y: 90, w: 440, h: 330 } };
  if (game.state === 'paused') {
    L.resume = { x: cx - 140, y: 190, w: 280, h: 64 };
    L.restart = { x: cx - 140, y: 266, w: 280, h: 56 };
    L.menu = { x: cx - 140, y: 334, w: 280, h: 56 };
  } else {
    L.again = { x: cx - 140, y: 270, w: 280, h: 64 };
    L.menu = { x: cx - 140, y: 346, w: 280, h: 56 };
  }
  return L;
}

export function drawOverlay(ctx, game) {
  if (game.state !== 'paused' && game.state !== 'won' && game.state !== 'lost') return;
  ctx.fillStyle = 'rgba(30,22,48,0.55)';
  ctx.fillRect(0, 0, game.viewW, VIEW_H);
  const L = overlayLayout(game);
  rrect(ctx, L.card.x, L.card.y, L.card.w, L.card.h, 28);
  fillOutline(ctx, '#fff7ec', 4);
  const cx = game.viewW / 2;
  if (game.state === 'paused') {
    text(ctx, 'PAUSA', cx, 140, { size: 40, color: INK, stroke: null });
    uiButton(ctx, L.resume, 'CONTINUAR', '#45c36b', { size: 26 });
    uiButton(ctx, L.restart, 'REINICIAR', '#5aa9ff', { size: 22 });
    uiButton(ctx, L.menu, 'MENU', '#9aa6b8', { size: 22 });
    return;
  }
  const won = game.state === 'won';
  text(ctx, won ? 'VITÓRIA!' : 'DERROTA', cx, 150, { size: 46, color: won ? '#2e9e57' : '#e0474c', stroke: null });
  text(ctx, won ? 'Sua rede está protegida.' : 'As ameaças invadiram o servidor.', cx, 210, { size: 20, color: INK, stroke: null });
  if (game.endDelay <= 0) {
    uiButton(ctx, L.again, won ? 'JOGAR DE NOVO' : 'TENTAR DE NOVO', '#45c36b', { size: 24 });
    uiButton(ctx, L.menu, 'MENU', '#9aa6b8', { size: 22 });
  }
}

// Aviso curto no topo do mapa ("ONDA 3", "ONDA 3 CONCLUÍDA +$40")
export function drawBanner(ctx, game) {
  const b = game.banner;
  if (!b) return;
  const k = easeOutBack(clamp((b.total - b.time) * 5, 0, 1));
  ctx.save();
  ctx.globalAlpha = Math.min(1, b.time * 3);
  ctx.translate(game.viewW / 2, 112);
  ctx.scale(k, k);
  text(ctx, b.title, 0, 0, { size: 34 });
  if (b.sub) text(ctx, b.sub, 0, 36, { size: 22, color: '#ffc83d' });
  ctx.restore();
}
