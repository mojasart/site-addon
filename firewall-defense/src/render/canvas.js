import { FONT, INK } from '../config.js';

// ── Formas básicas ──────────────────────────────────────────

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

export function ellipse(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
}

// Preenche o caminho atual e contorna com a cor de contorno padrão
export function fillOutline(ctx, fill, lineWidth = 3) {
  ctx.fillStyle = fill;
  ctx.fill();
  if (lineWidth > 0) {
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = INK;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
}

// Membro arredondado (braço, perna) com contorno
export function limb(ctx, x1, y1, x2, y2, w, color) {
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineWidth = w + 5;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.lineWidth = w;
  ctx.strokeStyle = color;
  ctx.stroke();
}

// Sombra suave no chão
export function shadow(ctx, x, y, rx, ry = rx * 0.4, alpha = 0.22) {
  ctx.fillStyle = `rgba(60,35,25,${alpha})`;
  ellipse(ctx, x, y, rx, ry);
  ctx.fill();
}

// Brilho suave no canto de cima
export function gloss(ctx, x, y, rx, ry, rot = -0.6, alpha = 0.45) {
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  ellipse(ctx, x, y, rx, ry, rot);
  ctx.fill();
}

// ── Texto ───────────────────────────────────────────────────

export function setFont(ctx, size) {
  ctx.font = `${size}px ${FONT}`;
}

// Texto de jogo mobile: letra gorda com contorno
export function text(ctx, str, x, y, { size = 20, color = '#ffffff', align = 'center', baseline = 'middle', stroke = INK, strokeWidth } = {}) {
  setFont(ctx, size);
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  if (stroke) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = strokeWidth ?? Math.max(3, size * 0.24);
    ctx.strokeStyle = stroke;
    ctx.strokeText(str, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

export const inRect = (r, x, y) => !!r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
export const inCircle = (c, x, y) => !!c && Math.hypot(x - c.x, y - c.y) <= c.r;

// ── Cache de sprites ────────────────────────────────────────
// Coisas que aparecem muitas vezes podem ser pré-desenhadas num canvas
// pequeno. O cache é refeito quando a escala da tela muda.
let pixelScale = 1;
const spriteCache = new Map();

export function setPixelScale(ps) {
  if (Math.abs(ps - pixelScale) < 0.01) return;
  pixelScale = ps;
  spriteCache.clear();
}

export function getPixelScale() {
  return pixelScale;
}

export function cachedSprite(key, w, h, draw) {
  let c = spriteCache.get(key);
  if (!c) {
    c = document.createElement('canvas');
    c.width = Math.ceil(w * pixelScale);
    c.height = Math.ceil(h * pixelScale);
    const g = c.getContext('2d');
    g.scale(pixelScale, pixelScale);
    g.translate(w / 2, h / 2);
    draw(g);
    spriteCache.set(key, c);
  }
  return c;
}

export function blit(ctx, c, w, h) {
  ctx.drawImage(c, -w / 2, -h / 2, w, h);
}
