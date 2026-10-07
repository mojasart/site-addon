import { VIEW_H, PANEL_W, OUTLINE, GOLD } from '../config.js';
import { TOWERS, TOWER_ORDER, TARGET_MODES } from '../data/towers.js';
import { rrect, circle, fillOutline, text, setFont, button } from './canvas.js';
import { drawCharacter } from './characters.js';
import { drawCoin, drawHeart, ICONS } from './sprites.js';
import { iconButton } from './widgets.js';

// Posições da interface do jogo (pra desenhar E pra detectar toques).
// Coordenadas de tela; o painel fica colado na direita.
export function layout(game) {
  const px = game.mapW;
  const W = PANEL_W;
  return {
    panel: { x: px, y: 0, w: W, h: VIEW_H },
    // 2 colunas; se sobrar uma sozinha na última linha, ela fica no meio
    tiles: TOWER_ORDER.map((type, i) => {
      const alone = i === TOWER_ORDER.length - 1 && i % 2 === 0;
      return { type, x: px + 10 + (alone ? 45 : (i % 2) * 90), y: 44 + Math.floor(i / 2) * 116, w: 80, h: 108 };
    }),
    play: { x: px + 10, y: VIEW_H - 76, w: 108, h: 68 }, // próxima rodada
    speed: { x: px + 124, y: VIEW_H - 76, w: W - 134, h: 68 }, // 1x → 2x → 3x
    pause: { x: game.mapW - 58, y: 10, w: 48, h: 48 },
    close: { x: px + W - 48, y: 6, w: 40, h: 40 },
    upgrades: [0, 1].map((i) => ({ x: px + 10, y: 64 + i * 98, w: W - 20, h: 90 })),
    target: { x: px + 10, y: 262, w: W - 20, h: 46 },
    sell: { x: px + 10, y: 314, w: W - 20, h: 50 },
    info: { x: px + 10, y: 372, w: W - 20, h: 82 },
  };
}

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
  const bump = 1 + game.coinBump * 0.25;
  ctx.scale(bump, bump);
  drawCoin(ctx, 14);
  ctx.restore();
  text(ctx, `$${game.money}`, 54, 73, { size: 28 + game.coinBump * 4, color: GOLD, align: 'left' });

  const r = game.rounds;
  const shown = r.current;
  text(ctx, 'RODADA', L.pause.x - 14, 20, { size: 14, align: 'right', color: '#e3f6ff' });
  text(ctx, `${shown}/${r.total}`, L.pause.x - 14, 45, { size: 28, align: 'right' });
  iconButton(ctx, L.pause, '#5fb4ff', 'pause');
}

// ── Painel lateral ──────────────────────────────────────────
export function drawPanel(ctx, game) {
  const L = layout(game);
  const P = L.panel;
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  grad.addColorStop(0, '#34497f');
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
  drawSpeedButton(ctx, game, L.speed);
}

function drawShop(ctx, game, L) {
  const P = L.panel;
  text(ctx, game.placing ? TOWERS[game.placing].name : 'DEFESAS', P.x + P.w / 2 + 2, 22, { size: game.placing ? 19 : 24 });
  for (const tile of L.tiles) {
    const def = TOWERS[tile.type];
    const placing = game.placing === tile.type;
    const affordable = game.money >= def.cost;
    button(ctx, tile, placing ? '#ffcf4a' : '#5fb4ff', { radius: 14, depth: 5 });
    ctx.save();
    ctx.beginPath();
    rrect(ctx, tile.x + 2, tile.y + 2, tile.w - 4, tile.h - 8, 12);
    ctx.clip();
    ctx.translate(tile.x + tile.w / 2, tile.y + 56);
    ctx.scale(0.8, 0.8);
    drawCharacter(ctx, tile.type, { t: game.anim + tile.x * 0.01, face: 1, level: 0 });
    ctx.restore();
    if (!affordable) {
      rrect(ctx, tile.x, tile.y, tile.w, tile.h - 5, 14);
      ctx.fillStyle = 'rgba(20,28,60,0.55)';
      ctx.fill();
    }
    text(ctx, `$${def.cost}`, tile.x + tile.w / 2, tile.y + tile.h - 16, { size: 18, color: affordable ? GOLD : '#ff7a8a' });
  }
}

function drawTowerInfo(ctx, game, L) {
  const P = L.panel;
  const tw = game.selectedTower;
  const def = tw.def;
  text(ctx, def.name, P.x + 14, 24, { size: def.name.length > 11 ? 17 : 21, align: 'left' });
  if (def.attack !== 'farm' && def.damage !== 0) text(ctx, `Estourou ${tw.pops}`, P.x + 14, 50, { size: 13, align: 'left', color: '#bcd0f5' });
  iconButton(ctx, L.close, '#ff5a5a', 'close');

  if (def.upgrades.length) def.upgrades.forEach((up, i) => drawUpgrade(ctx, game, tw, up, i, L.upgrades[i]));

  if (def.targeting) {
    button(ctx, L.target, '#8a7dff', { radius: 12, depth: 5 });
    const mode = TARGET_MODES.find((m) => m.id === tw.targetMode);
    text(ctx, 'ALVO', L.target.x + L.target.w / 2, L.target.y + 12, { size: 11, color: '#ece9ff' });
    text(ctx, mode.label, L.target.x + L.target.w / 2, L.target.y + 29, { size: 17 });
  }

  button(ctx, L.sell, '#ff5a5a', { radius: 12, depth: 5 });
  text(ctx, `VENDER $${tw.sellValue}`, L.sell.x + L.sell.w / 2, L.sell.y + 22, { size: 19 });

  const info = towerInfo(tw);
  const r = def.upgrades.length ? L.info : { x: L.info.x, y: L.upgrades[0].y, w: L.info.w, h: 180 };
  rrect(ctx, r.x, r.y, r.w, r.h, 12);
  fillOutline(ctx, 'rgba(10,16,40,0.45)', 3);
  if (info.big) {
    text(ctx, info.title, r.x + r.w / 2, r.y + 26, { size: 15, color: '#d8e6ff' });
    text(ctx, info.big, r.x + r.w / 2, r.y + 74, { size: 42, color: GOLD });
    wrapText(ctx, info.sub, r.x + r.w / 2, r.y + 128, r.w - 20, 13, '#bcd0f5', 2);
  } else {
    wrapText(ctx, info.sub, r.x + r.w / 2, r.y + r.h / 2 - 9, r.w - 16, 13, '#d8e6ff', 3);
  }
}

function towerInfo(tw) {
  const s = tw.stats;
  switch (s.attack) {
    case 'decoy':
      return { title: 'VIDA DA ISCA', big: `${Math.ceil(tw.hp)}/${tw.maxHp}`, sub: 'Não dá dano: os vírus param pra atacar até ela quebrar' };
    case 'farm':
      return { sub: `Minera ${s.packetsPerRound} bitcoins de $${s.packetValue} por rodada${s.roundBonus ? ` e mais $${s.roundBonus} quando ela começa` : ''}` };
    default:
      if (s.slow) return { sub: `Suporte: deixa os vírus lentos${s.vulnerable ? ' e eles levam dano dobrado' : ''}` };
      return { sub: tw.hitsArmored ? 'Fura blindagem dos Trojans' : 'Não fura blindagem (Trojans)' };
  }
}

function drawUpgrade(ctx, game, tw, up, i, r) {
  const bought = tw.level > i;
  const next = tw.level === i;
  const affordable = game.money >= up.cost;
  const face = bought ? '#ffcf4a' : next && affordable ? '#3fd16b' : '#7d8fa8';
  button(ctx, r, face, { radius: 14, depth: 5 });
  text(ctx, up.name, r.x + r.w / 2, r.y + 17, { size: up.name.length > 16 ? 14 : 16 });
  wrapText(ctx, up.desc, r.x + r.w / 2, r.y + 38, r.w - 16, 12, '#ffffff', 2, OUTLINE);
  if (bought) text(ctx, 'COMPRADO', r.x + r.w / 2, r.y + r.h - 20, { size: 16 });
  else if (next) text(ctx, `$${up.cost}`, r.x + r.w / 2, r.y + r.h - 20, { size: 20, color: affordable ? GOLD : '#ff7a8a' });
  else text(ctx, 'BLOQUEADO', r.x + r.w / 2, r.y + r.h - 20, { size: 14, color: '#d8e6ff' });
}

// Botão da próxima rodada: INICIAR (primeira), contagem (mapa limpo) ou
// chamar já com outra rolando, mostrando o bônus que ganha
function drawPlayButton(ctx, game, r) {
  const can = game.canCall() && game.state === 'playing';
  const bonus = game.earlyBonus();
  const cx = r.x + r.w / 2;
  ctx.save();
  if (can && !game.rounds.active) {
    const k = 1 + Math.sin(game.anim * 5) * 0.03;
    ctx.translate(cx, r.y + r.h / 2);
    ctx.scale(k, k);
    ctx.translate(-cx, -(r.y + r.h / 2));
  }
  button(ctx, r, can ? '#3fd16b' : '#7d8aa8', { radius: 16, depth: 6 });
  ctx.save();
  ctx.translate(cx, r.y + 20);
  ICONS.play(ctx, 10);
  ctx.restore();
  let label = 'INICIAR';
  if (!game.rounds.canStart) label = 'ÚLTIMA';
  else if (!can) label = 'ESPERE';
  else if (game.nextIn != null) label = `${Math.ceil(game.nextIn)}s`;
  else if (bonus > 0) label = `+$${bonus}`;
  text(ctx, label, cx, r.y + 44, { size: 18, color: bonus > 0 && can ? GOLD : '#ffffff' });
  ctx.restore();
}

function drawSpeedButton(ctx, game, r) {
  button(ctx, r, game.speed > 1 ? '#ff9a2e' : '#5fb4ff', { radius: 16, depth: 6 });
  ctx.save();
  ctx.translate(r.x + r.w / 2, r.y + 20);
  ICONS.ff(ctx, 9);
  ctx.restore();
  text(ctx, `${game.speed}x`, r.x + r.w / 2, r.y + 44, { size: 20 });
}

export function wrapText(ctx, str, x, y, maxW, size, color, maxLines = 2, stroke = null) {
  setFont(ctx, size);
  const lines = [];
  let line = '';
  for (const w of str.split(' ')) {
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
export function drawRange(ctx, x, y, range, valid = true, color = null) {
  if (!Number.isFinite(range) || range <= 0) return;
  circle(ctx, x, y, range);
  ctx.fillStyle = color ?? (valid ? 'rgba(255,255,255,0.18)' : 'rgba(255,60,80,0.25)');
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = valid ? 'rgba(255,255,255,0.75)' : 'rgba(255,90,100,0.9)';
  ctx.stroke();
}
