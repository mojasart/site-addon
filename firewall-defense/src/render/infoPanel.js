import { OUTLINE, GOLD } from '../config.js';
import { TOWERS } from '../data/towers.js';
import { statsAt, statRows } from '../data/towerInfo.js';
import { applyPerks } from '../data/darknet.js';
import { rrect, fillOutline, text } from './canvas.js';

/* ════════════════════════════════════════════════════════════
 *  ABA DE INFORMAÇÕES DA DEFESA
 *  Aparece na borda direita do mapa quando o jogador escolhe uma defesa
 *  na loja (antes de comprar, mesmo sem dinheiro: aí o custo fica
 *  vermelho) ou toca numa já colocada: o nome e os
 *  números do nível atual. A alça do lado recolhe e abre a aba (fica
 *  salvo em save.infoOpen). Abrir, fechar, aparecer e sumir são animados:
 *  a aba desliza pela borda direita do mapa.
 * ════════════════════════════════════════════════════════════ */

const W = 224; // largura da aba
const TOP = 70; // abaixo do contador de rodada
const PAD = 12;
const ROW_H = 20;
const SLIDE = W + 8; // recolhida: a aba sai da tela e só a alça fica na borda
const SPEED = 4; // velocidade da animação: vai de ponta a ponta em 1/SPEED s (0,25 s)
const ease = (k) => k * k * (3 - 2 * k);

// Defesa mostrada: a selecionada no mapa ou a que está sendo colocada
function subject(game) {
  if (game.state !== 'playing') return null;
  const tw = game.selectedTower;
  if (tw) return { type: tw.type, level: tw.level, stats: tw.stats, placed: true };
  if (game.placing) return { type: game.placing, level: 0, stats: applyPerks(statsAt(game.placing, 0), game.placing, game.app.perks), placed: false };
  // tocada na loja sem dinheiro pra comprar: só os atributos
  if (game.inspect) return { type: game.inspect, level: 0, stats: applyPerks(statsAt(game.inspect, 0), game.inspect, game.app.perks), placed: false };
  return null;
}

// Posições da aba e da alça (pro toque). null = nada pra mostrar
export function infoLayout(game) {
  const sub = subject(game);
  return sub ? layoutFor(game, sub) : null;
}

// Posições já com a animação: open (0→1) desliza a aba pra dentro e a
// alça junto; vis (0→1) faz tudo entrar pela borda quando aparece uma defesa
function layoutFor(game, sub) {
  const open = game.app.save?.infoOpen !== false;
  const k = ease(game.infoOpenK ?? (open ? 1 : 0));
  const vis = ease(game.infoVis ?? 1);
  const h = game.infoH ?? 220; // altura medida no último desenho
  const card = { x: game.mapW - W - 10 + (1 - k) * SLIDE + (1 - vis) * 50, y: TOP, w: W, h };
  const toggle = { x: card.x - 28, y: TOP + 8, w: 30, h: 46 };
  return { sub, open, card, toggle, k };
}

// Avança a animação (a cada desenho, pelo relógio do jogo). Guarda a
// última defesa mostrada pra aba continuar com ela enquanto some
function animate(game) {
  const sub = subject(game);
  if (sub) game.infoSub = sub;
  const dt = Math.min(0.05, Math.max(0, game.anim - (game.infoLast ?? game.anim)));
  game.infoLast = game.anim;
  const open = game.app.save?.infoOpen !== false;
  const step = (v, to) => v + Math.sign(to - v) * Math.min(Math.abs(to - v), dt * SPEED);
  game.infoVis = step(game.infoVis ?? 0, sub ? 1 : 0);
  game.infoOpenK = step(game.infoOpenK ?? (open ? 1 : 0), open ? 1 : 0);
  return game.infoVis > 0 ? game.infoSub : null;
}

export function drawInfoPanel(ctx, game) {
  const sub = animate(game);
  if (!sub) return;
  const L = layoutFor(game, sub);
  ctx.save();
  ctx.globalAlpha = Math.min(1, game.infoVis * 1.5);
  drawToggle(ctx, L);
  if (L.k > 0.001) drawCard(ctx, L, game);
  ctx.restore();
}

function drawCard(ctx, L, game) {
  const { sub, card } = L;
  const def = TOWERS[sub.type];
  const s = sub.stats;
  const x = card.x + PAD;
  const w = card.w - PAD * 2;

  // conteúdo: mede antes pra saber a altura da aba
  const rows = [
    ...(sub.placed ? [] : [['CUSTO', `$${game.costOf(sub.type)}`]]),
    ...statRows(s, { armor: s.attack !== 'farm' && s.attack !== 'decoy' && s.effect !== 'frost' }),
  ];
  const h = PAD * 2 + 34 + (rows.length - 0.5) * ROW_H;
  game.infoH = h;
  card.h = h;

  rrect(ctx, card.x, card.y + 5, card.w, card.h, 16);
  ctx.fillStyle = 'rgba(10,16,40,0.45)';
  ctx.fill();
  rrect(ctx, card.x, card.y, card.w, card.h, 16);
  fillOutline(ctx, 'rgba(31,43,82,0.94)', 3);

  let y = card.y + PAD + 10;
  text(ctx, def.name, x, y, { size: 18, align: 'left' });
  y += 26;

  // status: rótulo à esquerda, valor à direita
  for (const [k, v] of rows) {
    rrect(ctx, x - 4, y - ROW_H / 2 + 1, w + 8, ROW_H - 2, 6);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fill();
    text(ctx, k, x, y, { size: 12, align: 'left', color: '#bcd0f5' });
    const red = (k === 'BLINDADOS' && v === 'não fura') || (k === 'CUSTO' && !game.canAfford(game.costOf(sub.type))); // custo em vermelho: falta dinheiro
    text(ctx, v, x + w, y, { size: 13, align: 'right', color: red ? '#ff9aa5' : GOLD });
    y += ROW_H;
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
