import { VIEW_H } from '../config.js';
import { rrect, fillOutline, text } from '../render/canvas.js';
import { iconButton, inRect } from '../render/widgets.js';
import { ICONS } from '../render/sprites.js';

/* ════════════════════════════════════════════════════════════
 *  DARK NET
 *  Onde os cafés vão comprar upgrades (árvore ainda em construção).
 *  Por enquanto: chuva de código roxa, a cebola, o saldo de cafés e um
 *  terminal avisando que a árvore está chegando.
 *  Libera com DARKNET_STARS estrelas (data/darknet.js).
 * ════════════════════════════════════════════════════════════ */

const MONO = '"Courier New", ui-monospace, Menlo, Consolas, monospace';
const PURPLE = '#b77bff';
const GREEN = '#3dff9a';
const CHARS = '01₿#$%<>/{}';
const COLS = 64;

export class DarkNetScene {
  constructor(app) {
    this.app = app;
    this.t = 0;
    // cada coluna da chuva tem sua velocidade e seu ponto de partida
    this.rain = Array.from({ length: COLS }, (_, i) => ({ speed: 60 + ((i * 37) % 90), start: (i * 131) % 700 }));
  }

  layout() {
    return { back: { x: 18, y: 16, w: 56, h: 56 } };
  }

  update(dt) {
    this.t += dt;
  }

  render(ctx) {
    const W = this.app.viewW;
    const t = this.t;
    ctx.fillStyle = '#07020f';
    ctx.fillRect(0, 0, W, VIEW_H);
    this.drawRain(ctx, W, t);
    const vig = ctx.createRadialGradient(W / 2, VIEW_H / 2, 120, W / 2, VIEW_H / 2, W * 0.65);
    vig.addColorStop(0, 'rgba(7,2,15,0)');
    vig.addColorStop(1, 'rgba(7,2,15,0.9)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, VIEW_H);

    // cebola flutuando, com brilho roxo
    ctx.save();
    ctx.translate(W / 2, 120 + Math.sin(t * 1.8) * 6);
    ctx.shadowColor = 'rgba(183,123,255,0.8)';
    ctx.shadowBlur = 30 * this.app.pixelScale;
    ICONS.darknet(ctx, 30);
    ctx.restore();

    text(ctx, 'DARK NET', W / 2, 228, { size: 64, color: PURPLE, strokeWidth: 12 });

    // saldo de cafés
    const pill = { x: W / 2 - 95, y: 266, w: 190, h: 46 };
    rrect(ctx, pill.x, pill.y, pill.w, pill.h, 23);
    fillOutline(ctx, '#5a3a1e', 4);
    ctx.save();
    ctx.translate(pill.x + 30, pill.y + pill.h / 2 - 1);
    ICONS.coffee(ctx, 11);
    ctx.restore();
    const n = this.app.coffee;
    text(ctx, `${n} ${n === 1 ? 'CAFÉ' : 'CAFÉS'}`, pill.x + 56, pill.y + pill.h / 2 + 1, { size: 24, color: '#ffe0b0', align: 'left' });

    // terminal
    const term = { x: W / 2 - 260, y: 334, w: 520, h: 130 };
    rrect(ctx, term.x, term.y, term.w, term.h, 8);
    ctx.fillStyle = 'rgba(14,4,28,0.92)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#6a3fb0';
    ctx.stroke();
    const lines = [
      ['> conectando via 7 proxies ......... OK', GREEN],
      ['> árvore de upgrades: EM CONSTRUÇÃO', '#ffc62e'],
      ['> volte em breve pra gastar seus cafés', PURPLE],
    ];
    ctx.font = `bold 17px ${MONO}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    lines.forEach(([str, color], i) => {
      ctx.fillStyle = color;
      ctx.fillText(str, term.x + 22, term.y + 30 + i * 34);
    });
    if (Math.floor(t * 2) % 2 === 0) {
      const w = ctx.measureText(lines[2][0]).width;
      ctx.fillStyle = PURPLE;
      ctx.fillRect(term.x + 28 + w, term.y + 30 + 2 * 34 - 9, 10, 18);
    }

    iconButton(ctx, this.layout().back, '#5fb4ff', 'back');
  }

  // Chuva de código roxa caindo devagar ao fundo
  drawRain(ctx, W, t) {
    ctx.font = `15px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const step = W / COLS;
    this.rain.forEach((c, i) => {
      const head = ((c.start + t * c.speed) % (VIEW_H + 240)) - 120;
      for (let k = 0; k < 8; k++) {
        const y = head - k * 17;
        if (y < -10 || y > VIEW_H + 10) continue;
        ctx.globalAlpha = (1 - k / 8) * 0.45;
        ctx.fillStyle = k === 0 ? '#e6d0ff' : '#7b3fe0';
        ctx.fillText(CHARS[(i * 7 + k * 3 + Math.floor(t * 4)) % CHARS.length], i * step + step / 2, y);
      }
    });
    ctx.globalAlpha = 1;
  }

  pointerDown(x, y) {
    if (inRect(this.layout().back, x, y)) {
      this.app.sound.play('click');
      this.app.goMaps();
    }
  }

  key(k) {
    if (k === 'Escape') this.app.goMaps();
  }
}
