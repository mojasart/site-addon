import { VIEW_H, OUTLINE } from '../config.js';
import { rrect, text } from './canvas.js';

/* ════════════════════════════════════════════════════════════
 *  ENTRADAS DE VÍRUS
 *  Cada rota ganha, na borda da tela por onde os vírus entram:
 *   - um portal vermelho (rasgo na borda) que pulsa e dá um clarão
 *     toda vez que sai um vírus por ali (game.spawnFlash[k]);
 *   - uma plaquinha "ENTRADA" (numerada quando há mais de uma) e
 *     setinhas correndo pelo começo do caminho: só antes da 1ª onda,
 *     depois somem (o portal fica pra lembrar de onde vêm).
 *  Tudo em coordenadas do mapa (o jogo já fez translate(offsetX)).
 * ════════════════════════════════════════════════════════════ */

export function drawSpawns(ctx, game, t) {
  const routes = game.path.routes;
  const many = routes.length > 1;
  // aviso (placa + setinhas) só antes da 1ª onda; some num fade rápido
  const hint = game.rounds.started === 0 ? 1 : Math.max(0, 1 - (game.anim - (game.firstRoundAt ?? 0)) * 2.5);
  routes.forEach((route, k) => {
    const e = entryOf(game, route, k);
    if (!e) return;
    const flash = game.spawnFlash?.[k] ?? 0;
    portal(ctx, e, t, flash);
    if (hint <= 0) return;
    ctx.save();
    ctx.globalAlpha = hint;
    chevrons(ctx, route, game.view.spawnDists[k], t);
    label(ctx, e, many ? `ENTRADA ${k + 1}` : 'ENTRADA', t);
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
  if (Math.abs(Math.cos(ang)) > 0.7) return { x: left, y: p.y, ang: 0, side: 'left' };
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

function label(ctx, e, str, t) {
  const w = str.length * 7.6 + 30;
  let x;
  let y;
  if (e.side === 'left') {
    x = e.x + 10;
    // perto do topo a placa iria pra trás da HUD (vidas/dinheiro): vai embaixo
    y = e.y - 50 < 100 ? e.y + 32 : e.y - 50;
  } else if (e.side === 'top') {
    x = e.x + 34;
    y = e.y + 12;
  } else {
    x = e.x + 34;
    y = e.y - 36;
  }
  const bob = Math.sin(t * 3) * 2;
  ctx.save();
  rrect(ctx, x, y + bob, w, 24, 12);
  ctx.fillStyle = '#e8344e';
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = OUTLINE;
  ctx.stroke();
  // triângulo de alerta
  const ax = x + 13;
  const ay = y + 12 + bob;
  ctx.beginPath();
  ctx.moveTo(ax, ay - 6);
  ctx.lineTo(ax + 6, ay + 5);
  ctx.lineTo(ax - 6, ay + 5);
  ctx.closePath();
  ctx.fillStyle = '#fff59a';
  ctx.fill();
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(ax - 0.8, ay - 2.5, 1.6, 4);
  text(ctx, str, x + 22 + (w - 26) / 2, ay + 1, { size: 12 });
  ctx.restore();
}

// Setinhas correndo pelo começo do caminho (só antes da rodada)
function chevrons(ctx, route, start, t) {
  ctx.save();
  const base = ctx.globalAlpha; // já vem com o fade do aviso
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 0; i < 4; i++) {
    const f = (t * 0.6 + i / 4) % 1;
    const p = route.pointAt(start + 20 + f * 170);
    ctx.globalAlpha = base * Math.sin(f * Math.PI) * 0.9;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.beginPath();
    ctx.moveTo(-6, -11);
    ctx.lineTo(6, 0);
    ctx.lineTo(-6, 11);
    ctx.lineWidth = 8;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
    ctx.lineWidth = 4.5;
    ctx.strokeStyle = '#ff5a6a';
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}
