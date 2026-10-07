import { VIEW_H, LEVEL_W } from '../config.js';
import { LEVEL } from '../data/level.js';
import { Path } from '../core/Path.js';
import { LevelView } from '../render/levelView.js';
import { drawBase } from '../render/level.js';
import { text, inRect } from '../render/canvas.js';
import { uiButton } from '../render/ui.js';
import { easeOutBack, clamp } from '../util.js';

// Tela inicial: FIREWALL DEFENSE + [JOGAR] + [CONFIGURAÇÕES]
// VISUAL PROVISÓRIO — será refeito na Etapa 4.
export class TitleScene {
  constructor(app) {
    this.app = app;
    this.t = 0;
    this.pressed = null;
    this.levelView = new LevelView(LEVEL, new Path(LEVEL.path, LEVEL.pathWidth));
  }

  layout() {
    const cx = this.app.viewW / 2;
    return {
      play: { x: cx - 150, y: 300, w: 300, h: 82 },
      settings: { x: cx - 150, y: 398, w: 300, h: 62 },
    };
  }

  update(dt) {
    this.t += dt;
  }

  render(ctx) {
    const W = this.app.viewW;
    const ox = (W - LEVEL_W) / 2;
    this.levelView.draw(ctx, W, ox, this.app.pixelScale);
    ctx.save();
    ctx.translate(ox + LEVEL.base.x, LEVEL.base.y);
    drawBase(ctx, this.t, 0);
    ctx.restore();
    ctx.fillStyle = 'rgba(36,28,52,0.45)';
    ctx.fillRect(0, 0, W, VIEW_H);

    const k = easeOutBack(clamp(this.t * 1.8, 0, 1));
    ctx.save();
    ctx.translate(W / 2, 150);
    ctx.scale(k, k);
    text(ctx, 'FIREWALL', 0, -36, { size: 80, color: '#ffffff', strokeWidth: 12 });
    text(ctx, 'DEFENSE', 0, 40, { size: 80, color: '#ffc83d', strokeWidth: 12 });
    ctx.restore();

    const L = this.layout();
    uiButton(ctx, L.play, 'JOGAR', '#45c36b', { size: 40, pressed: this.pressed === 'play' });
    uiButton(ctx, L.settings, 'CONFIGURAÇÕES', '#5aa9ff', { size: 26, pressed: this.pressed === 'settings' });
  }

  pointerDown(x, y) {
    const L = this.layout();
    this.pressed = inRect(L.play, x, y) ? 'play' : inRect(L.settings, x, y) ? 'settings' : null;
  }

  pointerUp(x, y) {
    const p = this.pressed;
    this.pressed = null;
    const L = this.layout();
    if (p === 'play' && inRect(L.play, x, y)) {
      this.app.sound.play('click');
      this.app.startGame();
    } else if (p === 'settings' && inRect(L.settings, x, y)) {
      this.app.sound.play('click');
      this.app.goSettings();
    }
  }

  key(k) {
    if (k === 'Enter' || k === ' ') this.app.startGame();
  }
}
