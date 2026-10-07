import { INK } from '../config.js';
import { text } from '../render/canvas.js';
import { TAU } from '../util.js';

const MAX_PARTICLES = 160;

// Efeitos visuais simples. Tudo em coordenadas do mapa, menos as moedas
// (que voam até o contador na HUD, em coordenadas de tela).
export class Effects {
  constructor() {
    this.particles = [];
    this.puffs = [];
    this.rings = [];
    this.beams = [];
    this.texts = [];
    this.coins = [];
  }

  // faísca pequena no impacto
  spark(x, y, color) {
    this.burst(x, y, color, 3, 110, 0.18, 3);
  }

  burst(x, y, color, count, speed, life, size) {
    for (let i = 0; i < count && this.particles.length < MAX_PARTICLES; i++) {
      const a = Math.random() * TAU;
      const s = speed * (0.5 + Math.random() * 0.5);
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 30, life, max: life, size: size * (0.7 + Math.random() * 0.6), color });
    }
  }

  // morte do inimigo: nuvenzinha + alguns pedaços da cor dele
  death(x, y, colors, size = 1) {
    this.puffs.push({ x, y, r: 14 * size, life: 0.35, max: 0.35 });
    colors.forEach((c) => this.burst(x, y, c, Math.round(3 * size), 150 * size, 0.4, 5 * size));
  }

  ring(x, y, radius, kind) {
    this.rings.push({ x, y, radius, kind, life: 0.32, max: 0.32 });
  }

  explosion(x, y, radius) {
    this.rings.push({ x, y, radius, kind: 'boom', life: 0.25, max: 0.25 });
    this.puffs.push({ x, y, r: radius * 0.45, life: 0.4, max: 0.4 });
    this.burst(x, y, '#ffb347', 6, 170, 0.35, 5);
  }

  beam(x1, y1, x2, y2) {
    this.beams.push({ x1, y1, x2, y2, life: 0.12, max: 0.12 });
  }

  blocked(x, y) {
    if (this.texts.length < 12) this.texts.push({ x, y, str: 'TINC!', color: '#e6ebf2', size: 13, life: 0.45, max: 0.45 });
  }

  text(x, y, str, color = '#ffffff', size = 20) {
    this.texts.push({ x, y, str, color, size, life: 1, max: 1 });
  }

  // moeda voando (coordenadas de tela) — chama onArrive ao chegar
  coin(x, y, tx, ty, onArrive) {
    this.coins.push({ x, y, tx, ty, t: 0, sx: x, sy: y, onArrive });
  }

  update(dt) {
    for (const p of this.particles) {
      p.life -= dt;
      p.vy += 320 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    for (const list of [this.puffs, this.rings, this.beams]) for (const e of list) e.life -= dt;
    for (const t of this.texts) {
      t.life -= dt;
      t.y -= 28 * dt;
    }
    for (const c of this.coins) {
      c.t = Math.min(1, c.t + dt * 1.8);
      const k = c.t * c.t;
      c.x = c.sx + (c.tx - c.sx) * k;
      c.y = c.sy + (c.ty - c.sy) * k - Math.sin(c.t * Math.PI) * 40;
      if (c.t >= 1 && !c.done) {
        c.done = true;
        c.onArrive?.();
      }
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    this.puffs = this.puffs.filter((p) => p.life > 0);
    this.rings = this.rings.filter((r) => r.life > 0);
    this.beams = this.beams.filter((b) => b.life > 0);
    this.texts = this.texts.filter((t) => t.life > 0);
    this.coins = this.coins.filter((c) => !c.done);
  }

  // Termina tudo que está pendente (ex.: ao sair da partida)
  flushCoins() {
    for (const c of this.coins) if (!c.done) c.onArrive?.();
    this.coins = [];
  }

  draw(ctx) {
    for (const r of this.rings) {
      const k = 1 - r.life / r.max;
      const rad = 12 + (r.radius - 12) * Math.sqrt(k);
      ctx.globalAlpha = (1 - k) * 0.9;
      ctx.beginPath();
      ctx.arc(r.x, r.y, rad, 0, TAU);
      ctx.fillStyle = r.kind === 'boom' ? 'rgba(255,190,90,0.35)' : 'rgba(255,140,60,0.18)';
      ctx.fill();
      ctx.lineWidth = r.kind === 'boom' ? 4 : 6;
      ctx.strokeStyle = r.kind === 'boom' ? '#ffd27a' : '#ff8a3d';
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    ctx.lineCap = 'round';
    for (const b of this.beams) {
      ctx.globalAlpha = b.life / b.max;
      ctx.strokeStyle = '#ff5b5b';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(b.x1, b.y1);
      ctx.lineTo(b.x2, b.y2);
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    for (const p of this.puffs) {
      const k = 1 - p.life / p.max;
      ctx.globalAlpha = 1 - k;
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU;
        ctx.beginPath();
        ctx.arc(p.x + Math.cos(a) * p.r * k, p.y + Math.sin(a) * p.r * k * 0.7, p.r * (0.55 - k * 0.3), 0, TAU);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size / 2, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (const t of this.texts) {
      ctx.globalAlpha = Math.min(1, t.life / (t.max * 0.4));
      text(ctx, t.str, t.x, t.y, { size: t.size, color: t.color, stroke: INK });
    }
    ctx.globalAlpha = 1;
  }
}
