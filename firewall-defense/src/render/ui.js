import { VIEW_H, PANEL_W, OUTLINE, GOLD } from '../config.js';
import { TOWERS, TOWER_ORDER, TARGET_MODES } from '../data/towers.js';
import { rrect, circle, fillOutline, text, setFont, button } from './canvas.js';
import { drawTower, drawCoin, drawHeart } from './sprites.js';

// Posições de tudo da interface (usado pra desenhar E pra detectar toques).
// Coordenadas de tela; o painel fica colado na direita.
export function layout(game) {
  const px = game.mapW;
  const W = PANEL_W;
  return {
    panel: { x: px, y: 0, w: W, h: VIEW_H },
    tiles: TOWER_ORDER.map((type, i) => ({ type, x: px + 10 + (i % 2) * 90, y: 50 + Math.floor(i / 2) * 116, w: 80, h: 108 })),
    play: { x: px + 10, y: VIEW_H - 78, w: W - 20, h: 68 },
    pause: { x: game.mapW - 60, y: 10, w: 50, h: 50 },
    close: { x: px + W - 50, y: 8, w: 42, h: 42 },
    upgrades: [0, 1].map((i) => ({ x: px + 10, y: 84 + i * 104, w: W - 20, h: 96 })),
    target: { x: px + 10, y: 294, w: W - 20, h: 48 },
    sell: { x: px + 10, y: 350, w: W - 20, h: 52 },
  };
}

export const inRect = (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

// ── HUD em cima do mapa ─────────────────────────────────────
export function drawHud(ctx, game) {
  const L = layout(game);
  const t = game.anim;

  ctx.save();
  ctx.translate(30, 30);
  const beat = game.hurt > 0 ? 1 + Math.sin(t * 40) * 0.12 : 1;
  ctx.scale(beat, beat);
  drawHeart(ctx, 15);
  ctx.restore();
  text(ctx, String(Math.max(0, game.lives)), 54, 32, { size: 28, align: 'left' });

  ctx.save();
  ctx.translate(30, 72);
  drawCoin(ctx, 14);
  ctx.restore();
  text(ctx, `$${game.money}`, 54, 73, { size: 28, color: GOLD, align: 'left' });

  const r = game.rounds;
  const shown = Math.min(r.index + 1, r.total);
  text(ctx, 'RODADA', L.pause.x - 14, 20, { size: 14, align: 'right', color: '#d8f5ff' });
  text(ctx, `${shown}/${r.total}`, L.pause.x - 14, 45, { size: 28, align: 'right' });

  button(ctx, L.pause, '#5fb4ff', { radius: 12, depth: 4 });
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2.5;
  for (const dx of [-7, 5]) {
    rrect(ctx, L.pause.x + L.pause.w / 2 + dx - 1, L.pause.y + 14, 7, 18, 2);
    ctx.fill();
    ctx.stroke();
  }
}

// ── Painel lateral ──────────────────────────────────────────
export function drawPanel(ctx, game) {
  const L = layout(game);
  const P = L.panel;

  const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  grad.addColorStop(0, '#30437a');
  grad.addColorStop(1, '#1f2b52');
  ctx.fillStyle = grad;
  ctx.fillRect(P.x, 0, P.w, P.h);
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(P.x, 0, 5, P.h);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(P.x + 5, 0, 3, P.h);

  if (game.selectedTower) drawTowerInfo(ctx, game, L);
  else drawShop(ctx, game, L);

  drawPlayButton(ctx, game, L.play);
}

function drawShop(ctx, game, L) {
  const P = L.panel;
  text(ctx, 'DEFESAS', P.x + P.w / 2 + 2, 27, { size: 26 });

  for (const tile of L.tiles) {
    const def = TOWERS[tile.type];
    const placing = game.placing === tile.type;
    const affordable = game.money >= def.cost;
    button(ctx, tile, placing ? '#ffcf4a' : '#5fb4ff', { radius: 14, depth: 5 });
    ctx.save();
    ctx.translate(tile.x + tile.w / 2, tile.y + 44);
    ctx.scale(0.95, 0.95);
    drawTower(ctx, tile.type, { t: game.anim, angle: -Math.PI / 4 });
    ctx.restore();
    if (!affordable) {
      rrect(ctx, tile.x, tile.y, tile.w, tile.h - 5, 14);
      ctx.fillStyle = 'rgba(20,28,60,0.55)';
      ctx.fill();
    }
    text(ctx, `$${def.cost}`, tile.x + tile.w / 2, tile.y + tile.h - 20, { size: 20, color: affordable ? GOLD : '#ff7a8a' });
  }

  const info = game.placing ? TOWERS[game.placing] : null;
  if (info) {
    const y = L.tiles[L.tiles.length - 1].y + 116;
    text(ctx, info.name, P.x + P.w / 2, y, { size: 18, color: '#ffffff' });
    wrapText(ctx, info.desc, P.x + P.w / 2, y + 20, P.w - 24, 13, '#d8e6ff', 2);
  }
}

function drawTowerInfo(ctx, game, L) {
  const P = L.panel;
  const tw = game.selectedTower;
  const def = tw.def;

  text(ctx, def.name, P.x + 16, 28, { size: 22, align: 'left' });
  text(ctx, `Estourou ${tw.pops}`, P.x + 16, 58, { size: 14, align: 'left', color: '#bcd0f5' });

  // fechar
  button(ctx, L.close, '#ff5a5a', { radius: 12, depth: 4 });
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  const cx = L.close.x + L.close.w / 2;
  const cy = L.close.y + (L.close.h - 4) / 2;
  ctx.beginPath();
  ctx.moveTo(cx - 7, cy - 7);
  ctx.lineTo(cx + 7, cy + 7);
  ctx.moveTo(cx + 7, cy - 7);
  ctx.lineTo(cx - 7, cy + 7);
  ctx.stroke();

  if (def.upgrades.length) {
    def.upgrades.forEach((up, i) => drawUpgrade(ctx, game, tw, up, i, L.upgrades[i]));
  } else {
    // defesa sem upgrades (honeypot): mostra a capacidade restante
    const r = { ...L.upgrades[0], h: 200 };
    rrect(ctx, r.x, r.y, r.w, r.h, 14);
    fillOutline(ctx, 'rgba(10,16,40,0.45)', 3);
    text(ctx, 'CAPACIDADE', r.x + r.w / 2, r.y + 40, { size: 18, color: '#d8e6ff' });
    text(ctx, `${tw.capacity}/${def.capacity}`, r.x + r.w / 2, r.y + 90, { size: 44, color: GOLD });
    wrapText(ctx, 'Some quando estourar todos', r.x + r.w / 2, r.y + 140, r.w - 20, 13, '#bcd0f5', 2);
  }

  if (def.targeting) {
    button(ctx, L.target, '#8a7dff', { radius: 12, depth: 5 });
    const mode = TARGET_MODES.find((m) => m.id === tw.targetMode);
    text(ctx, 'ALVO', L.target.x + L.target.w / 2, L.target.y + 13, { size: 12, color: '#e9e6ff' });
    text(ctx, mode.label, L.target.x + L.target.w / 2, L.target.y + 30, { size: 17 });
  }

  button(ctx, L.sell, '#ff5a5a', { radius: 12, depth: 5 });
  text(ctx, `VENDER $${tw.sellValue}`, L.sell.x + L.sell.w / 2, L.sell.y + 23, { size: 19 });
}

function drawUpgrade(ctx, game, tw, up, i, r) {
  const bought = tw.level > i;
  const next = tw.level === i;
  const affordable = game.money >= up.cost;
  const face = bought ? '#ffcf4a' : next && affordable ? '#3fd16b' : '#7d8fa8';
  button(ctx, r, face, { radius: 14, depth: 5 });
  text(ctx, up.name, r.x + r.w / 2, r.y + 18, { size: 16 });
  wrapText(ctx, up.desc, r.x + r.w / 2, r.y + 40, r.w - 16, 12, '#ffffff', 2, OUTLINE);
  if (bought) text(ctx, 'COMPRADO', r.x + r.w / 2, r.y + r.h - 22, { size: 16 });
  else if (next) text(ctx, `$${up.cost}`, r.x + r.w / 2, r.y + r.h - 22, { size: 20, color: affordable ? GOLD : '#ff7a8a' });
  else text(ctx, 'BLOQUEADO', r.x + r.w / 2, r.y + r.h - 22, { size: 14, color: '#d8e6ff' });
}

function drawPlayButton(ctx, game, r) {
  const active = game.rounds.active;
  const t = game.anim;
  ctx.save();
  if (!active && game.state === 'playing') {
    // pulsa pra chamar atenção quando está esperando o jogador
    const k = 1 + Math.sin(t * 5) * 0.03;
    ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
    ctx.scale(k, k);
    ctx.translate(-(r.x + r.w / 2), -(r.y + r.h / 2));
  }
  const face = !active ? '#3fd16b' : game.speed > 1 ? '#ff9a2e' : '#5fb4ff';
  button(ctx, r, face, { radius: 16, depth: 6 });
  const cy = r.y + (r.h - 6) / 2;
  const ix = r.x + 38;
  if (!active) {
    triangle(ctx, ix, cy, 15);
    text(ctx, 'INICIAR', r.x + r.w / 2 + 22, cy + 1, { size: 24 });
  } else {
    triangle(ctx, ix - 9, cy, 12);
    triangle(ctx, ix + 9, cy, 12);
    text(ctx, `${game.speed}x`, r.x + r.w / 2 + 26, cy + 1, { size: 28 });
  }
  ctx.restore();
}

function triangle(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x - s * 0.6, y - s);
  ctx.lineTo(x + s * 0.9, y);
  ctx.lineTo(x - s * 0.6, y + s);
  ctx.closePath();
  ctx.lineJoin = 'round';
  fillOutline(ctx, '#ffffff', 3);
}

function wrapText(ctx, str, x, y, maxW, size, color, maxLines = 2, stroke = null) {
  setFont(ctx, size);
  const words = str.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  lines.slice(0, maxLines).forEach((l, i) => {
    text(ctx, l, x, y + i * (size + 3), { size, color, stroke, strokeWidth: 3 });
  });
}

// Círculo de alcance (cinza translúcido como no Bloons; vermelho se inválido)
export function drawRange(ctx, x, y, range, valid = true) {
  if (!Number.isFinite(range)) return;
  circle(ctx, x, y, range);
  ctx.fillStyle = valid ? 'rgba(255,255,255,0.18)' : 'rgba(255,60,80,0.25)';
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = valid ? 'rgba(255,255,255,0.7)' : 'rgba(255,90,100,0.9)';
  ctx.stroke();
}
