import { OUTLINE } from '../config.js';
import { rrect, circle, fillOutline, shadow, gloss } from './canvas.js';

// ── Lixeira Turbo (entities/Bin.js) ────────────────────────
// A lixeira do sistema com rodinhas e um turbo de neon atrás. Rola de ré
// pelo caminho; segurando vírus ela treme. Barra de vida em cima.
export function drawBin(ctx, v, t) {
  ctx.save();
  ctx.translate(v.x, v.y);
  shadow(ctx, 0, 11, 20, 5.5);
  const shake = v.pushing ? Math.sin(t * 45) * 1.2 : 0;
  ctx.save();
  ctx.translate(shake, Math.sin(t * 12) * 0.6);
  ctx.scale(v.face, 1);
  // turbo: rastro de neon saindo de trás (mais forte andando)
  const go = v.pushing ? 0.35 : 1;
  for (let i = 0; i < 3; i++) {
    const k = (t * 6 + i / 3) % 1;
    ctx.globalAlpha = (1 - k) * 0.7 * go;
    circle(ctx, -16 - k * 18, -4 + Math.sin(t * 20 + i) * 2, 4 - k * 2);
    ctx.fillStyle = '#3df2ff';
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  drawBinBody(ctx, t, v.pulse);
  // rodinhas
  for (const wx of [-8, 8]) {
    circle(ctx, wx, 9, 4.5);
    fillOutline(ctx, '#1b2340', 2);
    circle(ctx, wx, 9, 1.6);
    ctx.fillStyle = '#9aa7bd';
    ctx.fill();
  }
  ctx.restore();
  // vida (como a do Honeypot)
  const w = 34;
  const k = Math.max(0, v.hp / v.maxHp);
  rrect(ctx, -w / 2, -42, w, 6, 3);
  ctx.fillStyle = 'rgba(15,20,40,0.85)';
  ctx.fill();
  if (k > 0) {
    rrect(ctx, -w / 2 + 1, -41, (w - 2) * k, 4, 2);
    ctx.fillStyle = k > 0.5 ? '#3df2ff' : k > 0.25 ? '#ffd23f' : '#ff5a6a';
    ctx.fill();
  }
  ctx.restore();
}

// Corpo da lixeira (sem rodas): também é o ícone do botão. Origem no
// meio da base; pulse (0..1) dá uma piscada branca quando mordida
export function drawBinBody(ctx, t, pulse = 0) {
  // balde (mais largo em cima)
  ctx.beginPath();
  ctx.moveTo(-13, -26);
  ctx.lineTo(13, -26);
  ctx.lineTo(10, 6);
  ctx.lineTo(-10, 6);
  ctx.closePath();
  fillOutline(ctx, pulse > 0.1 ? '#ffffff' : '#cfe6ff', 2.5);
  // listras
  ctx.strokeStyle = 'rgba(60,110,170,0.45)';
  ctx.lineWidth = 2;
  for (const x of [-6, 0, 6]) {
    ctx.beginPath();
    ctx.moveTo(x * 1.1, -20);
    ctx.lineTo(x * 0.9, 2);
    ctx.stroke();
  }
  // símbolo de reciclar (seta em volta) brilhando
  ctx.save();
  ctx.translate(0, -9);
  ctx.rotate(t * 2);
  ctx.strokeStyle = '#18c26b';
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, 0, 5.5, 0.3, Math.PI * 1.7);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(5.5 * Math.cos(0.3) + 2.5, 5.5 * Math.sin(0.3) - 1);
  ctx.lineTo(5.5 * Math.cos(0.3), 5.5 * Math.sin(0.3));
  ctx.lineTo(5.5 * Math.cos(0.3) - 0.5, 5.5 * Math.sin(0.3) - 3.5);
  ctx.stroke();
  ctx.restore();
  // tampa
  rrect(ctx, -15, -31, 30, 6, 3);
  fillOutline(ctx, '#8fb8e8', 2.5);
  rrect(ctx, -4, -35, 8, 4, 2);
  fillOutline(ctx, '#8fb8e8', 2);
  gloss(ctx, -8, -20, 2.5, 6, 0.1);
  ctx.strokeStyle = OUTLINE;
}
