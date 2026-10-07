import { circle, fillOutline, shadow, rrect } from './canvas.js';
import { drawImage, hasImage } from './images.js';

/* ════════════════════════════════════════════════════════════
 *  INIMIGOS
 *
 *  drawEnemy(ctx, e, t) → origem (0,0) = ponto do caminho (os pés/base do
 *     inimigo ficam ali; o corpo desenha pra cima).
 *     e = { type, r, phase (relógio de andar), face (1/-1), angle,
 *           flash (>0 logo após levar dano), kick (1→0 tranco do dano),
 *           stun (>0 travado pelo Firewall), hp, maxHp, def.boss }
 *  DEATH_COLORS[type] → cores dos pedaços quando o inimigo é derrotado
 *
 *  Sprites em assets/sprites (personagens cartoon que andam pulando).
 *  Sem a imagem, cai na bolinha provisória.
 * ════════════════════════════════════════════════════════════ */

export const DEATH_COLORS = {
  virus: ['#e8414e', '#ffffff'],
  worm: ['#8cd03c', '#2b3f73'],
  trojan: ['#9aa6b2', '#e8414e'],
  ransomware: ['#8a3cc4', '#f7c843'],
};

// Como cada sprite é desenhada (medidas em múltiplos do raio):
//   size → lado da imagem    foot → onde ficam os pés, em fração da imagem
//   hop  → altura do pulo (0 = flutua)
const LOOK = {
  virus: { size: 2.9, foot: 0.473, hop: 0.6 },
  worm: { size: 4.4, foot: 0.34, hop: 0.35 },
  trojan: { size: 2.8, foot: 0.477, hop: 0.4 },
  ransomware: { size: 3.6, foot: 0.336, hop: 0 },
};

export function drawEnemy(ctx, e) {
  const look = LOOK[e.type];
  if (!look || !hasImage(e.type)) {
    drawPlaceholder(ctx, e);
    return;
  }
  const r = e.r;
  const size = r * look.size;
  const stunned = e.stun > 0;

  // ciclo do pulo: mais rápido pros inimigos rápidos; parado quando travado
  const rate = Math.min(3.2, Math.max(1.5, e.def.speed / 50));
  const u = stunned ? 0 : (e.phase * rate) % 1;
  const air = Math.sin(u * Math.PI); // 0 no chão, 1 no topo
  const land = Math.max(0, 1 - Math.min(u, 1 - u) / 0.15); // perto de encostar
  let lift = air * r * look.hop;
  let sx = 1 + 0.2 * land - 0.06 * air;
  let sy = 1 - 0.2 * land + 0.1 * air;
  if (look.hop === 0) {
    lift = 10 + Math.sin(e.phase * 2) * 4; // flutuando
    sx = sy = 1;
  }
  if (stunned) {
    // tonto: achatado e tremendo
    sx = 1.1;
    sy = 0.9;
  }

  // sombra no chão: diminui quando sobe
  shadow(ctx, 0, 0, r * (e.def.boss ? 1.4 : 0.9) * (1 - 0.3 * air), r * 0.32, 0.25 * (1 - 0.4 * air));

  ctx.save();
  const kick = (e.kick ?? 0) * -6 * e.face; // tranco pra trás ao levar dano
  const wobble = stunned ? Math.sin(e.phase * 40 + e.stun * 60) * 2 : 0;
  ctx.translate(kick + wobble, -lift);
  ctx.rotate(e.face * 0.12 * air); // inclina pra frente no ar
  ctx.scale(e.face * sx, sy); // escala ancorada nos pés
  const dy = -size * look.foot;
  drawImage(ctx, e.type, size, 0, dy);
  if (e.flash > 0) {
    // acerto: pisca mais claro
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.6;
    drawImage(ctx, e.type, size, 0, dy);
  }
  ctx.restore();

  if (stunned) drawStunStars(ctx, e, -lift - size * look.foot * 1.9);
  if (e.def.boss) drawBossBar(ctx, e, -lift - size * look.foot * 2 - 10);
}

function drawStunStars(ctx, e, y) {
  for (let i = 0; i < 3; i++) {
    const a = e.stun * 9 + (i * Math.PI * 2) / 3;
    star(ctx, Math.cos(a) * e.r * 0.8, y + Math.sin(a) * 4, 5);
    fillOutline(ctx, '#ffe066', 2);
  }
}

function star(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.45 : r;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

function drawBossBar(ctx, e, y) {
  const w = 70;
  rrect(ctx, -w / 2, y, w, 11, 5.5);
  fillOutline(ctx, '#2a1840', 3);
  const k = Math.max(0, e.hp / e.maxHp);
  if (k > 0) {
    rrect(ctx, -w / 2 + 2, y + 2, (w - 4) * k, 7, 3.5);
    ctx.fillStyle = '#ff4d6d';
    ctx.fill();
  }
}

const COLORS = { virus: '#e8414e', worm: '#8cd03c', trojan: '#b5773a', ransomware: '#4b5568' };

function drawPlaceholder(ctx, e) {
  shadow(ctx, 0, 2, e.r, e.r * 0.35);
  circle(ctx, 0, -e.r, e.r);
  fillOutline(ctx, e.flash > 0 ? '#ffffff' : COLORS[e.type], 3);
}
