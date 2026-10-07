import { circle, ellipse, rrect, fillOutline, shadow, text } from './canvas.js';
import { drawImage, hasImage } from './images.js';

/* ════════════════════════════════════════════════════════════
 *  DEFENSORES
 *
 *  drawDefender(ctx, type, s)     → personagem em pé no ponto de instalação.
 *     Origem (0,0) = centro do ponto; os pés ficam perto de y=+6.
 *     s = { t, face (1 = olhando pra direita, -1 = esquerda),
 *           attack (1 logo depois de atacar → 0), spawn (1 ao ser instalado → 0) }
 *  drawDefenderIcon(ctx, type, t) → retrato pros botões da HUD, cabe num
 *     círculo de raio ~30 centrado em (0,0).
 *  drawProjectile(ctx, p, t)      → p.kind: 'dart' | 'burst' | 'bomb'; p.angle
 *
 *  Sprites em assets/sprites (desenhadas olhando pra direita).
 *  Sem a imagem, cai na bolinha provisória.
 * ════════════════════════════════════════════════════════════ */

const SIZE = 68; // lado da imagem do personagem
const FOOT = 0.477; // pés, em fração da imagem (medido nas sprites)
const FEET_Y = 6;

export function drawDefender(ctx, type, s = {}) {
  if (!hasImage(type)) {
    drawPlaceholder(ctx, type, s);
    return;
  }
  const t = s.t ?? 0;
  const face = s.face ?? 1;
  const atk = s.attack ?? 0;
  const pop = 1 + Math.sin((s.spawn ?? 0) * Math.PI) * 0.25;
  // respirando parado; ao atacar dá um bote pra frente e achata
  const breathe = Math.sin(t * 3) * 0.025;
  const sx = pop * (1 + atk * 0.12 - breathe);
  const sy = pop * (1 - atk * 0.1 + breathe);

  shadow(ctx, 0, FEET_Y, 20, 7);
  ctx.save();
  ctx.translate(face * atk * 5, FEET_Y);
  ctx.scale(face * sx, sy); // escala ancorada nos pés
  drawImage(ctx, type, SIZE, 0, -SIZE * FOOT);
  ctx.restore();
}

export function drawDefenderIcon(ctx, type) {
  if (!drawImage(ctx, type, 52, 0, 2)) {
    circle(ctx, 0, 0, 22);
    fillOutline(ctx, COLORS[type], 3);
    text(ctx, type[0].toUpperCase(), 0, 1, { size: 20 });
  }
}

export function drawProjectile(ctx, p) {
  ctx.save();
  ctx.rotate(p.angle ?? 0);
  if (p.kind === 'bomb') {
    circle(ctx, 0, 0, 8);
    fillOutline(ctx, '#2b2340', 2.5);
    ellipse(ctx, -2.5, -3, 2.5, 1.6, -0.6);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fill();
    circle(ctx, 6, -6, 2.5);
    ctx.fillStyle = '#ffb02e';
    ctx.fill();
  } else if (p.kind === 'burst') {
    // pacote de rede
    rrect(ctx, -6, -4.5, 12, 9, 2.5);
    fillOutline(ctx, '#3fd6c4', 2);
  } else {
    // dardo de dados verde
    ellipse(ctx, 0, 0, 10, 4);
    fillOutline(ctx, '#5dff9d', 2);
    ellipse(ctx, 2, -1, 4, 1.5);
    ctx.fillStyle = '#eafff2';
    ctx.fill();
  }
  ctx.restore();
}

const COLORS = {
  hacker: '#3c4a63',
  roteador: '#2fb3a5',
  firewall: '#ff7a3d',
  scanner: '#5aa9ff',
  engenheiro: '#ffc83d',
  minerador: '#a37a52',
};

function drawPlaceholder(ctx, type, s) {
  const pop = 1 + Math.sin((s.spawn ?? 0) * Math.PI) * 0.25;
  shadow(ctx, 0, 4, 18, 7);
  ctx.save();
  ctx.scale(pop, pop);
  ctx.translate(0, -(s.attack ?? 0) * 3);
  circle(ctx, 0, -18, 17);
  fillOutline(ctx, COLORS[type], 3);
  text(ctx, type[0].toUpperCase(), 0, -18, { size: 16 });
  ctx.restore();
}
