import { OUTLINE, GOLD, SKIN } from '../config.js';
import { rrect, circle, ellipse, fillOutline, limb, gloss, shadow, setFont } from './canvas.js';
import { TAU, clamp } from '../util.js';
import { drawImage, hasImage } from './images.js';

/* ════════════════════════════════════════════════════════════
 *  PERSONAGENS (as defesas)
 *  Estilo chibi cartoon: cabeça grande, contorno grosso, vista 3/4
 *  olhando pra direita. A origem (0,0) é o centro da base; os pés
 *  ficam em y≈14 e a cabeça em y≈-26.
 *  drawCharacter cuida de: sombra, virar pro alvo (face), respirar e
 *  o "pulinho" ao ser colocado. Cada personagem só se desenha.
 *
 *  s: { t (relógio), face (1/-1), attack (1→0 logo após atacar),
 *       pulse (1→0), spawn (1→0 ao ser colocado) }
 *  Se existir sprite PNG com o nome do tipo (assets/sprites), ela é usada
 *  no lugar do desenho com formas (drawSpriteCharacter).
 * ════════════════════════════════════════════════════════════ */

export function drawCharacter(ctx, type, s = {}) {
  const t = s.t ?? 0;
  const own = OWN_SHADOW.has(type);
  if (!own) shadow(ctx, 0, 15, 17, 5.5);
  const pop = 1 + Math.sin((s.spawn ?? 0) * Math.PI) * 0.28;
  const breath = 1 + Math.sin(t * 3) * 0.02;
  ctx.save();
  ctx.translate(0, 15);
  ctx.scale((s.face ?? 1) * pop, breath * pop);
  ctx.translate(0, -15);
  if (hasImage(type)) drawSpriteCharacter(ctx, type, s.attack ?? 0, t);
  else CHARACTERS[type]?.(ctx, s, t, s.attack ?? 0);
  ctx.restore();
}

// Sprites olhando pra direita, pés em y=14.
//   size → lado da imagem    foot → onde ficam os pés, em fração da imagem
//   dx   → acerto horizontal pros pés das poses ficarem no mesmo lugar
// (medidos em cada PNG; as poses do mesmo personagem têm que ficar do mesmo
// tamanho — a do golem atacando é maior porque os punhos erguidos "encolhem" a imagem)
const SPRITE_META = {
  hacker: { size: 62, foot: 0.477 },
  pinguim: { size: 62, foot: 0.477 },
  pinguim_open: { size: 62, foot: 0.477 },
  firewall: { size: 64, foot: 0.473 },
  firewall_attack: { size: 75, foot: 0.434, dx: -1.7 },
};
// Pose usada logo depois de atacar (sem ela, o personagem dá um bote pra frente)
const ATTACK_POSE = { pinguim: 'pinguim_open', firewall: 'firewall_attack' };

function drawSpriteCharacter(ctx, type, a, t) {
  const pose = ATTACK_POSE[type];
  const posing = pose && a > 0.2 && hasImage(pose);
  const name = posing ? pose : type;
  const { size, foot, dx = 0 } = SPRITE_META[name] ?? { size: 62, foot: 0.477 };
  ctx.save();
  ctx.translate(posing ? 0 : a * 4, 14);
  if (!pose) ctx.scale(1 + a * 0.08, 1 - a * 0.06);
  drawImage(ctx, name, size, dx, -size * foot);
  ctx.restore();
  // pinguim congelando: brilhinhos dos lados
  if (posing && type === 'pinguim') {
    for (const sx of [-26, 26]) sparkle(ctx, sx, -24 + Math.sin(t * 9) * 2, 4.5);
  }
}

const OWN_SHADOW = new Set(['pescador', 'honeypot']);

const CHARACTERS = {
  // Hacker anônimo de moletom (o "dart monkey")
  hacker(ctx, s, t, a) {
    const hood = '#2c3042';
    const light = '#454b64';
    const glove = '#f0a35e';
    legs(ctx, '#1c2030', '#3a3f52');
    limb(ctx, -9, -8, -14, 1, 7, hood);
    hand(ctx, -14.5, 2.5, glove);
    torso(ctx, hood);
    rrect(ctx, -7, -2, 14, 6, 3);
    ctx.fillStyle = light;
    ctx.fill();
    const throwing = a > 0.35;
    const hx = throwing ? 22 : 13;
    const hy = throwing ? -12 : 2;
    limb(ctx, 9, -8, hx, hy, 7, hood);
    if (!throwing) dart(ctx, hx + 3, hy - 4, -0.7);
    hand(ctx, hx, hy, glove);
    // capuz
    circle(ctx, 0, -27, 16.5);
    fillOutline(ctx, hood);
    gloss(ctx, -8, -36, 4, 2.2);
    ellipse(ctx, 4, -25.5, 11, 12.5);
    ctx.fillStyle = '#141726';
    ctx.fill();
    // máscara
    ellipse(ctx, 4.5, -25, 9.3, 11.3);
    fillOutline(ctx, '#f6f1e6', 2);
    ctx.fillStyle = OUTLINE;
    ellipse(ctx, 1, -28, 2.5, 1.2);
    ctx.fill();
    ellipse(ctx, 8.5, -28, 2.5, 1.2);
    ctx.fill();
    blush(ctx, 0, -23.5, 9.5);
    ctx.strokeStyle = OUTLINE;
    ctx.lineCap = 'round';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-1.5, -31.5);
    ctx.quadraticCurveTo(1, -33.2, 3.5, -31);
    ctx.moveTo(6, -31);
    ctx.quadraticCurveTo(8.5, -33.2, 11, -31.5);
    ctx.stroke();
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-0.5, -21.3);
    ctx.quadraticCurveTo(2, -19.4, 4.75, -21);
    ctx.quadraticCurveTo(7.5, -19.4, 10, -21.3);
    ctx.stroke();
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(1.8, -18.8);
    ctx.quadraticCurveTo(4.75, -16.9, 7.7, -18.8);
    ctx.stroke();
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(4.75, -16.4);
    ctx.lineTo(4.75, -14.2);
    ctx.stroke();
    ellipse(ctx, 4, -25.5, 11, 12.5);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = light;
    ctx.stroke();
  },

  // Golem de tijolos com fogo na cabeça
  firewall(ctx, s, t, a) {
    const up = a > 0.25 ? -12 : 0;
    rrect(ctx, -15, 7, 12, 8, 3);
    fillOutline(ctx, '#7a2b17', 2.5);
    rrect(ctx, 3, 7, 12, 8, 3);
    fillOutline(ctx, '#7a2b17', 2.5);
    rrect(ctx, -27, -12 + up, 10, 19, 5);
    fillOutline(ctx, '#d4572c');
    rrect(ctx, 17, -12 + up, 10, 19, 5);
    fillOutline(ctx, '#d4572c');
    rrect(ctx, -18, -34, 36, 44, 9);
    fillOutline(ctx, '#7a2b17');
    ctx.save();
    rrect(ctx, -18, -34, 36, 44, 9);
    ctx.clip();
    ctx.fillStyle = '#e8652f';
    for (let r = 0; r < 5; r++) {
      const y = -34 + r * 8.8;
      for (let x = -18 + (r % 2 ? -8 : 0); x < 18; x += 16) ctx.fillRect(x + 1.6, y + 1.6, 12.8, 5.6);
    }
    ctx.restore();
    rrect(ctx, -18, -34, 36, 44, 9);
    ctx.lineWidth = 3;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
    rrect(ctx, -12, -25, 25, 19, 7);
    ctx.fillStyle = '#f6a873';
    ctx.fill();
    for (const ex of [-4, 6]) {
      circle(ctx, ex, -18, 3.8);
      fillOutline(ctx, '#ffffff', 2);
      circle(ctx, ex + 1, -17.6, 1.9);
      ctx.fillStyle = OUTLINE;
      ctx.fill();
    }
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-8.5, -23.5);
    ctx.lineTo(-1.5, -21.5);
    ctx.moveTo(10.5, -23.5);
    ctx.lineTo(3.5, -21.5);
    ctx.stroke();
    rrect(ctx, -2, -12.5, 9, 3.5, 1.7);
    ctx.fillStyle = OUTLINE;
    ctx.fill();
    [-10, 0, 10].forEach((x, i) => {
      const h = 13 + Math.sin(t * 10 + i * 2.1) * 3 + (i === 1 ? 6 : 0) + (s.pulse ?? 0) * 6;
      flame(ctx, x, -32, h, 7);
      fillOutline(ctx, '#ff8a1f', 2.5);
      flame(ctx, x, -32.5, h * 0.55, 3.8);
      ctx.fillStyle = '#ffe066';
      ctx.fill();
    });
  },

  // Pinguim de cachecol que congela tudo
  pinguim(ctx, s, t, a) {
    const raise = a > 0.2 ? 1 : 0;
    ellipse(ctx, -6, 13.5, 6, 3.2);
    fillOutline(ctx, '#ff9f1c', 2.5);
    ellipse(ctx, 7, 13.5, 6, 3.2);
    fillOutline(ctx, '#ff9f1c', 2.5);
    flipper(ctx, -12, -8, raise ? 1.7 : 0.3);
    ellipse(ctx, 0, -9, 15.5, 21.5);
    fillOutline(ctx, '#2b3a67');
    gloss(ctx, -7, -24, 4, 2.4);
    ellipse(ctx, 2.5, -2, 10, 13.5);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ellipse(ctx, 4, -20.5, 9.5, 8);
    ctx.fill();
    eyesCute(ctx, 0.5, -21.5, 7.5);
    blush(ctx, -0.5, -17, 10);
    ctx.beginPath();
    ctx.moveTo(4.5, -18);
    ctx.lineTo(13.5, -16);
    ctx.lineTo(4.5, -14);
    ctx.closePath();
    fillOutline(ctx, '#ff9f1c', 2);
    rrect(ctx, -13.5, -12.5, 28, 6, 3);
    fillOutline(ctx, '#3dd6ff', 2.5);
    rrect(ctx, -10, -8, 6, 11, 3);
    fillOutline(ctx, '#3dd6ff', 2.5);
    ctx.beginPath();
    ctx.arc(8.5, -6.5, 2.6, Math.PI, 0);
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
    rrect(ctx, 5, -6.5, 7, 6, 1.5);
    fillOutline(ctx, GOLD, 1.5);
    flipper(ctx, 13, -8, raise ? -1.7 : -0.3);
    if (raise) {
      for (const sx of [-26, 26]) sparkle(ctx, sx, -24 + Math.sin(t * 9) * 2, 4.5);
    }
  },

  // Robô com olho-câmera que solta laser
  scanner(ctx, s, t, a) {
    limb(ctx, -6, 2, -6, 11, 5, '#8a96aa');
    limb(ctx, 6, 2, 6, 11, 5, '#8a96aa');
    ellipse(ctx, -6.5, 13.5, 6, 3.2);
    fillOutline(ctx, '#5a6886', 2.5);
    ellipse(ctx, 7, 13.5, 6, 3.2);
    fillOutline(ctx, '#5a6886', 2.5);
    limb(ctx, -12, -6, -16, 2, 5, '#a9b6c8');
    circle(ctx, -16, 3, 3.6);
    fillOutline(ctx, '#8a96aa', 2.5);
    rrect(ctx, -13, -14, 26, 19, 6);
    fillOutline(ctx, '#c9d3e0');
    rrect(ctx, -7, -9, 14, 8, 3);
    ctx.fillStyle = '#8ea0bc';
    ctx.fill();
    circle(ctx, -3, -5, 1.8);
    ctx.fillStyle = Math.sin(t * 6) > 0 ? '#3dff9a' : '#1d5a3c';
    ctx.fill();
    circle(ctx, 3, -5, 1.8);
    ctx.fillStyle = GOLD;
    ctx.fill();
    rrect(ctx, -3, -18, 6, 5, 2);
    fillOutline(ctx, '#8a96aa', 2);
    limb(ctx, -6, -42, -9, -50, 2.5, '#8a96aa');
    circle(ctx, -9, -51, 3);
    fillOutline(ctx, Math.sin(t * 4) > 0 ? '#ff4d5e' : '#7a1a2a', 2);
    rrect(ctx, -15, -42, 30, 25, 9);
    fillOutline(ctx, '#e6ecf5');
    gloss(ctx, -8, -37, 6, 3);
    circle(ctx, 4, -29.5, 9);
    fillOutline(ctx, '#2b3346');
    circle(ctx, 4, -29.5, 6);
    ctx.fillStyle = a > 0.5 ? '#ffffff' : '#ff3b5c';
    ctx.fill();
    circle(ctx, 6, -31.5, 1.8);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    limb(ctx, 12, -6, 17, 2, 5, '#a9b6c8');
    circle(ctx, 17, 3, 3.6);
    fillOutline(ctx, '#8a96aa', 2.5);
  },

  // Engenheira de capacete com bombas lógicas
  engenheiro(ctx, s, t, a) {
    legs(ctx, '#3b5998', '#6b4423');
    limb(ctx, -9, -8, -14, 1, 7, '#3b6fd6');
    hand(ctx, -14.5, 2.5);
    torso(ctx, '#3b6fd6');
    ctx.fillStyle = '#ff8a1f';
    rrect(ctx, -12, -13, 8.5, 20, 4);
    ctx.fill();
    rrect(ctx, 3.5, -13, 8.5, 20, 4);
    ctx.fill();
    ctx.fillStyle = '#fff3a0';
    ctx.fillRect(-12, -4, 8.5, 3);
    ctx.fillRect(3.5, -4, 8.5, 3);
    rrect(ctx, -12, -13, 24, 20, 8);
    ctx.lineWidth = 3;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
    const throwing = a > 0.35;
    const hx = throwing ? 22 : 13;
    const hy = throwing ? -13 : 1;
    limb(ctx, 9, -8, hx, hy, 7, '#3b6fd6');
    if (!throwing) bomb(ctx, hx + 2, hy - 6, t);
    hand(ctx, hx, hy);
    circle(ctx, 2, -25, 12.5);
    fillOutline(ctx, SKIN);
    eyesCute(ctx, 1, -24.5, 7.5);
    blush(ctx, -0.5, -20, 10);
    ctx.beginPath();
    ctx.arc(5, -19.5, 3, 0.2, Math.PI - 0.2);
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
    // capacete
    ctx.beginPath();
    ctx.arc(2, -28, 13.8, Math.PI, 0);
    ctx.closePath();
    fillOutline(ctx, GOLD);
    rrect(ctx, -12.5, -30, 32, 4.8, 2.4);
    fillOutline(ctx, '#ffc107', 2.5);
    rrect(ctx, 0, -41, 4, 11, 2);
    ctx.fillStyle = '#ffe27a';
    ctx.fill();
  },

  // Roteador com perninhas e 3 antenas
  roteador(ctx, s, t, a) {
    const glow = Math.max(s.pulse ?? 0, a);
    rrect(ctx, -13, 5, 8, 9, 3);
    fillOutline(ctx, '#5a6886', 2.5);
    rrect(ctx, 5, 5, 8, 9, 3);
    fillOutline(ctx, '#5a6886', 2.5);
    [-11, 0, 11].forEach((x, i) => {
      const tilt = (i - 1) * 0.3 + Math.sin(t * 2 + i) * 0.06;
      const tx = x + Math.sin(tilt) * 18;
      const ty = -13 - Math.cos(tilt) * 18;
      limb(ctx, x, -12, tx, ty, 3.5, '#4d5670');
      circle(ctx, tx, ty, 3.8);
      fillOutline(ctx, glow > 0.2 ? '#7df9ff' : '#ff4d5e', 2);
    });
    rrect(ctx, -20, -16, 40, 24, 9);
    fillOutline(ctx, '#eef2f8');
    gloss(ctx, -11, -11, 6, 2.5, 0);
    rrect(ctx, -12, -11, 24, 11, 4);
    ctx.fillStyle = '#1e2740';
    ctx.fill();
    const blink = Math.sin(t * 1.7) > 0.96;
    for (const ex of [-7, 3]) {
      rrect(ctx, ex, blink ? -6 : -9, 4, blink ? 1.5 : 6, 1);
      ctx.fillStyle = '#7df9ff';
      ctx.fill();
    }
    for (let i = 0; i < 4; i++) {
      circle(ctx, -11 + i * 7.3, 3.5, 1.8);
      ctx.fillStyle = Math.sin(t * 8 + i) > 0 ? '#3dff9a' : '#1d5a3c';
      ctx.fill();
    }
    if (glow > 0) {
      ctx.globalAlpha = glow;
      ctx.strokeStyle = '#7df9ff';
      ctx.lineWidth = 2.5;
      for (const r of [8, 14]) {
        ctx.beginPath();
        ctx.arc(0, -36, r, Math.PI * 1.2, Math.PI * 1.8);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  },

  // Sysadmin de óculos, headset e café
  sysadmin(ctx, s, t) {
    legs(ctx, '#7a6a52', '#e9eef5');
    limb(ctx, -9, -8, -14, 1, 7, '#3fae6a');
    hand(ctx, -14.5, 2.5);
    torso(ctx, '#3fae6a');
    setFont(ctx, 8);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e9fff2';
    ctx.fillText('</>', 0, -3);
    const k = clamp((Math.sin(t * 1.3) - 0.7) * 4, 0, 1); // gole de café
    const hx = 13 - k * 5;
    const hy = 1 - k * 18;
    limb(ctx, 9, -8, hx, hy, 7, '#3fae6a');
    // caneca
    ctx.save();
    ctx.translate(hx + 4, hy - 3);
    ctx.beginPath();
    ctx.arc(4.5, 0, 3.2, -Math.PI / 2, Math.PI / 2);
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
    rrect(ctx, -4.5, -5, 9, 10, 2);
    fillOutline(ctx, '#ff5a5a', 2);
    if (k < 0.1) {
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = 1.6;
      for (const dx of [-1.5, 2]) {
        const w = Math.sin(t * 4 + dx) * 1.5;
        ctx.beginPath();
        ctx.moveTo(dx, -7);
        ctx.quadraticCurveTo(dx + 2 + w, -10, dx + w, -13);
        ctx.stroke();
      }
    }
    ctx.restore();
    hand(ctx, hx, hy);
    circle(ctx, 2, -25, 12.5);
    fillOutline(ctx, SKIN);
    // cabelo bagunçado
    ctx.beginPath();
    ctx.moveTo(-10.5, -27);
    ctx.lineTo(-11, -34);
    ctx.lineTo(-6, -33);
    ctx.lineTo(-4, -40);
    ctx.lineTo(1, -35);
    ctx.lineTo(5, -41);
    ctx.lineTo(8, -35);
    ctx.lineTo(13.5, -37);
    ctx.lineTo(13.5, -29);
    ctx.quadraticCurveTo(2, -33, -10.5, -27);
    ctx.closePath();
    fillOutline(ctx, '#6b4423', 2.5);
    // barba
    ctx.beginPath();
    ctx.moveTo(-9, -23);
    ctx.quadraticCurveTo(-6, -11, 3, -11.5);
    ctx.quadraticCurveTo(12, -11, 14, -23);
    ctx.quadraticCurveTo(3, -17, -9, -23);
    fillOutline(ctx, '#6b4423', 2);
    // óculos
    for (const ex of [-0.5, 8.5]) {
      circle(ctx, ex, -25.5, 4.3);
      ctx.fillStyle = 'rgba(210,240,255,0.55)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = OUTLINE;
      ctx.stroke();
      circle(ctx, ex + 0.8, -25.5, 1.4);
      ctx.fillStyle = OUTLINE;
      ctx.fill();
    }
    ctx.beginPath();
    ctx.moveTo(3.8, -25.5);
    ctx.lineTo(4.2, -25.5);
    ctx.stroke();
    // headset
    ctx.beginPath();
    ctx.arc(2, -26, 14.5, Math.PI * 1.08, Math.PI * 1.9);
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#3a3f52';
    ctx.stroke();
    rrect(ctx, -14.5, -30, 6, 10, 3);
    fillOutline(ctx, '#3a3f52', 2);
    limb(ctx, -11, -21, -3, -16, 1.8, '#3a3f52');
  },

  // Minerador barbudo de picareta
  minerador(ctx, s, t, a) {
    legs(ctx, '#2f5fb3', '#5a3a1e');
    limb(ctx, -9, -8, -14, 1, 7, '#e8434f');
    hand(ctx, -14.5, 2.5);
    torso(ctx, '#e8434f');
    rrect(ctx, -8, -8, 16, 15, 4);
    fillOutline(ctx, '#2f5fb3', 2.5);
    circle(ctx, -4.5, -5, 1.6);
    ctx.fillStyle = GOLD;
    ctx.fill();
    circle(ctx, 4.5, -5, 1.6);
    ctx.fill();
    // picareta (bate quando minera uma moeda)
    const swing = a > 0 ? Math.sin(a * Math.PI) * 1.4 : Math.sin(t * 2) * 0.08;
    ctx.save();
    ctx.translate(12, -3);
    ctx.rotate(-0.5 + swing);
    limb(ctx, 0, 6, 0, -21, 3.5, '#a0682f');
    ctx.beginPath();
    ctx.moveTo(-12, -16);
    ctx.quadraticCurveTo(0, -27, 12, -16);
    ctx.lineTo(10, -14);
    ctx.quadraticCurveTo(0, -21, -10, -14);
    ctx.closePath();
    fillOutline(ctx, '#c9d3e0', 2);
    ctx.restore();
    limb(ctx, 9, -8, 12, -3, 7, '#e8434f');
    hand(ctx, 12, -3);
    circle(ctx, 2, -25, 12.5);
    fillOutline(ctx, SKIN);
    eyesCute(ctx, 1, -26, 7.5);
    ctx.beginPath();
    ctx.moveTo(-9, -22);
    ctx.quadraticCurveTo(-7, -8, 3.5, -8.5);
    ctx.quadraticCurveTo(14, -8, 14.5, -22);
    ctx.quadraticCurveTo(10, -18, 3.5, -20);
    ctx.quadraticCurveTo(-3, -18, -9, -22);
    fillOutline(ctx, '#ff8a3d', 2);
    circle(ctx, 4.5, -21, 2.6);
    fillOutline(ctx, '#f0a07a', 1.6);
    ctx.beginPath();
    ctx.arc(2, -29, 13.8, Math.PI, 0);
    ctx.closePath();
    fillOutline(ctx, GOLD);
    rrect(ctx, -12.5, -31, 30, 4.5, 2.2);
    fillOutline(ctx, '#ffc107', 2.5);
    circle(ctx, 3, -37, 4.2);
    fillOutline(ctx, '#fff7c2', 2);
  },

  // Pescador num barquinho (só na água)
  pescador(ctx, s, t, a) {
    ellipse(ctx, 0, 13, 30, 6.5);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.stroke();
    ctx.save();
    ctx.translate(0, Math.sin(t * 2) * 1.5);
    limb(ctx, -8, -8, -13, -1, 6, '#ffcf3a');
    rrect(ctx, -10, -14, 20, 18, 7);
    fillOutline(ctx, '#ffcf3a');
    circle(ctx, 1, -24, 11.5);
    fillOutline(ctx, SKIN);
    eyesCute(ctx, 0, -24, 7);
    blush(ctx, -1, -19.5, 9.5);
    ctx.beginPath();
    ctx.arc(4, -19, 2.6, 0.2, Math.PI - 0.2);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
    ellipse(ctx, 1, -30, 15, 4.2);
    fillOutline(ctx, '#7d8f3a', 2.5);
    rrect(ctx, -7, -41, 16, 12, 5);
    fillOutline(ctx, '#8fa33f', 2.5);
    // vara de pescar
    const cast = a > 0.3;
    const tipX = cast ? 32 : 24;
    const tipY = cast ? -30 : -42;
    limb(ctx, 8, -5, tipX, tipY, 2.6, '#8a5a2b');
    if (!cast) {
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.quadraticCurveTo(tipX + 6, -14, tipX + 4, 5);
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.stroke();
      circle(ctx, tipX + 4, 6, 3);
      fillOutline(ctx, '#ff4d5e', 1.5);
    }
    hand(ctx, 9, -5);
    // barco por cima (cobre as pernas)
    ctx.beginPath();
    ctx.moveTo(-27, 0);
    ctx.lineTo(27, 0);
    ctx.quadraticCurveTo(23, 15, 0, 15);
    ctx.quadraticCurveTo(-23, 15, -27, 0);
    ctx.closePath();
    fillOutline(ctx, '#b06a32');
    ctx.strokeStyle = '#8a4f22';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-20, 7);
    ctx.lineTo(20, 7);
    ctx.stroke();
    rrect(ctx, -28, -3, 56, 6, 3);
    fillOutline(ctx, '#8a4f22', 2.5);
    ctx.restore();
  },

  // Pote de mel com uma abelhinha rondando
  honeypot(ctx, s, t) {
    shadow(ctx, 2, 15, 18, 6);
    ctx.save();
    const k = 1 + (s.pulse ?? 0) * 0.15;
    ctx.scale(k, k);
    ctx.beginPath();
    ctx.moveTo(-11, -8);
    ctx.bezierCurveTo(-23, -3, -21, 16, -8, 17);
    ctx.lineTo(8, 17);
    ctx.bezierCurveTo(21, 16, 23, -3, 11, -8);
    ctx.closePath();
    fillOutline(ctx, '#f5a524');
    gloss(ctx, 9, 3, 3, 7, 0.2);
    rrect(ctx, -8, 2, 16, 10, 3);
    ctx.fillStyle = '#fff3c4';
    ctx.fill();
    ctx.fillStyle = '#ffcf4a';
    rrect(ctx, -11, -9, 5.5, 11, 2.75);
    ctx.fill();
    circle(ctx, -8.2, 2.5, 3.3);
    ctx.fill();
    rrect(ctx, -14, -16, 28, 9, 3.5);
    fillOutline(ctx, '#b8621b');
    ctx.restore();
    const bx = Math.cos(t * 2.5) * 19;
    const by = -24 + Math.sin(t * 5) * 4;
    ctx.globalAlpha = 0.7;
    ellipse(ctx, bx - 1, by - 4, 3.5, 2.5, -0.5);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.globalAlpha = 1;
    ellipse(ctx, bx, by, 4.5, 3.5);
    fillOutline(ctx, GOLD, 1.5);
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(bx - 1, by - 3.2, 1.6, 6.4);
  },
};

// ── peças reaproveitadas ───────────────────────────────────

function legs(ctx, pants, shoes) {
  limb(ctx, -5, 3, -5, 10.5, 7, pants);
  limb(ctx, 5, 3, 5, 10.5, 7, pants);
  ellipse(ctx, -6, 13.5, 5.5, 3.4);
  fillOutline(ctx, shoes, 2.5);
  ellipse(ctx, 7, 13.5, 5.5, 3.4);
  fillOutline(ctx, shoes, 2.5);
}

function torso(ctx, color) {
  rrect(ctx, -12, -13, 24, 20, 8);
  fillOutline(ctx, color);
}

function hand(ctx, x, y, color = SKIN) {
  circle(ctx, x, y, 4);
  fillOutline(ctx, color, 2.5);
}

function eyesCute(ctx, x, y, gap) {
  for (const dx of [0, gap]) {
    ellipse(ctx, x + dx, y, 2.2, 3.4);
    ctx.fillStyle = OUTLINE;
    ctx.fill();
    circle(ctx, x + dx + 0.7, y - 1.3, 0.9);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }
}

function blush(ctx, x, y, gap) {
  ctx.fillStyle = 'rgba(255,110,130,0.5)';
  ellipse(ctx, x, y, 2.6, 1.6);
  ctx.fill();
  ellipse(ctx, x + gap, y, 2.6, 1.6);
  ctx.fill();
}

function flipper(ctx, x, y, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ellipse(ctx, 0, 8, 4.5, 10);
  fillOutline(ctx, '#2b3a67');
  ctx.restore();
}

function dart(ctx, x, y, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  rrect(ctx, -7, -1.6, 12, 3.2, 1.6);
  fillOutline(ctx, '#c9d3e0', 1.5);
  ctx.beginPath();
  ctx.moveTo(5, -2.5);
  ctx.lineTo(9, 0);
  ctx.lineTo(5, 2.5);
  ctx.closePath();
  fillOutline(ctx, '#8a96aa', 1.5);
  ctx.beginPath();
  ctx.moveTo(-7, 0);
  ctx.lineTo(-11, -4);
  ctx.lineTo(-11, 4);
  ctx.closePath();
  fillOutline(ctx, '#ff4d5e', 1.5);
  ctx.restore();
}

export function bomb(ctx, x, y, t) {
  circle(ctx, x, y, 6.5);
  fillOutline(ctx, '#2b2f3a', 2.5);
  gloss(ctx, x - 2.5, y - 2.5, 2, 1.2);
  ctx.beginPath();
  ctx.moveTo(x + 3, y - 5);
  ctx.quadraticCurveTo(x + 5, y - 9, x + 7.5, y - 9);
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#c9a26b';
  ctx.stroke();
  sparkle(ctx, x + 8, y - 9.5, 3 + Math.sin(t * 30) * 1.2, Math.sin(t * 30) > 0 ? GOLD : '#ff8a1f');
}

function flame(ctx, x, y, h, w) {
  ctx.beginPath();
  ctx.moveTo(x, y - h);
  ctx.bezierCurveTo(x + w * 0.7, y - h * 0.45, x + w * 1.1, y - h * 0.05, x + w * 0.75, y + w * 0.45);
  ctx.quadraticCurveTo(x, y + w * 1.05, x - w * 0.75, y + w * 0.45);
  ctx.bezierCurveTo(x - w * 1.1, y - h * 0.05, x - w * 0.7, y - h * 0.45, x, y - h);
  ctx.closePath();
}

export function sparkle(ctx, x, y, r, color = '#ffffff') {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fillStyle = color;
  ctx.fill();
}

// Estrelinhas douradas embaixo da defesa: uma por upgrade comprado
export function drawPips(ctx, level, r) {
  for (let i = 0; i < level; i++) {
    const x = (i - (level - 1) / 2) * 15;
    if (drawImage(ctx, 'icon_star', 7 * 2.4, x, r + 10)) continue;
    star(ctx, x, r + 10, 7);
    fillOutline(ctx, GOLD, 2);
  }
}

export function star(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.48 : r;
    const a = (i / 10) * TAU - Math.PI / 2;
    if (i === 0) ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    else ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}
