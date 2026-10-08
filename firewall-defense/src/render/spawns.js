import { VIEW_H, OUTLINE } from '../config.js';
import { drawImage } from './images.js';
import { PATH_DEPTH } from './maps/shared.js';

/* ════════════════════════════════════════════════════════════
 *  ENTRADAS DE VÍRUS
 *  Cada rota ganha, na borda da tela por onde os vírus entram:
 *   - um portal vermelho (rasgo na borda) que pulsa e dá um clarão
 *     toda vez que sai um vírus por ali (game.spawnFlash[k]);
 *   - um sinal de perigo pulsando do lado da entrada: só antes da 1ª
 *     onda, depois some (o portal fica pra lembrar de onde vêm).
 *  O portal fica alinhado com o TOPO do caminho elevado (PATH_DEPTH
 *  acima da rota), não com a pegada no chão.
 *  Tudo em coordenadas do mapa (o jogo já fez translate(offsetX)).
 * ════════════════════════════════════════════════════════════ */

export function drawSpawns(ctx, game, t) {
  const routes = game.path.routes;
  // aviso (sinal de perigo) só antes da 1ª onda; some num fade rápido
  const hint = game.rounds.started === 0 ? 1 : Math.max(0, 1 - (game.anim - (game.firstRoundAt ?? 0)) * 2.5);
  routes.forEach((route, k) => {
    const e = entryOf(game, route, k);
    if (!e) return;
    const flash = game.spawnFlash?.[k] ?? 0;
    portal(ctx, e, t, flash);
    if (hint <= 0) return;
    ctx.save();
    ctx.globalAlpha = hint;
    danger(ctx, e, t + k * 0.4);
    ctx.restore();
  });
}

// Onde a rota cruza a borda da tela e pra que lado ela anda dali
function entryOf(game, route, k) {
  const d = game.view.spawnDists[k];
  const p = route.pointAt(d + 2);
  const left = -game.offsetX;
  // de que borda vem: pelo sentido do caminho logo depois de entrar
  const dir = route.pointAt(d + 30);
  const ang = Math.atan2(dir.y - p.y, dir.x - p.x);
  // entrando pelo lado: sobe junto com o topo do caminho
  if (Math.abs(Math.cos(ang)) > 0.7) return { x: left, y: p.y - PATH_DEPTH, ang: 0, side: 'left' };
  if (Math.sin(ang) > 0) return { x: p.x, y: 0, ang: Math.PI / 2, side: 'top' };
  return { x: p.x, y: VIEW_H, ang: -Math.PI / 2, side: 'bottom' };
}

function portal(ctx, e, t, flash) {
  const pulse = 0.5 + Math.sin(t * 4) * 0.5;
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(e.ang);
  // brilho vermelho espalhando pra dentro do mapa
  const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 70 + flash * 20);
  g.addColorStop(0, `rgba(255,70,100,${0.55 + flash * 0.4})`);
  g.addColorStop(1, 'rgba(255,70,100,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, 70 + flash * 20, 52, 0, 0, Math.PI * 2);
  ctx.fill();
  // o "rasgo": meia elipse escura com borda vermelha brilhando
  ctx.beginPath();
  ctx.ellipse(0, 0, 14 + flash * 4, 33, 0, -Math.PI / 2, Math.PI / 2);
  ctx.closePath();
  ctx.fillStyle = '#1a0710';
  ctx.fill();
  ctx.lineWidth = 4 + pulse * 2;
  ctx.strokeStyle = `rgba(255,${90 + flash * 120},${110 + flash * 100},1)`;
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.strokeStyle = OUTLINE;
  ctx.stroke();
  ctx.restore();
}

// Sinal de perigo pulsando do lado da entrada (assets/icons/danger.svg),
// com um brilho vermelho atrás batendo junto
function danger(ctx, e, t) {
  let x;
  let y;
  if (e.side === 'left') {
    x = e.x + 30;
    // perto do topo o sinal iria pra trás da HUD (vidas/dinheiro): vai embaixo
    y = e.y - 50 < 100 ? e.y + 50 : e.y - 50;
  } else if (e.side === 'top') {
    x = e.x + 50;
    y = e.y + 30;
  } else {
    x = e.x + 50;
    y = e.y - 30;
  }
  const beat = 0.5 + Math.sin(t * 6) * 0.5; // 0 → 1, umas 1 vez por segundo
  ctx.save();
  ctx.translate(x, y);
  const glow = ctx.createRadialGradient(0, 2, 4, 0, 2, 30 + beat * 8);
  glow.addColorStop(0, `rgba(255,60,90,${0.35 + beat * 0.35})`);
  glow.addColorStop(1, 'rgba(255,60,90,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 2, 30 + beat * 8, 0, Math.PI * 2);
  ctx.fill();
  const s = 1 + beat * 0.14;
  ctx.scale(s, s);
  if (!drawImage(ctx, 'icon_danger', 40)) {
    // sem o SVG: triângulo com "!" desenhado na mão
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.lineTo(17, 13);
    ctx.lineTo(-17, 13);
    ctx.closePath();
    ctx.lineJoin = 'round';
    ctx.fillStyle = '#ffd23f';
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(-1.8, -7, 3.6, 10);
    ctx.fillRect(-1.8, 6, 3.6, 3.6);
  }
  ctx.restore();
}
