import { OUTLINE } from '../config.js';
import { text } from '../render/canvas.js';
import { TAU } from '../util.js';

const MAX_PARTICLES = 400;
const MAX_POPS = 60;

const RING_COLORS = {
  fire: { fill: 'rgba(255,122,26,0.28)', stroke: '#ff9a2e' },
  frost: { fill: 'rgba(120,220,255,0.28)', stroke: '#9fe8ff' },
};

// Efeitos visuais. Tudo em coordenadas do mapa.
export class Effects {
  constructor() {
    this.particles = [];
    this.pops = [];
    this.rings = [];
    this.beams = [];
    this.texts = [];
  }

  // "POP!" estilo Bloons: estrelinha branca + pedacinhos coloridos
  pop(x, y, color, r) {
    if (this.pops.length < MAX_POPS) this.pops.push({ x, y, r: r * 1.5, life: 0.16, max: 0.16, rot: Math.random() * TAU });
    this.burst(x, y, color, r > 30 ? 30 : 6, r > 30 ? 260 : 150, 0.35, r > 30 ? 7 : 4);
  }

  burst(x, y, color, count = 10, speed = 140, life = 0.4, size = 4) {
    for (let i = 0; i < count && this.particles.length < MAX_PARTICLES; i++) {
      const a = Math.random() * TAU;
      const s = speed * (0.4 + Math.random() * 0.6);
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, max: life, size: size * (0.7 + Math.random() * 0.6), color });
    }
  }

  ring(x, y, radius, kind) {
    this.rings.push({ x, y, radius, life: 0.3, max: 0.3, ...RING_COLORS[kind] });
  }

  beam(x1, y1, x2, y2) {
    this.beams.push({ x1, y1, x2, y2, life: 0.1, max: 0.1 });
  }

  blocked(x, y) {
    if (this.texts.length < 30) this.texts.push({ x, y, str: 'BLOQ!', color: '#cfd6e6', size: 14, life: 0.5, max: 0.5 });
  }

  text(x, y, str, color = '#ffffff', size = 22) {
    this.texts.push({ x, y, str, color, size, life: 1.1, max: 1.1 });
  }

  update(dt) {
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.92;
      p.vy *= 0.92;
    }
    for (const list of [this.pops, this.rings, this.beams]) for (const e of list) e.life -= dt;
    for (const t of this.texts) {
      t.life -= dt;
      t.y -= 34 * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    this.pops = this.pops.filter((p) => p.life > 0);
    this.rings = this.rings.filter((r) => r.life > 0);
    this.beams = this.beams.filter((b) => b.life > 0);
    this.texts = this.texts.filter((t) => t.life > 0);
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

    for (const b of this.beams) {
      ctx.globalAlpha = b.life / b.max;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#ff3b5c';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(b.x1, b.y1);
      ctx.lineTo(b.x2, b.y2);
      ctx.stroke();
      ctx.strokeStyle = '#ffe1e6';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    for (const p of this.pops) {
      const k = 1 - p.life / p.max;
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

    for (const t of this.texts) {
      ctx.globalAlpha = Math.min(1, t.life / (t.max * 0.4));
      text(ctx, t.str, t.x, t.y, { size: t.size, color: t.color });
    }
    ctx.globalAlpha = 1;
  }
}
