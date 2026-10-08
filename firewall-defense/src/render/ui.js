import { VIEW_H, PANEL_W, OUTLINE, GOLD } from '../config.js';
import { TOWERS, TOWER_ORDER, TARGET_MODES } from '../data/towers.js';
import { rrect, circle, fillOutline, text, setFont, button } from './canvas.js';
import { drawCharacter } from './characters.js';
import { drawCoin, drawHeart, ICONS } from './sprites.js';
import { iconButton } from './widgets.js';
import { seeded } from '../util.js';

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
  drawCoin(ctx, 16.5); // do tamanho do coração de cima
  ctx.restore();
  text(ctx, `$${game.money}`, 54, 73, { size: 28 + game.coinBump * 4, color: GOLD, align: 'left' });

  const r = game.rounds;
  if (game.platinum) {
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
  const shown = game.placing ?? game.inspect; // posicionando ou só olhando os atributos
  text(ctx, shown ? TOWERS[shown].name : 'DEFESAS', P.x + P.w / 2 + 2, 22, { size: shown ? 19 : 24 });
  for (const tile of L.tiles) {
    const def = TOWERS[tile.type];
    const placing = shown === tile.type;
    const affordable = game.money >= def.cost;
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
    const blocked = game.blocked === tile.type;
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
    text(ctx, `$${def.cost}`, tile.x + tile.w / 2, tile.y + tile.h - 16, { size: 18, color: affordable ? GOLD : '#ff7a8a' });
  }
}

// ── Fundo cyber dos cards da loja ───────────────────────────
// Uma "telinha" dentro da moldura neon do botão: grade fina, trilhas de
// circuito (cada card com o seu desenho) com dados correndo devagar e um
// brilho no chão embaixo do boneco. Dourada quando é a defesa escolhida.
const CYBER = {
  idle: { top: '#0c1a3c', bottom: '#060d22', line: '95,200,255', glow: '47,200,255' },
  pick: { top: '#2a1d05', bottom: '#140d02', line: '255,207,74', glow: '255,207,74' },
};
const traceCache = new Map(); // desenho das trilhas de cada card (fixo)

function cardTraces(seed, w, h) {
  const key = `${seed},${w},${h}`;
  if (traceCache.has(key)) return traceCache.get(key);
  const rnd = seeded(seed * 7919 + 13);
  const step = 8;
  const traces = [];
  for (let i = 0; i < 5; i++) {
    // sai de uma borda e anda em ângulos retos (com uma diagonal de 45° às vezes)
    let x = Math.round((rnd() * (w - 16) + 8) / step) * step;
    let y = rnd() < 0.5 ? 0 : h;
    const dirY = y === 0 ? 1 : -1;
    const pts = [[x, y]];
    for (let k = 0; k < 3; k++) {
      y += dirY * step * (1 + Math.floor(rnd() * 3));
      pts.push([x, y]);
      const dx = (rnd() < 0.5 ? -1 : 1) * step * (1 + Math.floor(rnd() * 2));
      if (rnd() < 0.4) {
        x += dx;
        y += dirY * Math.abs(dx);
      } else x += dx;
      x = Math.max(6, Math.min(w - 6, x));
      pts.push([x, y]);
    }
    traces.push(pts);
  }
  traceCache.set(key, traces);
  return traces;
}

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
  // grade
  ctx.lineWidth = 1;
  ctx.strokeStyle = `rgba(${c.line},0.07)`;
  ctx.beginPath();
  for (let gx = x + 8; gx < x + w; gx += 8) {
    ctx.moveTo(gx + 0.5, y);
    ctx.lineTo(gx + 0.5, y + h);
  }
  for (let gy = y + 8; gy < y + h; gy += 8) {
    ctx.moveTo(x, gy + 0.5);
    ctx.lineTo(x + w, gy + 0.5);
  }
  ctx.stroke();
  // trilhas de circuito com a ponta (pad) e um dado correndo em cada uma
  const traces = cardTraces(seed, w, h);
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = `rgba(${c.line},0.28)`;
  for (const pts of traces) {
    ctx.beginPath();
    pts.forEach(([px, py], i) => (i ? ctx.lineTo(x + px, y + py) : ctx.moveTo(x + px, y + py)));
    ctx.stroke();
    const [ex, ey] = pts[pts.length - 1];
    ctx.beginPath();
    ctx.arc(x + ex, y + ey, 2, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${c.line},0.45)`;
    ctx.fill();
  }
  traces.forEach((pts, i) => {
    const segs = pts.slice(1).map((p, k) => Math.hypot(p[0] - pts[k][0], p[1] - pts[k][1]));
    const len = segs.reduce((a, b) => a + b, 0);
    let d = ((t * 22 + i * 37 + seed * 11) % (len + 40)) - 20; // passa e some um pouco antes de voltar
    if (d < 0 || d > len) return;
    let k = 0;
    while (d > segs[k]) d -= segs[k++];
    const [ax, ay] = pts[k];
    const [bx, by] = pts[k + 1];
    const f = d / segs[k];
    ctx.beginPath();
    ctx.arc(x + ax + (bx - ax) * f, y + ay + (by - ay) * f, 1.8, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${c.line},0.9)`;
    ctx.fill();
  });
  // brilho no chão embaixo do boneco
  const fy = y + 60;
  const glow = ctx.createRadialGradient(x + w / 2, fy, 2, x + w / 2, fy, 30);
  glow.addColorStop(0, `rgba(${c.glow},0.35)`);
  glow.addColorStop(1, `rgba(${c.glow},0)`);
  ctx.fillStyle = glow;
  ctx.fillRect(x, fy - 30, w, 60);
  // faixa escura do preço
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(x, y + h - 24, w, 24);
  ctx.fillStyle = `rgba(${c.line},0.35)`;
  ctx.fillRect(x, y + h - 24, w, 1);
  ctx.restore();
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
  if (game.platinum && game.rounds.started > 0) label = 'AUTO';
  else if (!game.rounds.canStart) label = 'ÚLTIMA';
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
