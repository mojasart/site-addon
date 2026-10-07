import { FONT } from '../config.js';

export function rrect(ctx, x, y, w, h, r) {
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

export function shadow(ctx, x, y, rx) {
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(x, y, rx, rx * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function setFont(ctx, size, weight = 700) {
  ctx.font = `${weight} ${size}px ${FONT}`;
}

export function text(
  ctx,
  str,
  x,
  y,
  { size = 16, color = '#fff', align = 'center', baseline = 'middle', weight = 700, stroke = null, strokeWidth = 4 } = {},
) {
  setFont(ctx, size, weight);
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  if (stroke) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = stroke;
    ctx.strokeText(str, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

export function panel(ctx, r, fill, border, lineWidth = 2, radius = 8) {
  rrect(ctx, r.x, r.y, r.w, r.h, radius);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = border;
  ctx.stroke();
}
