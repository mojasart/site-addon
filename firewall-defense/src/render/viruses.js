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
    case 'cicada':
      drawFlyer(ctx, e);
      break;
    default:
      drawHopper(ctx, e);
  }
  ctx.filter = 'none';
  if (e.golden) goldenSparkles(ctx, e);
  drawChill(ctx, e, -e.r * 0.3);
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
  spy: { size: 3, foot: 0.477, hop: 0.32 },
  adware: { size: 2.8, foot: 0.477, hop: 0.2 },
  boss: { size: 3.4, foot: 0.336, hop: 0 },
  cicada: { size: 5.2, foot: 0.5, hop: 0, float: 30 }, // Cicada 3301: voa bem acima da sombra (o quadro sobra por causa das asas)
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
    lift = (look.float ?? 8) + Math.sin(e.phase * (look.float ? 5 : 2)) * 4; // flutuando (ou voando)
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
  // Cicada 3301: no pulso da aura troca pra pose "ativando" (olhos verdes)
  const sprite = def.aura && auraPulse(e) > 0 && hasImage(`${def.sprite}_aura`) ? `${def.sprite}_aura` : def.sprite;
  if (e.golden) ctx.filter = GOLD_FILTER;
  drawImage(ctx, sprite, size, 0, dy, def.tint);
  ctx.filter = 'none';
  if (e.flash > 0) {
    // acerto: pisca mais claro
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.6;
    if (e.golden) ctx.filter = GOLD_FILTER;
    drawImage(ctx, sprite, size, 0, dy, def.tint);
    ctx.filter = 'none';
  }
  ctx.restore();

  drawChill(ctx, e, ground - lift - size * look.foot);
  if (e.burnTimer > 0) drawBurning(ctx, e, ground - lift - size * look.foot);
}

// Gelo do Penguin Linux (cy = centro do corpo):
//   congelado (Kernel Gelado, Congelar Tudo) → bloco de gelo semitransparente
//   em volta do vírus, do tamanho dele
//   lento (onda do Pinguim) → floquinho em cima da cabeça, girando devagar
// Sem as sprites, o círculo azul de antes. Chefão não fica lento nem congela
function drawChill(ctx, e, cy) {
  if (e.def.boss) return;
  const { r } = e;
  if (e.freezeTimer > 0) {
    ctx.save();
    ctx.globalAlpha = 0.55;
    // o bloco ocupa ~70% da largura e quase toda a altura do quadro; os Worms
    // são compridos, então o bloco estica na largura
    if (e.def.kind === 'worm') ctx.scale(1.9, 1);
    if (!drawImage(ctx, 'ice_block', r * 3, 0, cy + r * 0.05)) {
      circle(ctx, 0, cy, r + 4);
      ctx.fillStyle = 'rgba(170,235,255,0.6)';
      ctx.fill();
    }
    ctx.restore();
  }
  if (e.slowTimer > 0) {
    const fy = cy - r - 7 + Math.sin(e.phase * 3) * 1.5;
    ctx.save();
    ctx.translate(0, fy);
    ctx.rotate(Math.sin(e.phase * 1.5) * 0.4);
    if (!drawImage(ctx, 'frost_flake', r * 1.15)) {
      ctx.restore();
      circle(ctx, 0, cy, r + 4);
      ctx.fillStyle = 'rgba(170,235,255,0.38)';
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#d8f8ff';
      ctx.stroke();
      return;
    }
    ctx.restore();
  }
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
    else if (def.kind === 'adware') adware(g, r, def.color);
    else if (def.kind === 'spy') spy(g, r, def.color);
    else if (def.kind === 'cicada') cicada(g, r, 0);
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
// Adware: janelinha de pop-up com cara de brava (barra de título com o X,
// olhos de sobrancelha franzida, sorrisão e o selo "AD")
function adware(g, r, color) {
  const w = r * 2.1;
  const h = r * 1.75;
  const x = -w / 2;
  const y = -h / 2;
  rrect(g, x, y, w, h, r * 0.3);
  fillOutline(g, '#fffaf0', 3.5);
  // barra de título colorida
  g.save();
  rrect(g, x, y, w, h, r * 0.3);
  g.clip();
  const bar = g.createLinearGradient(0, y, 0, y + r * 0.55);
  bar.addColorStop(0, shade(color, 0.3));
  bar.addColorStop(1, color);
  g.fillStyle = bar;
  g.fillRect(x, y, w, r * 0.55);
  g.restore();
  rrect(g, x, y, w, h, r * 0.3);
  g.lineWidth = 3.5;
  g.strokeStyle = OUTLINE;
  g.stroke();
  // X vermelho no canto da barra
  circle(g, x + w - r * 0.32, y + r * 0.28, r * 0.19);
  fillOutline(g, '#ff5a5a', 2);
  g.lineWidth = 2.2;
  g.strokeStyle = '#ffffff';
  const cx = x + w - r * 0.32;
  const cy = y + r * 0.28;
  const k = r * 0.08;
  g.beginPath();
  g.moveTo(cx - k, cy - k);
  g.lineTo(cx + k, cy + k);
  g.moveTo(cx + k, cy - k);
  g.lineTo(cx - k, cy + k);
  g.stroke();
  // olhos bravos
  for (const s of [-1, 1]) {
    circle(g, s * r * 0.42, r * 0.1, r * 0.22);
    fillOutline(g, '#ffffff', 2.5);
    circle(g, s * r * 0.38, r * 0.14, r * 0.1);
    g.fillStyle = OUTLINE;
    g.fill();
    g.lineWidth = 3;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(s * r * 0.68, -r * 0.16);
    g.lineTo(s * r * 0.2, -r * 0.04);
    g.stroke();
  }
  // sorrisão
  g.beginPath();
  g.arc(0, r * 0.38, r * 0.4, 0.15 * Math.PI, 0.85 * Math.PI);
  g.lineWidth = 3;
  g.strokeStyle = OUTLINE;
  g.stroke();
  // selo "AD"
  rrect(g, x + r * 0.12, y + h - r * 0.5, r * 0.62, r * 0.38, r * 0.1);
  fillOutline(g, GOLD, 2);
  text(g, 'AD', x + r * 0.43, y + h - r * 0.3, { size: r * 0.3, color: OUTLINE, stroke: null });
}

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
  blit(ctx, cachedSprite(`worm:${r}:${e.def.color}`, r * 3.4, (g) => blob(g, r, e.def.color, true)), r * 3.4);
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

// Cicada 3301 (voa): sombra no chão e a cigarra lá em cima, subindo e
// descendo devagar e batendo as asas
function drawFlyer(ctx, e) {
  const { r } = e;
  const ground = r * 0.9;
  const lift = 30 + Math.sin(e.phase * 3) * 4;
  ctx.fillStyle = 'rgba(10,20,30,0.22)';
  ellipse(ctx, 0, ground, r * 0.8, r * 0.24);
  ctx.fill();
  ctx.save();
  ctx.translate(0, ground - lift - r * 0.5);
  ctx.scale((e.face || 1) * 1.5, 1.5); // minichefão: bem maior que os vírus
  cicada(ctx, r, e.phase * 22);
  if (e.flash > 0) {
    circle(ctx, 0, 0, r * 0.7);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fill();
  }
  ctx.restore();
}

// Cigarra do Cicada 3301: corpo escuro, asas transparentes com veias
// verdes de terminal (batendo com o flap), olhos vermelhos e o "3301" nas
// costas. Origem no meio do corpo, olhando pra direita
function cicada(g, r, flap) {
  const k = 0.7 + 0.3 * Math.abs(Math.sin(flap)); // abertura das asas
  const wing = (rot, len, alpha) => {
    g.save();
    g.translate(-r * 0.1, -r * 0.2);
    g.rotate(rot);
    g.scale(1, k);
    ellipse(g, -len * 0.55, 0, len * 0.6, r * 0.28);
    g.fillStyle = `rgba(200,255,225,${alpha})`;
    g.fill();
    g.lineWidth = 2;
    g.strokeStyle = '#3dff9a';
    g.stroke();
    // veias
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(-len * 1.05, 0);
    g.moveTo(-len * 0.4, 0);
    g.lineTo(-len * 0.75, -r * 0.18);
    g.moveTo(-len * 0.4, 0);
    g.lineTo(-len * 0.75, r * 0.18);
    g.stroke();
    g.restore();
  };
  wing(-0.55, r * 1.25, 0.45); // asa de trás
  wing(-0.2, r * 1.45, 0.6); // asa da frente
  // corpo
  ellipse(g, -r * 0.05, r * 0.1, r * 0.75, r * 0.4);
  fillOutline(g, '#1d2a24', 3);
  // listras do abdômen
  g.strokeStyle = '#3a5246';
  g.lineWidth = 2;
  for (const x of [-r * 0.45, -r * 0.25]) {
    g.beginPath();
    g.moveTo(x, -r * 0.18);
    g.lineTo(x, r * 0.42);
    g.stroke();
  }
  // "3301" nas costas, em verde de terminal
  text(g, '3301', -r * 0.02, r * 0.12, { size: Math.max(7, r * 0.34), color: '#3dff9a', stroke: null });
  // cabeça larga e os olhos vermelhos saltados
  ellipse(g, r * 0.68, r * 0.02, r * 0.3, r * 0.36);
  fillOutline(g, '#24352c', 3);
  for (const dy of [-r * 0.24, r * 0.26]) {
    circle(g, r * 0.84, dy, r * 0.13);
    fillOutline(g, '#ff3b4e', 2);
  }
}

// Aura de criptografia da Cicada 3301: círculo verde translúcido com borda
// tracejada girando e caracteres cifrados correndo em volta. Desenhada na
// origem da Cicada (centro do chão), antes dela
const AURA_CHARS = '3301ᚠᚢᚦᚩᚱᚳ01$#';
export const AURA_PULSE = 3.301; // a cada quantos segundos a Cicada "ativa" a aura
const PULSE_TIME = 0.7; // quanto dura o pulso

// 0 fora do pulso; no pulso sobe até 1 e volta (pra animar a aura e a pose)
export function auraPulse(e) {
  const k = (e.auraT ?? 0) % AURA_PULSE;
  return k < PULSE_TIME ? Math.sin((k / PULSE_TIME) * Math.PI) : 0;
}

export function drawAura(ctx, e, t) {
  const p = auraPulse(e);
  const R = e.def.aura * (1 + 0.08 * p);
  const pulse = Math.max(p, 0.5 + Math.sin(t * 2.5) * 0.5 * (1 - p));
  ctx.save();
  const g = ctx.createRadialGradient(0, 0, R * 0.2, 0, 0, R);
  g.addColorStop(0, 'rgba(61,255,154,0.06)');
  g.addColorStop(1, `rgba(61,255,154,${0.2 + 0.08 * pulse + 0.15 * p})`);
  ctx.fillStyle = g;
  circle(ctx, 0, 0, R);
  ctx.fill();
  ctx.setLineDash([10, 8]);
  ctx.lineDashOffset = -t * 30;
  ctx.lineWidth = 3 + 2 * p;
  ctx.strokeStyle = `rgba(61,255,154,${0.7 + 0.3 * pulse})`;
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.font = 'bold 13px "Courier New", ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#3dff9a';
  ctx.shadowColor = '#3dff9a';
  ctx.shadowBlur = 6;
  const n = 14;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + t * 0.5;
    ctx.fillText(AURA_CHARS[(i + Math.floor(t * 4)) % AURA_CHARS.length], Math.cos(a) * (R - 9), Math.sin(a) * (R - 9));
  }
  ctx.restore();
}

// Vírus parado (decoração de menus)
export function drawVirusIcon(ctx, type, def, r) {
  if (drawImage(ctx, def.sprite, r * 3, 0, 0, def.tint)) return;
  blit(ctx, enemySprite(type, def, r), r * 3.4);
}
