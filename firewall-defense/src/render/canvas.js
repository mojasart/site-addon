import { FONT, OUTLINE } from '../config.js';

export function rrect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

// Preenche e contorna o caminho atual com o contorno grosso padrão
export function fillOutline(ctx, fill, lineWidth = 3) {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = OUTLINE;
  ctx.stroke();
}

export function shadow(ctx, x, y, rx, ry = rx * 0.45) {
  ctx.fillStyle = 'rgba(10,20,30,0.28)';
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

// Brilho de "plástico" no canto de cima
export function gloss(ctx, x, y, rx, ry, rot = -0.6) {
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  ctx.fill();
}

export function setFont(ctx, size) {
  ctx.font = `${size}px ${FONT}`;
}

// Texto de jogo mobile: letra gorda com contorno escuro grosso
export function text(ctx, str, x, y, { size = 20, color = '#ffffff', align = 'center', baseline = 'middle', stroke = OUTLINE, strokeWidth } = {}) {
  setFont(ctx, size);
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  if (stroke) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = strokeWidth ?? Math.max(3, size * 0.26);
    ctx.strokeStyle = stroke;
    ctx.strokeText(str, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

// Botão "3D" de jogo mobile: base escura embaixo + face colorida
export function button(ctx, r, face, { pressed = false, radius = 14, depth = 5 } = {}) {
  const d = pressed ? 1 : depth;
  rrect(ctx, r.x, r.y + depth, r.w, r.h - depth, radius);
  ctx.fillStyle = OUTLINE;
  ctx.fill();
  rrect(ctx, r.x, r.y + (depth - d), r.w, r.h - depth, radius);
  fillOutline(ctx, face, 3);
  // faixa de brilho em cima
  ctx.save();
  rrect(ctx, r.x, r.y + (depth - d), r.w, r.h - depth, radius);
  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(r.x, r.y + (depth - d), r.w, (r.h - depth) * 0.42);
  ctx.restore();
}
