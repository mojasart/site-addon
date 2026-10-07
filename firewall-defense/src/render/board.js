import {
  VIEW_H, ROWS, COLS, CELL_W, CELL_H, BOARD_X, BOARD_Y, BOARD_RIGHT, BOARD_BOTTOM, CORE_X, BACKUP_X, rowY,
} from '../config.js';
import { text } from './canvas.js';

// Fundo, grade de células, "cabos" de rede e zona da internet
export function drawBoard(ctx, game) {
  const t = game.anim;
  const W = game.viewW;
  const boardH = ROWS * CELL_H;

  ctx.fillStyle = '#060a14';
  ctx.fillRect(0, 0, W, VIEW_H);

  // faixa entre o núcleo e o tabuleiro (onde ficam os backups)
  ctx.fillStyle = '#081226';
  ctx.fillRect(CORE_X, BOARD_Y, BOARD_X - CORE_X, boardH);

  // zona da internet (de onde vêm as ameaças)
  ctx.fillStyle = 'rgba(255,59,92,0.06)';
  ctx.fillRect(BOARD_RIGHT, BOARD_Y, W - BOARD_RIGHT, boardH);

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      ctx.fillStyle = (r + c) % 2 ? '#0d1830' : '#101e3a';
      ctx.fillRect(BOARD_X + c * CELL_W, BOARD_Y + r * CELL_H, CELL_W, CELL_H);
    }
  }

  ctx.strokeStyle = 'rgba(61,214,255,0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let c = 0; c <= COLS; c++) {
    const x = BOARD_X + c * CELL_W + 0.5;
    ctx.moveTo(x, BOARD_Y);
    ctx.lineTo(x, BOARD_BOTTOM);
  }
  for (let r = 0; r <= ROWS; r++) {
    const y = BOARD_Y + r * CELL_H + 0.5;
    ctx.moveTo(BOARD_X, y);
    ctx.lineTo(BOARD_RIGHT, y);
  }
  ctx.stroke();

  // cabos de rede com dados fluindo em direção ao núcleo
  ctx.strokeStyle = 'rgba(61,214,255,0.22)';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 16]);
  ctx.lineDashOffset = t * 30;
  ctx.beginPath();
  for (let r = 0; r < ROWS; r++) {
    const y = rowY(r) + 36;
    ctx.moveTo(CORE_X, y);
    ctx.lineTo(W, y);
  }
  ctx.stroke();

  // perímetro da rede
  ctx.strokeStyle = 'rgba(255,59,92,0.5)';
  ctx.setLineDash([8, 8]);
  ctx.lineDashOffset = 0;
  ctx.beginPath();
  ctx.moveTo(BOARD_RIGHT + 0.5, BOARD_Y);
  ctx.lineTo(BOARD_RIGHT + 0.5, BOARD_BOTTOM);
  ctx.stroke();
  ctx.setLineDash([]);
}

// O que estamos protegendo
export function drawCore(ctx, game) {
  const t = game.anim;
  const h = ROWS * CELL_H;

  ctx.fillStyle = '#0c1d3a';
  ctx.fillRect(0, BOARD_Y, CORE_X, h);
  ctx.fillStyle = '#132b52';
  for (let y = BOARD_Y + 6; y < BOARD_BOTTOM - 6; y += 14) ctx.fillRect(6, y, CORE_X - 12, 6);

  // cabos ligando o núcleo aos backups
  ctx.fillStyle = 'rgba(61,214,255,0.35)';
  for (let r = 0; r < ROWS; r++) ctx.fillRect(CORE_X, rowY(r) - 1, BACKUP_X - CORE_X - 18, 2);

  ctx.fillStyle = `rgba(61,214,255,${0.55 + Math.sin(t * 3) * 0.25})`;
  ctx.fillRect(CORE_X - 3, BOARD_Y, 3, h);

  ctx.save();
  ctx.translate(CORE_X / 2, (BOARD_Y + BOARD_BOTTOM) / 2);
  ctx.rotate(-Math.PI / 2);
  text(ctx, 'NÚCLEO', 0, 0, { size: 16, color: '#9fe8ff', stroke: '#0c1d3a', strokeWidth: 6 });
  ctx.restore();
}

// Destaca onde dá pra colocar (ou deletar) quando uma carta está selecionada
export function drawPlacementHints(ctx, game) {
  const sel = game.selected;
  if (!sel) return;
  const deleting = sel === 'shovel';
  ctx.fillStyle = deleting ? 'rgba(255,59,92,0.10)' : 'rgba(255,210,63,0.07)';
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const occupied = !!game.grid[r][c];
      if (occupied === deleting) ctx.fillRect(BOARD_X + c * CELL_W + 2, BOARD_Y + r * CELL_H + 2, CELL_W - 4, CELL_H - 4);
    }
  }
}
