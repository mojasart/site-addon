import { VIEW_H, OUTLINE, GOLD, ENERGY } from '../config.js';
import { rrect, fillOutline, text, setFont } from './canvas.js';
import { drawImage } from './images.js';
import { drawItemIcon } from './consumables.js';
import { bigButton, iconButton, ribbon } from './widgets.js';
import { ICONS } from './sprites.js';
import { easeOutBack } from '../util.js';

/* ════════════════════════════════════════════════════════════
 *  ENERGIA
 *  Cada partida gasta 1 quando passa da 1ª onda (antes disso, sair ou
 *  reiniciar não gasta). Volta 1 a cada
 *  ENERGY.regenMin minutos, até ENERGY.max. Sem energia, abre a janela
 *  "SEM ENERGIA" por cima de qualquer tela (app.energyUI), com o tempo pra
 *  próxima e um anúncio (simulado por enquanto) que dá +ENERGY.ad.
 *  Tudo em coordenadas de tela.
 * ════════════════════════════════════════════════════════════ */

// Raio amarelo (origem no centro, s = metade da altura). Usa a sprite
// energy_bolt (tools/sprites/gen.py); sem ela, o desenho em vetor
export function drawBolt(ctx, s, gray = false) {
  if (drawImage(ctx, 'energy_bolt', s * 2.5, 0, 0, gray ? 'grayscale(1) brightness(0.8)' : null)) return;
  ctx.beginPath();
  ctx.moveTo(s * 0.2, -s);
  ctx.lineTo(-s * 0.62, s * 0.12);
  ctx.lineTo(-s * 0.05, s * 0.12);
  ctx.lineTo(-s * 0.28, s);
  ctx.lineTo(s * 0.62, -s * 0.18);
  ctx.lineTo(s * 0.04, -s * 0.18);
  ctx.closePath();
  ctx.lineJoin = 'round';
  fillOutline(ctx, gray ? '#7d8fa8' : '#ffd23f', Math.max(2, s * 0.22));
}

// mm:ss
const clock = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

// Contador de energia no estilo dos jogos com vidas/energia (Candy Crush,
// Royal Match, Homescapes): o raio grande saindo da pílula pela esquerda,
// a quantidade em destaque e, numa caixinha à direita, o relógio até a
// próxima. A caixinha vai enchendo de amarelo enquanto a próxima carrega;
// com a energia cheia ela some.
export const ENERGY_BADGE = { w: 178, h: 42 };

export function drawEnergyBadge(ctx, app, x, y) {
  const { w, h } = ENERGY_BADGE;
  const e = app.energy;
  const inf = app.debug || app.vip; // energia infinita
  const full = inf || e >= ENERGY.max;
  const empty = !inf && e <= 0;
  const t = performance.now() / 1000;
  // sombra + pílula
  rrect(ctx, x, y + 4, w, h, h / 2);
  ctx.fillStyle = 'rgba(10,16,40,0.45)';
  ctx.fill();
  rrect(ctx, x, y, w, h, h / 2);
  fillOutline(ctx, '#1b2550', 3);

  // quantidade: "9" grande e "/10" menor
  const nx = x + 46;
  const cy = y + h / 2 + 1;
  const count = inf ? '∞' : String(e);
  text(ctx, count, nx, cy, { size: 24, align: 'left', color: empty ? '#ff7a8a' : '#ffffff' });
  if (!inf) {
    setFont(ctx, 24);
    text(ctx, `/${ENERGY.max}`, nx + ctx.measureText(count).width + 2, cy + 3, { size: 14, align: 'left', color: '#9fb2d8' });
  }

  // caixinha do tempo (enche enquanto a próxima energia carrega)
  const bw = 66;
  const bh = h - 12;
  const bx = x + w - bw - 6;
  const by = y + 6;
  // (com a energia cheia, sem VIP, não tem caixinha nenhuma)
  if (app.vip || !full) {
    ctx.save();
    rrect(ctx, bx, by, bw, bh, bh / 2);
    ctx.fillStyle = app.vip ? '#e0a92a' : '#0c1230';
    ctx.fill();
    if (!full) {
      ctx.clip();
      const k = 1 - app.energyNextMs() / app.energyRegenMs;
      ctx.fillStyle = 'rgba(255,210,63,0.30)';
      ctx.fillRect(bx, by, bw * Math.min(1, Math.max(0, k)), bh);
    }
    ctx.restore();
    if (app.vip) text(ctx, 'VIP', bx + bw / 2, by + bh / 2 + 1, { size: 15 });
    else text(ctx, clock(app.energyNextMs()), bx + bw / 2, by + bh / 2 + 1, { size: 15, color: '#ffe27a' });
  }

  // raio grande por cima da borda esquerda, respirando de leve
  ctx.save();
  ctx.translate(x + 20, y + h / 2);
  const k = empty ? 1 : 1 + Math.sin(t * 3) * 0.04;
  ctx.scale(k, k);
  drawBolt(ctx, 26, empty);
  ctx.restore();
}

// Posições da janela de energia (desenho e toque)
export function energyLayout(app) {
  const cx = app.viewW / 2;
  const card = { x: cx - 230, y: 110, w: 460, h: 320 };
  return {
    card,
    close: { x: card.x + card.w - 54, y: card.y + 14, w: 42, h: 42 },
    watch: { x: card.x + 50, y: card.y + 222, w: card.w - 100, h: 70 },
    skip: { x: cx - 130, y: VIEW_H - 110, w: 260, h: 70 }, // fim do anúncio
  };
}

export function drawEnergyModal(ctx, app) {
  const ui = app.energyUI;
  if (ui.mode === 'ad') return drawAd(ctx, app, ui);
  if (ui.mode === 'loading') return drawLoading(ctx, app, ui);
  const W = app.viewW;
  const L = energyLayout(app);
  const c = L.card;
  const k = easeOutBack(Math.min(1, ui.t * 4));
  ctx.fillStyle = `rgba(10,18,40,${0.75 * Math.min(1, ui.t * 4)})`;
  ctx.fillRect(0, 0, W, VIEW_H);
  ctx.save();
  ctx.translate(W / 2, VIEW_H / 2);
  ctx.scale(0.7 + 0.3 * k, 0.7 + 0.3 * k);
  ctx.translate(-W / 2, -VIEW_H / 2);
  rrect(ctx, c.x, c.y + 10, c.w, c.h, 28);
  ctx.fillStyle = 'rgba(10,16,40,0.55)';
  ctx.fill();
  rrect(ctx, c.x, c.y, c.w, c.h, 28);
  fillOutline(ctx, '#34497f', 5);
  ribbon(ctx, W / 2, c.y + 4, 280, 'SEM ENERGIA', '#ff9a2e', 26);
  iconButton(ctx, L.close, '#ff5a5a', 'close');
  // raio apagado pulsando
  ctx.save();
  ctx.translate(W / 2, c.y + 100);
  const p = 1 + Math.sin(ui.t * 5) * 0.06;
  ctx.scale(p, p);
  drawBolt(ctx, 34, true);
  ctx.restore();
  text(ctx, `0/${ENERGY.max} energias`, W / 2, c.y + 158, { size: 22 });
  // fechou o anúncio antes do fim: avisa no lugar do relógio
  if (ui.note) text(ctx, ui.note, W / 2, c.y + 190, { size: 16, color: '#ffb35c' });
  else text(ctx, `A próxima volta em ${clock(app.energyNextMs())}`, W / 2, c.y + 190, { size: 16, color: '#d8e6ff' });
  bigButton(ctx, L.watch, '#3fd16b', `ASSISTIR ANÚNCIO  +${ENERGY.ad}`, { icon: 'play', size: 21 });
  ctx.restore();
}

// Esperando o anúncio do Google: tela escura com "carregando" girando
function drawLoading(ctx, app, ui) {
  const W = app.viewW;
  ctx.fillStyle = `rgba(5,7,15,${Math.min(0.9, ui.t * 4)})`;
  ctx.fillRect(0, 0, W, VIEW_H);
  ctx.save();
  ctx.translate(W / 2, VIEW_H / 2 - 20);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + ui.t * 6;
    ctx.globalAlpha = 0.25 + 0.75 * (((i + Math.floor(ui.t * 8)) % 8) / 7);
    ctx.beginPath();
    ctx.arc(Math.cos(a) * 22, Math.sin(a) * 22, 5, 0, Math.PI * 2);
    ctx.fillStyle = GOLD;
    ctx.fill();
  }
  ctx.restore();
  text(ctx, 'Carregando anúncio...', W / 2, VIEW_H / 2 + 34, { size: 18, color: '#d8e6ff' });
}

// Anúncio simulado: tela cheia com uma propaganda e a contagem; no fim,
// o botão de pegar as energias
function drawAd(ctx, app, ui) {
  const W = app.viewW;
  const L = energyLayout(app);
  const left = Math.max(0, ENERGY.adTime - ui.t);
  ctx.fillStyle = '#05070f';
  ctx.fillRect(0, 0, W, VIEW_H);
  text(ctx, 'ANÚNCIO', 24, 28, { size: 14, align: 'left', color: '#7d8fa8' });
  // "vídeo": propaganda do Cafezinho do Hacker
  const cx = W / 2;
  const cy = VIEW_H / 2 - 40;
  rrect(ctx, cx - 260, cy - 120, 520, 240, 24);
  fillOutline(ctx, '#2a1840', 4);
  const bob = Math.sin(ui.t * 4) * 6;
  text(ctx, 'CAFEZINHO DO HACKER', cx, cy - 70 + bob * 0.3, { size: 32, color: GOLD });
  text(ctx, 'O expresso que compila mais rápido', cx, cy - 24, { size: 18, color: '#ffffff' });
  for (const dx of [-70, 0, 70]) {
    ctx.save();
    ctx.translate(cx + dx, cy + 30 + (dx === 0 ? bob : -bob));
    ICONS.coffee(ctx, 20);
    ctx.restore();
  }
  text(ctx, 'Peça já no seu terminal', cx, cy + 86, { size: 15, color: '#bcd0f5' });
  // barra de progresso do "vídeo"
  const pw = 520;
  const prog = Math.min(1, ui.t / ENERGY.adTime);
  rrect(ctx, cx - pw / 2, cy + 140, pw, 8, 4);
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fill();
  rrect(ctx, cx - pw / 2, cy + 140, Math.max(8, pw * prog), 8, 4);
  ctx.fillStyle = GOLD;
  ctx.fill();
  if (left > 0) {
    text(ctx, `Recompensa em ${Math.ceil(left)}…`, W - 24, 28, { size: 16, align: 'right', color: '#d8e6ff' });
  } else {
    // recompensa: energias ou o brinde do dia da loja (ui.reward = id do item)
    bigButton(ctx, L.skip, '#3fd16b', ui.reward ? 'PEGAR' : `PEGAR +${ENERGY.ad}`, { size: 24 });
    ctx.save();
    ctx.translate(L.skip.x + L.skip.w - 40, L.skip.y + (L.skip.h - 6) / 2);
    if (ui.reward) drawItemIcon(ctx, ui.reward, 16, ui.t);
    else drawBolt(ctx, 14);
    ctx.restore();
  }
  ctx.lineWidth = 1;
  ctx.strokeStyle = OUTLINE;
}
