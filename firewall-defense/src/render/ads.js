import { VIEW_H, OUTLINE, GOLD } from '../config.js';
import { rrect, fillOutline, text, button, circle } from './canvas.js';
import { iconButton } from './widgets.js';
import { drawCoin, drawHeart, ICONS } from './sprites.js';
import { drawImage } from './images.js';
import { drawVirusIcon } from './viruses.js';
import { ENEMIES } from '../data/enemies.js';
import { wrapText } from './ui.js';
import { easeOutBack } from '../util.js';

/* ════════════════════════════════════════════════════════════
 *  ANÚNCIOS DO ADWARE
 *  Janelas de propaganda (cômicas) que brotam na tela enquanto o chefão
 *  Adware está vivo. São enormes (ocupam ~70% da tela), cobrem o que
 *  estiver embaixo (o toque não passa) e só fecham no X vermelho, igual
 *  ao do menu. Algumas andam de um lado pro outro. O anúncio CRIPTOGRAFADO
 *  foge: no 1º toque o X pula pra outra borda; no 2º fecha. Ficam na tela
 *  até o jogador fechar, mesmo com o Adware morto (Game.updateAds).
 *  Coordenadas de tela (por cima do mapa e do painel). O desenho é feito
 *  nas medidas W × H e escalado por ad.s (adScale).
 *  Clicar no anúncio (fora do X) abre a ENXURRADA (Game.startAdStorm): os
 *  anúncios dela são "fotos" guardadas em cache (snap), porque podem ser
 *  dezenas ao mesmo tempo e redesenhar texto em todos pesa no celular.
 * ════════════════════════════════════════════════════════════ */

const W = 250; // medidas do desenho (antes da escala)
const H = 158;
const BAR = 34; // barra de título (com o X)
const CLOSE = 30; // lado do X

// Escala do anúncio: ~70% da altura da tela, sem passar de ~66% da largura
export function adScale(viewW) {
  return Math.min((VIEW_H * 0.7) / H, (viewW * 0.66) / W);
}

// Tamanho do anúncio na tela
export const adSize = (s) => ({ w: W * s, h: H * s });

// Tipos de anúncio: cor da barra, título, chamada, texto, botão e desenho.
// crypt: o criptografado (aparece com a chance `crypt` do Adware, não no sorteio comum)
export const ADS = [
  { bar: '#8a5530', title: 'PROMOÇÃO', head: 'CAFÉ EXPRESSO: LEVE 2, PAGUE 3!', sub: 'Só hoje no Cafezinho do Hacker', cta: 'QUERO!', icon: 'coffee' },
  { bar: '#ff9a2e', title: 'PARABÉNS!!!', head: 'VOCÊ É O VISITANTE 1.000.000', sub: 'Resgate seu iPhone 3G agora', cta: 'RESGATAR', icon: 'star' },
  { bar: '#3f8cff', title: 'PC LENTO?', head: 'BAIXE MAIS MEMÓRIA RAM', sub: '16 GB grátis, é só clicar aqui', cta: 'BAIXAR', icon: 'ram' },
  { bar: '#ff4d5e', title: 'ALERTA!!!', head: 'SEU PC TEM 37 VÍRUS', sub: 'Limpe agora (instala só mais 38)', cta: 'LIMPAR', icon: 'virus' },
  { bar: '#ff6fd0', title: 'ENCONTROS', head: 'VÍRUS SOLTEIROS NA SUA REDE', sub: 'A 2 metros do seu servidor', cta: 'CONHECER', icon: 'heart' },
  { bar: '#2fbf6a', title: 'RENDA EXTRA', head: 'GANHE BITCOIN DORMINDO', sub: 'Mineradores odeiam esse truque', cta: 'COMEÇAR', icon: 'coin' },
  { bar: '#8a7dff', title: 'CURSO ONLINE', head: 'VIRE HACKER EM 7 DIAS', sub: 'Aula 1: como arremessar teclados', cta: 'MATRICULAR', icon: 'keyboard' },
  { bar: '#7a3cc4', title: 'CRIPTOGRAFADO', head: '', sub: 'Pague 0,5 BTC pra fechar', cta: 'DESCRIPTOGRAFAR', icon: 'lock', crypt: true },
];
export const CRYPT_AD = ADS.findIndex((a) => a.crypt);

// Lugares do X na borda do anúncio (medidas do desenho). O normal fica no
// canto de cima à direita; o criptografado pula entre eles
export const CLOSE_SPOTS = [
  [W - CLOSE - 4, 3],
  [4, 3],
  [W / 2 - CLOSE / 2, 3],
  [W - CLOSE - 4, H - CLOSE - 4],
  [4, H - CLOSE - 4],
  [W / 2 - CLOSE / 2, H - CLOSE - 4],
  [4, H / 2 - CLOSE / 2],
  [W - CLOSE - 4, H / 2 - CLOSE / 2],
];

// X de fechar, em coordenadas de tela (pra tocar)
export function adClose(ad) {
  const [x, y] = CLOSE_SPOTS[ad.closeAt ?? 0];
  return { x: ad.x + x * ad.s, y: ad.y + y * ad.s, w: CLOSE * ad.s, h: CLOSE * ad.s };
}

export function drawAds(ctx, game) {
  for (const ad of game.ads) drawAd(ctx, ad, game.anim, game.app.pixelScale);
}

// "Foto" de um anúncio (pros da enxurrada): desenhada uma vez por tipo, no
// tamanho grande (ad.s0), e reduzida na hora de copiar. No máximo 1 por
// tipo na memória (uma por tamanho seriam dezenas de imagens grandes)
const snaps = new Map();
function snapshot(ad, ps) {
  const s0 = ad.s0 ?? ad.s;
  const key = `${ad.type}:${s0.toFixed(2)}:${ps}`;
  let c = snaps.get(key);
  if (!c) {
    c = document.createElement('canvas');
    c.width = Math.ceil((W + 8) * s0 * ps);
    c.height = Math.ceil((H + 12) * s0 * ps);
    const g = c.getContext('2d');
    g.scale(s0 * ps, s0 * ps);
    g.translate(4, 2);
    drawBody(g, ADS[ad.type], { seed: ad.seed, closeAt: 0, vx: 0 }, 0.4);
    snaps.set(key, c);
  }
  return c;
}

function drawAd(ctx, real, t, ps = 1) {
  const def = ADS[real.type];
  const ad = { ...real, x: 0, y: 0 }; // desenha no lugar dele, já escalado
  ctx.save();
  ctx.translate(real.x, real.y);
  ctx.scale(real.s, real.s);
  // entra pulando; ao fechar encolhe e some
  const k = ad.closing != null ? Math.max(0, ad.closing / 0.18) : easeOutBack(Math.min(1, ad.t / 0.25));
  const cx = W / 2;
  const cy = H / 2;
  ctx.globalAlpha = ad.closing != null ? k : Math.min(1, ad.t * 6);
  ctx.translate(cx, cy);
  ctx.scale(0.6 + 0.4 * k, 0.6 + 0.4 * k);
  ctx.translate(-cx, -cy);
  if (real.snap) ctx.drawImage(snapshot(real, ps), -4, -2, W + 8, H + 12);
  else drawBody(ctx, def, ad, t);
  ctx.restore();
}

// Janela do anúncio nas medidas do desenho (W × H, origem no canto)
function drawBody(ctx, def, ad, t) {
  // sombra + janela (o criptografado é tela de terminal escura)
  rrect(ctx, 0, 6, W, H, 16);
  ctx.fillStyle = 'rgba(10,16,40,0.45)';
  ctx.fill();
  rrect(ctx, 0, 0, W, H, 16);
  fillOutline(ctx, def.crypt ? '#0b1a12' : '#fffaf0', 4);
  // barra de título colorida, com o título e o X
  ctx.save();
  rrect(ctx, 0, 0, W, H, 16);
  ctx.clip();
  ctx.fillStyle = def.bar;
  ctx.fillRect(0, 0, W, BAR + 2);
  ctx.restore();
  rrect(ctx, 0, 0, W, H, 16);
  ctx.lineWidth = 4;
  ctx.strokeStyle = def.crypt ? '#3dff9a' : OUTLINE;
  ctx.stroke();
  const title = def.crypt && Math.sin(t * 3 + ad.seed) > 0.3 ? cipher(ad.seed, 13, t) : def.title;
  text(ctx, title, 14, BAR / 2 + 2, { size: 15, align: 'left' });
  if (ad.vx) text(ctx, 'AD', W - 52, BAR / 2 + 2, { size: 11, color: GOLD }); // os que andam

  // desenho à esquerda, chamada e texto à direita
  ctx.save();
  ctx.translate(40, BAR + 46 + Math.sin(t * 5 + ad.seed) * 3);
  drawIcon(ctx, def.icon, t);
  ctx.restore();
  if (def.crypt) {
    // chamada embaralhada, trocando os caracteres o tempo todo
    text(ctx, cipher(ad.seed, 12, t), 160, BAR + 26, { size: 14, color: '#3dff9a', strokeWidth: 3 });
    text(ctx, cipher(ad.seed + 7, 12, t), 160, BAR + 44, { size: 14, color: '#3dff9a', strokeWidth: 3 });
    wrapText(ctx, def.sub, 160, BAR + 62, W - 96, 11, '#b77cff', 2);
  } else {
    wrapText(ctx, def.head, 160, BAR + 20, W - 96, 14, '#2a1840', 2);
    wrapText(ctx, def.sub, 160, BAR + 56, W - 96, 11, '#5d6680', 2);
  }
  // botão chamativo piscando (não faz nada: é só propaganda)
  const blink = Math.sin(t * 8 + ad.seed) > 0;
  const b = { x: 82, y: H - 38, w: W - 96, h: 28 };
  const on = def.crypt ? '#a35cf0' : '#3fd16b';
  const off = def.crypt ? '#7a3cc4' : '#2fbf6a';
  button(ctx, b, blink ? on : off, { radius: 10, depth: 3 });
  text(ctx, def.cta, b.x + b.w / 2, b.y + 12, { size: def.cta.length > 12 ? 11 : 13 });
  // X por último (no criptografado ele pode estar em cima do botão)
  const [xx, xy] = CLOSE_SPOTS[ad.closeAt ?? 0];
  iconButton(ctx, { x: xx, y: xy, w: CLOSE, h: CLOSE }, '#ff5a5a', 'close');
}

// Texto embaralhado que muda sozinho (anúncio criptografado)
const GLYPHS = '01#$%&@*!?ABCDEF0123456789XZ';
function cipher(seed, len, t) {
  const step = Math.floor(t * 8);
  let s = '';
  for (let i = 0; i < len; i++) s += GLYPHS[Math.floor(Math.abs(Math.sin(seed * 31 + i * 7.3 + step * 1.7)) * 1e4) % GLYPHS.length];
  return s;
}

// Desenho do anúncio (origem no centro)
function drawIcon(ctx, icon, t) {
  switch (icon) {
    case 'coffee':
      ICONS.coffee(ctx, 22);
      break;
    case 'star':
      if (!drawImage(ctx, 'icon_star', 56)) ICONS.play(ctx, 18);
      break;
    case 'coin':
      drawCoin(ctx, 22, t * 3);
      break;
    case 'heart':
      drawHeart(ctx, 22);
      break;
    case 'virus':
      drawVirusIcon(ctx, 'v1', ENEMIES.v1, 16);
      break;
    case 'lock': {
      const k = 1 + Math.sin(t * 5) * 0.08;
      ctx.scale(k, k);
      ICONS.lock(ctx, 24);
      break;
    }
    case 'ram': {
      // pente de memória verde com chips pretos
      rrect(ctx, -30, -12, 60, 24, 4);
      fillOutline(ctx, '#2fbf6a', 3);
      for (let i = 0; i < 4; i++) {
        rrect(ctx, -25 + i * 13, -7, 10, 11, 2);
        ctx.fillStyle = '#1b2340';
        ctx.fill();
      }
      ctx.fillStyle = GOLD;
      for (let i = 0; i < 9; i++) ctx.fillRect(-27 + i * 6, 9, 3, 5);
      break;
    }
    case 'keyboard': {
      rrect(ctx, -30, -14, 60, 28, 6);
      fillOutline(ctx, '#d8e2f2', 3);
      ctx.fillStyle = '#5d6680';
      for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) ctx.fillRect(-25 + c * 9, -9 + r * 7, 6, 4);
      circle(ctx, 22, -18, 4); // tecla voando
      ctx.fill();
      break;
    }
  }
}

// Lugar sorteado na tela pra um anúncio de tamanho w × h (dentro da tela)
export function adSpot(viewW, w, h) {
  return {
    x: 8 + Math.random() * Math.max(0, viewW - w - 16),
    y: 8 + Math.random() * Math.max(0, VIEW_H - h - 16),
  };
}
