import { OUTLINE } from '../config.js';
import { rrect, fillOutline, text } from './canvas.js';
import { drawCoin, drawHeart } from './sprites.js';
import { drawCharacter } from './characters.js';

/* ════════════════════════════════════════════════════════════
 *  DESENHO DOS CONSUMÍVEIS (data/consumables.js)
 *  drawItemIcon(ctx, id, s, t): o desenho do item centrado na origem, com
 *  "raio" s. Usado na loja (scenes/ShopScene.js) e na aba de itens do
 *  painel da partida.
 * ════════════════════════════════════════════════════════════ */

export function drawItemIcon(ctx, id, s, t = 0) {
  ctx.save();
  switch (id) {
    case 'cash': {
      // pilha de moedas com a de cima girando
      for (let i = 2; i >= 0; i--) {
        ctx.save();
        ctx.translate((i - 1) * s * 0.35, s * 0.35 - i * s * 0.18);
        drawCoin(ctx, s * 0.55, i === 0 ? t * 3 : 0);
        ctx.restore();
      }
      break;
    }
    case 'free': {
      // o Hacker com uma etiqueta "GRÁTIS"
      const k = s / 30;
      ctx.save();
      ctx.translate(0, s * 0.55);
      ctx.scale(k, k);
      drawCharacter(ctx, 'hacker', { t, face: 1, level: 0 });
      ctx.restore();
      ctx.save();
      ctx.translate(s * 0.45, -s * 0.55);
      ctx.rotate(-0.25);
      rrect(ctx, -s * 0.6, -s * 0.22, s * 1.2, s * 0.44, s * 0.12);
      fillOutline(ctx, '#3fd16b', 2);
      text(ctx, 'GRÁTIS', 0, 1, { size: Math.max(8, s * 0.3), strokeWidth: 3 });
      ctx.restore();
      break;
    }
    case 'freeze': {
      // floco de neve girando devagar
      ctx.rotate(t * 0.6);
      ctx.lineCap = 'round';
      for (const [w, color] of [[s * 0.32, OUTLINE], [s * 0.16, '#dff6ff']]) {
        ctx.lineWidth = w;
        ctx.strokeStyle = color;
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const cx = Math.cos(a);
          const cy = Math.sin(a);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(cx * s * 0.9, cy * s * 0.9);
          // galhinhos
          const bx = cx * s * 0.55;
          const by = cy * s * 0.55;
          for (const d of [-0.6, 0.6]) {
            ctx.moveTo(bx, by);
            ctx.lineTo(bx + Math.cos(a + d) * s * 0.3, by + Math.sin(a + d) * s * 0.3);
          }
          ctx.stroke();
        }
      }
      break;
    }
    case 'lives': {
      // coração batendo com um "+"
      const k = 1 + Math.sin(t * 5) * 0.06;
      ctx.scale(k, k);
      drawHeart(ctx, s * 0.85);
      text(ctx, '+', s * 0.62, -s * 0.55, { size: s * 0.8, color: '#3dff9a', strokeWidth: 4 });
      break;
    }
  }
  ctx.restore();
}
