import { OUTLINE, GOLD } from '../config.js';
import { rrect, fillOutline, text, button, circle } from './canvas.js';
import { ICONS } from './sprites.js';
import { drawImage } from './images.js';
import { star } from './characters.js';

export const inRect = (r, x, y) => !!r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

// Barra de volume (música ou efeitos): ícone à esquerda, trilho com a parte
// cheia e a bolinha, e a porcentagem à direita. label: nome em cima do trilho
// (barras mais altas). Tocar/arrastar no trilho usa sliderValue
export function volumeSlider(ctx, r, icon, value, label = null) {
  const on = value > 0;
  rrect(ctx, r.x, r.y, r.w, r.h, Math.min(18, r.h / 2));
  fillOutline(ctx, 'rgba(20,28,60,0.85)', 3);
  ctx.save();
  ctx.translate(r.x + 28, r.y + r.h / 2);
  ICONS[icon](ctx, Math.min(13, r.h * 0.3), on);
  ctx.restore();
  const t = sliderTrack(r, !!label);
  if (label) text(ctx, label, t.x, r.y + r.h * 0.3, { size: 15, align: 'left' });
  rrect(ctx, t.x, t.y, t.w, t.h, t.h / 2);
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.fill();
  if (on) {
    rrect(ctx, t.x, t.y, Math.max(t.h, t.w * value), t.h, t.h / 2);
    ctx.fillStyle = '#8a7dff';
    ctx.fill();
  }
  circle(ctx, t.x + t.w * value, t.y + t.h / 2, 10);
  fillOutline(ctx, '#ffffff', 3);
  text(ctx, `${Math.round(value * 100)}%`, r.x + r.w - 14, r.y + r.h / 2 + 1, { size: 15, align: 'right', color: on ? '#ffffff' : '#7d8fa8' });
}

// Trilho da barra de volume (entre o ícone e a porcentagem)
function sliderTrack(r, labeled) {
  const x = r.x + 56;
  const w = r.w - 56 - 64;
  const cy = labeled ? r.y + r.h * 0.66 : r.y + r.h / 2;
  return { x, y: cy - 5, w, h: 10 };
}

// Volume (0 a 1) no ponto x da barra
export function sliderValue(r, x, labeled = false) {
  const t = sliderTrack(r, labeled);
  return Math.min(1, Math.max(0, (x - t.x) / t.w));
}

// Botão grande com texto (e ícone opcional à esquerda)
export function bigButton(ctx, r, face, label, { icon, size = 26, pressed = false, depth = 6 } = {}) {
  button(ctx, r, face, { radius: 18, depth, pressed });
  const cy = r.y + (r.h - depth) / 2 + (pressed ? depth - 1 : 0);
  if (icon) {
    ctx.save();
    ctx.translate(r.x + 32, cy);
    ICONS[icon](ctx, 11);
    ctx.restore();
    text(ctx, label, r.x + r.w / 2 + 14, cy + 1, { size });
  } else text(ctx, label, r.x + r.w / 2, cy + 1, { size });
}

// Botão quadrado só com ícone
export function iconButton(ctx, r, face, icon, arg) {
  button(ctx, r, face, { radius: 14, depth: 5 });
  ctx.save();
  ctx.translate(r.x + r.w / 2, r.y + (r.h - 5) / 2);
  ICONS[icon](ctx, r.w * 0.24, arg);
  ctx.restore();
}

// Cor das estrelas pelo resultado: 1 bronze, 2 prata, 3 ouro, platina vencida
export function starTier(n, platinum = false) {
  if (platinum) return 'platinum';
  return ['bronze', 'bronze', 'silver', 'gold'][n] ?? 'gold';
}
const STAR_ICON = { bronze: 'icon_star_bronze', silver: 'icon_star_silver', gold: 'icon_star', platinum: 'icon_star_platinum' };
const STAR_COLOR = { bronze: '#d98b4a', silver: '#d6dde8', gold: GOLD, platinum: '#bdeeff' };

// Fileira de estrelas (cheias até n), com "pulo" opcional por estrela.
// tier: cor das cheias (padrão: pela quantidade, ver starTier)
export function stars(ctx, cx, y, n, size = 16, gap = 36, pop = null, tier = starTier(n)) {
  for (let i = 0; i < 3; i++) {
    const k = pop ? pop(i) : 1;
    if (k <= 0 && i < n) continue;
    ctx.save();
    ctx.translate(cx + (i - 1) * gap, y - (i === 1 ? size * 0.4 : 0));
    ctx.scale(i < n ? k : 1, i < n ? k : 1);
    if (!drawImage(ctx, i < n ? STAR_ICON[tier] : 'icon_star_empty', size * 2.4)) {
      star(ctx, 0, 0, size);
      fillOutline(ctx, i < n ? STAR_COLOR[tier] : 'rgba(20,30,60,0.55)', 3);
    }
    ctx.restore();
  }
}

// Fita de título (estilo "banner" de jogo mobile)
export function ribbon(ctx, cx, y, w, label, color = '#ff5a6a', size = 26) {
  const h = size * 1.7;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + s * (w / 2 - 6), y - h / 2 + 8);
    ctx.lineTo(cx + s * (w / 2 + 22), y - h / 2 + 8);
    ctx.lineTo(cx + s * (w / 2 + 10), y + 4);
    ctx.lineTo(cx + s * (w / 2 + 22), y + h / 2 + 8);
    ctx.lineTo(cx + s * (w / 2 - 6), y + h / 2 + 8);
    ctx.closePath();
    fillOutline(ctx, '#c23a4a', 3);
  }
  rrect(ctx, cx - w / 2, y - h / 2, w, h, 10);
  fillOutline(ctx, color, 3.5);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(cx - w / 2 + 4, y - h / 2 + 4, w - 8, h * 0.35);
  text(ctx, label, cx, y + 1, { size, stroke: OUTLINE });
}

// ── Aviso no estilo terminal hacker ─────────────────────────
// Caixa reta de tela de fósforo (como a loja e o catálogo), com prompt e
// cursor piscando. tone 'alert' (erro, perigo) fica vermelho com "!".
// info: quadradinho "i" pulsando no canto direito (vírus novo → catálogo).
// Centralizado em cx, sem passar de maxRight; devolve o retângulo do "i".
const TOAST_MONO = '"Courier New", ui-monospace, Menlo, Consolas, monospace';
const TOAST_H = 32;

export function terminalToast(ctx, { text: str, cx, y, maxRight = Infinity, alpha = 1, tone = 'info', t = 0, info = false }) {
  const alert = tone === 'alert';
  const color = alert ? '#ff5a6a' : '#3dff9a';
  const label = `${alert ? '!' : '>'} ${str}`;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `bold 14px ${TOAST_MONO}`;
  const tw = ctx.measureText(label).width;
  const pad = 14;
  const infoW = info ? 34 : 0;
  const w = tw + pad * 2 + 12 + infoW;
  const x = Math.min(cx - w / 2, maxRight - w);
  const H = TOAST_H;
  // sombra e tela escura com um tom da cor, linhas de varredura
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(x + 3, y + 4, w, H);
  ctx.fillStyle = '#03130a';
  ctx.fillRect(x, y, w, H);
  ctx.fillStyle = alert ? 'rgba(255,90,106,0.12)' : 'rgba(61,255,154,0.07)';
  ctx.fillRect(x, y, w, H);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  for (let yy = y + 1; yy < y + H; yy += 3) ctx.fillRect(x, yy, w, 1);
  // borda reta brilhando, com os cantos marcados
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.strokeRect(x + 1, y + 1, w - 2, H - 2);
  ctx.shadowBlur = 0;
  ctx.fillStyle = color;
  for (const [cx2, cy2] of [[x, y], [x + w - 5, y], [x, y + H - 5], [x + w - 5, y + H - 5]]) ctx.fillRect(cx2, cy2, 5, 5);
  // texto com brilho de fósforo e o cursor piscando
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.shadowBlur = 6;
  ctx.fillText(label, x + pad, y + H / 2 + 1);
  ctx.shadowBlur = 0;
  if (Math.sin(t * 8) > 0) ctx.fillRect(x + pad + tw + 3, y + H / 2 - 7, 8, 14);
  let infoRect = null;
  if (info) {
    // [i] pulsando: toque pra ver o vírus no catálogo
    const s = H - 10;
    const bx = x + w - infoW - 2 + (infoW - s) / 2;
    const by = y + 5;
    const glow = 0.5 + Math.sin(t * 6) * 0.5;
    ctx.shadowColor = color;
    ctx.shadowBlur = 6 + 8 * glow;
    ctx.fillStyle = color;
    ctx.fillRect(bx, by, s, s);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#03130a';
    ctx.textAlign = 'center';
    ctx.font = `bold 16px ${TOAST_MONO}`;
    ctx.fillText('i', bx + s / 2, by + s / 2 + 1);
    infoRect = { x: bx - 6, y: by - 6, w: s + 12, h: s + 12 };
  }
  ctx.restore();
  return infoRect;
}
