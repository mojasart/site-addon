import { OUTLINE, GOLD } from '../config.js';
import { rrect, circle, ellipse, fillOutline, shadow, gloss, text } from './canvas.js';
import { bomb } from './characters.js';
import { TAU } from '../util.js';

// ── Projéteis ───────────────────────────────────────────────
export function drawProjectile(ctx, p, t) {
  ctx.save();
  if (p.kind === 'bomb') {
    ctx.rotate(p.spin);
    bomb(ctx, 0, 0, t);
  } else if (p.kind === 'packet') {
    ctx.rotate(p.angle);
    rrect(ctx, -6, -5, 12, 10, 3);
    fillOutline(ctx, '#7df9ff', 2.5);
    ctx.fillStyle = '#1e2740';
    ctx.fillRect(-3, -2, 6, 1.6);
    ctx.fillRect(-3, 1, 4, 1.6);
  } else {
    ctx.rotate(p.angle);
    rrect(ctx, -8, -2, 13, 4, 2);
    fillOutline(ctx, '#d6deea', 2);
    ctx.beginPath();
    ctx.moveTo(5, -3.2);
    ctx.lineTo(11, 0);
    ctx.lineTo(5, 3.2);
    ctx.closePath();
    fillOutline(ctx, '#8a96aa', 2);
    ctx.beginPath();
    ctx.moveTo(-8, 0);
    ctx.lineTo(-13, -5);
    ctx.lineTo(-13, 5);
    ctx.closePath();
    fillOutline(ctx, '#ff4d5e', 2);
  }
  ctx.restore();
}

// ── Ícones do HUD ───────────────────────────────────────────
export function drawCoin(ctx, r = 14, spin = 0) {
  const sx = Math.max(0.25, Math.abs(Math.cos(spin * 2)));
  ctx.save();
  ctx.scale(sx, 1);
  circle(ctx, 0, 0, r);
  fillOutline(ctx, GOLD, 3);
  circle(ctx, 0, 0, r * 0.68);
  ctx.fillStyle = '#ffe58a';
  ctx.fill();
  gloss(ctx, -r * 0.35, -r * 0.45, r * 0.3, r * 0.16);
  ctx.restore();
  if (sx > 0.5) text(ctx, '$', 0, 1, { size: Math.round(r * 1.05), color: '#c48a00', stroke: null });
}

export function drawHeart(ctx, s = 14) {
  ctx.beginPath();
  ctx.moveTo(0, s * 0.95);
  ctx.bezierCurveTo(-s * 1.4, 0, -s * 0.9, -s * 1.15, 0, -s * 0.45);
  ctx.bezierCurveTo(s * 0.9, -s * 1.15, s * 1.4, 0, 0, s * 0.95);
  ctx.closePath();
  fillOutline(ctx, '#ff4d6d', 3);
  gloss(ctx, -s * 0.5, -s * 0.4, s * 0.28, s * 0.17);
}

// O servidor que estamos protegendo (fim do caminho)
export function drawServer(ctx, t, hurt) {
  const shake = hurt > 0 ? Math.sin(t * 80) * 2 : 0;
  ctx.save();
  ctx.translate(shake, 0);
  shadow(ctx, 5, 34, 44, 12);
  rrect(ctx, -42, -30, 84, 64, 12);
  fillOutline(ctx, '#3a4f86', 4);
  rrect(ctx, -32, -22, 64, 34, 7);
  fillOutline(ctx, hurt > 0 ? '#ff5a6a' : '#58e0ff', 3);
  gloss(ctx, -20, -16, 9, 3, 0);
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.strokeStyle = OUTLINE;
  if (hurt > 0) {
    for (const sx of [-12, 12]) {
      ctx.beginPath();
      ctx.moveTo(sx - 4, -10);
      ctx.lineTo(sx + 4, -2);
      ctx.moveTo(sx + 4, -10);
      ctx.lineTo(sx - 4, -2);
      ctx.stroke();
    }
  } else {
    const blink = Math.sin(t * 1.3) > 0.97;
    for (const sx of [-12, 12]) {
      ctx.beginPath();
      if (blink) {
        ctx.moveTo(sx - 4, -6);
        ctx.lineTo(sx + 4, -6);
        ctx.stroke();
      } else {
        ctx.ellipse(sx, -6, 3, 4.5, 0, 0, TAU);
        ctx.fillStyle = OUTLINE;
        ctx.fill();
      }
    }
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }
  rrect(ctx, -32, 16, 44, 10, 3);
  ctx.fillStyle = '#26345c';
  ctx.fill();
  for (let i = 0; i < 3; i++) {
    circle(ctx, 18 + i * 6, 21, 2.5);
    ctx.fillStyle = Math.sin(t * 5 + i * 2) > 0 ? '#3dff9a' : '#1d5a3c';
    ctx.fill();
  }
  ctx.restore();
}

// Ícones brancos dos botões (desenhados centrados em 0,0)
export const ICONS = {
  play(ctx, s = 14) {
    ctx.beginPath();
    ctx.moveTo(-s * 0.6, -s);
    ctx.lineTo(s * 0.9, 0);
    ctx.lineTo(-s * 0.6, s);
    ctx.closePath();
    ctx.lineJoin = 'round';
    fillOutline(ctx, '#ffffff', 3);
  },
  ff(ctx, s = 12) {
    ctx.save();
    ctx.translate(-s * 0.55, 0);
    ICONS.play(ctx, s);
    ctx.translate(s * 1.1, 0);
    ICONS.play(ctx, s);
    ctx.restore();
  },
  pause(ctx, s = 12) {
    for (const dx of [-s * 0.55, s * 0.55]) {
      rrect(ctx, dx - s * 0.3, -s, s * 0.6, s * 2, 2);
      fillOutline(ctx, '#ffffff', 2.5);
    }
  },
  close(ctx, s = 8) {
    stroked(ctx, () => {
      ctx.moveTo(-s, -s);
      ctx.lineTo(s, s);
      ctx.moveTo(s, -s);
      ctx.lineTo(-s, s);
    }, 4);
  },
  back(ctx, s = 11) {
    stroked(ctx, () => {
      ctx.moveTo(s * 0.4, -s);
      ctx.lineTo(-s * 0.6, 0);
      ctx.lineTo(s * 0.4, s);
    }, 4.5);
  },
  restart(ctx, s = 11) {
    stroked(ctx, () => ctx.arc(0, 0, s, -0.3, Math.PI * 1.5), 4);
    ctx.beginPath();
    ctx.moveTo(s * 0.55, -s * 1.35);
    ctx.lineTo(s * 1.2, -s * 0.3);
    ctx.lineTo(s * 0.05, -s * 0.2);
    ctx.closePath();
    fillOutline(ctx, '#ffffff', 2.5);
  },
  map(ctx, s = 12) {
    ctx.beginPath();
    ctx.moveTo(-s, -s * 0.7);
    ctx.lineTo(-s * 0.33, -s);
    ctx.lineTo(s * 0.33, -s * 0.7);
    ctx.lineTo(s, -s);
    ctx.lineTo(s, s * 0.7);
    ctx.lineTo(s * 0.33, s);
    ctx.lineTo(-s * 0.33, s * 0.7);
    ctx.lineTo(-s, s);
    ctx.closePath();
    ctx.lineJoin = 'round';
    fillOutline(ctx, '#ffffff', 3);
    ctx.beginPath();
    ctx.moveTo(-s * 0.33, -s);
    ctx.lineTo(-s * 0.33, s * 0.7);
    ctx.moveTo(s * 0.33, -s * 0.7);
    ctx.lineTo(s * 0.33, s);
    ctx.lineWidth = 2;
    ctx.stroke();
  },
  music(ctx, s = 12, on = true) {
    ellipse(ctx, -s * 0.4, s * 0.55, s * 0.42, s * 0.32, -0.4);
    fillOutline(ctx, '#ffffff', 2.5);
    ellipse(ctx, s * 0.6, s * 0.3, s * 0.42, s * 0.32, -0.4);
    fillOutline(ctx, '#ffffff', 2.5);
    stroked(ctx, () => {
      ctx.moveTo(-s * 0.05, s * 0.5);
      ctx.lineTo(-s * 0.05, -s * 0.8);
      ctx.lineTo(s * 0.95, -s);
      ctx.lineTo(s * 0.95, s * 0.25);
    }, 2.5);
    if (!on) slash(ctx, s);
  },
  sfx(ctx, s = 12, on = true) {
    ctx.beginPath();
    ctx.moveTo(-s, -s * 0.35);
    ctx.lineTo(-s * 0.45, -s * 0.35);
    ctx.lineTo(s * 0.15, -s * 0.9);
    ctx.lineTo(s * 0.15, s * 0.9);
    ctx.lineTo(-s * 0.45, s * 0.35);
    ctx.lineTo(-s, s * 0.35);
    ctx.closePath();
    ctx.lineJoin = 'round';
    fillOutline(ctx, '#ffffff', 2.5);
    if (on) {
      for (const r of [s * 0.5, s * 0.9]) stroked(ctx, () => ctx.arc(s * 0.15, 0, r, -0.8, 0.8), 2.5);
    } else slash(ctx, s);
  },
  lock(ctx, s = 16) {
    ctx.beginPath();
    ctx.arc(0, -s * 0.35, s * 0.55, Math.PI, 0);
    ctx.lineWidth = s * 0.5;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
    ctx.lineWidth = s * 0.25;
    ctx.strokeStyle = '#d6dce8';
    ctx.stroke();
    rrect(ctx, -s * 0.8, -s * 0.35, s * 1.6, s * 1.25, s * 0.25);
    fillOutline(ctx, GOLD, 3);
    circle(ctx, 0, s * 0.2, s * 0.17);
    ctx.fillStyle = OUTLINE;
    ctx.fill();
  },
  drop(ctx, s = 7) {
    ctx.beginPath();
    ctx.moveTo(0, -s * 1.3);
    ctx.quadraticCurveTo(s * 1.05, -s * 0.1, s * 0.8, s * 0.4);
    ctx.arc(0, s * 0.35, s * 0.8, 0, Math.PI);
    ctx.quadraticCurveTo(-s * 1.05, -s * 0.1, 0, -s * 1.3);
    ctx.closePath();
    fillOutline(ctx, '#3dc0ff', 2.5);
    gloss(ctx, -s * 0.3, s * 0.1, s * 0.2, s * 0.3, 0);
  },
};

// traço branco com contorno escuro (para ícones de linha)
function stroked(ctx, path, w) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  path();
  ctx.lineWidth = w * 2;
  ctx.strokeStyle = OUTLINE;
  ctx.stroke();
  ctx.lineWidth = w;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
}

function slash(ctx, s) {
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-s, s);
  ctx.lineTo(s, -s);
  ctx.lineWidth = 7;
  ctx.strokeStyle = OUTLINE;
  ctx.stroke();
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = '#ff5a5a';
  ctx.stroke();
}
