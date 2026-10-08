import { VIEW_H, GOLD } from '../config.js';
import { rrect, fillOutline, text, setFont } from './canvas.js';
import { bigButton, iconButton, stars, ribbon, starTier } from './widgets.js';
import { drawEnemy } from './viruses.js';
import { drawCharacter } from './characters.js';
import { ENEMIES } from '../data/enemies.js';
import { easeOutBack, clamp } from '../util.js';
import { ICONS, drawHeart } from './sprites.js';
import { formatCoffee } from '../data/darknet.js';
import { drawDuck } from './duck.js';

// Posições dos botões das telas de pausa/vitória/derrota (desenho e toque)
export function overlayLayout(game) {
  const cx = game.viewW / 2;
  const L = { card: { x: cx - 270, y: 40, w: 540, h: 460 } };
  if (game.state === 'paused') {
    L.resume = { x: cx - 150, y: 150, w: 300, h: 72 };
    L.restart = { x: cx - 150, y: 234, w: 300, h: 66 };
    L.maps = { x: cx - 150, y: 312, w: 300, h: 66 };
    L.music = { x: cx - 105, y: 400, w: 60, h: 60 };
    L.sfx = { x: cx - 30, y: 400, w: 60, h: 60 };
    L.auto = { x: cx + 45, y: 400, w: 60, h: 60 };
  } else if (retryOffered(game)) {
    // venceu com 2 estrelas ou menos: MAPAS · DE NOVO · PRÓXIMO
    L.maps = { x: cx - 255, y: 392, w: 160, h: 72 };
    L.retry = { x: cx - 80, y: 392, w: 160, h: 72 };
    L.next = { x: cx + 95, y: 392, w: 160, h: 72 };
  } else if (game.state === 'won' || game.state === 'lost') {
    L.maps = { x: cx - 230, y: 392, w: 210, h: 72 };
    L.next = { x: cx + 20, y: 392, w: 210, h: 72 };
  }
  return L;
}

// Venceu sem as 3 estrelas (e tem próximo mapa): oferece jogar de novo pra
// tentar as 3. No último mapa o botão da direita já é "DE NOVO"; a platina
// vencida sempre vale 3
function retryOffered(game) {
  return game.state === 'won' && !game.platinum && game.stars < 3 && !!game.nextMap;
}

export function drawBanner(ctx, game) {
  const b = game.banner;
  if (!b) return;
  const k = Math.min(1, (b.total - b.time) * 5);
  ctx.save();
  ctx.globalAlpha = Math.min(1, b.time * 2.5);
  ctx.translate(game.mapW / 2, VIEW_H / 2 - 40);
  const s = 0.6 + 0.4 * easeOutBack(k);
  ctx.scale(s, s);
  text(ctx, b.text, 0, 0, { size: b.size ?? 46, color: b.color });
  if (b.sub) text(ctx, b.sub, 0, 44, { size: 24, color: GOLD });
  ctx.restore();
}

export function drawOverlay(ctx, game) {
  if (game.state === 'playing') return;
  const W = game.viewW;
  const cx = W / 2;
  const t = game.anim;
  const k = clamp(game.overlayTime * 4, 0, 1);
  const L = overlayLayout(game);

  ctx.fillStyle = `rgba(10,18,40,${0.62 * k})`;
  ctx.fillRect(0, 0, W, VIEW_H);

  ctx.save();
  ctx.translate(cx, VIEW_H / 2);
  const s = 0.7 + 0.3 * easeOutBack(k);
  ctx.scale(s, s);
  ctx.translate(-cx, -VIEW_H / 2);

  const c = L.card;
  rrect(ctx, c.x, c.y + 10, c.w, c.h, 30);
  ctx.fillStyle = 'rgba(10,16,40,0.55)';
  ctx.fill();
  rrect(ctx, c.x, c.y, c.w, c.h, 30);
  fillOutline(ctx, '#34497f', 5);
  rrect(ctx, c.x + 10, c.y + 10, c.w - 20, c.h - 20, 22);
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.stroke();

  if (game.state === 'paused') {
    ribbon(ctx, cx, c.y + 46, 260, 'PAUSADO', '#5fb4ff', 30);
    bigButton(ctx, L.resume, '#3fd16b', 'CONTINUAR', { icon: 'play', size: 28 });
    bigButton(ctx, L.restart, '#5fb4ff', 'REINICIAR', { icon: 'restart', size: 24 });
    bigButton(ctx, L.maps, '#ff9a2e', 'MAPAS', { icon: 'map', size: 24 });
    iconButton(ctx, L.music, game.app.save.music ? '#8a7dff' : '#7d8fa8', 'music', game.app.save.music);
    iconButton(ctx, L.sfx, game.app.save.sfx ? '#8a7dff' : '#7d8fa8', 'sfx', game.app.save.sfx);
    iconButton(ctx, L.auto, game.autoRound ? '#3fd16b' : '#7d8fa8', 'auto', game.autoRound);
    text(ctx, game.autoRound ? 'TURNO AUTOMÁTICO: LIGADO' : 'TURNO AUTOMÁTICO: DESLIGADO', game.viewW / 2, 478, { size: 13, color: '#d8e6ff' });
  } else {
    const won = game.state === 'won';
    const plat = won && game.platinum;
    ribbon(ctx, cx, c.y + 46, won ? 280 : 360, plat ? 'PLATINA!' : won ? 'VITÓRIA!' : 'SERVIDOR INVADIDO', plat ? '#5fb4e8' : won ? '#3fd16b' : '#ff5a6a', 30);
    if (won) {
      const pop = (i) => easeOutBack(clamp((game.overlayTime - 0.4 - i * 0.35) * 3, 0, 1));
      stars(ctx, cx, 175, game.stars, 30, 78, pop, starTier(game.stars, plat));
    } else {
      ctx.save();
      ctx.translate(cx, 180);
      ctx.scale(2.6, 2.6);
      drawEnemy(ctx, { type: 'v1', def: ENEMIES.v1, r: 15, phase: t, face: 1, slowTimer: 0, flash: 0 });
      ctx.restore();
    }
    if (won) {
      // vidas que sobraram e cafés novos lado a lado; ameaças contidas embaixo
      drawResults(ctx, cx, 270, game.lives, game.coffeeGain, game.overlayTime);
      text(ctx, `Ameaças contidas: ${game.stats.pops}`, cx, 318, { size: 19, color: GOLD });
      if (game.turboUnlocked) text(ctx, 'ACELERAR 5x LIBERADO!', cx, 348, { size: 17, color: '#bdeeff' });
    } else {
      const survived = Math.floor(Math.min(game.platTime, 180));
      const lines = game.platinum
        ? [game.bossCalled ? 'O chefão invadiu o servidor.' : `Os vírus venceram em ${Math.floor(survived / 60)}:${String(survived % 60).padStart(2, '0')}.`, 'Tente outras defesas ou upgrades!']
        : [`Os vírus venceram na rodada ${game.rounds.current}.`, 'Tente outras defesas ou upgrades!'];
      text(ctx, lines[0], cx, 262, { size: 24 });
      text(ctx, lines[1], cx, 296, { size: 18, color: '#d8e6ff' });
      text(ctx, `Ameaças contidas: ${game.stats.pops}`, cx, 330, { size: 18, color: GOLD });
    }
    if (won) {
      // a galera comemorando dos lados das estrelas
      for (const [type, x, face] of [['hacker', c.x + 72, 1], ['pinguim', c.x + c.w - 72, -1]]) {
        ctx.save();
        ctx.translate(x, 200 - Math.abs(Math.sin(t * 5 + x)) * 10);
        ctx.scale(1.5, 1.5);
        drawCharacter(ctx, type, { t, face, attack: Math.sin(t * 5 + x) > 0 ? 1 : 0 });
        ctx.restore();
      }
      // Pato de Borracha (upgrade secreto) comemora junto, pulando embaixo do Hacker
      if (game.app.perks?.duck) {
        ctx.save();
        ctx.translate(c.x + 72, 296);
        drawDuck(ctx, 15, { t, hop: Math.abs(Math.sin(t * 4)) * 0.5 });
        ctx.restore();
      }
    }
    if (game.endDelay <= 0) {
      const size = L.retry ? 21 : 24; // com 3 botões, a letra encolhe um pouco
      bigButton(ctx, L.maps, '#5fb4ff', 'MAPAS', { icon: 'map', size });
      if (L.retry) bigButton(ctx, L.retry, '#ff9a2e', 'DE NOVO', { icon: 'restart', size });
      const label = won ? (game.nextMap ? 'PRÓXIMO' : 'DE NOVO') : 'DE NOVO';
      bigButton(ctx, L.next, '#3fd16b', label, { icon: won && game.nextMap ? 'play' : 'restart', size });
    }
  }
  ctx.restore();
}

// "+1 CAFÉ" na vitória (cafés da Dark Net), aparece logo depois das estrelas
// Vidas (coraçãozinho do HUD + número) e, se teve, os cafés novos (ícone do
// café + "+N") na mesma linha, centralizados juntos. O café entra com um
// pulinho logo depois das estrelas
function drawResults(ctx, cx, y, lives, coffee, time) {
  const SEP = 44;
  const SIZE = 30;
  const wl = groupWidth(`${lives}`, SIZE);
  const wc = coffee >= 0.01 ? groupWidth(`+${formatCoffee(coffee)}`, SIZE) : 0;
  const total = wl + (coffee >= 0.01 ? SEP + wc : 0);
  ctx.save();
  ctx.translate(cx - total / 2 + wl / 2, y);
  iconAndNumber(ctx, (g) => drawHeart(g, 13), `${lives}`, SIZE, '#ffffff');
  ctx.restore();
  if (coffee < 0.01) return;
  const k = easeOutBack(clamp((time - 1.5) * 3, 0, 1));
  if (k <= 0) return;
  ctx.save();
  ctx.translate(cx + total / 2 - wc / 2, y);
  ctx.scale(k, k);
  iconAndNumber(ctx, (g) => ICONS.coffee(g, 11), `+${formatCoffee(coffee)}`, SIZE, '#ffe0b0');
  ctx.restore();
}

// Ícone + número, os dois juntos centralizados na origem
const ICON_W = 32;
const ICON_GAP = 8;

function groupWidth(str, size) {
  return ICON_W + ICON_GAP + measure(str, size);
}

function measure(str, size) {
  const c = measure.ctx ?? (measure.ctx = document.createElement('canvas').getContext('2d'));
  setFont(c, size);
  return c.measureText(str).width;
}

function iconAndNumber(ctx, icon, str, size, color) {
  const w = groupWidth(str, size);
  ctx.save();
  ctx.translate(-w / 2 + ICON_W / 2, 0);
  icon(ctx);
  ctx.restore();
  text(ctx, str, -w / 2 + ICON_W + ICON_GAP, 2, { size, color, align: 'left' });
}
