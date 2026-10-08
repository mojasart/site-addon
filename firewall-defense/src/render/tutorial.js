import { drawImage } from './images.js';
import { VIEW_H, OUTLINE, GOLD } from '../config.js';
import { rrect, fillOutline, text } from './canvas.js';
import { drawCharacter } from './characters.js';
import { wrapText } from './ui.js';

/* ════════════════════════════════════════════════════════════
 *  DESENHO DO TUTORIAL (systems/tutorial.js)
 *  Caixa de fala do Hacker (retrato + texto) em cima do mapa, um anel
 *  piscando no alvo e uma mãozinha apontando pra ele. A caixa fica embaixo
 *  ou em cima, do lado contrário do alvo, pra não tampar.
 * ════════════════════════════════════════════════════════════ */

export function drawTutorial(ctx, game) {
  const tut = game.tutorial;
  if (!tut || tut.done || game.state !== 'playing') return;
  const s = tut.step;
  if (s.kind === 'wait') return;
  const t = game.anim;
  tut.nudge = Math.max(0, (tut.nudge ?? 0) - 0.05);
  const target = s.kind === 'do' ? s.target() : null;

  // fala: escurece o resto pra chamar atenção
  if (s.kind === 'say') {
    ctx.fillStyle = 'rgba(8,12,30,0.45)';
    ctx.fillRect(0, 0, game.viewW, VIEW_H);
  }

  if (target) drawTarget(ctx, target, t, tut.nudge, game.viewW);

  // caixa de fala: do lado contrário do alvo
  const w = Math.min(game.mapW - 24, 600);
  const h = 118;
  const x = 12 + Math.max(0, (game.mapW - 24 - w) / 2);
  const y = target && target.y > VIEW_H * 0.55 ? 64 : VIEW_H - h - 14;
  rrect(ctx, x, y + 5, w, h, 18);
  ctx.fillStyle = 'rgba(10,16,40,0.45)';
  ctx.fill();
  rrect(ctx, x, y, w, h, 18);
  fillOutline(ctx, '#1f2b52', 3);
  rrect(ctx, x + 4, y + 4, w - 8, h - 8, 15);
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#3dff9a';
  ctx.globalAlpha = 0.6;
  ctx.stroke();
  ctx.globalAlpha = 1;

  // retrato do Hacker falando (balança de leve)
  ctx.save();
  rrect(ctx, x + 12, y + 12, 94, 94, 14);
  ctx.fillStyle = '#0d1530';
  ctx.fill();
  ctx.clip();
  ctx.translate(x + 59, y + 112 + Math.sin(t * 6) * 1.5);
  ctx.scale(2.1, 2.1);
  drawCharacter(ctx, 'hacker', { t, face: 1, level: 0, attack: s.kind === 'say' && Math.sin(t * 9) > 0.6 ? 1 : 0 });
  ctx.restore();

  text(ctx, 'HACKER', x + 120, y + 22, { size: 15, align: 'left', color: '#3dff9a' });
  const msg = typeof s.text === 'function' ? s.text() : s.text;
  const tw = w - 136;
  wrapText(ctx, msg, x + 120 + tw / 2, y + 50, tw, 15, '#ffffff', 3, OUTLINE);
  if (s.kind === 'say' && tut.t > 0.35 && Math.sin(t * 5) > -0.3) {
    text(ctx, 'toque pra continuar ›', x + w - 16, y + h - 14, { size: 11, align: 'right', color: GOLD, stroke: null });
  }
}

// Anel pulsando em volta do alvo + mãozinha apontando
function drawTarget(ctx, tg, t, nudge, viewW) {
  const pulse = 0.5 + Math.sin(t * 6) * 0.5;
  ctx.save();
  ctx.lineWidth = 4;
  ctx.strokeStyle = `rgba(255,214,63,${0.5 + pulse * 0.5})`;
  ctx.shadowColor = '#ffd23f';
  ctx.shadowBlur = 12;
  if (tg.tile) {
    const s = tg.r * 1.6;
    rrect(ctx, tg.x - s / 2, tg.y - s / 2, s, s, 8);
  } else {
    ctx.beginPath();
    ctx.arc(tg.x, tg.y, tg.r + pulse * 4, 0, Math.PI * 2);
  }
  ctx.stroke();
  ctx.restore();

  // mão vindo do lado de dentro da tela (perto da borda ela não some),
  // batendo no alvo
  const ux = tg.x > viewW / 2 ? -0.7 : 0.7;
  const uy = tg.y > VIEW_H / 2 ? -0.7 : 0.7;
  const tap = 8 + Math.abs(Math.sin(t * 3.2)) * 16;
  const shake = Math.sin(t * 60) * 6 * nudge;
  drawHand(ctx, tg.x + ux * tap + shake, tg.y + uy * tap, Math.atan2(-ux, uy));
}

// Mãozinha de luva branca (ponta do dedo na origem); rot gira a mão: com 0
// o dedo aponta pra cima e o punho fica embaixo
const HAND = 64; // tamanho da sprite da mão
const HAND_TIP = [0.432, 0.02]; // ponta do dedo na sprite (fração da imagem)

function drawHand(ctx, x, y, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  // sprite (assets/sprites/hand.png) com a ponta do dedo na origem
  if (drawImage(ctx, 'hand', HAND, (0.5 - HAND_TIP[0]) * HAND, (0.5 - HAND_TIP[1]) * HAND)) {
    ctx.restore();
    return;
  }
  ctx.lineJoin = 'round';
  // dedo indicador
  rrect(ctx, -6, 0, 12, 30, 6);
  fillOutline(ctx, '#ffffff', 3);
  // palma com os outros dedos dobrados
  rrect(ctx, -12, 22, 30, 28, 10);
  fillOutline(ctx, '#ffffff', 3);
  for (const dx of [-3, 6]) {
    ctx.beginPath();
    ctx.moveTo(dx, 24);
    ctx.lineTo(dx, 32);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#b8c4dc';
    ctx.stroke();
  }
  // punho da luva
  rrect(ctx, -10, 48, 26, 9, 4);
  fillOutline(ctx, '#ffd23f', 3);
  ctx.restore();
}
