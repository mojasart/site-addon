import { MIN_VIEW_W, VIEW_H } from './config.js';
import { loadSettings, saveSettings } from './save.js';
import { Sound } from './audio/Sound.js';
import { setPixelScale } from './render/canvas.js';
import { TitleScene } from './scenes/TitleScene.js';
import { SettingsScene } from './scenes/SettingsScene.js';
import { Game } from './game.js';

// Controla as telas (título → configurações / jogo), a transição entre
// elas, as configurações salvas e o som.
export class App {
  constructor({ debug = false } = {}) {
    this.debug = debug;
    this.settings = loadSettings();
    this.sound = new Sound(this.settings);
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

  goSettings() {
    this.go(() => new SettingsScene(this));
  }

  startGame() {
    this.go(() => new Game(this));
  }

  toggleSetting(key) {
    this.settings[key] = !this.settings[key];
    saveSettings(this.settings);
    this.sound.play('click');
    if (key === 'vibration' && this.settings.vibration) this.vibrate(30);
  }

  vibrate(ms) {
    if (!this.settings.vibration) return;
    try {
      navigator.vibrate?.(ms);
    } catch {
      // sem vibração neste aparelho
    }
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
        this.game?.fx.flushCoins();
        this.scene = this.next();
        this.next = null;
      }
    } else this.fade = Math.max(0, this.fade - dt * 4);
    this.scene.update(dt);
  }

  render(ctx) {
    this.scene.render(ctx);
    if (this.fade > 0) {
      ctx.fillStyle = `rgba(36,28,52,${this.fade})`;
      ctx.fillRect(0, 0, this.viewW, VIEW_H);
    }
  }

  // ── toque ──
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
