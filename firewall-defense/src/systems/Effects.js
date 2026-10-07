import { text } from '../render/canvas.js';

const MAX_PARTICLES = 500;

// Partículas "pixeladas" (combina com o tema digital), ondas de explosão
// e textos flutuantes (+25, BACKUP!, etc).
export class Effects {
  constructor() {
    this.particles = [];
    this.rings = [];
    this.texts = [];
  }

  burst(x, y, color, count = 12, speed = 140, life = 0.5, size = 4) {
    for (let i = 0; i < count && this.particles.length < MAX_PARTICLES; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.6);
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 40,
        life,
        max: life,
        size: size * (0.6 + Math.random() * 0.6),
        color,
      });
    }
  }

  explosion(x, y, color) {
    this.rings.push({ x, y, max: 95, life: 0.45, maxLife: 0.45, color });
    this.burst(x, y, color, 40, 260, 0.8, 6);
    this.burst(x, y, '#ffffff', 12, 160, 0.4, 3);
  }

  text(x, y, str, color = '#ffffff') {
    this.texts.push({ x, y, str, color, life: 1.1, max: 1.1 });
  }

  update(dt) {
    for (const p of this.particles) {
      p.life -= dt;
      p.vy += 300 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    for (const r of this.rings) r.life -= dt;
    for (const t of this.texts) {
      t.life -= dt;
      t.y -= 30 * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    this.rings = this.rings.filter((r) => r.life > 0);
    this.texts = this.texts.filter((t) => t.life > 0);
  }

  draw(ctx) {
    for (const r of this.rings) {
      const k = 1 - r.life / r.maxLife;
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 6 * (1 - k) + 1;
      ctx.beginPath();
      ctx.arc(r.x, r.y, 10 + (r.max - 10) * k, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    for (const t of this.texts) {
      ctx.globalAlpha = Math.min(1, t.life / (t.max * 0.4));
      text(ctx, t.str, t.x, t.y, { size: 18, color: t.color, stroke: '#04060c', strokeWidth: 4 });
    }
    ctx.globalAlpha = 1;
  }
}
