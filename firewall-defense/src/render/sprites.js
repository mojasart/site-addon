import { OUTLINE, GOLD, TILE } from '../config.js';
import { rrect, circle, ellipse, fillOutline, shadow, gloss } from './canvas.js';
import { TAU } from '../util.js';
import { drawImage, hasImage } from './images.js';

// ── Projéteis ───────────────────────────────────────────────
export function drawProjectile(ctx, p, t) {
  ctx.save();
  if (p.kind === 'keyboard') {
    // tecladinho girando no ar (o Hacker arremessa)
    ctx.rotate(p.spin * 0.8);
    rrect(ctx, -10, -5.5, 20, 11, 3);
    fillOutline(ctx, '#3a3f52', 2.5);
    for (let row = 0; row < 2; row++) {
      for (let k = 0; k < 4; k++) {
        ctx.fillStyle = (row + k) % 3 === 0 ? '#5dff9d' : '#c9d1de';
        ctx.fillRect(-7.5 + k * 4, -3 + row * 3.5, 3, 2.4);
      }
    }
  } else {
    ctx.rotate(p.angle);
    rrect(ctx, -8, -2, 13, 4, 2);
    fillOutline(ctx, '#d6deea', 2);
    ctx.beginPath();
    ctx.moveTo(5, -3.2);
    ctx.lineTo(11, 0);
    ctx.lineTo(5, 3.2);
    ctx.closePath();
    fillOutline(ctx, '#8a96aa', 2);
    ctx.beginPath();
    ctx.moveTo(-8, 0);
    ctx.lineTo(-13, -5);
    ctx.lineTo(-13, 5);
    ctx.closePath();
    fillOutline(ctx, '#ff4d5e', 2);
  }
  ctx.restore();
}

// ── Ícones do HUD ───────────────────────────────────────────
// Moeda de bitcoin: disco laranja com o ₿ em pé. spin achata no eixo x (girando).
// Usa o SVG (assets/icons/coin.svg); se faltar, a sprite PNG; se faltar, o desenho abaixo.
export function drawCoin(ctx, r = 14, spin = 0) {
  const sx = Math.max(0.25, Math.abs(Math.cos(spin * 2)));
  ctx.save();
  ctx.scale(sx, 1);
  if (drawImage(ctx, 'icon_coin', r * 2.15) || drawImage(ctx, 'coin', r * 2.2)) {
    ctx.restore();
    return;
  }
  circle(ctx, 0, 0, r);
  fillOutline(ctx, '#e8850f', 3);
  circle(ctx, 0, 0, r * 0.76);
  ctx.fillStyle = '#f9a13a';
  ctx.fill();
  bitcoinMark(ctx, r);
  ctx.restore();
  gloss(ctx, -r * 0.38 * sx, -r * 0.5, r * 0.26 * sx, r * 0.14);
}

// ₿ feito com traços (não depende da fonte ter o símbolo)
function bitcoinMark(ctx, r) {
  const x0 = -r * 0.26;
  const h = r * 0.5;
  ctx.beginPath();
  ctx.moveTo(x0, -h);
  ctx.lineTo(x0, h);
  ctx.moveTo(x0, -h);
  ctx.lineTo(r * 0.06, -h);
  ctx.arc(r * 0.06, -h / 2, h / 2, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(x0, 0);
  ctx.lineTo(r * 0.1, 0);
  ctx.arc(r * 0.1, h / 2, h / 2, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(x0, h);
  for (const tx of [-r * 0.1, r * 0.1]) {
    ctx.moveTo(tx, -h - r * 0.2);
    ctx.lineTo(tx, -h);
    ctx.moveTo(tx, h);
    ctx.lineTo(tx, h + r * 0.2);
  }
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = r * 0.22 + 2.4;
  ctx.strokeStyle = '#b35a00';
  ctx.stroke();
  ctx.lineWidth = r * 0.22;
  ctx.strokeStyle = '#fff8ea';
  ctx.stroke();
}

export function drawHeart(ctx, s = 14) {
  if (drawImage(ctx, 'heart', s * 2.4)) return;
  ctx.beginPath();
  ctx.moveTo(0, s * 0.95);
  ctx.bezierCurveTo(-s * 1.4, 0, -s * 0.9, -s * 1.15, 0, -s * 0.45);
  ctx.bezierCurveTo(s * 0.9, -s * 1.15, s * 1.4, 0, 0, s * 0.95);
  ctx.closePath();
  fillOutline(ctx, '#ff4d6d', 3);
  gloss(ctx, -s * 0.5, -s * 0.4, s * 0.28, s * 0.17);
}

// O servidor que estamos protegendo (fim do caminho)
const SERVER_SCALE = 0.6; // desenho antigo (sem sprite): escala pra caber no quadrado
const PAD = TILE; // a plataforma ocupa o quadrado inteiro
const PAD_DEPTH = 8; // parede da plataforma (igual à da rua)
const SERVER_IMG = 54; // tamanho da sprite: o cubo (234 de 256px) fica com ~49px

// Plataforma do servidor, como a rua elevada: o pé ocupa o quadrado inteiro
// e o topo fica PAD_DEPTH acima (invade um pouco o quadrado de cima), com a
// parede escura embaixo. Topo azul com borda ciano (uma doca); fica vermelho
// ao apanhar.
function drawServerPad(ctx, hurt) {
  const h = PAD / 2;
  // silhueta inteira (pé + topo subido) com contorno
  rrect(ctx, -h, -h - PAD_DEPTH, PAD, PAD + PAD_DEPTH, 9);
  fillOutline(ctx, '#2a3866', 3);
  // topo
  rrect(ctx, -h, -h - PAD_DEPTH, PAD, PAD, 9);
  fillOutline(ctx, hurt > 0 ? '#a8455a' : '#4f6aa8', 3);
  rrect(ctx, -h + 5, -h - PAD_DEPTH + 5, PAD - 10, PAD - 10, 6);
  ctx.lineWidth = 2;
  ctx.strokeStyle = hurt > 0 ? 'rgba(255,150,160,0.8)' : 'rgba(110,230,255,0.75)';
  ctx.stroke();
}

// O servidor ocupa 1 quadrado da grade: (0, 0) é o centro do quadrado.
// Embaixo, uma plataforma do tamanho exato do quadrado (topo + parede, como
// a rua elevada); em cima, o cubo do servidor, apoiado no topo dela.
export function drawServer(ctx, t, hurt) {
  const shake = hurt > 0 ? Math.sin(t * 80) * 2 : 0;
  drawServerPad(ctx, hurt);
  ctx.save();
  ctx.translate(shake, 0);
  if (hasImage('server')) {
    // a base do cubo fica a 122/256 do meio da imagem: apoia no topo da plataforma
    const S = SERVER_IMG;
    const bottom = (122 / 256) * S;
    drawImage(ctx, hurt > 0 && hasImage('server_hurt') ? 'server_hurt' : 'server', S, 0, PAD / 2 - PAD_DEPTH - 6 - bottom);
    ctx.restore();
    return;
  }
  ctx.scale(SERVER_SCALE, SERVER_SCALE);
  rrect(ctx, -42, -30, 84, 64, 12);
  fillOutline(ctx, '#3a4f86', 4);
  rrect(ctx, -32, -22, 64, 34, 7);
  fillOutline(ctx, hurt > 0 ? '#ff5a6a' : '#58e0ff', 3);
  gloss(ctx, -20, -16, 9, 3, 0);
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.strokeStyle = OUTLINE;
  if (hurt > 0) {
    for (const sx of [-12, 12]) {
      ctx.beginPath();
      ctx.moveTo(sx - 4, -10);
      ctx.lineTo(sx + 4, -2);
      ctx.moveTo(sx + 4, -10);
      ctx.lineTo(sx - 4, -2);
      ctx.stroke();
    }
  } else {
    const blink = Math.sin(t * 1.3) > 0.97;
    for (const sx of [-12, 12]) {
      ctx.beginPath();
      if (blink) {
        ctx.moveTo(sx - 4, -6);
        ctx.lineTo(sx + 4, -6);
        ctx.stroke();
      } else {
        ctx.ellipse(sx, -6, 3, 4.5, 0, 0, TAU);
        ctx.fillStyle = OUTLINE;
        ctx.fill();
      }
    }
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }
  rrect(ctx, -32, 16, 44, 10, 3);
  ctx.fillStyle = '#26345c';
  ctx.fill();
  for (let i = 0; i < 3; i++) {
    circle(ctx, 18 + i * 6, 21, 2.5);
    ctx.fillStyle = Math.sin(t * 5 + i * 2) > 0 ? '#3dff9a' : '#1d5a3c';
    ctx.fill();
  }
  ctx.restore();
}

// Ícones brancos dos botões (desenhados centrados em 0,0)
// Ícone SVG (assets/icons) num quadrado de lado s*k; devolve false se não carregou.
// O desenho do SVG ocupa ~70% do quadrado, por isso o k ~3 (s é "meia altura").
function svgIcon(ctx, name, s, k = 3.1) {
  return drawImage(ctx, `icon_${name}`, s * k);
}

export const ICONS = {
  play(ctx, s = 14) {
    if (svgIcon(ctx, 'play', s)) return;
    ctx.beginPath();
    ctx.moveTo(-s * 0.6, -s);
    ctx.lineTo(s * 0.9, 0);
    ctx.lineTo(-s * 0.6, s);
    ctx.closePath();
    ctx.lineJoin = 'round';
    fillOutline(ctx, '#ffffff', 3);
  },
  ff(ctx, s = 12) {
    if (svgIcon(ctx, 'ff', s, 3.4)) return;
    ctx.save();
    ctx.translate(-s * 0.55, 0);
    ICONS.play(ctx, s);
    ctx.translate(s * 1.1, 0);
    ICONS.play(ctx, s);
    ctx.restore();
  },
  pause(ctx, s = 12) {
    if (svgIcon(ctx, 'pause', s)) return;
    for (const dx of [-s * 0.55, s * 0.55]) {
      rrect(ctx, dx - s * 0.3, -s, s * 0.6, s * 2, 2);
      fillOutline(ctx, '#ffffff', 2.5);
    }
  },
  close(ctx, s = 8) {
    if (svgIcon(ctx, 'close', s, 3.6)) return;
    stroked(ctx, () => {
      ctx.moveTo(-s, -s);
      ctx.lineTo(s, s);
      ctx.moveTo(s, -s);
      ctx.lineTo(-s, s);
    }, 4);
  },
  back(ctx, s = 11) {
    if (svgIcon(ctx, 'back', s)) return;
    stroked(ctx, () => {
      ctx.moveTo(s * 0.4, -s);
      ctx.lineTo(-s * 0.6, 0);
      ctx.lineTo(s * 0.4, s);
    }, 4.5);
  },
  restart(ctx, s = 11) {
    if (svgIcon(ctx, 'restart', s)) return;
    stroked(ctx, () => ctx.arc(0, 0, s, -0.3, Math.PI * 1.5), 4);
    ctx.beginPath();
    ctx.moveTo(s * 0.55, -s * 1.35);
    ctx.lineTo(s * 1.2, -s * 0.3);
    ctx.lineTo(s * 0.05, -s * 0.2);
    ctx.closePath();
    fillOutline(ctx, '#ffffff', 2.5);
  },
  map(ctx, s = 12) {
    if (svgIcon(ctx, 'map', s)) return;
    ctx.beginPath();
    ctx.moveTo(-s, -s * 0.7);
    ctx.lineTo(-s * 0.33, -s);
    ctx.lineTo(s * 0.33, -s * 0.7);
    ctx.lineTo(s, -s);
    ctx.lineTo(s, s * 0.7);
    ctx.lineTo(s * 0.33, s);
    ctx.lineTo(-s * 0.33, s * 0.7);
    ctx.lineTo(-s, s);
    ctx.closePath();
    ctx.lineJoin = 'round';
    fillOutline(ctx, '#ffffff', 3);
    ctx.beginPath();
    ctx.moveTo(-s * 0.33, -s);
    ctx.lineTo(-s * 0.33, s * 0.7);
    ctx.moveTo(s * 0.33, -s * 0.7);
    ctx.lineTo(s * 0.33, s);
    ctx.lineWidth = 2;
    ctx.stroke();
  },
  music(ctx, s = 12, on = true) {
    if (svgIcon(ctx, on ? 'music' : 'music_off', s)) return;
    ellipse(ctx, -s * 0.4, s * 0.55, s * 0.42, s * 0.32, -0.4);
    fillOutline(ctx, '#ffffff', 2.5);
    ellipse(ctx, s * 0.6, s * 0.3, s * 0.42, s * 0.32, -0.4);
    fillOutline(ctx, '#ffffff', 2.5);
    stroked(ctx, () => {
      ctx.moveTo(-s * 0.05, s * 0.5);
      ctx.lineTo(-s * 0.05, -s * 0.8);
      ctx.lineTo(s * 0.95, -s);
      ctx.lineTo(s * 0.95, s * 0.25);
    }, 2.5);
    if (!on) slash(ctx, s);
  },
  sfx(ctx, s = 12, on = true) {
    if (svgIcon(ctx, on ? 'sfx' : 'sfx_off', s)) return;
    ctx.beginPath();
    ctx.moveTo(-s, -s * 0.35);
    ctx.lineTo(-s * 0.45, -s * 0.35);
    ctx.lineTo(s * 0.15, -s * 0.9);
    ctx.lineTo(s * 0.15, s * 0.9);
    ctx.lineTo(-s * 0.45, s * 0.35);
    ctx.lineTo(-s, s * 0.35);
    ctx.closePath();
    ctx.lineJoin = 'round';
    fillOutline(ctx, '#ffffff', 2.5);
    if (on) {
      for (const r of [s * 0.5, s * 0.9]) stroked(ctx, () => ctx.arc(s * 0.15, 0, r, -0.8, 0.8), 2.5);
    } else slash(ctx, s);
  },
  // turno automático (seta circular em volta de um play); `on` = ligado
  auto(ctx, s = 12, on = true) {
    if (svgIcon(ctx, on ? 'auto' : 'auto_off', s)) return;
    ICONS.restart(ctx, s);
    if (!on) slash(ctx, s);
  },
  // catálogo de ameaças (monitorzinho com terminal)
  catalog(ctx, s = 12) {
    if (svgIcon(ctx, 'catalog', s)) return;
    rrect(ctx, -s, -s * 0.8, s * 2, s * 1.4, 3);
    fillOutline(ctx, '#ffffff', 2.5);
  },
  // café (o que se gasta na Dark Net)
  coffee(ctx, s = 12) {
    if (svgIcon(ctx, 'coffee', s)) return;
    rrect(ctx, -s * 0.8, -s * 0.6, s * 1.4, s * 1.4, 4);
    fillOutline(ctx, '#f3e6d4', 2.5);
  },
  // Dark Net (cebola roxa, como a do Tor)
  darknet(ctx, s = 12) {
    if (svgIcon(ctx, 'darknet', s)) return;
    circle(ctx, 0, s * 0.2, s * 0.9);
    fillOutline(ctx, '#8a4fe0', 2.5);
  },
  lock(ctx, s = 16) {
    if (svgIcon(ctx, 'lock', s, 2.5)) return;
    ctx.beginPath();
    ctx.arc(0, -s * 0.35, s * 0.55, Math.PI, 0);
    ctx.lineWidth = s * 0.5;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
    ctx.lineWidth = s * 0.25;
    ctx.strokeStyle = '#d6dce8';
    ctx.stroke();
    rrect(ctx, -s * 0.8, -s * 0.35, s * 1.6, s * 1.25, s * 0.25);
    fillOutline(ctx, GOLD, 3);
    circle(ctx, 0, s * 0.2, s * 0.17);
    ctx.fillStyle = OUTLINE;
    ctx.fill();
  },
};

// traço branco com contorno escuro (para ícones de linha)
function stroked(ctx, path, w) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  path();
  ctx.lineWidth = w * 2;
  ctx.strokeStyle = OUTLINE;
  ctx.stroke();
  ctx.lineWidth = w;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
}

function slash(ctx, s) {
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-s, s);
  ctx.lineTo(s, -s);
  ctx.lineWidth = 7;
  ctx.strokeStyle = OUTLINE;
  ctx.stroke();
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = '#ff5a5a';
  ctx.stroke();
}
