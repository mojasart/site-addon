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
 *  Adware está vivo. Cobrem o que estiver embaixo (o toque não passa):
 *  só fecham no X vermelho, igual ao do menu. Algumas andam de um lado
 *  pro outro. Morreu o Adware, somem sozinhas (Game.updateAds).
 *  Coordenadas de tela (por cima do mapa e do painel).
 * ════════════════════════════════════════════════════════════ */

const W = 250; // medidas do desenho (antes da escala)
const H = 158;
const SCALE = 1.45; // anúncio grande na tela
export const AD_W = W * SCALE; // tamanho na tela
export const AD_H = H * SCALE;
const BAR = 34; // barra de título (com o X)

// Tipos de anúncio: cor da barra, título, chamada, texto, botão e desenho
export const ADS = [
  { bar: '#8a5530', title: 'PROMOÇÃO', head: 'CAFÉ EXPRESSO: LEVE 2, PAGUE 3!', sub: 'Só hoje no Cafezinho do Hacker', cta: 'QUERO!', icon: 'coffee' },
  { bar: '#ff9a2e', title: 'PARABÉNS!!!', head: 'VOCÊ É O VISITANTE 1.000.000', sub: 'Resgate seu iPhone 3G agora', cta: 'RESGATAR', icon: 'star' },
  { bar: '#3f8cff', title: 'PC LENTO?', head: 'BAIXE MAIS MEMÓRIA RAM', sub: '16 GB grátis, é só clicar aqui', cta: 'BAIXAR', icon: 'ram' },
  { bar: '#ff4d5e', title: 'ALERTA!!!', head: 'SEU PC TEM 37 VÍRUS', sub: 'Limpe agora (instala só mais 38)', cta: 'LIMPAR', icon: 'virus' },
  { bar: '#ff6fd0', title: 'ENCONTROS', head: 'VÍRUS SOLTEIROS NA SUA REDE', sub: 'A 2 metros do seu servidor', cta: 'CONHECER', icon: 'heart' },
  { bar: '#2fbf6a', title: 'RENDA EXTRA', head: 'GANHE BITCOIN DORMINDO', sub: 'Mineradores odeiam esse truque', cta: 'COMEÇAR', icon: 'coin' },
  { bar: '#8a7dff', title: 'CURSO ONLINE', head: 'VIRE HACKER EM 7 DIAS', sub: 'Aula 1: como arremessar teclados', cta: 'MATRICULAR', icon: 'keyboard' },
];

// X de fechar: no canto da barra de título
export function adClose(ad) {
  return { x: ad.x + (W - 34) * SCALE, y: ad.y + 3 * SCALE, w: 30 * SCALE, h: 30 * SCALE };
}

export function drawAds(ctx, game) {
  for (const ad of game.ads) drawAd(ctx, ad, game.anim);
}

function drawAd(ctx, real, t) {
  const def = ADS[real.type];
  const ad = { ...real, x: 0, y: 0 }; // desenha no lugar dele, já escalado
  ctx.save();
  ctx.translate(real.x, real.y);
  ctx.scale(SCALE, SCALE);
  // entra pulando; ao fechar encolhe e some
  const k = ad.closing != null ? Math.max(0, ad.closing / 0.18) : easeOutBack(Math.min(1, ad.t / 0.25));
  const cx = ad.x + W / 2;
  const cy = ad.y + H / 2;
  ctx.save();
  ctx.globalAlpha = ad.closing != null ? k : Math.min(1, ad.t * 6);
  ctx.translate(cx, cy);
  ctx.scale(0.6 + 0.4 * k, 0.6 + 0.4 * k);
  ctx.translate(-cx, -cy);

  // sombra + janela
  rrect(ctx, ad.x, ad.y + 6, W, H, 16);
  ctx.fillStyle = 'rgba(10,16,40,0.45)';
  ctx.fill();
  rrect(ctx, ad.x, ad.y, W, H, 16);
  fillOutline(ctx, '#fffaf0', 4);
  // barra de título colorida, com o título e o X
  ctx.save();
  rrect(ctx, ad.x, ad.y, W, H, 16);
  ctx.clip();
  ctx.fillStyle = def.bar;
  ctx.fillRect(ad.x, ad.y, W, BAR + 2);
  ctx.restore();
  rrect(ctx, ad.x, ad.y, W, H, 16);
  ctx.lineWidth = 4;
  ctx.strokeStyle = OUTLINE;
  ctx.stroke();
  text(ctx, def.title, ad.x + 14, ad.y + BAR / 2 + 2, { size: 15, align: 'left' });
  if (ad.vx) text(ctx, 'AD', ad.x + W - 52, ad.y + BAR / 2 + 2, { size: 11, color: GOLD }); // os que andam
  iconButton(ctx, { x: W - 34, y: 3, w: 30, h: 30 }, '#ff5a5a', 'close'); // (o toque usa adClose, já escalado)

  // desenho à esquerda, chamada e texto à direita
  ctx.save();
  ctx.translate(ad.x + 40, ad.y + BAR + 46 + Math.sin(t * 5 + ad.seed) * 3);
  drawIcon(ctx, def.icon, t);
  ctx.restore();
  wrapText(ctx, def.head, ad.x + 160, ad.y + BAR + 20, W - 96, 14, '#2a1840', 2);
  wrapText(ctx, def.sub, ad.x + 160, ad.y + BAR + 56, W - 96, 11, '#5d6680', 2);
  // botão chamativo piscando (não faz nada: é só propaganda)
  const blink = Math.sin(t * 8 + ad.seed) > 0;
  const b = { x: ad.x + 82, y: ad.y + H - 38, w: W - 96, h: 28 };
  button(ctx, b, blink ? '#3fd16b' : '#2fbf6a', { radius: 10, depth: 3 });
  text(ctx, def.cta, b.x + b.w / 2, b.y + 12, { size: 13 });
  ctx.restore();
  ctx.restore();
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

// Lugar sorteado na tela pra um anúncio novo (dentro da tela, abaixo do HUD)
export function adSpot(viewW) {
  return {
    x: 16 + Math.random() * (viewW - AD_W - 32),
    y: 70 + Math.random() * (VIEW_H - AD_H - 90),
  };
}
