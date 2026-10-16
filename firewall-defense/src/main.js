import { App } from './app.js';
import { VIEW_H, MIN_VIEW_W, MAX_VIEW_W } from './config.js';
import { bumpFontEpoch } from './render/maps/index.js';
import { clamp } from './util.js';
import { loadImages } from './render/images.js';
import { isNative, plugin } from './native.js';
import { initNotifications } from './notify.js';
import { initAnalytics, trackError, trackDesign } from './analytics.js';
import { clearSpriteCache } from './render/canvas.js';

const stage = document.getElementById('stage'); // área útil da tela (fora do notch)
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// Abra com ?debug na URL: cafés infinitos e todos os mapas liberados.
// ?mute: começa com música e efeitos desligados (servidores de teste)
// ?analytics: mostra no console cada evento de analytics (src/analytics.js)
const params = new URLSearchParams(location.search);
initAnalytics({ debug: params.has('debug'), verbose: params.has('analytics') });
const app = new App({ debug: params.has('debug'), mute: params.has('mute') });
window.app = app; // acesso pelo console do navegador pra testar coisas
initNotifications(app); // app Android: avisos de energia, brinde e saudade (notify.js)

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

// Botão/gesto de voltar do Android: pausa a partida e volta de tela nos
// menus (app.back). Na tela inicial deixa sair do jogo.
// No navegador o "voltar" mexe no histórico: fica sempre uma entrada extra
// nossa; quando o jogador volta, o popstate trata e põe a entrada de novo.
// No app (Capacitor) o plugin App avisa pelo 'backButton'
if (isNative) {
  const App = plugin('App');
  App.addListener('backButton', () => {
    if (!app.back()) App.exitApp();
  });
} else {
  history.pushState({ firewall: true }, '');
  window.addEventListener('popstate', () => {
    if (app.back()) history.pushState({ firewall: true }, '');
    else history.back(); // tela inicial: sai de verdade
  });
}

// Pausa sozinho quando o app vai pro fundo (ligação, troca de app...)
document.addEventListener('visibilitychange', () => (document.hidden ? app.hidden() : app.shown()));

// No celular, entra em tela cheia e trava em paisagem no primeiro toque
let fullscreenTried = false;
function requestFullscreenOnMobile() {
  if (fullscreenTried) return;
  fullscreenTried = true;
  if (isNative) return; // o app já abre em tela cheia (MainActivity)
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

// ── Diagnóstico de travamentos ──
// Sem memória de vídeo (aconteceu no Mac), o navegador descarta o canvas:
// tudo some. Avisa o analytics e, quando ele volta, refaz as imagens em cache
canvas.addEventListener('contextlost', (e) => {
  e.preventDefault(); // pede pro navegador devolver o canvas
  trackDesign('Tech:CanvasLost');
  trackError(`canvas perdido (dpr ${window.devicePixelRatio}, ${canvas.width}x${canvas.height}, ${navigator.userAgent})`);
});
canvas.addEventListener('contextrestored', () => {
  trackDesign('Tech:CanvasRestored');
  clearSpriteCache();
  bumpFontEpoch(); // redesenha os mapas em cache
  resize();
});
// erro de JavaScript em qualquer lugar (com a cena e a onda, pra reproduzir)
const where = () => {
  const s = app.scene;
  return `${s?.constructor?.name ?? '?'}${s?.map ? ` ${s.map.id} onda ${s.rounds?.started}` : ''}`;
};
window.addEventListener('error', (e) => trackError(`${e.message} @ ${e.filename?.split('/').pop()}:${e.lineno} [${where()}]`));
window.addEventListener('unhandledrejection', (e) => trackError(`promise: ${e.reason?.message ?? e.reason} [${where()}]`));

function frame(now) {
  // pede o próximo antes: se um quadro der erro, o jogo não congela
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, 0.05); // evita "teleporte" depois de travadas
  last = now;
  try {
    app.update(dt);
  } catch (err) {
    trackError(`update: ${err?.message} ${err?.stack?.split('\n')[1]?.trim() ?? ''} [${where()}]`);
  }

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
