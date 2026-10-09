import { OUTLINE } from '../config.js';
import { text } from '../render/canvas.js';
import { TAU, rand } from '../util.js';
import { drawImage, hasImage } from '../render/images.js';

const MAX_PARTICLES = 450;
const MAX_POPS = 60;
const POP_LIFE = 0.28; // duração do estouro (s)
const POP_PX = 96; // tamanho em que a sprite do estouro é desenhada (e escalada)
const POP_ALPHA = 0.7; // opacidade do estouro (um pouco transparente)
// cores do estouro (sorteada a cada um): a original e filtros que pintam o
// branco da sprite. Poucas, porque cada uma vira um desenho em cache
const POP_TINTS = [
  null,
  'sepia(1) saturate(5) hue-rotate(-50deg)', // rosa
  'sepia(1) saturate(5) hue-rotate(160deg)', // azul
  'sepia(1) saturate(5) hue-rotate(60deg)', // verde
  'sepia(1) saturate(4) hue-rotate(230deg)', // roxo
  'sepia(1) saturate(6) hue-rotate(5deg)', // laranja
];

const RING_COLORS = {
  fire: { fill: 'rgba(255,122,26,0.30)', stroke: '#ff9a2e' },
  frost: { fill: 'rgba(140,225,255,0.32)', stroke: '#c8f4ff' },
  ransom: { fill: 'rgba(61,255,154,0.14)', stroke: '#3dff9a' },
  boost: { fill: 'rgba(255,190,60,0.16)', stroke: '#ffcf4a' }, // Executivo / BURNOUT
};

// Efeitos visuais. Tudo em coordenadas do mapa.
export class Effects {
  constructor() {
    this.particles = [];
    this.pops = [];
    this.rings = [];
    this.beams = [];
    this.texts = [];
    this.panelTexts = []; // textos em cima do painel (coordenadas de tela, desenhados depois dele)
    this.sparks = [];
    this.confetti = [];
  }

  // "POP!" estilo Bloons: estrelinha branca + gotinhas da cor do vírus
  pop(x, y, color, r) {
    if (this.pops.length < MAX_POPS) {
      this.pops.push({
        x, y, r: r * 1.6, life: POP_LIFE, max: POP_LIFE,
        rot: Math.random() * TAU, // ângulo e giro sorteados
        spin: rand(-1.2, 1.2),
        tint: POP_TINTS[Math.floor(Math.random() * POP_TINTS.length)],
      });
    }
    const big = r > 22;
    this.burst(x, y, color, big ? 34 : 7, big ? 280 : 170, big ? 0.6 : 0.35, big ? 7 : 4.5, true);
  }

  burst(x, y, color, count = 10, speed = 140, life = 0.4, size = 4, round = false) {
    for (let i = 0; i < count && this.particles.length < MAX_PARTICLES; i++) {
      const a = Math.random() * TAU;
      const s = speed * (0.4 + Math.random() * 0.6);
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, g: 300, life, max: life, size: size * (0.7 + Math.random() * 0.6), color, round });
    }
  }

  ring(x, y, radius, kind) {
    this.rings.push({ x, y, radius, life: 0.3, max: 0.3, ...RING_COLORS[kind] });
  }

  beam(x1, y1, x2, y2) {
    this.beams.push({ x1, y1, x2, y2, life: 0.12, max: 0.12 });
  }

  blocked(x, y) {
    if (this.texts.length < 30) this.texts.push({ x, y, str: 'BLOQ!', color: '#d6deea', size: 14, life: 0.5, max: 0.5 });
  }

  text(x, y, str, color = '#ffffff', size = 22) {
    this.texts.push({ x, y, str, color, size, life: 1.1, max: 1.1 });
  }

  // Texto subindo em cima do painel da direita ("Sem dinheiro!" no card da
  // defesa): em coordenadas de tela, porque o painel é desenhado por cima do mapa
  panelText(x, y, str, color = '#ffffff', size = 16) {
    this.panelTexts.push({ x, y, str, color, size, life: 1.1, max: 1.1 });
  }

  // Brilhinho de 4 pontas (sorte da Dark Net batendo): sem texto, some rápido
  spark(x, y, color = '#ffe79a', size = 9) {
    if (this.sparks.length < 40) this.sparks.push({ x, y, color, size, life: 0.38, max: 0.38, rot: Math.random() * 0.6 });
  }

  celebrate(w, h) {
    const colors = ['#ff4d5e', '#ffd23f', '#3dff9a', '#5fb4ff', '#ff6fd0', '#ffffff'];
    for (let i = 0; i < 140; i++) {
      this.confetti.push({
        x: rand(0, w), y: rand(-h * 0.6, -10), vx: rand(-40, 40), vy: rand(80, 220),
        rot: rand(0, TAU), vr: rand(-8, 8), w: rand(6, 11), h: rand(4, 7), color: colors[i % colors.length], life: 4,
      });
    }
  }

  update(dt) {
    for (const p of this.particles) {
      p.life -= dt;
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.93;
    }
    for (const list of [this.pops, this.rings, this.beams, this.sparks]) for (const e of list) e.life -= dt;
    for (const t of [...this.texts, ...this.panelTexts]) {
      t.life -= dt;
      t.y -= 34 * dt;
    }
    for (const c of this.confetti) {
      c.life -= dt;
      c.x += c.vx * dt + Math.sin(c.rot) * 20 * dt;
      c.y += c.vy * dt;
      c.rot += c.vr * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    this.pops = this.pops.filter((p) => p.life > 0);
    this.rings = this.rings.filter((r) => r.life > 0);
    this.beams = this.beams.filter((b) => b.life > 0);
    this.sparks = this.sparks.filter((s) => s.life > 0);
    this.texts = this.texts.filter((t) => t.life > 0);
    this.panelTexts = this.panelTexts.filter((t) => t.life > 0);
    this.confetti = this.confetti.filter((c) => c.life > 0);
  }

  draw(ctx) {
    for (const r of this.rings) {
      const k = 1 - r.life / r.max;
      ctx.globalAlpha = 1 - k * 0.8;
      ctx.beginPath();
      ctx.arc(r.x, r.y, 10 + (r.radius - 10) * k, 0, TAU);
      ctx.fillStyle = r.fill;
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.strokeStyle = r.stroke;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    ctx.lineCap = 'round';
    for (const b of this.beams) {
      // laser do Robô NMAP
      ctx.globalAlpha = b.life / b.max;
      ctx.strokeStyle = '#ff3b5c';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(b.x1, b.y1);
      ctx.lineTo(b.x2, b.y2);
      ctx.stroke();
      ctx.strokeStyle = '#ffe1e6';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      if (p.round) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size / 2, 0, TAU);
        ctx.fill();
      } else ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    for (const p of this.pops) {
      const k = 1 - p.life / p.max;
      // sprite do estouro (assets/sprites/pop.png): nasce pequeno, cresce
      // rápido, gira um pouco e some no fim. Desenhada num tamanho só
      // (cache) e escalada
      if (hasImage('pop')) {
        const d = p.r * 2.3 * (0.5 + 0.65 * (1 - (1 - k) ** 3));
        ctx.save();
        ctx.globalAlpha = POP_ALPHA * (k < 0.55 ? 1 : 1 - (k - 0.55) / 0.45);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot + k * p.spin);
        ctx.scale(d / POP_PX, d / POP_PX);
        drawImage(ctx, 'pop', POP_PX, 0, 0, p.tint);
        ctx.restore();
        continue;
      }
      const r = p.r * (0.7 + k * 0.5);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.beginPath();
      for (let i = 0; i < 16; i++) {
        const rr = i % 2 ? r * 0.55 : r;
        const a = (i / 16) * TAU;
        if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
        else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = OUTLINE;
      ctx.stroke();
      ctx.restore();
    }

    for (const s of this.sparks) {
      const k = 1 - s.life / s.max; // 0 → 1
      const r = s.size * (0.5 + Math.sin(k * Math.PI) * 0.7);
      ctx.save();
      ctx.globalAlpha = 1 - k * k;
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot + k * 0.8);
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const rr = i % 2 ? r * 0.28 : r;
        const a = (i / 8) * TAU;
        if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
        else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fillStyle = s.color;
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    for (const t of this.texts) {
      ctx.globalAlpha = Math.min(1, t.life / (t.max * 0.4));
      text(ctx, t.str, t.x, t.y, { size: t.size, color: t.color });
    }
    ctx.globalAlpha = 1;
  }

  // Confete é desenhado em coordenadas de tela, por cima de tudo
  drawPanelTexts(ctx) {
    for (const t of this.panelTexts) {
      ctx.globalAlpha = Math.min(1, t.life / (t.max * 0.4));
      text(ctx, t.str, t.x, t.y, { size: t.size, color: t.color });
    }
    ctx.globalAlpha = 1;
  }

  drawConfetti(ctx) {
    for (const c of this.confetti) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot);
      ctx.fillStyle = c.color;
      ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
      ctx.restore();
    }
  }
}
