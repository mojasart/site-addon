import { App } from './app.js';
import { VIEW_H, MIN_VIEW_W, MAX_VIEW_W } from './config.js';
import { bumpFontEpoch } from './render/maps/index.js';
import { clamp } from './util.js';
import { loadImages } from './render/images.js';

const stage = document.getElementById('stage'); // área útil da tela (fora do notch)
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// Abra com ?debug na URL: dinheiro infinito e todos os mapas liberados
const debug = new URLSearchParams(location.search).has('debug');
const app = new App({ debug });
window.app = app; // acesso pelo console do navegador pra testar coisas

// O canvas só baixa a fonte se alguém pedir; quando chega, os mapas são redesenhados
document.fonts?.load('20px "Lilita One"').then(bumpFontEpoch).catch(() => {});

// ── Escala: resolução virtual → tela real ─────────────────────
const view = { scale: 1, offX: 0, offY: 0, dpr: 1 };

function resize() {
  const cssW = stage.clientWidth;
  const cssH = stage.clientHeight;
  if (!cssW || !cssH) return; // aba escondida/sem tamanho: espera o próximo resize
  const viewW = clamp(Math.round((VIEW_H * cssW) / cssH), MIN_VIEW_W, MAX_VIEW_W);
  view.scale = Math.min(cssW / viewW, cssH / VIEW_H);
  view.offX = (cssW - viewW * view.scale) / 2;
  view.offY = (cssH - VIEW_H * view.scale) / 2;
  view.dpr = Math.min(window.devicePixelRatio || 1, 2); // limita pra não pesar em celular fraco
  app.resize(viewW, view.scale * view.dpr);
  canvas.width = Math.round(cssW * view.dpr);
  canvas.height = Math.round(cssH * view.dpr);
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
}

window.addEventListener('resize', resize);
resize();

// ── Input (toque e mouse via Pointer Events) ─────────────────
function toWorld(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - r.left - view.offX) / view.scale,
    y: (e.clientY - r.top - view.offY) / view.scale,
  };
}

// dedos na tela (pra pinça de zoom): id -> posição no mundo
const touches = new Map();
let pinchPrev = null;
function pinchState() {
  const [a, b] = [...touches.values()];
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, d: Math.hypot(a.x - b.x, a.y - b.y) || 1 };
}

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  const p = toWorld(e);
  touches.set(e.pointerId, p);
  if (touches.size === 2) pinchPrev = pinchState();
  if (!e.isPrimary) return; // o segundo dedo só serve pra pinça
  canvas.setPointerCapture?.(e.pointerId);
  app.pointerDown(p.x, p.y, e.pointerType);
  requestFullscreenOnMobile();
});
canvas.addEventListener('pointermove', (e) => {
  const p = toWorld(e);
  if (touches.has(e.pointerId)) touches.set(e.pointerId, p);
  if (touches.size === 2 && pinchPrev) {
    const now = pinchState();
    app.pinch(now.x, now.y, now.d / pinchPrev.d, now.x - pinchPrev.x, now.y - pinchPrev.y);
    pinchPrev = now;
    return;
  }
  if (!e.isPrimary) return;
  app.pointerMove(p.x, p.y, e.pointerType);
});
function pointerEnd(e) {
  touches.delete(e.pointerId);
  if (touches.size < 2) pinchPrev = null;
}
canvas.addEventListener('pointerup', (e) => {
  pointerEnd(e);
  if (!e.isPrimary) return;
  const p = toWorld(e);
  app.pointerUp(p.x, p.y);
});
canvas.addEventListener('pointercancel', (e) => {
  pointerEnd(e);
  app.pointerCancel();
});
// roda do mouse / gesto de zoom do trackpad
canvas.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    const p = toWorld(e);
    const k = e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1; // linhas/páginas -> px
    app.wheel(p.x, p.y, e.deltaY * k);
  },
  { passive: false },
);
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
window.addEventListener('keydown', (e) => app.key(e.key));

// Pausa sozinho quando o app vai pro fundo (ligação, troca de app...)
document.addEventListener('visibilitychange', () => (document.hidden ? app.hidden() : app.shown()));

// No celular, entra em tela cheia e trava em paisagem no primeiro toque
let fullscreenTried = false;
function requestFullscreenOnMobile() {
  if (fullscreenTried) return;
  fullscreenTried = true;
  if (!matchMedia('(pointer: coarse)').matches) return;
  const el = document.documentElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!req) return;
  try {
    Promise.resolve(req.call(el))
      .then(() => screen.orientation?.lock?.('landscape'))
      .catch(() => {});
  } catch {
    // dentro de iframe/webview a tela cheia pode ser bloqueada: segue sem ela
  }
}

// ── Loop principal ────────────────────────────────────────────
let last = performance.now();

function frame(now) {
  // pede o próximo antes: se um quadro der erro, o jogo não congela
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, 0.05); // evita "teleporte" depois de travadas
  last = now;
  app.update(dt);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#1f2b52';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const s = view.scale * view.dpr;
  ctx.setTransform(s, 0, 0, s, view.offX * view.dpr, view.offY * view.dpr);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, app.viewW, VIEW_H);
  ctx.clip();
  try {
    app.render(ctx);
  } finally {
    ctx.restore();
  }
}

// Espera as sprites (no máximo 3s; o que faltar usa o desenho antigo)
Promise.race([loadImages(), new Promise((r) => setTimeout(r, 3000))]).then(() => {
  last = performance.now();
  requestAnimationFrame(frame);
});
