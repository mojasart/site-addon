import { OUTLINE, GOLD } from '../config.js';
import { TOWERS } from '../data/towers.js';
import { AGES, statsAt, statRows } from '../data/towerInfo.js';
import { rrect, fillOutline, text, setFont } from './canvas.js';

/* ════════════════════════════════════════════════════════════
 *  ABA DE INFORMAÇÕES DA DEFESA
 *  Aparece na borda direita do mapa quando o jogador escolhe uma defesa
 *  na loja (antes de comprar) ou toca numa já colocada: o que ela faz,
 *  os números do nível atual e o próximo upgrade. A alça do lado recolhe
 *  e abre a aba (fica salvo em save.infoOpen).
 * ════════════════════════════════════════════════════════════ */

const W = 224; // largura da aba
const TOP = 70; // abaixo do contador de rodada
const PAD = 12;
const ROW_H = 20;

// Defesa mostrada: a selecionada no mapa ou a que está sendo colocada
function subject(game) {
  if (game.state !== 'playing') return null;
  const tw = game.selectedTower;
  if (tw) return { type: tw.type, level: tw.level, stats: tw.stats, placed: true };
  if (game.placing) return { type: game.placing, level: 0, stats: statsAt(game.placing, 0), placed: false };
  return null;
}

// Posições da aba e da alça (desenho e toque). null = nada pra mostrar
export function infoLayout(game) {
  const sub = subject(game);
  if (!sub) return null;
  const open = game.app.save?.infoOpen !== false;
  const h = game.infoH ?? 220; // altura medida no último desenho
  const card = { x: game.mapW - W - 10, y: TOP, w: W, h };
  const toggle = open ? { x: card.x - 28, y: TOP + 8, w: 30, h: 46 } : { x: game.mapW - 30, y: TOP + 8, w: 30, h: 46 };
  return { sub, open, card, toggle };
}

export function drawInfoPanel(ctx, game) {
  const L = infoLayout(game);
  if (!L) return;
  drawToggle(ctx, L);
  if (!L.open) return;

  const { sub, card } = L;
  const def = TOWERS[sub.type];
  const s = sub.stats;
  const levels = def.upgrades.length + 1;
  const x = card.x + PAD;
  const w = card.w - PAD * 2;

  // conteúdo: mede antes pra saber a altura da aba
  const desc = wrapLines(ctx, def.desc, w, 13);
  const rows = [
    ...(sub.placed ? [] : [['CUSTO', `$${def.cost}`]]),
    ...statRows(s, { armor: s.attack !== 'farm' && s.attack !== 'decoy' && s.effect !== 'frost' }),
  ];
  const next = sub.placed ? def.upgrades[sub.level] : def.upgrades[0];
  const nextLines = next ? wrapLines(ctx, next.desc, w, 12) : [];
  const h = PAD + 22 + 18 + desc.length * 16 + 8 + rows.length * ROW_H + (next ? 14 + 18 + nextLines.length * 15 : 0) + PAD;
  game.infoH = h;
  card.h = h;

  rrect(ctx, card.x, card.y + 5, card.w, card.h, 16);
  ctx.fillStyle = 'rgba(10,16,40,0.45)';
  ctx.fill();
  rrect(ctx, card.x, card.y, card.w, card.h, 16);
  fillOutline(ctx, 'rgba(31,43,82,0.94)', 3);

  let y = card.y + PAD + 10;
  text(ctx, def.name, x, y, { size: 18, align: 'left' });
  y += 20;
  const lvl = levels > 1 ? `NÍVEL ${sub.level + 1}/${levels} · ${AGES[sub.level]}` : 'NÍVEL ÚNICO';
  text(ctx, sub.placed ? lvl : 'NA LOJA · ' + lvl, x, y, { size: 11, align: 'left', color: '#9fb6e8' });
  y += 18;
  for (const line of desc) {
    text(ctx, line, x, y, { size: 13, align: 'left', color: '#ffffff' });
    y += 16;
  }
  y += 8;

  // status: rótulo à esquerda, valor à direita
  for (const [k, v] of rows) {
    rrect(ctx, x - 4, y - ROW_H / 2 + 1, w + 8, ROW_H - 2, 6);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fill();
    text(ctx, k, x, y, { size: 12, align: 'left', color: '#bcd0f5' });
    text(ctx, v, x + w, y, { size: 13, align: 'right', color: k === 'BLINDADOS' && v === 'não fura' ? '#ff9aa5' : GOLD });
    y += ROW_H;
  }

  if (next) {
    y += 14;
    text(ctx, `${sub.placed ? 'PRÓXIMO' : '1º UPGRADE'}: ${next.name} ($${next.cost})`, x, y, { size: 12, align: 'left', color: '#3dff9a' });
    y += 18;
    for (const line of nextLines) {
      text(ctx, line, x, y, { size: 12, align: 'left', color: '#d8e6ff' });
      y += 15;
    }
  }
}

// Alça na lateral: "›" recolhe (aba aberta), "i" abre (recolhida)
function drawToggle(ctx, L) {
  const r = L.toggle;
  rrect(ctx, r.x, r.y, r.w + 12, r.h, 10);
  fillOutline(ctx, L.open ? '#34497f' : '#5fb4ff', 3);
  const cx = r.x + r.w / 2 + 1;
  const cy = r.y + r.h / 2;
  if (L.open) {
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy - 8);
    ctx.lineTo(cx + 4, cy);
    ctx.lineTo(cx - 4, cy + 8);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 7;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
  } else {
    text(ctx, 'i', cx, cy + 1, { size: 24 });
  }
}

// Quebra o texto em linhas que cabem na largura
function wrapLines(ctx, str, maxW, size) {
  setFont(ctx, size);
  const lines = [];
  let line = '';
  for (const word of str.split(' ')) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = word;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}
