import { VIEW_H, PANEL_W, OUTLINE, GOLD } from '../config.js';
import { comboMul } from '../data/bounty.js';
import { TOWERS, TOWER_ORDER, TARGET_MODES } from '../data/towers.js';
import { rrect, circle, fillOutline, text, setFont, button } from './canvas.js';
import { drawCharacter } from './characters.js';
import { drawVirusIcon } from './viruses.js';
import { ENEMIES } from '../data/enemies.js';
import { drawCoin, drawHeart, ICONS } from './sprites.js';
import { iconButton } from './widgets.js';
import { fmt } from '../util.js';
import { CONSUMABLES } from '../data/consumables.js';
import { drawItemIcon } from './consumables.js';

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
    // abas no topo do painel: DEFESAS e ITENS (game.panelTab)
    tabs: [
      { id: 'towers', label: 'DEFESAS', x: px + 10, y: 4, w: 88, h: 34 },
      { id: 'items', label: 'ITENS', x: px + 102, y: 4, w: W - 112, h: 34 },
    ],
    // aba ITENS: um card por consumível, 2 colunas, do tamanho dos cards de defesa
    items: CONSUMABLES.map((item, i) => ({ id: item.id, x: px + 10 + (i % 2) * 90, y: 44 + Math.floor(i / 2) * 116, w: 80, h: 108 })),
    play: { x: px + 10, y: VIEW_H - 76, w: 108, h: 68 }, // próxima rodada
    speed: { x: px + 124, y: VIEW_H - 76, w: W - 134, h: 68 }, // 1x → 2x → 3x
    pause: { x: game.mapW - 58, y: 10, w: 48, h: 48 },
    close: { x: px + W - 48, y: 6, w: 40, h: 40 },
    upgrades: [0, 1].map((i) => ({ x: px + 10, y: 64 + i * 98, w: W - 20, h: 90 })),
    ransom: { x: px + 10, y: 64, w: W - 20, h: 188 }, // no lugar dos upgrades (defesa criptografada)
    target: { x: px + 10, y: 262, w: W - 20, h: 46 },
    sell: { x: px + 10, y: 314, w: W - 20, h: 50 },
    preview: { x: px + 10, y: 390, w: W - 20, h: 66 }, // vírus da próxima rodada
  };
}

// ── HUD em cima do mapa ─────────────────────────────────────
export function drawHud(ctx, game) {
  const L = layout(game);
  const t = game.anim;

  if (game.bounty) {
    // Bug Bounty: pontos e combo no lugar das vidas
    text(ctx, `${game.points} pts`, 16, 32, { size: 28, align: 'left', color: '#ffe07a' });
    const mul = comboMul(game.combo);
    if (mul > 1) text(ctx, `COMBO x${String(mul).replace('.', ',')}`, 18 + measureText(ctx, `${game.points} pts`, 28) + 10, 34, { size: 16, align: 'left', color: '#ff9a2e' });
  } else {
    ctx.save();
    ctx.translate(30, 30);
    const beat = game.hurt > 0 ? 1 + Math.sin(t * 40) * 0.12 : 1;
    ctx.scale(beat, beat);
    drawHeart(ctx, 15);
    ctx.restore();
    text(ctx, String(Math.max(0, game.lives)), 54, 32, { size: 28, align: 'left' });
  }

  ctx.save();
  ctx.translate(30, 72);
  const bump = 1 + game.coinBump * 0.25;
  ctx.scale(bump, bump);
  drawCoin(ctx, 16.5); // do tamanho do coração de cima
  ctx.restore();
  // negativo (Empréstimo da Dark Net) fica vermelho: -$120
  text(ctx, game.money < 0 ? `-$${-game.money}` : `$${game.money}`, 54, 73, { size: 28 + game.coinBump * 4, color: game.money < 0 ? '#ff7a8a' : GOLD, align: 'left' });

  const r = game.rounds;
  if (game.bounty) {
    // Bug Bounty: relógio dos 90 s (pisca vermelho nos últimos 10)
    const left = Math.ceil(game.bountyLeft);
    const clock = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
    const hurry = game.rounds.started > 0 && left <= 10 && Math.sin(t * 10) > 0;
    text(ctx, 'BUG BOUNTY', L.pause.x - 14, 20, { size: 14, align: 'right', color: '#ffe07a' });
    text(ctx, clock, L.pause.x - 14, 45, { size: 28, align: 'right', color: hurry ? '#ff7a8a' : '#ffffff' });
  } else if (game.platinum) {
    // platina: relógio até o chefão (pisca vermelho no fim)
    const left = Math.ceil(game.platLeft);
    const clock = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
    const hurry = !game.bossCalled && left <= 10 && Math.sin(t * 10) > 0;
    text(ctx, 'PLATINA', L.pause.x - 14, 20, { size: 14, align: 'right', color: '#bdeeff' });
    text(ctx, game.bossCalled ? 'CHEFÃO' : clock, L.pause.x - 14, 45, { size: 28, align: 'right', color: game.bossCalled || hurry ? '#ff7a8a' : '#ffffff' });
  } else {
    text(ctx, 'RODADA', L.pause.x - 14, 20, { size: 14, align: 'right', color: '#e3f6ff' });
    text(ctx, `${r.current}/${r.total}`, L.pause.x - 14, 45, { size: 28, align: 'right' });
  }
  iconButton(ctx, L.pause, '#5fb4ff', 'pause');
  drawBossBars(ctx, game);
}

// Chefão com topBar (Ransomware): barra grande no topo, no meio do mapa,
// com o nome, um cadeado e a vida em pontos. Dois ao mesmo tempo: uma
// embaixo da outra. O rastro claro mostra o dano que acabou de levar.
const BAR_H = 26;
const topBosses = (game) => game.enemies.filter((e) => e.def.topBar && !e.dead);

// Onde acabam as barras de chefão no topo (0 = nenhuma): o aviso do topo fica embaixo delas
export function bossBarsBottom(game) {
  const n = topBosses(game).length;
  return n ? 12 + n * (BAR_H + 8) - 8 : 0;
}

function drawBossBars(ctx, game) {
  const bosses = topBosses(game);
  const w = Math.min(380, game.mapW - 400);
  const x = (game.mapW - w) / 2;
  bosses.forEach((e, i) => {
    const y = 12 + i * (BAR_H + 8);
    const k = Math.max(0, e.hp / e.maxHp);
    const ghost = Math.max(k, (e.ghostHp ?? e.hp) / e.maxHp);
    rrect(ctx, x, y + 3, w, BAR_H, 13);
    ctx.fillStyle = 'rgba(10,6,20,0.45)';
    ctx.fill();
    rrect(ctx, x, y, w, BAR_H, 13);
    fillOutline(ctx, '#2a1840', 3);
    const iw = w - 6;
    if (ghost > k) {
      rrect(ctx, x + 3, y + 3, iw * ghost, BAR_H - 6, 10);
      ctx.fillStyle = '#ffe0a8';
      ctx.fill();
    }
    if (k > 0) {
      rrect(ctx, x + 3, y + 3, Math.max(20, iw * k), BAR_H - 6, 10);
      const g = ctx.createLinearGradient(0, y + 3, 0, y + BAR_H - 3);
      g.addColorStop(0, '#ff8aa0');
      g.addColorStop(0.45, '#ff4d6d');
      g.addColorStop(1, '#c4234a');
      ctx.fillStyle = g;
      ctx.fill();
    }
    ctx.save();
    ctx.translate(x + 20, y + BAR_H / 2);
    if (e.def.ads) text(ctx, 'AD', 0, 1, { size: 12, color: GOLD }); // Adware
    else ICONS.lock(ctx, 9);
    ctx.restore();
    text(ctx, e.def.name.toUpperCase(), x + 36, y + BAR_H / 2 + 1, { size: 14, align: 'left' });
    text(ctx, `${fmt(Math.ceil(e.hp))} / ${fmt(e.maxHp)}`, x + w - 14, y + BAR_H / 2 + 1, { size: 14, align: 'right' });
  });
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
  else {
    if (game.panelTab === 'items') drawItems(ctx, game, L);
    else drawShop(ctx, game, L);
    drawPreview(ctx, game, L.preview);
  }
  drawPlayButton(ctx, game, L.play);
  drawSpeedButton(ctx, game, L.speed);
}

function drawShop(ctx, game, L) {
  const P = L.panel;
  const shown = game.placing ?? game.inspect; // posicionando ou só olhando os atributos
  if (shown) text(ctx, TOWERS[shown].name, P.x + P.w / 2 + 2, 22, { size: 19 });
  else drawTabs(ctx, game, L);
  for (const tile of L.tiles) {
    const def = TOWERS[tile.type];
    const placing = shown === tile.type;
    const cost = game.costOf(tile.type);
    const affordable = game.canAfford(cost);
    button(ctx, tile, placing ? '#ffcf4a' : '#2fc8ff', { radius: 14, depth: 5 });
    drawCyberScreen(ctx, tile, game.anim, placing, TOWER_ORDER.indexOf(tile.type));
    ctx.save();
    ctx.beginPath();
    rrect(ctx, tile.x + 2, tile.y + 2, tile.w - 4, tile.h - 8, 12);
    ctx.clip();
    ctx.translate(tile.x + tile.w / 2, tile.y + 56);
    ctx.scale(0.8, 0.8);
    drawCharacter(ctx, tile.type, { t: game.anim + tile.x * 0.01, face: 1, level: 0 });
    ctx.restore();
    const blocked = game.isLocked?.(tile.type) ?? game.blocked === tile.type;
    if (!affordable || blocked) {
      rrect(ctx, tile.x, tile.y, tile.w, tile.h - 5, 14);
      ctx.fillStyle = blocked ? 'rgba(20,28,60,0.75)' : 'rgba(20,28,60,0.55)';
      ctx.fill();
    }
    if (blocked) {
      // aliado bloqueado no modo platina
      ctx.save();
      ctx.translate(tile.x + tile.w / 2, tile.y + 44);
      ICONS.lock(ctx, 14);
      ctx.restore();
      text(ctx, 'BLOQUEADO', tile.x + tile.w / 2, tile.y + tile.h - 16, { size: 13, color: '#ff7a8a' });
      continue;
    }
    text(ctx, `$${cost}`, tile.x + tile.w / 2, tile.y + tile.h - 16, { size: 18, color: affordable ? GOLD : '#ff7a8a' });
    drawRoleTag(ctx, tile);
  }
}

// Abas DEFESAS / ITENS no topo do painel: a ativa fica acesa e "colada"
// nos cards; a outra apagada. A de itens mostra quantos itens tem no total.
function drawTabs(ctx, game, L) {
  const total = CONSUMABLES.reduce((n, c) => n + (game.app.inventory?.[c.id] ?? 0), 0);
  for (const tab of L.tabs) {
    const on = (game.panelTab ?? 'towers') === tab.id;
    rrect(ctx, tab.x, tab.y, tab.w, tab.h, 10);
    fillOutline(ctx, on ? '#2fc8ff' : '#2a3a68', 3);
    if (on) {
      rrect(ctx, tab.x + 4, tab.y + 4, tab.w - 8, tab.h / 2 - 4, 6);
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.fill();
    }
    const badge = tab.id === 'items' && total > 0;
    const cx = tab.x + tab.w / 2 - (badge ? 8 : 0);
    text(ctx, tab.label, cx, tab.y + tab.h / 2 + 1, { size: 15, color: on ? '#ffffff' : '#9fb2d8' });
    if (badge) {
      // bolinha com o total de itens no inventário
      const bx = tab.x + tab.w - 13;
      const by = tab.y + tab.h / 2;
      circle(ctx, bx, by, 10);
      fillOutline(ctx, '#ffcf4a', 2.5);
      text(ctx, total > 99 ? '99' : String(total), bx, by + 1, { size: total > 9 ? 10 : 12, strokeWidth: 3 });
    }
  }
}

// Aba ITENS: os consumíveis do inventário (comprados na Loja, na tela de
// mapas). Tocar no card usa um (useConsumable). Sem estoque fica apagado.
function drawItems(ctx, game, L) {
  const P = L.panel;
  const inv = game.app.inventory ?? {};
  drawTabs(ctx, game, L);
  CONSUMABLES.forEach((item, i) => {
    const tile = L.items[i];
    const n = inv[item.id] ?? 0;
    const active = item.id === 'free' && game.freeTower; // Defesa Grátis esperando a próxima defesa
    button(ctx, tile, active ? '#ffcf4a' : item.color, { radius: 14, depth: 5 });
    drawCyberScreen(ctx, tile, game.anim, active, i + 7);
    wrapText(ctx, item.name.toUpperCase(), tile.x + tile.w / 2, tile.y + 15, tile.w - 10, 11, '#ffffff', 2, OUTLINE);
    ctx.save();
    ctx.translate(tile.x + tile.w / 2, tile.y + 58);
    drawItemIcon(ctx, item.id, 18, game.anim);
    ctx.restore();
    if (n <= 0) {
      rrect(ctx, tile.x, tile.y, tile.w, tile.h - 5, 14);
      ctx.fillStyle = 'rgba(20,28,60,0.62)';
      ctx.fill();
    }
    if (active) text(ctx, 'ATIVA', tile.x + tile.w / 2, tile.y + tile.h - 16, { size: 15, color: GOLD });
    else text(ctx, String(n), tile.x + tile.w / 2, tile.y + tile.h - 16, { size: 18, color: n > 0 ? '#ffffff' : '#ff7a8a' });
  });
  // onde compra mais
  const y = L.items[L.items.length - 1].y + 108 + 16;
  wrapText(ctx, 'Compre mais na LOJA, na tela de mapas', P.x + P.w / 2 + 2, y, P.w - 30, 12, '#bcd0f5', 2);
}

// Etiqueta da função de cada defesa no card da loja (pra escolher sem abrir o catálogo)
const ROLE = {
  hacker: { label: 'DANO', color: '#ff7a5c' },
  firewall: { label: 'ÁREA', color: '#ff9a2e' },
  pinguim: { label: 'SUPORTE', color: '#5fd0ff' },
  scanner: { label: 'SNIPER', color: '#ff5a7a' },
  minerador: { label: 'ECONOMIA', color: '#ffc62e' },
  honeypot: { label: 'ISCA', color: '#f5a524' },
};

// Função escrita como num terminal: [DANO] em fonte de máquina, na cor da
// função e com brilho de fósforo (combina com a tela cyber do card)
const ROLE_GREEN = '#3dff9a'; // verde hacker em todas as funções
const ROLE_FONT = 'bold 11px "Courier New", ui-monospace, Menlo, Consolas, monospace';

function drawRoleTag(ctx, tile) {
  const role = ROLE[tile.type];
  if (!role) return;
  const def = TOWERS[tile.type];
  ctx.save();
  ctx.font = ROLE_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = ROLE_GREEN;
  ctx.shadowColor = ROLE_GREEN;
  ctx.shadowBlur = 6;
  ctx.fillText(`[${role.label}]`, tile.x + tile.w / 2, tile.y + 14);
  ctx.restore();
  // escudinho: fura blindagem (Trojan)
  if (def.canHitArmored && def.attack !== 'decoy' && def.effect !== 'frost') {
    ctx.save();
    ctx.translate(tile.x + tile.w - 13, tile.y + 30);
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(6, -4.5);
    ctx.quadraticCurveTo(6, 3.5, 0, 7);
    ctx.quadraticCurveTo(-6, 3.5, -6, -4.5);
    ctx.closePath();
    fillOutline(ctx, '#c9d3e0', 2);
    ctx.restore();
  }
}

// Prévia da próxima rodada: os tipos de vírus que vêm e quantos
function drawPreview(ctx, game, r) {
  const rounds = game.rounds;
  if (game.platinum || !rounds.canStart) return;
  const counts = new Map();
  for (const g of rounds.rounds[rounds.started]) if (g.count > 0) counts.set(g.type, (counts.get(g.type) ?? 0) + g.count);
  if (!counts.size) return;
  text(ctx, 'PRÓXIMA RODADA', r.x + r.w / 2, r.y + 8, { size: 11, color: '#bcd0f5' });
  const list = [...counts].slice(0, 4);
  const step = r.w / list.length;
  list.forEach(([type, n], i) => {
    const cx = r.x + step * (i + 0.5);
    ctx.save();
    ctx.translate(cx - 9, r.y + 36);
    drawVirusIcon(ctx, type, ENEMIES[type], 9);
    ctx.restore();
    text(ctx, `${n}`, cx + 13, r.y + 38, { size: 13, align: 'center' });
  });
}

// ── Fundo cyber dos cards da loja ───────────────────────────
// Uma "telinha" escura dentro da moldura neon do botão, no estilo da Dark
// Net: fundo liso e umas poucas colunas de código caindo bem apagadas.
// Dourada quando é a defesa escolhida.
const CYBER = {
  idle: { top: '#0b1430', bottom: '#05070f', rain: '95,200,255' },
  pick: { top: '#2a1d05', bottom: '#0f0a02', rain: '255,207,74' },
};
const RAIN_CHARS = '01<>/{}#$';
const RAIN_COLS = 4;

function drawCyberScreen(ctx, tile, t, picked, seed) {
  const c = picked ? CYBER.pick : CYBER.idle;
  const x = tile.x + 4;
  const y = tile.y + 4;
  const w = tile.w - 8;
  const h = tile.h - 13;
  ctx.save();
  rrect(ctx, x, y, w, h, 10);
  const bg = ctx.createLinearGradient(0, y, 0, y + h);
  bg.addColorStop(0, c.top);
  bg.addColorStop(1, c.bottom);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.clip();
  // chuva de código: cada coluna com a sua velocidade, só um rastro curto
  ctx.font = `9px "Courier New", ui-monospace, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < RAIN_COLS; i++) {
    const speed = 14 + ((i * 7 + seed * 5) % 4) * 4;
    const head = ((t * speed + i * 41 + seed * 23) % (h + 40)) - 20;
    const cx = x + ((i + 0.5) * w) / RAIN_COLS;
    for (let k = 0; k < 4; k++) {
      const cy = y + head - k * 10;
      if (cy < y - 6 || cy > y + h + 6) continue;
      ctx.fillStyle = `rgba(${c.rain},${(0.22 * (1 - k / 4)).toFixed(3)})`;
      ctx.fillText(RAIN_CHARS[(i * 3 + k + seed + Math.floor(t * 3)) % RAIN_CHARS.length], cx, cy);
    }
  }
  ctx.restore();
}

function drawTowerInfo(ctx, game, L) {
  const P = L.panel;
  const tw = game.selectedTower;
  const def = tw.def;
  text(ctx, def.name, P.x + 14, 24, { size: def.name.length > 11 ? 17 : 21, align: 'left' });
  if (def.attack !== 'farm' && def.damage !== 0) text(ctx, `Estourou ${tw.pops}`, P.x + 14, 50, { size: 13, align: 'left', color: '#bcd0f5' });
  iconButton(ctx, L.close, '#ff5a5a', 'close');

  if (tw.ransom) drawRansom(ctx, game, tw, L.ransom);
  else if (def.upgrades.length) def.upgrades.forEach((up, i) => drawUpgrade(ctx, game, tw, up, i, L.upgrades[i]));

  if (def.targeting && !tw.ransom) {
    button(ctx, L.target, '#8a7dff', { radius: 12, depth: 5 });
    const mode = TARGET_MODES.find((m) => m.id === tw.targetMode);
    text(ctx, 'ALVO', L.target.x + L.target.w / 2, L.target.y + 12, { size: 11, color: '#ece9ff' });
    text(ctx, mode.label, L.target.x + L.target.w / 2, L.target.y + 29, { size: 17 });
  }

  button(ctx, L.sell, '#ff5a5a', { radius: 12, depth: 5 });
  text(ctx, `VENDER $${tw.sellValue}`, L.sell.x + L.sell.w / 2, L.sell.y + 22, { size: 19 });

}

// Defesa criptografada pelo Ransomware: um botão grande pra pagar o resgate
function drawRansom(ctx, game, tw, r) {
  const can = game.canAfford(tw.ransom);
  button(ctx, r, can ? '#2fbf6a' : '#5d6680', { radius: 14, depth: 5 });
  const cx = r.x + r.w / 2;
  ctx.save();
  ctx.translate(cx, r.y + 38);
  ICONS.lock(ctx, 16);
  ctx.restore();
  text(ctx, 'CRIPTOGRAFADO', cx, r.y + 76, { size: 17, color: '#d6ffe9' });
  wrapText(ctx, 'Pague o resgate pra ele voltar a funcionar', cx, r.y + 104, r.w - 20, 12, '#ffffff', 2, OUTLINE);
  text(ctx, `PAGAR $${tw.ransom}`, cx, r.y + r.h - 28, { size: 20, color: can ? GOLD : '#ff7a8a' });
}

function drawUpgrade(ctx, game, tw, up, i, r) {
  const bought = tw.level > i;
  const next = tw.level === i;
  const affordable = game.canAfford(up.cost);
  const face = bought ? '#ffcf4a' : next && affordable ? '#3fd16b' : '#7d8fa8';
  button(ctx, r, face, { radius: 14, depth: 5 });
  text(ctx, up.name, r.x + r.w / 2, r.y + 17, { size: up.name.length > 16 ? 14 : 16 });
  wrapText(ctx, up.desc, r.x + r.w / 2, r.y + 38, r.w - 16, 12, '#ffffff', 2, OUTLINE);
  if (bought) text(ctx, 'COMPRADO', r.x + r.w / 2, r.y + r.h - 20, { size: 16 });
  else if (next) text(ctx, `$${up.cost}`, r.x + r.w / 2, r.y + r.h - 20, { size: 20, color: affordable ? GOLD : '#ff7a8a' });
  else text(ctx, 'BLOQUEADO', r.x + r.w / 2, r.y + r.h - 20, { size: 14, color: '#d8e6ff' });
}

// Botão da próxima rodada: INICIAR (primeira) ou
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
  if ((game.platinum || game.bounty) && game.rounds.started > 0) label = 'AUTO';
  else if (!game.rounds.canStart) label = 'ÚLTIMA';
  else if (!can) label = 'ESPERE';
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

// Largura de um texto no tamanho dado (pra pôr o combo do lado dos pontos)
function measureText(ctx, str, size) {
  setFont(ctx, size);
  return ctx.measureText(str).width;
}
