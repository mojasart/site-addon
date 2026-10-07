import { OUTLINE } from '../config.js';
import { TILE } from '../core/coinTiles.js';
import { rrect, text, ellipse } from './canvas.js';
import { drawImage } from './images.js';
import { sparkle } from './characters.js';

// Quadrados com pilha de bitcoin no chão (core/coinTiles.js). Com um
// Minerador sendo posicionado (highlight), as bordas piscam pra mostrar
// onde ele minera. Com uma defesa em cima, a pilha some inteira (moedas e a
// marca do quadrado). O jogo desenha isto antes da rua elevada: com uma
// rua logo abaixo, o topo dela tapa a parte de baixo da pilha.
export function drawCoinTiles(ctx, tiles, t, highlight = false, towers = []) {
  for (const tile of tiles) {
    if (towers.some((tw) => Math.abs(tw.x - tile.x) < TILE / 2 && Math.abs(tw.y - tile.y) < TILE / 2)) continue;
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
    drawPile(ctx, t + tile.c * 0.37);
    ctx.restore();
  }
}

/* ── A pilha ────────────────────────────────────────────────
 *  Montinhos de moedas empilhadas vistos de cima em ângulo (3/4), como
 *  moedas de verdade: cada moeda é uma elipse (a face de cima, com o ₿
 *  achatado em perspectiva) com a espessura dourada embaixo. Desenha do
 *  fundo pra frente pra um montinho tampar o de trás.
 * ─────────────────────────────────────────────────────────── */
const RX = 8.5; // raio da moeda
const RY = 3.6; // achatamento da perspectiva
const THICK = 2.7; // espessura de cada moeda
// [x, y do chão, quantas moedas]; as de 1 moeda são as soltas no chão
const PILE = [
  [-5, -1, 5],
  [9, 2, 3],
  [-10, 10, 2],
  [6, 13, 1],
].sort((a, b) => a[1] - b[1]);

function drawPile(ctx, t) {
  ellipse(ctx, 1, 15, 23, 8);
  ctx.fillStyle = 'rgba(40,20,0,0.3)';
  ctx.fill();
  for (const [x, y, n] of PILE) drawStack(ctx, x, y, n);
  // brilho passando de vez em quando no topo do montinho mais alto
  const p = t % 2.4;
  if (p < 0.5) sparkle(ctx, -5, -1 - 4 * THICK - 4, 5 * Math.sin((p / 0.5) * Math.PI), '#fff6c8');
}

function drawStack(ctx, x, y, n) {
  const top = y - (n - 1) * THICK;
  // silhueta do montinho com o contorno grosso (o "look" cartoon)
  ctx.beginPath();
  ctx.ellipse(x, y + THICK, RX, RY, 0, 0, Math.PI);
  ctx.lineTo(x - RX, top);
  ctx.ellipse(x, top, RX, RY, 0, Math.PI, Math.PI * 2);
  ctx.closePath();
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3;
  ctx.strokeStyle = OUTLINE;
  ctx.stroke();
  for (let k = 0; k < n; k++) coinSide(ctx, x, y - k * THICK);
  coinFace(ctx, x, top);
}

// Espessura da moeda: faixa dourada com sombra nas pontas e serrilhado
function coinSide(ctx, x, y) {
  ctx.beginPath();
  ctx.ellipse(x, y + THICK, RX, RY, 0, 0, Math.PI);
  ctx.lineTo(x - RX, y);
  ctx.ellipse(x, y, RX, RY, 0, Math.PI, 0, true);
  ctx.closePath();
  const g = ctx.createLinearGradient(x - RX, 0, x + RX, 0);
  g.addColorStop(0, '#a3560c');
  g.addColorStop(0.35, '#f4b53c');
  g.addColorStop(0.7, '#dc8d1e');
  g.addColorStop(1, '#94490a');
  ctx.fillStyle = g;
  ctx.fill();
  // serrilhado da borda (risquinhos verticais seguindo a curva)
  ctx.beginPath();
  for (let i = -3; i <= 3; i++) {
    const dx = (i / 3.6) * RX;
    const dy = RY * Math.sqrt(1 - (dx / RX) ** 2);
    ctx.moveTo(x + dx, y + dy + 0.4);
    ctx.lineTo(x + dx, y + dy + THICK - 0.4);
  }
  ctx.lineWidth = 0.7;
  ctx.strokeStyle = 'rgba(110,55,0,0.45)';
  ctx.stroke();
  // linha separando uma moeda da outra
  ctx.beginPath();
  ctx.ellipse(x, y + THICK, RX, RY, 0, 0, Math.PI);
  ctx.lineWidth = 0.9;
  ctx.strokeStyle = 'rgba(90,40,0,0.6)';
  ctx.stroke();
}

// Face de cima: a moeda ₿ do jogo achatada em perspectiva
function coinFace(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, RY / RX);
  const drawn = drawImage(ctx, 'icon_coin', RX * 2.3);
  ctx.restore();
  if (drawn) return;
  ellipse(ctx, x, y, RX, RY);
  ctx.fillStyle = '#ffd04a';
  ctx.fill();
  ellipse(ctx, x, y, RX * 0.7, RY * 0.7);
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#e08a12';
  ctx.stroke();
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
