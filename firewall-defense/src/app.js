import { MIN_VIEW_W, VIEW_H } from './config.js';
import { MAPS, MAPS_PER_SEASON } from './data/maps.js';
import { loadSave, writeSave } from './save.js';
import { Sound } from './audio/Sound.js';
import { setPixelScale } from './render/canvas.js';
import { TitleScene } from './scenes/TitleScene.js';
import { LevelSelectScene } from './scenes/LevelSelectScene.js';
import { Game } from './game.js';
import { CatalogScene } from './scenes/CatalogScene.js';
import { DarkNetScene } from './scenes/DarkNetScene.js';
import { DARKNET_STARS, COFFEE, mapCoffee, NODE, TREE } from './data/darknet.js';

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
    if (this.next) return;
    this.game?.bankKills(); // saindo de uma partida: os abatidos dela viram cafés
    this.next = makeScene;
  }

  goTitle() {
    this.go(() => new TitleScene(this));
  }

  goMaps() {
    this.go(() => new LevelSelectScene(this));
  }

  goCatalog() {
    this.go(() => new CatalogScene(this));
  }

  goDarkNet() {
    this.go(() => new DarkNetScene(this));
  }

  // Estrelas somadas de todos os mapas
  get totalStars() {
    return MAPS.reduce((sum, m) => sum + (this.save.stars[m.id] ?? 0), 0);
  }

  // Dark Net: libera com DARKNET_STARS estrelas (no modo debug, sempre)
  darkNetOpen() {
    return this.debug || this.totalStars >= DARKNET_STARS;
  }

  // Cafés ganhos até agora (pelo recorde de cada mapa: data/darknet.js)
  // (mais os dos monstros abatidos em todas as partidas)
  get coffeeEarned() {
    const maps = MAPS.reduce((sum, m) => sum + mapCoffee(this.save.stars[m.id], this.hasPlatinum(m.id)), 0);
    return maps + (this.save.kills ?? 0) * COFFEE.perKill + (this.save.duckCoffee ?? 0);
  }

  // Café que o Pato de Borracha achou numa partida (upgrade secreto)
  addDuckCoffee(v) {
    this.save.duckCoffee = Math.round(((this.save.duckCoffee ?? 0) + v) * 100) / 100;
    writeSave(this.save);
  }

  // Saldo de cafés pra gastar na Dark Net (com 2 casas: os abatidos dão fração)
  get coffee() {
    return Math.round((this.coffeeEarned - (this.save.coffeeSpent ?? 0)) * 100) / 100;
  }

  // Monstros abatidos numa partida entram no total do save (viram cafés)
  addKills(n) {
    this.save.kills = (this.save.kills ?? 0) + n;
    writeSave(this.save);
  }

  // Árvore da Dark Net: upgrades comprados (save.darknet)
  get perks() {
    return this.save.darknet ?? {};
  }

  // Dá pra comprar esse nó? (ainda não tem, já tem o anterior e tem cafés)
  canBuyPerk(id) {
    const n = NODE[id];
    return !!n && !this.perks[id] && (!n.parent || !!this.perks[n.parent]) && this.coffee >= n.cost;
  }

  buyPerk(id) {
    if (!this.canBuyPerk(id)) return false;
    this.save.darknet = { ...this.perks, [id]: true };
    this.save.coffeeSpent = (this.save.coffeeSpent ?? 0) + NODE[id].cost;
    writeSave(this.save);
    return true;
  }

  // Nós que saem junto num rollback: o próprio e os comprados que dependem dele
  perkRollbackSet(id) {
    const out = [];
    const walk = (pid) => {
      if (!this.perks[pid]) return;
      out.push(pid);
      for (const n of TREE) if (n.parent === pid) walk(n.id);
    };
    walk(id);
    return out;
  }

  // Cafés que voltam ao desfazer esse nó (com os que dependem dele)
  perkRefund(id) {
    return this.perkRollbackSet(id).reduce((sum, k) => sum + NODE[k].cost, 0);
  }

  // Rollback: desfaz o nó (e os que dependem dele) e devolve os cafés
  refundPerk(id) {
    const ids = this.perkRollbackSet(id);
    if (!ids.length) return false;
    const back = this.perkRefund(id);
    const darknet = { ...this.perks };
    for (const k of ids) delete darknet[k];
    this.save.darknet = darknet;
    this.save.coffeeSpent = Math.max(0, (this.save.coffeeSpent ?? 0) - back);
    writeSave(this.save);
    return true;
  }

  // Ameaça já apareceu numa fase? (no modo debug, todas)
  hasSeen(type) {
    return this.debug || !!this.save.seen?.[type];
  }

  // Primeira vez que um tipo de vírus aparece: entra no catálogo.
  // Devolve true se for novidade.
  discover(type) {
    if (this.save.seen?.[type]) return false;
    this.save.seen = { ...this.save.seen, [type]: true };
    writeSave(this.save);
    return true;
  }

  // mode: 'normal' ou 'platinum' (libera com 3 estrelas)
  startMap(i, mode = 'normal') {
    this.go(() => new Game(this, i, mode));
  }

  hasPlatinum(mapId) {
    return !!this.save.platinum?.[mapId];
  }

  // Todos os mapas da season com a platina vencida?
  seasonPlatinum(s) {
    return MAPS.slice(s * MAPS_PER_SEASON, (s + 1) * MAPS_PER_SEASON).every((m) => this.hasPlatinum(m.id));
  }

  // Modo platina liberado nesse mapa? (precisa das 3 estrelas)
  platinumOpen(i) {
    return this.debug || (this.save.stars[MAPS[i].id] ?? 0) >= 3;
  }

  recordPlatinum(mapId) {
    if (this.hasPlatinum(mapId)) return;
    this.save.platinum = { ...this.save.platinum, [mapId]: true };
    writeSave(this.save);
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

  // Turno automático: a próxima rodada começa sozinha quando o mapa limpa
  toggleAuto() {
    this.save.autoRound = !this.save.autoRound;
    writeSave(this.save);
    this.sound.play('click');
    this.game?.autoChanged();
  }

  // Aba de informações da defesa (no jogo): aberta ou recolhida
  toggleInfo() {
    this.save.infoOpen = this.save.infoOpen === false;
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
    this.game?.bankKills();
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
        // na partida, música de batalha; nos menus, a alegre
        this.sound.setTheme?.(this.scene instanceof Game ? 'battle' : 'menu');
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

  wheel(x, y, dy) {
    if (!this.next) this.scene.wheel?.(x, y, dy);
  }

  pinch(x, y, f, dx, dy) {
    if (!this.next) this.scene.pinch?.(x, y, f, dx, dy);
  }

  key(k) {
    this.sound.unlock();
    if (!this.next) this.scene.key?.(k);
  }
}
