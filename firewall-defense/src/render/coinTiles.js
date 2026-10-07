import { TILE } from '../core/coinTiles.js';
import { rrect, text } from './canvas.js';
import { drawCoin } from './sprites.js';
import { sparkle } from './characters.js';

// Quadrados com pilha de bitcoin no chão (core/coinTiles.js). Com um
// Minerador sendo posicionado (highlight), as bordas piscam pra mostrar
// onde ele minera.
export function drawCoinTiles(ctx, tiles, t, highlight = false) {
  for (const tile of tiles) {
    const s = TILE - 6;
    ctx.save();
    ctx.translate(tile.x, tile.y);
    rrect(ctx, -s / 2, -s / 2, s, s, 9);
    ctx.fillStyle = 'rgba(120,70,0,0.28)';
    ctx.fill();
    const glow = highlight ? 0.6 + Math.sin(t * 8) * 0.4 : 0.75;
    ctx.lineWidth = highlight ? 4 : 2.5;
    ctx.strokeStyle = `rgba(255,198,46,${glow})`;
    ctx.setLineDash(highlight ? [] : [7, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
    // a pilha: 3 moedas embaixo, 2 no meio e 1 em cima
    for (const [x, y] of [[-11, 9], [0, 10], [11, 9], [-6, 1], [6, 1], [0, -7]]) {
      ctx.save();
      ctx.translate(x, y);
      drawCoin(ctx, 7, 0);
      ctx.restore();
    }
    const p = (t * 0.7 + tile.c * 0.37) % 1;
    if (p < 0.35) sparkle(ctx, 10, -12, 5 * Math.sin((p / 0.35) * Math.PI), '#fff6c8');
    ctx.restore();
  }
}

// Minerador fora da pilha: "Zz" subindo (não está minerando)
export function drawNoMine(ctx, x, y, t) {
  ctx.save();
  for (let i = 0; i < 2; i++) {
    const p = (t * 0.6 + i * 0.5) % 1;
    ctx.globalAlpha = Math.sin(p * Math.PI);
    text(ctx, 'z', x + 16 + p * 10 + i * 4, y - 40 - p * 22, { size: 14 + i * 4, color: '#d8e6ff', strokeWidth: 4 });
  }
  ctx.restore();
}
