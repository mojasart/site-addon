import { Game } from '../game.js';
import { PREVIEW, PREVIEWS } from '../data/previews.js';
import { tileCenter, tileKey, tileOf, COLS, ROWS } from '../core/grid.js';

// Cena que roda um roteiro de preview (data/previews.js) no jogo de verdade:
// um Game no modo 'preview' no mapa de testes, com as defesas do roteiro já
// colocadas, e a onda começando em PREVIEW.start. É o que
// tools/previews/record.js grava (?preview=<id>&record na URL); sem o
// &record dá pra assistir no navegador (?preview=<id>&debug&mute)
export class PreviewScene {
  constructor(app, id) {
    this.app = app;
    this.id = id;
    this.script = PREVIEWS[id];
    if (!this.script) throw new Error(`preview sem roteiro: ${id}`);
    this.game = new Game(app, 0, 'preview', { rounds: this.script.rounds, coin: this.script.coin });
    for (const [type, c, r, level] of this.script.towers) this.put(type, c, r, level);
    this.t = 0;
    this.started = false;
    this.events = [...(this.script.at ?? [])].sort((a, b) => a[0] - b[0]);
  }

  get done() {
    return this.t >= PREVIEW.length;
  }

  // Coloca a defesa no quadrado (c, r) ou no livre mais perto (a decoração
  // do mapa às vezes ocupa um) e sobe até o nível pedido
  put(type, c, r, level = 0) {
    const g = this.game;
    const spots = [];
    for (let cc = 0; cc < COLS; cc++) for (let rr = 0; rr < ROWS; rr++) spots.push([cc, rr, Math.hypot(cc - c, (rr - r) * 1.5)]);
    spots.sort((a, b) => a[2] - b[2]);
    for (const [cc, rr] of spots) {
      const { x, y } = tileCenter(cc, rr);
      if (!g.canPlace(type, x, y) || !g.place(type, x, y)) continue;
      const tw = g.towers.find((t) => tileKey(...tileOf(t.x, t.y)) === tileKey(cc, rr));
      for (let i = 0; i < level && tw?.nextUpgrade; i++) tw.upgrade();
      return;
    }
  }

  update(dt) {
    const g = this.game;
    this.t += dt;
    if (!this.started && this.t >= PREVIEW.start) {
      this.started = true;
      g.startRound();
    }
    while (this.events.length && this.events[0][0] <= this.t) this.events.shift()[1](g);
    // Adware: fecha os anúncios como o jogador tocando no X
    const after = this.script.closeAds;
    if (after != null) for (const ad of g.ads) if (ad.closing == null && (ad.t ?? 0) >= after) ad.closing = 0.18;
    g.update(dt);
  }

  render(ctx) {
    this.game.render(ctx);
  }
}
