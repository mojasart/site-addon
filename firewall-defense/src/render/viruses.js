import { OUTLINE, GOLD } from '../config.js';
import { rrect, circle, ellipse, fillOutline, gloss, cachedSprite, blit, text } from './canvas.js';
import { TAU, shade } from '../util.js';
import { drawImage, hasImage } from './images.js';

/* ════════════════════════════════════════════════════════════
 *  VÍRUS
 *  Bolotas gelatinosas com "biquinhos" em volta, volume (gradiente),
 *  brilho e cara de malvadinho. Andam dando pulinhos e olham pra
 *  onde estão indo. O desenho de cada tipo é feito uma vez só e
 *  guardado em cache, porque podem aparecer dezenas ao mesmo tempo.
 *
 *  Quando a sprite PNG do inimigo existe (def.sprite, assets/sprites),
 *  ela é usada no lugar do desenho com formas (drawSpriteEnemy).
 * ════════════════════════════════════════════════════════════ */

export function drawEnemy(ctx, e) {
  const def = e.def;
  if (e.golden) goldenHalo(ctx, e);
  if (hasImage(def.sprite)) {
    drawSpriteEnemy(ctx, e);
    if (e.golden) goldenSparkles(ctx, e);
    return;
  }
  if (e.golden) ctx.filter = GOLD_FILTER;
  switch (def.kind) {
    case 'worm':
      drawWorm(ctx, e);
      break;
    case 'boss':
      drawBoss(ctx, e);
      break;
    default:
      drawHopper(ctx, e);
  }
  ctx.filter = 'none';
  if (e.golden) goldenSparkles(ctx, e);
  if (e.slowTimer > 0 && !def.boss) {
    circle(ctx, 0, -e.r * 0.3, e.r + 4);
    ctx.fillStyle = 'rgba(170,235,255,0.38)';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#d8f8ff';
    ctx.stroke();
  }
  if (e.burnTimer > 0) drawBurning(ctx, e, -e.r * 0.3);
  if (e.flash > 0) {
    circle(ctx, 0, -e.r * 0.3, e.r);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fill();
  }
}

// Vírus dourado (Toque de Midas, Minerador nível 3): cor puxada pro ouro
// (filtro do canvas; onde não existe, fica só o halo e os brilhos), halo
// dourado atrás e brilhinhos girando em volta
const GOLD_FILTER = 'sepia(1) saturate(2.2) hue-rotate(10deg) brightness(1.28) contrast(1.05)';

function goldenHalo(ctx, e) {
  const pulse = 0.5 + Math.sin(e.phase * 5) * 0.5;
  const r = e.r * (1.5 + pulse * 0.15);
  const g = ctx.createRadialGradient(0, -e.r * 0.3, e.r * 0.4, 0, -e.r * 0.3, r);
  g.addColorStop(0, `rgba(255,214,70,${0.55 + pulse * 0.2})`);
  g.addColorStop(1, 'rgba(255,214,70,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, -e.r * 0.3, r, 0, Math.PI * 2);
  ctx.fill();
}

function goldenSparkles(ctx, e) {
  ctx.save();
  ctx.fillStyle = '#fff6c8';
  for (let i = 0; i < 3; i++) {
    const a = e.phase * 2.2 + (i * Math.PI * 2) / 3;
    const k = 0.5 + 0.5 * Math.sin(e.phase * 6 + i * 2);
    const x = Math.cos(a) * e.r * 1.05;
    const y = -e.r * 0.3 + Math.sin(a) * e.r * 0.85;
    const s = 2 + k * 3;
    ctx.globalAlpha = 0.4 + 0.6 * k;
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.quadraticCurveTo(x, y, x + s, y);
    ctx.quadraticCurveTo(x, y, x, y + s);
    ctx.quadraticCurveTo(x, y, x - s, y);
    ctx.quadraticCurveTo(x, y, x, y - s);
    ctx.fill();
  }
  ctx.restore();
}

// Como cada sprite é desenhada (medidas em múltiplos do raio):
//   size → lado da imagem    foot → onde ficam os pés, em fração da imagem
//   hop  → altura do pulo (0 = flutua)
const SPRITE_LOOK = {
  worm: { size: 4.4, foot: 0.34, hop: 0.22 },
  trojan: { size: 2.8, foot: 0.477, hop: 0.3 },
  locker: { size: 2.9, foot: 0.477, hop: 0.22 },
  boss: { size: 3.4, foot: 0.336, hop: 0 },
};
const VIRUS_LOOK = { size: 2.9, foot: 0.477, hop: 0.42 };

// Inimigo com sprite: anda dando pulinhos suaves (sobe e desce em curva,
// sem tranco no chão), balança de leve e vira aos poucos pro lado em que
// anda (e.turn vai de -1 a 1). O chefão só flutua.
function drawSpriteEnemy(ctx, e) {
  const { def, r } = e;
  const look = SPRITE_LOOK[def.kind] ?? VIRUS_LOOK;
  const size = r * look.size;
  const ground = r * 0.9; // onde ficam os pés (igual aos desenhos com formas)

  // ritmo do pulo: mais rápido pros vírus rápidos (e mais lento se estiver
  // lento, porque o phase anda junto com a lentidão)
  const rate = Math.min(2.6, Math.max(1.3, def.speed / 60));
  const wave = Math.cos(e.phase * rate * TAU);
  const air = (1 - wave) / 2; // 0 no chão, 1 no topo (suave nas duas pontas)
  const low = (1 + wave) / 2; // perto do chão
  let lift = air * r * look.hop;
  let sx = 1 + 0.07 * low - 0.03 * air;
  let sy = 1 - 0.07 * low + 0.05 * air;
  let lean = Math.sin(e.phase * rate * TAU) * 0.07;
  if (look.hop === 0) {
    lift = 8 + Math.sin(e.phase * 2) * 4; // flutuando
    sx = sy = 1;
    lean = 0;
  }
  // virada: o desenho "afina" no meio do giro em vez de trocar de lado de uma vez
  const turn = e.turn ?? e.face;
  const flip = Math.sign(turn || 1) * Math.max(0.12, Math.abs(turn));

  // sombra no chão: diminui quando sobe
  ctx.fillStyle = `rgba(10,20,30,${0.25 * (1 - 0.4 * air)})`;
  ellipse(ctx, 0, ground, r * (def.boss ? 1.3 : 0.85) * (1 - 0.3 * air), r * 0.28);
  ctx.fill();

  ctx.save();
  ctx.translate(0, ground - lift);
  ctx.rotate(Math.sign(turn || 1) * lean); // balança pra frente e pra trás
  ctx.scale(flip * sx, sy); // escala ancorada nos pés
  const dy = -size * look.foot;
  if (e.golden) ctx.filter = GOLD_FILTER;
  drawImage(ctx, def.sprite, size, 0, dy);
  ctx.filter = 'none';
  if (e.flash > 0) {
    // acerto: pisca mais claro
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.6;
    if (e.golden) ctx.filter = GOLD_FILTER;
    drawImage(ctx, def.sprite, size, 0, dy);
    ctx.filter = 'none';
  }
  ctx.restore();

  if (e.slowTimer > 0 && !def.boss) {
    circle(ctx, 0, ground - lift - size * look.foot, r + 4);
    ctx.fillStyle = 'rgba(170,235,255,0.38)';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#d8f8ff';
    ctx.stroke();
  }
  if (e.burnTimer > 0) drawBurning(ctx, e, ground - lift - size * look.foot);
}

// Pegando fogo (Golem com Incêndio): chaminhas tremendo em cima do corpo.
// Somem aos poucos no último meio segundo da queima
function drawBurning(ctx, e, cy) {
  const r = Math.min(e.r, 22); // no chefão as chamas não ficam gigantes
  ctx.save();
  ctx.globalAlpha = Math.min(1, e.burnTimer * 2);
  for (let i = 0; i < 3; i++) {
    const x = (i - 1) * r * 0.55;
    const flick = Math.sin(e.phase * 19 + i * 2.3) * 0.18;
    const h = r * (i === 1 ? 0.95 : 0.65) * (1 + flick);
    const w = r * (i === 1 ? 0.32 : 0.24);
    const y = cy - e.r * 0.55 + Math.abs(i - 1) * r * 0.2;
    flame(ctx, x, y, h, w);
    fillOutline(ctx, '#ff7a1a', 1.5);
    flame(ctx, x, y + w * 0.25, h * 0.5, w * 0.5);
    ctx.fillStyle = '#ffd23f';
    ctx.fill();
  }
  ctx.restore();
}

function flame(ctx, x, y, h, w) {
  ctx.beginPath();
  ctx.moveTo(x, y - h);
  ctx.bezierCurveTo(x + w * 0.7, y - h * 0.45, x + w * 1.1, y - h * 0.05, x + w * 0.75, y + w * 0.45);
  ctx.quadraticCurveTo(x, y + w * 1.05, x - w * 0.75, y + w * 0.45);
  ctx.bezierCurveTo(x - w * 1.1, y - h * 0.05, x - w * 0.7, y - h * 0.45, x, y - h);
  ctx.closePath();
}

// Vírus que anda pulando (todos menos worm e chefão)
function drawHopper(ctx, e) {
  const r = e.r;
  const hop = Math.abs(Math.sin(e.phase * 8));
  const squash = hop < 0.25 ? 1 - (0.25 - hop) * 0.5 : 1;
  // sombra fica no chão
  ctx.fillStyle = 'rgba(10,20,30,0.25)';
  ellipse(ctx, 0, r * 0.9, r * (0.85 - hop * 0.18), r * 0.28);
  ctx.fill();
  const size = r * 3.4;
  ctx.save();
  ctx.translate(0, r * 0.9 - hop * r * 0.45);
  ctx.scale(e.face * (2 - squash), squash);
  ctx.translate(0, -r * 0.9);
  blit(ctx, enemySprite(e.type, e.def, r), size);
  ctx.restore();
}

export function enemySprite(type, def, r) {
  return cachedSprite(`e:${type}:${r}`, r * 3.4, (g) => {
    if (def.kind === 'trojan') trojan(g, r, def.color);
    else if (def.kind === 'locker') locker(g, r, def.color);
    else if (def.kind === 'spy') spy(g, r, def.color);
    else blob(g, r, def.color, true);
  });
}

function blob(g, r, color, withFace) {
  // biquinhos em volta (atrás do corpo)
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i / 7) * TAU + 0.2;
    circle(g, Math.cos(a) * r * 0.98, Math.sin(a) * r * 0.98, r * 0.27);
    fillOutline(g, shade(color, -0.12), 2.5);
  }
  const grad = g.createRadialGradient(-r * 0.35, -r * 0.45, r * 0.1, 0, 0, r * 1.05);
  grad.addColorStop(0, shade(color, 0.5));
  grad.addColorStop(0.55, color);
  grad.addColorStop(1, shade(color, -0.32));
  circle(g, 0, 0, r);
  g.fillStyle = grad;
  g.fill();
  g.lineWidth = 3;
  g.strokeStyle = OUTLINE;
  g.stroke();
  // pintinhas de "germe"
  g.fillStyle = 'rgba(0,0,0,0.12)';
  for (const [x, y, s] of [[-0.48, 0.32, 0.16], [0.52, 0.5, 0.1], [-0.1, 0.66, 0.08]]) {
    circle(g, x * r, y * r, s * r);
    g.fill();
  }
  gloss(g, -r * 0.38, -r * 0.5, r * 0.3, r * 0.17, -0.5);
  circle(g, -r * 0.66, -r * 0.2, r * 0.07);
  g.fillStyle = 'rgba(255,255,255,0.8)';
  g.fill();
  if (withFace) face(g, r);
}

// Spyware: vírus cinza de óculos escuros
function spy(g, r, color) {
  blob(g, r, color, true);
  for (const dx of [-0.24, 0.38]) {
    ellipse(g, dx * r, -r * 0.1, r * 0.27, r * 0.19);
    fillOutline(g, '#141824', 2);
    ellipse(g, (dx - 0.07) * r, -r * 0.16, r * 0.08, r * 0.04);
    g.fillStyle = 'rgba(255,255,255,0.6)';
    g.fill();
  }
  g.beginPath();
  g.moveTo(-0.0 * r, -r * 0.12);
  g.lineTo(0.12 * r, -r * 0.12);
  g.lineWidth = 2.5;
  g.strokeStyle = '#141824';
  g.stroke();
}

// Olhões bravinhos + sorriso com caninos (olhando pra direita)
function face(g, r) {
  for (const dx of [-0.24, 0.38]) {
    ellipse(g, dx * r, -r * 0.08, r * 0.23, r * 0.3);
    fillOutline(g, '#ffffff', 2);
    circle(g, (dx + 0.08) * r, -r * 0.03, r * 0.13);
    g.fillStyle = OUTLINE;
    g.fill();
    circle(g, (dx + 0.12) * r, -r * 0.09, r * 0.045);
    g.fillStyle = '#ffffff';
    g.fill();
  }
  g.lineCap = 'round';
  g.lineWidth = Math.max(2, r * 0.14);
  g.strokeStyle = OUTLINE;
  g.beginPath();
  g.moveTo(-r * 0.5, -r * 0.46);
  g.lineTo(-r * 0.06, -r * 0.3);
  g.moveTo(r * 0.68, -r * 0.46);
  g.lineTo(r * 0.24, -r * 0.3);
  g.stroke();
  g.beginPath();
  g.moveTo(-r * 0.22, r * 0.3);
  g.quadraticCurveTo(r * 0.12, r * 0.66, r * 0.52, r * 0.26);
  g.quadraticCurveTo(r * 0.14, r * 0.42, -r * 0.22, r * 0.3);
  g.closePath();
  g.fillStyle = '#5a0a1a';
  g.fill();
  g.lineWidth = 2;
  g.stroke();
  g.fillStyle = '#ffffff';
  for (const x of [-0.06, 0.28]) {
    g.beginPath();
    g.moveTo(x * r, r * 0.33);
    g.lineTo((x + 0.07) * r, r * 0.44);
    g.lineTo((x + 0.14) * r, r * 0.32);
    g.closePath();
    g.fill();
  }
}

// Trojan: vírus de capacete espartano (blindado)
function trojan(g, r, color) {
  blob(g, r, color, false);
  // penacho
  ellipse(g, -r * 0.05, -r * 1.02, r * 0.24, r * 0.55);
  fillOutline(g, '#e8344e', 2.5);
  // capacete
  const grad = g.createLinearGradient(0, -r, 0, r * 0.4);
  grad.addColorStop(0, '#f1f5fb');
  grad.addColorStop(1, '#8e9bb0');
  g.beginPath();
  g.arc(0, -r * 0.05, r * 0.98, Math.PI, 0);
  g.lineTo(r * 0.98, r * 0.32);
  g.quadraticCurveTo(r * 0.75, r * 0.5, r * 0.55, r * 0.32);
  g.lineTo(-r * 0.55, r * 0.32);
  g.quadraticCurveTo(-r * 0.75, r * 0.5, -r * 0.98, r * 0.32);
  g.closePath();
  g.fillStyle = grad;
  g.fill();
  g.lineWidth = 3;
  g.strokeStyle = OUTLINE;
  g.stroke();
  // viseira em T
  rrect(g, -r * 0.55, -r * 0.24, r * 1.2, r * 0.3, r * 0.12);
  g.fillStyle = '#141726';
  g.fill();
  rrect(g, r * 0.0, -r * 0.1, r * 0.26, r * 0.5, r * 0.1);
  g.fill();
  for (const dx of [-0.25, 0.4]) {
    ellipse(g, dx * r, -r * 0.09, r * 0.12, r * 0.07);
    g.fillStyle = '#ff3b5c';
    g.fill();
  }
  for (const [x, y] of [[-0.7, 0.1], [0.75, 0.1], [-0.4, -0.62], [0.45, -0.62]]) {
    circle(g, x * r, y * r, r * 0.07);
    g.fillStyle = '#7f8ba0';
    g.fill();
  }
  gloss(g, -r * 0.42, -r * 0.6, r * 0.28, r * 0.12, -0.4);
}

// Locker: mini-chefão acorrentado com cadeado na barriga
function locker(g, r, color) {
  blob(g, r, color, true);
  g.lineCap = 'round';
  for (const dir of [-1, 1]) {
    for (let i = -3; i <= 3; i++) {
      const x = i * r * 0.25;
      const y = dir * i * r * 0.18 + r * 0.15;
      ellipse(g, x, y, r * 0.13, r * 0.08, dir * -0.6);
      g.lineWidth = 3.5;
      g.strokeStyle = OUTLINE;
      g.stroke();
      g.lineWidth = 2;
      g.strokeStyle = '#c9d3e0';
      g.stroke();
    }
  }
  g.beginPath();
  g.arc(r * 0.08, r * 0.38, r * 0.18, Math.PI, 0);
  g.lineWidth = 5;
  g.strokeStyle = OUTLINE;
  g.stroke();
  g.lineWidth = 2.5;
  g.strokeStyle = '#d6dce8';
  g.stroke();
  rrect(g, -r * 0.18, r * 0.38, r * 0.52, r * 0.42, r * 0.1);
  fillOutline(g, GOLD, 2.5);
  circle(g, r * 0.08, r * 0.56, r * 0.07);
  g.fillStyle = OUTLINE;
  g.fill();
}

// Worm: lagartinha que se replica (os gomos balançam)
function drawWorm(ctx, e) {
  const r = e.r;
  ctx.fillStyle = 'rgba(10,20,30,0.25)';
  ellipse(ctx, -r * 1.2, r * 0.8, r * 2.2, r * 0.3);
  ctx.fill();
  ctx.save();
  ctx.scale(e.face, 1);
  for (let i = 4; i >= 1; i--) {
    const y = Math.sin(e.phase * 12 - i * 0.9) * r * 0.22 - Math.abs(Math.sin(e.phase * 12 - i * 0.9)) * r * 0.2;
    circle(ctx, -i * r * 0.78, y + r * 0.1, r * (0.82 - i * 0.07));
    fillOutline(ctx, i % 2 ? '#56c23a' : '#6fd444');
    circle(ctx, -i * r * 0.78, y + r * 0.1 - r * 0.3, r * 0.15);
    ctx.fillStyle = '#ffd23f';
    ctx.fill();
  }
  const hy = -Math.abs(Math.sin(e.phase * 12)) * r * 0.25;
  ctx.translate(0, hy);
  ctx.lineCap = 'round';
  for (const dx of [-0.2, 0.35]) {
    ctx.beginPath();
    ctx.moveTo(dx * r, -r * 0.8);
    ctx.quadraticCurveTo((dx + 0.1) * r, -r * 1.3, (dx + 0.3) * r, -r * 1.35);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
    circle(ctx, (dx + 0.3) * r, -r * 1.35, r * 0.14);
    fillOutline(ctx, '#ff4d5e', 2);
  }
  blit(ctx, cachedSprite(`worm:${r}`, r * 3.4, (g) => blob(g, r, '#7be04a', true)), r * 3.4);
  ctx.restore();
}

// Ransomware: dirigível chefão (gira com o caminho), hélice girando
function drawBoss(ctx, e) {
  const r = e.r;
  const L = r * 1.4;
  const W = r * 0.85;
  ctx.fillStyle = 'rgba(10,20,30,0.25)';
  ellipse(ctx, 6, r * 0.9, L, W * 0.5);
  ctx.fill();
  ctx.save();
  ctx.translate(0, Math.sin(e.phase * 2) * 3 - 6);
  ctx.rotate(e.angle);
  const size = L * 2 + 60;
  blit(ctx, cachedSprite(`boss:${r}`, size, (g) => bossBody(g, L, W, e.def.color)), size);
  // hélice
  ctx.save();
  ctx.translate(-L - 10, 0);
  ctx.scale(1, Math.sin(e.phase * 30));
  rrect(ctx, -3, -W * 0.75, 6, W * 1.5, 3);
  fillOutline(ctx, '#c9d3e0', 2);
  ctx.restore();
  ctx.restore();
}

function bossBody(g, L, W, color) {
  for (const sy of [-1, 1]) {
    g.beginPath();
    g.moveTo(-L * 0.55, sy * W * 0.5);
    g.lineTo(-L - 12, sy * (W + 14));
    g.lineTo(-L - 2, sy * W * 0.15);
    g.closePath();
    fillOutline(g, shade(color, -0.3), 3.5);
  }
  rrect(g, -L - 12, -6, 12, 12, 4);
  fillOutline(g, '#5a6886', 3);
  const grad = g.createLinearGradient(0, -W, 0, W);
  grad.addColorStop(0, shade(color, 0.35));
  grad.addColorStop(0.5, color);
  grad.addColorStop(1, shade(color, -0.35));
  rrect(g, -L, -W, L * 2, W * 2, W);
  g.fillStyle = grad;
  g.fill();
  g.lineWidth = 4;
  g.strokeStyle = OUTLINE;
  g.stroke();
  rrect(g, -L * 0.55, -W, L * 0.3, W * 2, 4);
  g.fillStyle = 'rgba(0,0,0,0.16)';
  g.fill();
  gloss(g, -L * 0.15, -W * 0.55, L * 0.55, W * 0.17, 0);
  for (const sy of [-1, 1]) {
    ellipse(g, L * 0.68, sy * W * 0.36, 7.5, 5.5, sy * 0.4);
    fillOutline(g, '#ffffff', 2.5);
    circle(g, L * 0.72, sy * W * 0.33, 3);
    g.fillStyle = '#ff3b5c';
    g.fill();
    g.beginPath();
    g.moveTo(L * 0.55, sy * W * 0.62);
    g.lineTo(L * 0.85, sy * W * 0.42);
    g.lineWidth = 3.5;
    g.strokeStyle = OUTLINE;
    g.stroke();
  }
  // cadeado com $
  g.lineCap = 'round';
  g.beginPath();
  g.arc(-4, -7, 10, Math.PI, 0);
  g.lineWidth = 10;
  g.strokeStyle = OUTLINE;
  g.stroke();
  g.lineWidth = 5;
  g.strokeStyle = '#d6dce8';
  g.stroke();
  rrect(g, -19, -8, 30, 24, 6);
  fillOutline(g, GOLD, 3);
  text(g, '$', -4, 5, { size: 18, color: '#7a5600', stroke: null });
}

// Vírus parado (decoração de menus)
export function drawVirusIcon(ctx, type, def, r) {
  if (drawImage(ctx, def.sprite, r * 3)) return;
  blit(ctx, enemySprite(type, def, r), r * 3.4);
}
