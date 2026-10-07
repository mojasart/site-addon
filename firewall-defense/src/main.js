import { Game } from './game.js';
import { VIEW_H, MIN_VIEW_W, MAX_VIEW_W } from './config.js';
import { clamp } from './util.js';

const stage = document.getElementById('stage'); // área útil da tela (fora do notch)
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// Abra com ?debug na URL pra começar com dinheiro infinito
const debug = new URLSearchParams(location.search).has('debug');
const game = new Game({ debug });
window.game = game; // acesso pelo console do navegador pra testar coisas

// O canvas só baixa a fonte se alguém pedir; quando chega, o mapa é redesenhado
document.fonts?.load('20px "Lilita One"').then(() => game.mapRenderer && (game.mapRenderer.key = ''));

// ── Escala: resolução virtual → tela real ─────────────────────
const view = { scale: 1, offX: 0, offY: 0, dpr: 1 };

function resize() {
  const cssW = stage.clientWidth;
  const cssH = stage.clientHeight;
  const viewW = clamp(Math.round((VIEW_H * cssW) / cssH), MIN_VIEW_W, MAX_VIEW_W);
  view.scale = Math.min(cssW / viewW, cssH / VIEW_H);
  view.offX = (cssW - viewW * view.scale) / 2;
  view.offY = (cssH - VIEW_H * view.scale) / 2;
  view.dpr = Math.min(window.devicePixelRatio || 1, 2); // limita pra não pesar em celular fraco
  game.resize(viewW, view.scale * view.dpr);
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

canvas.addEventListener('pointerdown', (e) => {
  if (!e.isPrimary) return; // ignora o segundo dedo
  e.preventDefault();
  canvas.setPointerCapture?.(e.pointerId);
  const p = toWorld(e);
  game.pointerDown(p.x, p.y, e.pointerType);
  requestFullscreenOnMobile();
});
canvas.addEventListener('pointermove', (e) => {
  if (!e.isPrimary) return;
  const p = toWorld(e);
  game.pointerMove(p.x, p.y, e.pointerType);
});
canvas.addEventListener('pointerup', (e) => {
  if (!e.isPrimary) return;
  const p = toWorld(e);
  game.pointerUp(p.x, p.y);
});
canvas.addEventListener('pointercancel', () => game.pointerCancel());
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

// Pausa sozinho quando o app vai pro fundo (ligação, troca de app...)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) game.pause();
});

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
  const dt = Math.min((now - last) / 1000, 0.05); // evita "teleporte" depois de travadas
  last = now;
  game.update(dt);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#1f2b52';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const s = view.scale * view.dpr;
  ctx.setTransform(s, 0, 0, s, view.offX * view.dpr, view.offY * view.dpr);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, game.viewW, VIEW_H);
  ctx.clip();
  game.render(ctx);
  ctx.restore();

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
