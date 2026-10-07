import { VIEW_H, OUTLINE } from '../config.js';
import { MAPS } from '../data/maps.js';
import { ENEMIES } from '../data/enemies.js';
import { renderThumb } from '../render/maps/index.js';
import { rrect, fillOutline, text } from '../render/canvas.js';
import { iconButton, inRect, stars, ribbon } from '../render/widgets.js';
import { drawVirusIcon } from '../render/viruses.js';
import { drawHeart, drawCoin, ICONS } from '../render/sprites.js';
import { wrapText } from '../render/ui.js';

const DIFF_COLOR = { 'FÁCIL': '#3fd16b', 'MÉDIO': '#ff9a2e', 'DIFÍCIL': '#ff5a6a' };

// Seleção de mapas: cards com miniatura, dificuldade, estrelas e cadeado
export class LevelSelectScene {
  constructor(app) {
    this.app = app;
    this.t = 0;
    this.thumbs = {};
    this.thumbKey = '';
    this.pressed = -1;
    this.wiggle = { i: -1, t: 0 };
  }

  layout() {
    const W = this.app.viewW;
    const n = MAPS.length;
    const gap = 26;
    const cw = Math.min(290, (W - 80 - gap * (n - 1)) / n);
    const x0 = (W - (n * cw + (n - 1) * gap)) / 2;
    return {
      back: { x: 18, y: 16, w: 56, h: 56 },
      cards: MAPS.map((_, i) => ({ x: x0 + i * (cw + gap), y: 100, w: cw, h: 400 })),
    };
  }

  thumb(i, w, h) {
    const key = `${w}x${h}@${this.app.pixelScale}`;
    if (key !== this.thumbKey) {
      this.thumbs = {};
      this.thumbKey = key;
    }
    this.thumbs[i] ??= renderThumb(MAPS[i], w, h, this.app.pixelScale);
    return this.thumbs[i];
  }

  update(dt) {
    this.t += dt;
    this.wiggle.t = Math.max(0, this.wiggle.t - dt);
  }

  render(ctx) {
    const W = this.app.viewW;
    const t = this.t;
    const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    grad.addColorStop(0, '#4468b8');
    grad.addColorStop(1, '#1f2b52');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, VIEW_H);
    // listras diagonais andando
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = '#ffffff';
    const off = (t * 20) % 80;
    for (let x = -VIEW_H + off; x < W; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, VIEW_H);
      ctx.lineTo(x + 40, VIEW_H);
      ctx.lineTo(x + 40 + VIEW_H, 0);
      ctx.lineTo(x + VIEW_H, 0);
      ctx.fill();
    }
    ctx.restore();
    // vírus boiando nos cantos
    [['v2', 60, 470], ['v5', W - 60, 120], ['v3', W - 90, 470], ['v4', 110, 150]].forEach(([type, x, y], i) => {
      ctx.save();
      ctx.translate(x, y + Math.sin(t * 2 + i) * 8);
      ctx.rotate(Math.sin(t + i) * 0.2);
      drawVirusIcon(ctx, type, ENEMIES[type], 20);
      ctx.restore();
    });

    const L = this.layout();
    ribbon(ctx, W / 2, 50, 340, 'ESCOLHA O MAPA', '#ff9a2e', 30);
    iconButton(ctx, L.back, '#5fb4ff', 'back');

    L.cards.forEach((c, i) => this.drawCard(ctx, c, i));
  }

  drawCard(ctx, c, i) {
    const map = MAPS[i];
    const unlocked = this.app.isUnlocked(i);
    const got = this.app.save.stars[map.id] ?? 0;
    const cx = c.x + c.w / 2;
    ctx.save();
    let dx = 0;
    if (this.wiggle.i === i && this.wiggle.t > 0) dx = Math.sin(this.wiggle.t * 60) * 6 * this.wiggle.t * 3;
    const s = this.pressed === i ? 0.96 : 1;
    ctx.translate(cx + dx, c.y + c.h / 2 + Math.sin(this.t * 2 + i) * 2);
    ctx.scale(s, s);
    ctx.translate(-cx, -(c.y + c.h / 2));

    rrect(ctx, c.x, c.y + 8, c.w, c.h, 24);
    ctx.fillStyle = 'rgba(10,16,40,0.5)';
    ctx.fill();
    rrect(ctx, c.x, c.y, c.w, c.h, 24);
    fillOutline(ctx, '#34497f', 4);

    const tw = c.w - 20;
    const th = 176;
    ctx.save();
    rrect(ctx, c.x + 10, c.y + 10, tw, th, 16);
    ctx.clip();
    ctx.drawImage(this.thumb(i, Math.round(tw), th), c.x + 10, c.y + 10, tw, th);
    ctx.restore();
    rrect(ctx, c.x + 10, c.y + 10, tw, th, 16);
    ctx.lineWidth = 3;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();

    const chip = { x: c.x + 18, y: c.y + 18, w: 84, h: 28 };
    rrect(ctx, chip.x, chip.y, chip.w, chip.h, 14);
    fillOutline(ctx, DIFF_COLOR[map.difficulty], 3);
    text(ctx, map.difficulty, chip.x + chip.w / 2, chip.y + 15, { size: 15 });

    text(ctx, map.name, cx, c.y + 214, { size: 27 });
    wrapText(ctx, map.desc, cx, c.y + 246, c.w - 30, 14, '#d8e6ff', 2);

    // rodadas · vidas · dinheiro
    const y = c.y + 296;
    text(ctx, `${map.rounds}`, cx - 70, y, { size: 20 });
    text(ctx, 'RODADAS', cx - 70, y + 20, { size: 11, color: '#bcd0f5' });
    ctx.save();
    ctx.translate(cx - 12, y);
    drawHeart(ctx, 9);
    ctx.restore();
    text(ctx, `${map.lives}`, cx + 18, y, { size: 20 });
    ctx.save();
    ctx.translate(cx + 54, y);
    drawCoin(ctx, 9);
    ctx.restore();
    text(ctx, `${map.money}`, cx + 86, y, { size: 18 });

    stars(ctx, cx, c.y + 360, got, 18, 44);

    if (!unlocked) {
      rrect(ctx, c.x, c.y, c.w, c.h, 24);
      ctx.fillStyle = 'rgba(15,22,48,0.68)';
      ctx.fill();
      ctx.save();
      ctx.translate(cx, c.y + 88);
      ICONS.lock(ctx, 34);
      ctx.restore();
      text(ctx, 'Vença o mapa anterior', cx, c.y + 156, { size: 17, color: '#e3f6ff' });
    }
    ctx.restore();
  }

  pointerDown(x, y) {
    const L = this.layout();
    if (inRect(L.back, x, y)) {
      this.app.sound.play('click');
      this.app.goTitle();
      return;
    }
    L.cards.forEach((c, i) => {
      if (!inRect(c, x, y)) return;
      if (this.app.isUnlocked(i)) this.pressed = i;
      else {
        this.wiggle = { i, t: 0.35 };
        this.app.sound.play('error');
      }
    });
  }

  pointerUp(x, y) {
    const i = this.pressed;
    this.pressed = -1;
    if (i < 0 || !inRect(this.layout().cards[i], x, y)) return;
    this.app.sound.play('click');
    this.app.startMap(i);
  }

  key(k) {
    if (k === 'Escape') this.app.goTitle();
  }
}
