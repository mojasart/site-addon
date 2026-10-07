import { VIEW_H, GOLD } from '../config.js';
import { MAPS } from '../data/maps.js';
import { MapView } from '../render/maps/index.js';
import { Enemy } from '../entities/Enemy.js';
import { drawEnemy } from '../render/viruses.js';
import { drawCharacter } from '../render/characters.js';
import { drawServer } from '../render/sprites.js';
import { text } from '../render/canvas.js';
import { bigButton, iconButton, inRect } from '../render/widgets.js';
import { easeOutBack, clamp, rand } from '../util.js';

const PARADE = ['v1', 'v1', 'v2', 'v3', 'v4', 'v5', 'worm', 'trojan'];

// Tela de título: mapa ao fundo com vírus desfilando, logo e "JOGAR"
export class TitleScene {
  constructor(app) {
    this.app = app;
    this.t = 0;
    this.parade = [];
    this.spawn = 0;
    this.pressed = false;
    this.resize(app.viewW);
  }

  resize(viewW) {
    this.view = new MapView(MAPS[0], viewW);
  }

  layout() {
    const W = this.app.viewW;
    return {
      play: { x: W / 2 - 150, y: 352, w: 300, h: 88 },
      music: { x: W - 144, y: VIEW_H - 76, w: 60, h: 60 },
      sfx: { x: W - 76, y: VIEW_H - 76, w: 60, h: 60 },
    };
  }

  update(dt) {
    this.t += dt;
    this.spawn -= dt;
    const path = this.view.path.routes[0];
    if (this.spawn <= 0) {
      this.spawn = rand(0.45, 1);
      const e = new Enemy(PARADE[Math.floor(Math.random() * PARADE.length)], this.view.spawnDist, path);
      e.place();
      this.parade.push(e);
    }
    for (const e of this.parade) {
      e.dist += e.def.speed * 0.55 * dt;
      e.phase += dt;
      if (e.dist >= path.length - 40) e.dead = true;
      else e.place();
    }
    this.parade = this.parade.filter((e) => !e.dead);
  }

  render(ctx) {
    const W = this.app.viewW;
    const t = this.t;
    this.view.draw(ctx, this.app.pixelScale);
    ctx.save();
    ctx.translate(this.view.offsetX, 0);
    ctx.save();
    ctx.translate(this.view.server.x, this.view.server.y);
    drawServer(ctx, t, 0);
    ctx.restore();
    for (const e of [...this.parade].sort((a, b) => a.y - b.y)) {
      ctx.save();
      ctx.translate(e.x, e.y);
      drawEnemy(ctx, e);
      ctx.restore();
    }
    ctx.restore();

    const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    grad.addColorStop(0, 'rgba(20,30,70,0.55)');
    grad.addColorStop(1, 'rgba(20,30,70,0.25)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, VIEW_H);

    // personagens
    const cast = [
      ['hacker', W * 0.13, 430, 2.5, 1],
      ['firewall', W * 0.87, 420, 2.3, -1],
      ['pinguim', W * 0.74, 470, 1.8, -1],
      ['minerador', W * 0.26, 482, 1.6, 1],
    ];
    for (const [type, x, y, s, face] of cast) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(s, s);
      const beat = Math.sin(t * 2.4 + x) > 0.8 ? 1 : 0;
      drawCharacter(ctx, type, { t: t + x, face, attack: beat, pulse: beat });
      ctx.restore();
    }

    // logo
    const k = easeOutBack(clamp(t * 1.6, 0, 1));
    ctx.save();
    ctx.translate(W / 2, 128 + Math.sin(t * 1.8) * 4);
    ctx.scale(k, k);
    ctx.rotate(Math.sin(t * 1.3) * 0.015);
    text(ctx, 'FIREWALL', 0, -34, { size: 94, color: '#5fd8ff', strokeWidth: 15 });
    text(ctx, 'DEFENSE', 0, 54, { size: 94, color: GOLD, strokeWidth: 15 });
    ctx.restore();
    text(ctx, 'Estoure os vírus antes que cheguem no servidor!', W / 2, 262, { size: 21, color: '#e3f6ff' });

    const L = this.layout();
    ctx.save();
    const p = this.pressed ? 0.95 : 1 + Math.sin(t * 4) * 0.035;
    ctx.translate(L.play.x + L.play.w / 2, L.play.y + L.play.h / 2);
    ctx.scale(p, p);
    ctx.translate(-(L.play.x + L.play.w / 2), -(L.play.y + L.play.h / 2));
    bigButton(ctx, L.play, '#3fd16b', 'JOGAR', { icon: 'play', size: 42, depth: 8 });
    ctx.restore();
    const s = this.app.save;
    iconButton(ctx, L.music, s.music ? '#8a7dff' : '#7d8fa8', 'music', s.music);
    iconButton(ctx, L.sfx, s.sfx ? '#8a7dff' : '#7d8fa8', 'sfx', s.sfx);
  }

  pointerDown(x, y) {
    const L = this.layout();
    if (inRect(L.music, x, y)) this.app.toggleMusic();
    else if (inRect(L.sfx, x, y)) this.app.toggleSfx();
    else if (inRect(L.play, x, y)) this.pressed = true;
  }

  pointerUp(x, y) {
    if (!this.pressed) return;
    this.pressed = false;
    if (inRect(this.layout().play, x, y)) {
      this.app.sound.play('click');
      this.app.goMaps();
    }
  }

  key(k) {
    if (k === 'Enter' || k === ' ') this.app.goMaps();
  }
}
