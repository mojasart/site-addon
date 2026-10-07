import { VIEW_H, INK } from '../config.js';
import { rrect, fillOutline, text, inRect } from '../render/canvas.js';
import { uiButton } from '../render/ui.js';

// Configurações básicas: som e vibração
// VISUAL PROVISÓRIO — será refeito na Etapa 4.
export class SettingsScene {
  constructor(app) {
    this.app = app;
    this.t = 0;
  }

  layout() {
    const cx = this.app.viewW / 2;
    return {
      card: { x: cx - 230, y: 70, w: 460, h: 400 },
      sound: { x: cx - 170, y: 170, w: 340, h: 70 },
      vibration: { x: cx - 170, y: 256, w: 340, h: 70 },
      back: { x: cx - 120, y: 372, w: 240, h: 64 },
    };
  }

  update(dt) {
    this.t += dt;
  }

  render(ctx) {
    const W = this.app.viewW;
    ctx.fillStyle = '#e8c08c';
    ctx.fillRect(0, 0, W, VIEW_H);
    const L = this.layout();
    rrect(ctx, L.card.x, L.card.y, L.card.w, L.card.h, 28);
    fillOutline(ctx, '#fff7ec', 4);
    text(ctx, 'CONFIGURAÇÕES', W / 2, 118, { size: 34, color: INK, stroke: null });
    const s = this.app.settings;
    uiButton(ctx, L.sound, `SOM: ${s.sound ? 'LIGADO' : 'DESLIGADO'}`, s.sound ? '#45c36b' : '#9aa6b8', { size: 24 });
    uiButton(ctx, L.vibration, `VIBRAÇÃO: ${s.vibration ? 'LIGADA' : 'DESLIGADA'}`, s.vibration ? '#45c36b' : '#9aa6b8', { size: 24 });
    uiButton(ctx, L.back, 'VOLTAR', '#5aa9ff', { size: 24 });
  }

  pointerDown(x, y) {
    const L = this.layout();
    if (inRect(L.sound, x, y)) this.app.toggleSetting('sound');
    else if (inRect(L.vibration, x, y)) this.app.toggleSetting('vibration');
    else if (inRect(L.back, x, y)) {
      this.app.sound.play('click');
      this.app.goTitle();
    }
  }

  key(k) {
    if (k === 'Escape') this.app.goTitle();
  }
}
