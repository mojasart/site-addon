import { MIN_VIEW_W, VIEW_H, DEBUG, ENERGY } from './config.js';
import { MAPS, MAPS_PER_SEASON } from './data/maps.js';
import { loadSave, writeSave, pauseSaving } from './save.js';
import { Sound } from './audio/Sound.js';
import { setPixelScale } from './render/canvas.js';
import { TitleScene } from './scenes/TitleScene.js';
import { LevelSelectScene } from './scenes/LevelSelectScene.js';
import { Game } from './game.js';
import { CatalogScene } from './scenes/CatalogScene.js';
import { DarkNetScene } from './scenes/DarkNetScene.js';
import { ShopScene } from './scenes/ShopScene.js';
import { NameScene } from './scenes/NameScene.js';
import { ITEM } from './data/consumables.js';
import { drawEnergyModal, energyLayout } from './render/energy.js';
import { inRect } from './render/widgets.js';
import { DARKNET_STARS, COFFEE, mapCoffee, NODE, TREE } from './data/darknet.js';

// Controla as telas (título → mapas → jogo), a transição entre elas,
// o progresso salvo e o som.
export class App {
  constructor({ debug = false, mute = false } = {}) {
    this.debug = false;
    this.save = loadSave();
    if (debug) this.enableDebug();
    // saves antigos: música/efeitos desligados viram volume 0
    if (this.save.music === false) this.save.musicVol = 0;
    if (this.save.sfx === false) this.save.sfxVol = 0;
    delete this.save.music;
    delete this.save.sfx;
    if (mute) {
      // ?mute: sem música nem efeitos (dá pra aumentar de novo no volume)
      this.save.musicVol = 0;
      this.save.sfxVol = 0;
    }
    this.sound = new Sound(this.save);
    this.viewW = MIN_VIEW_W;
    this.pixelScale = 1;
    this.scene = new TitleScene(this);
    this.next = null; // próxima cena (durante o fade)
    this.fade = 1; // começa escuro e clareia
  }

  // Modo debug (?debug na URL ou tocando no worm da tela inicial): todos os
  // mapas liberados com 3 estrelas e platina, DEBUG.money por fase e
  // DEBUG.coffee cafés. Usa uma cópia do save que não é gravada: o progresso
  // de verdade volta ao recarregar a página
  enableDebug() {
    if (this.debug) return;
    this.debug = true;
    pauseSaving();
    const s = structuredClone(this.save);
    for (const m of MAPS) {
      s.stars[m.id] = 3;
      s.platinum[m.id] = true;
    }
    this.save = s;
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

  // JOGAR na tela inicial: na primeira vez pergunta o nome (janelinha por
  // cima da tela inicial, sem transição); depois, mapas
  goPlay() {
    if (this.save.playerName) this.goMaps();
    else if (!this.next) this.scene = new NameScene(this, this.scene);
  }

  // Nome que o Hacker usa pra falar com o jogador
  get playerName() {
    return this.save.playerName || null;
  }

  setPlayerName(name) {
    this.save.playerName = name;
    writeSave(this.save);
  }

  goCatalog() {
    this.go(() => new CatalogScene(this));
  }

  goDarkNet() {
    this.go(() => new DarkNetScene(this));
  }

  goShop() {
    this.go(() => new ShopScene(this));
  }

  // Consumíveis no inventário (data/consumables.js): { id: quantidade }
  get inventory() {
    return (this.save.inventory ??= {});
  }

  // Compra 1 consumível com café (vai pro inventário)
  buyConsumable(id) {
    const item = ITEM[id];
    if (!item || this.coffee < item.cost) return false;
    this.save.coffeeSpent = (this.save.coffeeSpent ?? 0) + item.cost;
    this.inventory[id] = (this.inventory[id] ?? 0) + 1;
    writeSave(this.save);
    return true;
  }

  // Gasta 1 consumível do inventário (usado na partida)
  consumeItem(id) {
    if (!(this.inventory[id] > 0)) return false;
    this.inventory[id]--;
    writeSave(this.save);
    return true;
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
    if (this.debug) return Math.round((DEBUG.coffee - (this.save.coffeeSpent ?? 0)) * 100) / 100;
    return Math.round((this.coffeeEarned - (this.save.coffeeSpent ?? 0)) * 100) / 100;
  }

  // Monstros abatidos numa partida entram no total do save (viram cafés)
  addKills(n) {
    this.save.kills = (this.save.kills ?? 0) + n;
    writeSave(this.save);
  }

  // Catálogo: soma os abatidos por tipo de vírus e as defesas usadas
  addTally(kills, placed) {
    const add = (into, from) => {
      for (const [k, n] of Object.entries(from)) into[k] = (into[k] ?? 0) + n;
    };
    add((this.save.killsBy ??= {}), kills);
    add((this.save.placedBy ??= {}), placed);
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
  // Começa (ou reinicia) uma partida: gasta 1 energia. Sem energia, abre a
  // janela "SEM ENERGIA" (com o anúncio); depois do anúncio a partida começa
  startMap(i, mode = 'normal') {
    if (this.next || this.energyUI) return;
    if (!this.spendEnergy()) {
      this.energyUI = { mode: 'empty', t: 0, pending: { i, mode } };
      this.sound.play('error');
      return;
    }
    this.go(() => new Game(this, i, mode));
  }

  // ── Energia (ENERGY em config.js; save.energy + save.energyAt) ──
  // energyAt: quando a recarga atual começou a contar (ms). Volta 1 a cada
  // regenMin minutos enquanto estiver abaixo do máximo
  get energyRegenMs() {
    return ENERGY.regenMin * 60 * 1000;
  }

  refreshEnergy() {
    const s = this.save;
    if (s.energy >= ENERGY.max) return;
    const gained = Math.floor((Date.now() - s.energyAt) / this.energyRegenMs);
    if (gained <= 0) return;
    s.energy = Math.min(ENERGY.max, s.energy + gained);
    s.energyAt = s.energy >= ENERGY.max ? Date.now() : s.energyAt + gained * this.energyRegenMs;
    writeSave(s);
  }

  get energy() {
    this.refreshEnergy();
    return this.save.energy;
  }

  // ms até a próxima energia voltar (0 com a energia cheia)
  energyNextMs() {
    if (this.energy >= ENERGY.max) return 0;
    return Math.max(0, this.save.energyAt + this.energyRegenMs - Date.now());
  }

  // Gasta 1 energia (no modo debug é de graça). false se não tiver
  spendEnergy() {
    if (this.debug) return true;
    if (this.energy <= 0) return false;
    if (this.save.energy >= ENERGY.max) this.save.energyAt = Date.now(); // começa a recarregar agora
    this.save.energy--;
    writeSave(this.save);
    return true;
  }

  addEnergy(n) {
    this.refreshEnergy();
    this.save.energy = Math.min(ENERGY.max, this.save.energy + n);
    writeSave(this.save);
  }

  // Toque na janela de energia (ela fica por cima de qualquer tela)
  energyTap(x, y) {
    const ui = this.energyUI;
    const L = energyLayout(this);
    if (ui.mode === 'ad') {
      // anúncio: só fecha depois da contagem, pegando as energias
      if (ui.t >= ENERGY.adTime && inRect(L.skip, x, y)) {
        this.addEnergy(ENERGY.ad);
        this.sound.play('upgrade');
        const p = ui.pending;
        this.energyUI = null;
        if (p) this.startMap(p.i, p.mode); // segue pra partida que ia começar
      }
      return;
    }
    if (inRect(L.watch, x, y)) {
      this.energyUI = { mode: 'ad', t: 0, pending: ui.pending };
      this.sound.play('click');
    } else if (inRect(L.close, x, y) || !inRect(L.card, x, y)) {
      this.energyUI = null;
      this.sound.play('click');
    }
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

  // Volume da música ou dos efeitos (kind: 'music' | 'sfx'), de 0 (mudo) a 1,
  // em passos de 5%
  setVolume(kind, v) {
    v = Math.round(Math.min(1, Math.max(0, v)) * 20) / 20;
    const key = kind === 'music' ? 'musicVol' : 'sfxVol';
    if (this.save[key] === v) return;
    if (kind === 'music') this.sound.setMusicVol(v);
    else this.sound.setSfxVol(v);
    writeSave(this.save);
  }

  // Botão de som da tela inicial: abaixa em degraus (100% → 50% → 0% → 100%)
  stepVolume(kind) {
    const v = this.save[kind === 'music' ? 'musicVol' : 'sfxVol'];
    this.setVolume(kind, v > 0.5 ? 0.5 : v > 0 ? 0 : 1);
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
    if (this.energyUI) this.energyUI.t += dt;
    if (this.next) {
      this.fade = Math.min(1, this.fade + dt * 5);
      if (this.fade >= 1) {
        this.scene = this.next();
        this.next = null;
        // na partida, a música de batalha da season do mapa; no catálogo, a "Matrix";
        // na loja, a bossa de compras; nos outros menus, a alegre
        this.sound.setTheme?.(
          this.scene instanceof Game
            ? `battle-${this.scene.map.season}`
            : this.scene instanceof CatalogScene
              ? 'catalog'
              : this.scene instanceof ShopScene
                ? 'shop'
                : 'menu',
        );
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
    if (this.energyUI) drawEnergyModal(ctx, this); // por cima de tudo
  }

  // ── input ──
  pointerDown(x, y, type) {
    this.sound.unlock();
    if (this.next) return;
    if (this.energyUI) return this.energyTap(x, y);
    this.scene.pointerDown?.(x, y, type);
  }

  pointerMove(x, y, type) {
    if (this.energyUI) return;
    this.scene.pointerMove?.(x, y, type);
  }

  pointerUp(x, y) {
    if (this.next || this.energyUI) return;
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
    if (this.energyUI) {
      if (k === 'Escape' && this.energyUI.mode !== 'ad') this.energyUI = null;
      return;
    }
    if (!this.next) this.scene.key?.(k);
  }
}
