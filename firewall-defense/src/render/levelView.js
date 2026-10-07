import { VIEW_H } from '../config.js';
import { paintLevel } from './level.js';

// Quando a fonte termina de carregar, o cenário em cache é redesenhado
let fontEpoch = 0;
export const bumpFontEpoch = () => fontEpoch++;

// Guarda o cenário estático pintado num canvas (desenhar tudo a cada frame
// pesaria no celular). Refaz quando a largura ou a escala da tela mudam.
export class LevelView {
  constructor(level, path) {
    this.level = level;
    this.path = path;
    this.canvas = null;
    this.key = '';
  }

  draw(ctx, W, offsetX, pixelScale) {
    const key = `${W}:${pixelScale.toFixed(3)}:${fontEpoch}`;
    if (key !== this.key) {
      const c = document.createElement('canvas');
      c.width = Math.ceil(W * pixelScale);
      c.height = Math.ceil(VIEW_H * pixelScale);
      const g = c.getContext('2d');
      g.scale(pixelScale, pixelScale);
      paintLevel(g, { W, offsetX, level: this.level, path: this.path });
      this.canvas = c;
      this.key = key;
    }
    ctx.drawImage(this.canvas, 0, 0, W, VIEW_H);
  }
}
