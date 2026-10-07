import { MIN_VIEW_W, VIEW_H } from './config.js';
import { MAPS } from './data/maps.js';
import { loadSave, writeSave } from './save.js';
import { Sound } from './audio/Sound.js';
import { setPixelScale } from './render/canvas.js';
import { TitleScene } from './scenes/TitleScene.js';
import { LevelSelectScene } from './scenes/LevelSelectScene.js';
import { Game } from './game.js';

// Controla as telas (título → mapas → jogo), a transição entre elas,
// o progresso salvo e o som.
export class App {
  constructor({ debug = false } = {}) {
    this.debug = debug;
    this.save = loadSave();
    this.sound = new Sound(this.save);
    this.viewW = MIN_VIEW_W;
    this.pixelScale = 1;
    this.scene = new TitleScene(this);
    this.next = null; // próxima cena (durante o fade)
    this.fade = 1; // começa escuro e clareia
  }

  get game() {
    return this.scene instanceof Game ? this.scene : null;
  }

  resize(viewW, pixelScale) {
    this.viewW = viewW;
    this.pixelScale = pixelScale;
    setPixelScale(pixelScale);
    this.scene.resize?.(viewW);
  }

  go(makeScene) {
    if (!this.next) this.next = makeScene;
  }

  goTitle() {
    this.go(() => new TitleScene(this));
  }

  goMaps() {
    this.go(() => new LevelSelectScene(this));
  }

  startMap(i) {
    this.go(() => new Game(this, i));
  }

  isUnlocked(i) {
    return this.debug || i === 0 || (this.save.stars[MAPS[i - 1].id] ?? 0) > 0;
  }

  recordStars(mapId, n) {
    if (n > (this.save.stars[mapId] ?? 0)) {
      this.save.stars[mapId] = n;
      writeSave(this.save);
    }
  }

  toggleMusic() {
    this.sound.setMusic(!this.save.music);
    writeSave(this.save);
    this.sound.play('click');
  }

  toggleSfx() {
    this.sound.setSfx(!this.save.sfx);
    writeSave(this.save);
    this.sound.play('click');
  }

  // App foi pro fundo (ligação, troca de app...)
  hidden() {
    this.game?.pause();
    this.sound.suspend();
  }

  shown() {
    this.sound.resume();
  }

  update(dt) {
    if (this.next) {
      this.fade = Math.min(1, this.fade + dt * 5);
      if (this.fade >= 1) {
        this.scene = this.next();
        this.next = null;
      }
    } else this.fade = Math.max(0, this.fade - dt * 4);
    this.scene.update(dt);
  }

  render(ctx) {
    this.scene.render(ctx);
    if (this.fade > 0) {
      ctx.fillStyle = `rgba(15,22,48,${this.fade})`;
      ctx.fillRect(0, 0, this.viewW, VIEW_H);
    }
  }

  // ── input ──
  pointerDown(x, y, type) {
    this.sound.unlock();
    if (this.next) return;
    this.scene.pointerDown?.(x, y, type);
  }

  pointerMove(x, y, type) {
    this.scene.pointerMove?.(x, y, type);
  }

  pointerUp(x, y) {
    if (this.next) return;
    this.scene.pointerUp?.(x, y);
  }

  pointerCancel() {
    this.scene.pointerCancel?.();
  }

  key(k) {
    this.sound.unlock();
    if (!this.next) this.scene.key?.(k);
  }
}
