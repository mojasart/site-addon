import { VIEW_H, PANEL_W, SPEEDS, TURBO_SPEED, DANGER_TILES, TAP, EARLY_BONUS, EARLY_WAVES, AD_REWARDS } from './config.js';
import { trackMatch, trackCoffee, trackDesign } from './analytics.js';
import { MAPS, BOUNTY_MAPS } from './data/maps.js';
import { roundsFor } from './data/rounds.js';
import { PLAT_WAVES, PLAT_LIVES, PLAT_WARMUP, PLAT_REWARD, WAVE_GAP, PLAT_GATE, BOSS_HP, ENDLESS, platinumScale, platinumPressure, blockedAlly, platinumRounds, platinumBoss } from './data/platinum.js';
import { withoutBosses, AGENDA_HP, CICADA_SHARE, bossHpMul } from './data/rounds.js';
import { DAILY, MODS, modMul } from './data/daily.js';
import { worth, ENEMIES } from './data/enemies.js';
import { BOUNTY, bountyRound, layers, comboMul, bountyStars } from './data/bounty.js';
import { TOWERS, TARGET_MODES, COMMANDER_MAX, BURNOUT } from './data/towers.js';
import { applyPerks, ROOT_MONEY, DUCK, INTEREST, LOAN, LOAN_EXTRA, BULK_DISCOUNT } from './data/darknet.js';
import { fitsTerrain } from './core/terrain.js';
import { Tower } from './entities/Tower.js';
import { Projectile } from './entities/Projectile.js';
import { Packet } from './entities/Packet.js';
import { RoundManager } from './systems/RoundManager.js';
import { Effects } from './systems/Effects.js';
import { Hazards } from './systems/Hazards.js';
import { MapView } from './render/maps/index.js';
import { TILE, tileOf, tileKey, inGrid, snapToTile } from './core/grid.js';
import { layout, drawHud, drawPanel, drawRange, bossBarsBottom, drawHasted, drawCommandZone, POWER_BTN } from './render/ui.js';
import { inRect, sliderValue, terminalToast } from './render/widgets.js';
import { drawBanner, drawOverlay, overlayLayout } from './render/screens.js';
import { drawInfoPanel, infoLayout } from './render/infoPanel.js';
import { drawCharacter } from './render/characters.js';
import { drawEnemy, drawAura } from './render/viruses.js';
import { drawProjectile, drawCoin, drawServer, ICONS } from './render/sprites.js';
import { drawHazards, drawStunned, drawHazardWarning } from './render/hazards.js';
import { drawEncrypted, drawEncryptedBody } from './render/ransom.js';
import { drawSpawns } from './render/spawns.js';
import { Tutorial, TUTORIAL_LOCKED } from './systems/tutorial.js';
import { drawTutorial } from './render/tutorial.js';
import { drawDuck } from './render/duck.js';
import { CatalogScene } from './scenes/CatalogScene.js';
import { ITEM, CASH, BACKUP_LIVES, useConsumable } from './data/consumables.js';
import { drawAds, adClose, adSpot, adScale, adSize, ADS, CRYPT_AD, CLOSE_SPOTS } from './render/ads.js';

// Enxurrada de anúncios (clicou no anúncio em vez do X): dura `time` s até o
// game over, com no máximo `max` anúncios; o intervalo entre eles começa
// em `gap` e encurta (×accel) até `minGap`
const STORM = { time: 4, max: 45, gap: 0.35, accel: 0.88, minGap: 0.05 };
import { pickCoinTiles, coinTileAt, COIN_SEASONS } from './core/coinTiles.js';
import { drawCoinTiles, drawNoMine } from './render/coinTiles.js';
import { rrect, fillOutline, circle, text, setFont } from './render/canvas.js';
import { rand, chance, plural } from './util.js';
import { t, lang } from './i18n.js';

const TOUCH_LIFT = 46; // ao arrastar com o dedo, a defesa aparece acima dele
const BASE_HIT = 24; // raio da hitbox do servidor (ele ocupa 1 quadrado)
const CAST_TIME = 0.5; // Ransomware fica parado tremendo esse tempo ao criptografar
const WIN_DELAY = 0.5; // limpou a última rodada: espera o último vírus estourar de vez antes da vitória

// A partida em si (uma fase). Criada pelo App ao escolher um mapa.
// mode: 'normal', 'platinum' (ondas sem parar até o chefão; data/platinum.js)
// ou 'bounty' (sala do Bug Bounty: mapIndex = season; data/bounty.js)
// ou 'daily' (desafio do dia: a fase com os modificadores de app.challenge; data/daily.js)
const COIN_MERGE = 40; // moedas de vírus mais perto que isso viram uma só (px)
const COIN_MAX = 30; // máximo de moedas no chão (daí pra frente juntam na mais perto)
const COIN_TAP = 14; // folga do toque em volta da moeda (px)

export class Game {
  constructor(app, mapIndex, mode = 'normal') {
    this.app = app;
    this.sound = app.sound;
    this.mapIndex = mapIndex;
    this.mode = mode;
    this.platinum = mode === 'platinum';
    this.bounty = mode === 'bounty';
    this.daily = mode === 'daily';
    this.challenge = this.daily ? app.challenge : null;
    if (this.daily) app.markDailyPlayed?.(); // a tentativa do dia começa aqui
    this.mods = this.challenge?.mods ?? [];
    this.map = this.bounty ? BOUNTY_MAPS[mapIndex] : MAPS[mapIndex];
    this.anim = 0;
    this.pointer = { x: -1, y: -1, down: false, type: 'touch' };
    this.drag = null;
    this.resize(app.viewW);
    this.reset();
    trackMatch('start', mode, this.map.id);
  }

  get viewW() { return this.app.viewW; }
  get path() { return this.view.path; }
  get server() { return this.view.server; }
  get spawnDist() { return this.view.spawnDist; }
  get offsetX() { return this.view.offsetX; }
  get nextMap() { return this.bounty || this.daily ? null : MAPS[this.mapIndex + 1] ?? null; }

  resize(viewW) {
    const mapW = viewW - PANEL_W;
    if (this.view?.mapW !== mapW) this.view = new MapView(this.map, mapW);
    this.mapW = mapW;
  }

  reset() {
    // Acesso Root (Dark Net): dinheiro a mais no começo da fase
    // Bug Bounty: só o orçamento da partida (sem o Acesso Root)
    // Desafio do dia: Orçamento curto e Servidor frágil mexem no dinheiro e nas vidas
    const money = Math.round((this.map.money * modMul(this.mods, 'money')) / 5) * 5;
    this.money = this.bounty ? BOUNTY.budget[this.map.season] : money + (this.app.perks?.root ? ROOT_MONEY : 0);
    this.baseLives = Math.max(1, Math.round(this.map.lives * modMul(this.mods, 'lives'))); // (estrelas: starsNow)
    this.lives = this.platinum ? PLAT_LIVES : this.bounty ? Infinity : this.baseLives;
    this.towers = [];
    this.coinTiles = pickCoinTiles(this); // pilhas de bitcoin (seasons 1 e 2)
    this.enemies = [];
    this.newEnemies = [];
    this.projectiles = [];
    this.packets = [];
    // platina: as ondas ganham a dificuldade calibrada do modo (k)
    // desafio do dia: Horda enche as ondas (como a platina) e a fase encolhe pra DAILY.waves ondas
    const k = this.platinum ? platinumScale(this.mapIndex) : modMul(this.mods, 'pressure');
    // a platina tem a pressão dela (data/platinum.js PLAT_PRESSURE): não segue a calibração do normal
    this.pressure = this.platinum ? platinumPressure(this.mapIndex, this.map) : this.map.pressure;
    const list = this.platinum
      ? platinumRounds(this.map)
      : this.bounty
        ? [bountyRound(this.map.d)]
        : roundsFor(this.daily ? { ...this.map, waves: Math.min(this.map.waves, DAILY.waves) } : this.map);
    this.rounds = new RoundManager(list, {
      count: this.bounty ? 1 : this.pressure * k, // Bug Bounty: a quantidade já vem pronta
      minCount: this.platinum ? 0 : 1,
      early: this.platinum || this.bounty ? null : EARLY_WAVES, // modo normal: primeiras ondas mais cheias
      // platina: a dificuldade k enche as ondas sem esticar elas (intervalo ÷ k)
      gap: this.map.gapMul / (this.platinum ? Math.max(1, k) : 1),
      warmup: this.platinum ? { k, waves: PLAT_WARMUP } : null, // platina: as primeiras ondas pegam leve
      speed: this.map.speedMul * modMul(this.mods, 'speed'), // Vírus apressados (desafio do dia)
      hp: this.pressure * k, // worms acompanham a pressão
      // chefões: curva própria pelas fases (data/rounds.js); na platina, a pressão como antes
      bossHp: this.platinum || this.bounty ? null : bossHpMul(this.mapIndex) * k,
    });
    this.fx = new Effects();
    this.hazards = new Hazards(this.map.hazards);
    this.spawnFlash = this.map.routes.map(() => 0); // clarão de cada entrada ao soltar um vírus
    this.speed = 1;
    this.nextIn = null; // turno automático: 0 = a próxima rodada começa no próximo passo (null = espera o jogador)
    this.callCooldown = 0;
    this.placing = null; // tipo de defesa sendo posicionada
    this.inspect = null; // defesa da loja só sendo olhada (sem dinheiro pra comprar): mostra os atributos
    this.selectedTower = null;
    this.panelTab = 'towers'; // aba do painel: towers (DEFESAS) | items (ITENS)
    this.banner = null;
    this.hurt = 0;
    this.duckHop = 0; // pulinho do Pato de Borracha quando acha café
    this.duckCoffee = 0; // café que ele achou nesta partida
    this.tally = { upgrades: 0, coins: 0, taps: 0 }; // pras missões do dia (App.missionProgress)
    this.killsBy = {}; // abatidos por tipo de vírus nesta partida (catálogo)
    this.placedBy = {}; // defesas colocadas por tipo nesta partida (catálogo)
    this.coinBump = 0;
    this.shakeAmt = 0;
    this.endDelay = 0;
    this.winIn = null; // contagem até a tela de vitória (WIN_DELAY), depois do último vírus
    this.overlayTime = 0;
    this.stars = 0;
    this.stats = { pops: 0 };
    // Bug Bounty: relógio, pontos, combo e camadas que escaparam
    this.bountyLeft = BOUNTY.time;
    this.points = 0;
    this.combo = 0;
    this.escaped = 0;
    this.ransomOdds = null; // chance do Ransomware criptografar no próximo quadrado (null = ainda não veio)
    this.ransomLocks = 0; // quantas vezes já criptografou nessa partida
    this.ads = []; // anúncios do Adware abertos na tela (render/ads.js)
    this.state = 'playing'; // playing | paused | won | lost
    // platina: relógio das ondas, se o chefão já veio e o aliado bloqueado
    this.platTime = 0;
    this.bossCalled = false;
    this.waveGap = null;
    this.blocked = this.platinum ? blockedAlly(this.map) : null;
    // 1-1 (normal) é o tutorial: só Hacker, Golem e Honeypot; o Hacker ensina a jogar
    // (no desafio do dia, as do Bloqueio duplo)
    this.lockedTowers = this.mapIndex === 0 && this.mode === 'normal' ? new Set(TUTORIAL_LOCKED) : this.challenge?.blocked.length ? new Set(this.challenge.blocked) : null;
    this.tutorial = Tutorial.wanted(this) ? new Tutorial(this) : null;
    if (this.platinum) {
      this.showBanner(t('MODO PLATINA'), 3, '#bdeeff', 46, t('{tower} bloqueado · chefão depois da onda {n}', { tower: TOWERS[this.blocked].name, n: PLAT_WAVES }));
      return;
    }
    if (this.bounty) {
      this.showBanner('BUG BOUNTY', 3, '#ffd23f', 50, t('5 minutos com ${money}: vírus não dão dinheiro!', { money: this.money }));
      return;
    }
    if (this.daily) {
      this.showBanner(t('DESAFIO DO DIA'), 3, '#ffd23f', 46, this.mods.map((id) => t(MODS[id].name)).join(' · '));
      return;
    }
    // mapa com novidade (várias entradas, loop, zonas...) avisa no começo
    const special = this.map.entries > 1 || this.map.loop || this.map.hazards?.length;
    this.showBanner(this.map.name, 2.6, '#ffffff', 46, special ? this.map.desc : t('Arraste as defesas pro mapa!'));
  }

  // Estrelas que a partida daria se vencesse com a vida de agora: 3 com 90%
  // das vidas ou mais, 2 com pelo menos metade, 1 com menos (cor da vida no HUD)
  get starsNow() {
    const L = this.baseLives;
    return this.lives >= L * 0.9 ? 3 : this.lives >= L * 0.5 ? 2 : 1;
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.overlayTime = 0;
    this.drag = null;
    this.sound.play('click');
  }

  resume() {
    this.state = 'playing';
    this.sound.play('click');
  }

  end(won) {
    this.state = won ? 'won' : 'lost';
    this.endDelay = won ? 1.6 : 0.9;
    this.overlayTime = 0;
    this.placing = null;
    this.inspect = null;
    this.selectedTower = null;
    this.drag = null;
    const coffeeBefore = this.app.coffeeEarned ?? 0;
    if (won) {
      // 3 estrelas com 90% das vidas ou mais, 2 com pelo menos metade, 1 com menos
      this.stars = this.bounty ? bountyStars(this.bountyRatio) : this.starsNow;
      if (this.platinum) {
        this.canContinue = true; // CONTINUAR: platina infinita (continueEndless)
        this.stars = 3; // vencer a platina já vale as 3 (em platina)
        const hadTurbo = this.app.seasonPlatinum?.(0);
        this.app.recordPlatinum?.(this.map.id);
        // fechou a platina da Placa-Mãe agora: libera o 5x (aviso na vitória)
        this.turboUnlocked = !hadTurbo && !!this.app.seasonPlatinum?.(0);
      }
      // desafio do dia: as estrelas são só da partida (a fase não muda); a 1ª vitória do dia dá café
      if (this.daily) this.dailyReward = this.app.recordDaily?.() ?? null;
      else this.app.recordStars(this.map.id, this.stars);
      this.app.missionWin?.(this.mode, this.stars);
      this.fx.celebrate(this.viewW, VIEW_H);
      this.sound.play('win');
      for (let i = 0; i < this.stars; i++) setTimeout(() => this.sound.play('star'), 500 + i * 350);
    } else this.sound.play('lose');
    // platina: os pontos (como no Bug Bounty) contam pro recorde da fase
    if (this.platinum) {
      this.newRecord = this.points > (this.app.endlessBest?.(this.map.id) ?? 0);
      this.app.recordEndless?.(this.map.id, this.points);
    }
    // cafés novos da partida: o que passou do recorde do mapa e os monstros
    // abatidos (data/darknet.js)
    this.bankKills();
    this.coffeeGain = (this.app.coffeeEarned ?? 0) - coffeeBefore + this.duckCoffee; // (o do pato já entrou no save durante a partida)
    // pontuação: estrelas (pontos na platina e no Bug Bounty)
    trackMatch(won ? 'complete' : 'fail', this.mode, this.map.id, this.platinum || this.bounty ? this.points : won ? this.stars : null);
    trackCoffee('source', this.coffeeGain, 'Match', this.mode);
  }

  // ── Anúncios com recompensa no fim da partida (AD_REWARDS em config.js) ──
  // DOBRAR CAFÉ: na vitória com pelo menos AD_REWARDS.doubleMin de café
  // ganho (fora o Bug Bounty, que não tem a linha do café), 1 vez
  get canDouble() {
    return this.state === 'won' && !this.bounty && !this.doubled && this.coffeeGain >= AD_REWARDS.doubleMin;
  }

  doubleCoffee() {
    if (!this.canDouble) return;
    this.sound.play('click');
    this.app.watchAd('double', {
      onReward: () => {
        if (this.doubled) return;
        this.doubled = true;
        this.app.addAdCoffee(this.coffeeGain);
        this.coffeeGain *= 2;
        this.doubledAt = this.overlayTime; // o número do café dá um pulinho
      },
    });
  }

  // REVIVER: perdeu no modo normal, 1 vez por partida (não vale na enxurrada
  // de anúncios do Adware: ela é o castigo por clicar no anúncio)
  get canRevive() {
    return this.state === 'lost' && this.mode === 'normal' && !this.revived && !this.adStorm;
  }

  get reviveLives() {
    return Math.max(1, Math.ceil(this.baseLives * AD_REWARDS.revive));
  }

  reviveAd() {
    if (!this.canRevive) return;
    this.sound.play('click');
    this.app.watchAd('revive', { onReward: () => this.revive() });
  }

  // Volta pra partida com AD_REWARDS.revive das vidas do começo e os vírus
  // congelados (o Congelar Tudo), pra dar tempo de arrumar a defesa
  revive() {
    if (!this.canRevive) return;
    this.revived = true;
    this.lives = this.reviveLives;
    this.state = 'playing';
    this.endDelay = 0;
    this.overlayTime = 0;
    this.hurt = 0;
    ITEM.freeze.use(this);
    this.showBanner(t('REVIVEU!'), 2, '#3dff9a', 46, t('+{n} vidas · vírus congelados', { n: this.lives }));
    trackDesign('Revive:Used');
  }

  // Monstros abatidos viram cafés: soma no save os desta partida que ainda
  // não foram contados (no fim da partida e ao sair dela no meio)
  bankKills() {
    // missões do dia: o que a partida fez desde a última vez
    this.app.missionProgress?.({ pops: this.stats.pops - (this.killsBanked ?? 0), killsBy: this.killsBy, placedBy: this.placedBy, ...this.tally });
    this.tally = { upgrades: 0, coins: 0, taps: 0 };
    // contagem do catálogo (abatidos por vírus e defesas usadas)
    if (Object.keys(this.killsBy).length || Object.keys(this.placedBy).length) {
      this.app.addTally?.(this.killsBy, this.placedBy);
      this.killsBy = {};
      this.placedBy = {};
    }
    const n = this.stats.pops - (this.killsBanked ?? 0);
    if (n <= 0) return;
    this.killsBanked = this.stats.pops;
    this.app.addKills?.(n);
  }

  showBanner(text, duration = 1.2, color = '#ffffff', size = 46, sub = null) {
    this.banner = { text, sub, color, size, time: duration, total: duration };
  }

  shake(amount) {
    this.shakeAmt = Math.max(this.shakeAmt, amount);
  }

  // ── Atualização ───────────────────────────────────────────

  update(dt) {
    this.anim += dt;
    if (this.state !== 'playing') this.overlayTime += dt;
    if (this.state === 'paused') return;
    if (this.state === 'playing') this.tutorial?.update(dt);
    if (this.adStorm && this.state === 'playing') this.updateAdStorm(dt);
    this.endDelay = Math.max(0, this.endDelay - dt);
    this.hurt = Math.max(0, this.hurt - dt);
    this.duckHop = Math.max(0, this.duckHop - dt * 2.5);
    this.coinBump = Math.max(0, this.coinBump - dt * 4);
    this.shakeAmt = Math.max(0, this.shakeAmt - dt * 30);
    if (this.banner && (this.banner.time -= dt) <= 0) this.banner = null;
    if (this.toast && (this.toast.time -= dt) <= 0) this.toast = null;
    if (this.state !== 'playing' || this.tutorial?.frozen) {
      this.fx.update(dt); // (tutorial falando: o jogo espera)
      return;
    }
    // acelerado (2x/3x) roda em passos pequenos pra colisão não falhar
    let remaining = dt * (this.rounds.active ? this.speed : 1);
    while (remaining > 1e-6 && this.state === 'playing') {
      const step = Math.min(remaining, 1 / 60);
      remaining -= step;
      this.step(step);
    }
  }

  step(dt) {
    // venceu: o jogo segue rodando um instante (o estouro do último vírus) e aí vem a vitória
    // (sobrou quem não segura a onda, como a Cicada: a vitória espera ele morrer)
    if (this.winIn != null && !this.anyAlive() && (this.winIn -= dt) <= 0) {
      this.winIn = null;
      this.end(true);
      return;
    }
    this.callCooldown = Math.max(0, this.callCooldown - dt);
    this.updateAds(dt);
    if (this.nextIn != null && (this.nextIn -= dt) <= 0) this.startRound();
    if (this.platinum && this.rounds.started > 0) this.platinumStep(dt);
    if (this.bounty && this.rounds.started > 0 && (this.bountyLeft -= dt) <= 0) {
      this.endBounty();
      return;
    }
    this.rounds.update(dt, this);
    this.flushSpawns();
    this.revealStealth();
    this.encryptAuras();
    this.updateHaste(dt);
    for (const t of this.towers) t.update(dt, this);
    this.flushSpawns();
    for (const p of this.projectiles) p.update(dt, this);
    this.flushSpawns();
    for (const e of this.enemies) if (!e.dead) e.update(dt, this);
    if (this.speed > 1 && !this.bounty) this.checkDanger();
    for (const p of this.packets) p.update(dt, this);
    this.hazards.update(dt, this);
    for (let k = 0; k < this.spawnFlash.length; k++) this.spawnFlash[k] = Math.max(0, this.spawnFlash[k] - dt * 4);
    this.fx.update(dt);

    this.enemies = this.enemies.filter((e) => !e.dead);
    this.projectiles = this.projectiles.filter((p) => !p.dead);
    this.packets = this.packets.filter((p) => !p.dead);
    if (this.towers.some((t) => t.dead)) {
      this.towers = this.towers.filter((t) => !t.dead);
      if (this.selectedTower?.dead) this.selectedTower = null;
    }
    if (this.lives <= 0) this.end(false);
  }

  // Comandantes (Executivo) no mapa que estão funcionando (criptografado ou
  // atordoado não manda em ninguém)
  get commanders() {
    return this.towers.filter((t) => t.def.commander && !t.dead);
  }

  // Já tem COMMANDER_MAX comandantes: não dá pra colocar outro
  commanderFull(type) {
    return !!TOWERS[type].commander && this.commanders.length >= COMMANDER_MAX;
  }

  // Velocidade de ataque de cada defesa: a aura do Executivo mais forte que
  // alcança ela (não soma com outro Executivo) e o BURNOUT por cima, pra todas
  updateHaste(dt) {
    // cada Executivo tem o BURNOUT dele: tempo ligado e recarga próprios
    for (const c of this.commanders) {
      c.burnLeft = Math.max(0, (c.burnLeft ?? 0) - dt);
      c.burnCd = Math.max(0, (c.burnCd ?? 0) - dt);
    }
    const bosses = this.activeCommanders;
    for (const t of this.towers) {
      // só quem ataca com recarga acelera (não o Executivo, o Minerador nem a isca)
      if (!hastes(t)) {
        t.haste = 1;
        t.teamRecharge = 0;
        continue;
      }
      let aura = 0;
      let burning = false; // no raio de um Executivo com o BURNOUT dele ligado
      let recharge = 0; // Hora Extra (Dark Net): o melhor Executivo que alcança
      for (const c of bosses) {
        if (Math.hypot(c.x - t.x, c.y - t.y) > c.stats.range) continue;
        aura = Math.max(aura, c.stats.haste);
        recharge = Math.max(recharge, c.stats.teamRecharge ?? 0);
        if (c.burnLeft > 0) burning = true;
      }
      t.teamRecharge = recharge;
      t.burning = burning;
      // BURNOUT: só no raio de um Executivo, pelo tempo do BURNOUT DELE
      t.haste = (1 + aura) * (burning ? 1 + BURNOUT.haste : 1);
    }
  }

  // Executivos que estão mandando (criptografado ou atordoado não manda)
  get activeCommanders() {
    return this.commanders.filter((c) => !c.ransom && !(c.stunned > 0));
  }

  // Executivos com o BURNOUT pronto (recarga zerada)
  get readyCommanders() {
    return this.commanders.filter((c) => !(c.burnCd > 0));
  }

  // Pro botão: segundos que faltam do BURNOUT ligado mais longo
  get burnoutLeft() {
    return Math.max(0, ...this.commanders.map((c) => c.burnLeft ?? 0));
  }

  // Pro botão: segundos até o próximo Executivo ficar pronto (0 = algum pronto)
  get burnoutCd() {
    return this.readyCommanders.length ? 0 : Math.min(...this.commanders.map((c) => c.burnCd));
  }

  // (zerar recarrega todos: usado pelas gravações do trailer)
  set burnoutCd(v) {
    for (const c of this.commanders) c.burnCd = v;
  }

  // Recarga total do próximo que vai ficar pronto (pra encher o botão)
  get burnoutMax() {
    const next = this.commanders.reduce((a, c) => (!a || c.burnCd < a.burnCd ? c : a), null);
    return next?.burnMax ?? BURNOUT.cooldown;
  }

  // Botão do BURNOUT: com algum Executivo pronto no mapa
  get canBurnout() {
    return this.readyCommanders.length > 0 && this.state === 'playing';
  }

  burnout() {
    if (!this.canBurnout) {
      if (this.commanders.length) this.sound.play('error');
      return;
    }
    // cada Executivo tem o BURNOUT dele, separado: só os prontos ligam, e o
    // tempo e a recarga (Meta Agressiva: +3 s e −5 s) valem só pra ele e pras
    // defesas no raio dele. Os outros seguem recarregando no tempo deles
    const ready = this.readyCommanders;
    for (const c of ready) {
      c.burnLeft = BURNOUT.time + (c.stats.burnoutExtra ?? 0);
      c.burnCd = c.burnMax = BURNOUT.cooldown - (c.stats.burnoutFaster ?? 0);
      // Virada de Noite (Dark Net): às vezes fica pronto de novo assim que este acaba
      if (chance(c.stats.burnoutFree ?? 0)) c.burnCd = c.burnLeft;
    }
    const bosses = ready.filter((c) => !c.ransom && !(c.stunned > 0));
    for (const t of this.towers) {
      if (!hastes(t) || !bosses.some((c) => Math.hypot(c.x - t.x, c.y - t.y) <= c.stats.range)) continue;
      t.spawnAnim = 1;
      this.fx.burst(t.x, t.y - 20, '#ff9a2e', 10, 150, 0.45, 4, true);
    }
    for (const c of ready) {
      c.attack = 1; // punho pra cima
      this.fx.ring(c.x, c.y, c.stats.range, 'boost');
      this.fx.text(c.x, c.y - 56, 'BURNOUT!', '#ff9a2e', 18);
    }
    this.sound.play('burnout');
    buzz(30);
  }

  // Botão do BURNOUT, em coordenadas de tela: sempre no canto de baixo à
  // direita do mapa (antes mudava de canto pra fugir do caminho, e o jogador
  // não achava ele)
  get abilitySpot() {
    return { x: this.mapW - 12 - POWER_BTN, y: VIEW_H - 12 - POWER_BTN };
  }

  // Filhos de vírus estourados entram na lista só entre etapas
  flushSpawns() {
    if (this.newEnemies.length === 0) return;
    for (const e of this.newEnemies) if (!e.dead) this.enemies.push(e);
    this.newEnemies.length = 0;
  }

  // Isca (Honeypot) que o vírus está encostando, se houver
  baitAt(e) {
    if (e.def.stealth && !e.revealed) return null; // escondido, passa reto pela isca
    if (e.def.flying) return null; // voa por cima da isca
    for (const t of this.towers) {
      if (t.def.attack !== 'decoy' || t.dead || t.ransom) continue; // criptografada não segura ninguém
      if (Math.hypot(e.x - t.x, e.y - t.y) < t.r + e.r * 0.8) return t;
    }
    return null;
  }

  // Hitbox da base: o vírus que encosta no servidor já invade
  // (antes ele só contava no fim da rota, depois de passar por cima)
  touchesBase(e) {
    const s = this.server;
    return Math.hypot(e.x - s.x, e.y - s.y) < BASE_HIT + e.r * 0.5;
  }

  // Patrocínio: quanto a mais cada vírus estourado por essa defesa solta
  // (soma dos Mineradores que patrocinam ela)
  sponsorBonus(tower) {
    let v = 0;
    for (const m of this.towers) if (m.sponsorOf === tower && !m.ransom) v += m.stats.sponsor ?? 0;
    return v;
  }

  // Pato de Borracha (upgrade secreto da Dark Net): cada vírus estourado tem
  // DUCK.chance de render DUCK.coffee café (direto no save)
  duckRoll(e) {
    if (!this.app.perks?.duck || !chance(DUCK.chance)) return;
    this.app.addDuckCoffee?.(DUCK.coffee);
    this.duckCoffee += DUCK.coffee;
    this.duckHop = 1;
    this.fx.spark(e.x, e.y - e.r, '#ffe0b0', 10);
    this.sound.play('coin');
  }

  leak(enemy) {
    if (this.bounty) {
      // Bug Bounty: ninguém perde vida, mas o combo zera
      this.escaped += layers(enemy.type);
      if (this.combo >= BOUNTY.comboStep) this.fx.text(this.server.x, this.server.y - 40, t('COMBO PERDIDO'), '#ff7a8a', 18);
      this.combo = 0;
      return;
    }
    this.lives -= enemy.threat;
    this.hurt = 0.4;
    this.shake(4);
    this.sound.play('leak');
    this.fx.text(this.server.x, this.server.y - 40, `-${enemy.threat}`, '#ff5a6a', 26);
    buzz(40);
  }

  // Bug Bounty: cada camada estourada vale ponto × combo (Enemy.pop chama)
  bountyPop(e) {
    if (!this.bounty && !this.platinum) return; // pontos: Bug Bounty e platina
    this.combo++;
    this.points += Math.round((e.def.reward ?? 1) * comboMul(this.combo) * 10);
  }

  // % das camadas estouradas do que entrou no mapa (as vivas no fim contam como não estouradas)
  get bountyRatio() {
    let alive = 0;
    for (const e of [...this.enemies, ...this.newEnemies]) if (!e.dead) alive += layers(e.type);
    const total = this.stats.pops + this.escaped + alive;
    return total ? this.stats.pops / total : 0;
  }

  // Fim do Bug Bounty (tempo ou tudo estourado): ganha se fez pelo menos 1 estrela
  // Gasta a energia da partida (uma vez só): quando passa da 1ª onda
  payEnergy() {
    if (this.energyPaid) return;
    this.energyPaid = true;
    this.app.spendEnergy?.();
  }

  endBounty() {
    if (this.state !== 'playing') return;
    this.payEnergy(); // a onda do Bug Bounty acabou (pelo tempo ou estourando tudo)
    this.newRecord = this.points > (this.app.bountyBest?.(this.map.id) ?? 0);
    this.app.recordBounty?.(this.map.id, this.points); // recorde conta mesmo sem estrela
    this.end(bountyStars(this.bountyRatio) > 0);
  }

  // Platina: a próxima onda começa quando a anterior termina de entrar e
  // sobram no máximo PLAT_GATE vírus vivos no mapa (+ WAVE_GAP); depois da
  // última onda vem o chefão (com a mesma regra)
  platinumStep(dt) {
    if (this.bossCalled) return;
    const r = this.rounds;
    this.platTime += dt;
    if (r.pending[r.started - 1] > 0) return; // a última onda ainda está entrando
    if (this.aliveCount() > PLAT_GATE) return; // mapa cheio demais: a próxima espera
    this.waveGap = (this.waveGap ?? WAVE_GAP) - dt;
    if (this.waveGap <= 0) {
      this.waveGap = null;
      // acabaram as PLAT_WAVES ondas: vem o chefão (na platina infinita, mais uma onda)
      if (r.canStart) this.startRound();
      else if (this.endless) this.endlessWave();
      else this.callBoss();
    }
  }

  // ── Platina infinita ──
  // Venceu a platina e tocou em CONTINUAR: a partida segue (mesmas defesas,
  // dinheiro e pontos) com ondas sem fim, cada vez mais cheias e com mais vida
  continueEndless() {
    if (!this.canContinue) return;
    this.canContinue = false;
    this.endless = true;
    this.endlessK = 0;
    // as 4 últimas ondas da platina (sem chefões) são a base das infinitas
    this.endlessBase = platinumRounds(this.map).slice(-4).map((w) => withoutBosses(w).map(({ finale, hpMul, ...g }) => g));
    this.state = 'playing';
    this.endDelay = 0;
    this.winIn = null;
    this.bossCalled = false;
    this.waveGap = WAVE_GAP;
    this.showBanner(t('PLATINA INFINITA'), 2.6, '#bdeeff', 46, t('Ondas sem fim: até onde você aguenta?'));
    this.sound.play('round');
  }

  // Mais uma onda infinita (a cada ENDLESS.bossEvery, com chefão)
  endlessWave() {
    const k = ++this.endlessK;
    this.rounds.rounds.push(this.makeEndlessWave(k));
    this.startRound();
    if (k % ENDLESS.bossEvery === 0) {
      this.shake(8);
      this.showBanner(t('CHEFÃO!'), 2, '#ff5a6a', 56, t('Onda infinita {n}', { n: k }));
    }
  }

  // A k-ésima onda infinita (já com a dificuldade do mapa aplicada): a base
  // crescendo exponencial (ENDLESS em data/platinum.js), minichefões que vão
  // aumentando e, a cada ENDLESS.bossEvery ondas, chefões
  makeEndlessWave(k) {
    const r = this.rounds;
    const E = ENDLESS;
    const grow = Math.min(E.countMax, E.count ** k);
    const hp = r.mod.hp * E.hp ** k;
    const base = this.endlessBase[(k - 1) % this.endlessBase.length];
    const wave = r.scale(base.map((g) => ({ ...g, count: g.count * grow, gap: g.gap / grow, hp })));
    // minichefões no meio da onda (Locker e Cicada intercalados, a Cicada é CICADA_SHARE deles)
    const minis = k >= E.miniFrom ? 1 + Math.floor((k - E.miniFrom) / E.miniEvery) : 0;
    for (let i = 0; i < minis; i++) {
      const cicada = Math.floor((i + 1) * CICADA_SHARE) > Math.floor(i * CICADA_SHARE);
      wave.push({ type: cicada ? 'cicada' : 'locker', count: 1, gap: 0, at: 3 + i * 2.5, hp: hp * AGENDA_HP });
    }
    // chefão a cada bossEvery ondas: o do fim da platina, cada vez mais forte
    // e com mais companhia; entram depois de todo mundo (finale)
    if (k % E.bossEvery === 0) {
      const n = k / E.bossEvery;
      // o 1º vem 20% mais fraco que o do fim da platina (agora tem companhia)
      const bossHp = BOSS_HP * Math.sqrt(this.pressure) * platinumScale(this.mapIndex) * 0.8 * E.bossHp ** (n - 1);
      // o 1º do grupo é o chefão; os outros (Lockers de escolta) têm vida de minichefão
      platinumBoss(this.map).forEach((g, j) => {
        for (let i = 0; i < g.count; i++) wave.push({ type: g.type, count: 1, gap: 0, finale: true, hp: j === 0 ? bossHp : hp * AGENDA_HP });
      });
      const ransom = Math.floor((n - 1) / 2);
      const adware = Math.floor((n - 1) / 3);
      // (cada chefão do fim é um grupo: o RoundManager solta 1 por grupo finale)
      for (let i = 0; i < ransom; i++) wave.push({ type: 'ransomware', count: 1, gap: 0, finale: true, hp: bossHp * 0.6 });
      for (let i = 0; i < adware; i++) wave.push({ type: 'adware', count: 1, gap: 0, finale: true, hp: bossHp * 0.5 });
    }
    return wave;
  }

  // Grupos da próxima onda que ainda não começou (prévia do painel): a da
  // lista; na platina, depois da última, o chefão; na infinita, a próxima
  // infinita. null = não tem próxima (ou o chefão já veio)
  nextWaveGroups() {
    const r = this.rounds;
    if (r.canStart) return r.rounds[r.started];
    if (!this.platinum || this.bossCalled) return null;
    if (this.endless) return this.makeEndlessWave(this.endlessK + 1);
    return platinumBoss(this.map);
  }

  // Vírus vivos no mapa agora (inclusive os que acabaram de nascer)
  aliveCount() {
    let n = 0;
    for (const e of this.enemies) if (!e.dead) n++;
    for (const e of this.newEnemies) if (!e.dead) n++;
    return n;
  }

  callBoss() {
    this.bossCalled = true;
    this.rounds.finishWith(platinumBoss(this.map), BOSS_HP * Math.sqrt(this.pressure) * platinumScale(this.mapIndex));
    this.rounds.start();
    this.shake(8);
    this.showBanner(t('CHEFÃO!'), 2, '#ff5a6a', 56, t('Derrote ele pra ganhar a platina'));
    this.sound.play('round');
  }

  // Ondas que faltam pro chefão (modo platina)
  get platLeft() {
    return Math.max(0, PLAT_WAVES - this.rounds.started);
  }

  onRoundEnd(n) {
    // passou da 1ª onda: agora a partida gasta a energia (sair, reiniciar ou
    // perder antes disso não gasta nada)
    this.payEnergy();
    if (this.bounty) {
      this.endBounty(); // estourou tudo antes do tempo
      return;
    }
    if (this.platinum) {
      // platina: o bônus da onda já veio quando ela começou (elas se acumulam)
      if (this.rounds.finished && !this.endless) this.winIn = WIN_DELAY;
      return;
    }
    const bonus = 100 + n;
    this.money += bonus;
    this.coinBump = 1;
    // mapa limpo: os Mineradores entregam na hora o que faltou minerar
    if (!this.rounds.active) for (const t of this.towers) t.finishMining(this);
    if (this.rounds.finished) {
      this.winIn = WIN_DELAY;
      // sobrou a Cicada: a vitória só vem com ela morta
      if (this.anyAlive()) this.showBanner(t('ÚLTIMA RODADA!'), 2.4, '#3dff9a', 36, t('Derrote a Cicada 3301 pra vencer'));
      return;
    }
    this.sound.play('roundEnd');
    this.showBanner(t('RODADA {n} COMPLETA!', { n }), 1.6, '#3dff9a', 36, `+$${bonus}`);
    // mapa limpo: com turno automático, a próxima começa na hora (no passo
    // seguinte, depois de os Mineradores entregarem o que faltou minerar)
    if (!this.rounds.active && this.autoRound) this.nextIn = 0;
  }

  get autoRound() {
    return this.app.save?.autoRound !== false;
  }

  // Ligou/desligou o turno automático no menu com o mapa parado
  autoChanged() {
    if (this.rounds.active || !this.rounds.canStart || this.rounds.started === 0) return;
    this.nextIn = this.autoRound ? 0 : null;
  }

  // Dinheiro de um vírus estourado (Bug Bounty não dá; platina dá PLAT_REWARD
  // vezes mais, e a Recompensa turbinada do desafio do dia também, guardando o quebrado pra próxima). Com a posição (x, y), cai
  // uma moeda no chão ali (dropCoin); sem ela, entra direto na carteira
  earnPop(reward, x, y) {
    if (this.bounty) return;
    let value = reward;
    // platina e Recompensa turbinada (desafio do dia): mais dinheiro por vírus
    const k = (this.platinum ? PLAT_REWARD : 1) * modMul(this.mods, 'reward');
    if (k !== 1) {
      this.popCents = (this.popCents ?? 0) + reward * k;
      value = Math.floor(this.popCents);
      this.popCents -= value;
    }
    if (value <= 0) return;
    if (x == null) this.money += value;
    else this.dropCoin(x, y, value);
  }

  // Moeda de vírus no chão (entities/Packet.js): fica até o jogador tocar
  // ou DROP_WAIT s. Pra não encher o mapa, junta com uma que ainda está no
  // chão a menos de COIN_MERGE px (soma o valor e ela cresce); com
  // COIN_MAX moedas no chão, junta com a mais perto, esteja onde estiver
  dropCoin(x, y, value) {
    const ground = this.packets.filter((p) => p.drop && p.state !== 'flying');
    let into = null;
    let best = Infinity;
    for (const p of ground) {
      const d = Math.hypot(p.toX - x, p.toY - y);
      if (d < best) [best, into] = [d, p];
    }
    if (into && (best < COIN_MERGE || ground.length >= COIN_MAX)) {
      into.value += value;
      into.bump = 1;
      return;
    }
    this.packets.push(new Packet(x, y, value, false, true));
  }

  // Toque no mapa: recolhe as moedas do chão em volta (x, y do mapa)
  tapCoins(x, y) {
    let got = false;
    for (const p of this.packets) {
      if (!p.drop || p.state === 'flying' || Math.hypot(p.x - x, p.y - y) > p.size + COIN_TAP) continue;
      p.collect();
      got = true;
      this.tally.coins++;
    }
    if (got) this.sound.play('click');
    return got;
  }

  // Ainda tem vírus vivo no mapa (conta quem não segura a onda, como a Cicada)
  anyAlive() {
    return this.enemies.some((e) => !e.dead) || this.newEnemies.some((e) => !e.dead);
  }

  // Bônus por chamar a próxima rodada com outra ainda rolando:
  // uma parte do dinheiro que os vírus dela valem, proporcional ao que
  // ainda falta da rodada atual (com 1 vírus sobrando, é só $1)
  earlyBonus() {
    if (this.platinum || this.bounty || !this.rounds.active || !this.canCall()) return 0;
    const roundValue = (r) => this.rounds.rounds[r].reduce((sum, g) => sum + g.count * worth(g.type), 0);
    const cur = this.rounds.done;
    const alive = (e) => !e.dead && e.round === cur && !e.def.lingers;
    let left = this.rounds.queue.reduce((sum, q) => sum + (q.round === cur && !ENEMIES[q.type].lingers ? worth(q.type) : 0), 0);
    for (const e of this.enemies) if (alive(e)) left += worth(e.type);
    for (const e of this.newEnemies) if (alive(e)) left += worth(e.type);
    const frac = Math.min(1, left / roundValue(cur));
    return Math.max(1, Math.round(roundValue(this.rounds.started) * EARLY_BONUS * frac));
  }

  // Dá pra chamar a próxima com no máximo 1 rodada rolando
  // (a 3 só depois de acabar com os vírus da 1)
  canCall() {
    if (this.platinum || this.bounty) return this.rounds.started === 0; // depois da 1ª, elas vêm sozinhas
    return this.rounds.canStart && this.rounds.started - this.rounds.done < 2;
  }

  // Botão de rodada: começa a próxima (mesmo com outra rolando)
  playPressed() {
    if (this.callCooldown > 0 || !this.rounds.canStart) return;
    if (this.platinum && this.rounds.started > 0) return;
    if (!this.canCall()) {
      this.fx.text(this.mapW / 2 - this.offsetX, VIEW_H / 2, t('Acabe com a rodada {n} primeiro!', { n: this.rounds.done + 1 }), '#ff7a8a', 22);
      this.sound.play('error');
      return;
    }
    this.callCooldown = 0.6; // evita chamar duas sem querer num toque duplo
    this.startRound();
  }

  // Velocidades do botão: 1x, 2x, 3x e, com a Placa-Mãe toda platinada, 5x
  get speeds() {
    return this.app.seasonPlatinum?.(0) ? [...SPEEDS, TURBO_SPEED] : SPEEDS;
  }

  speedPressed() {
    const list = this.speeds;
    this.speed = list[(list.indexOf(this.speed) + 1) % list.length];
    this.sound.play('click');
    this.tutorial?.on('speed');
  }

  // Acelerado e um vírus que faria perder (tira todas as vidas que sobram)
  // está chegando na base: volta pra 1x pra dar tempo de salvar. Cada vírus
  // avisa uma vez só (dá pra acelerar de novo)
  checkDanger() {
    for (const e of this.enemies) {
      if (e.dead || e.dangerSeen) continue;
      // pela distância que falta no caminho (por tempo, os rápidos avisavam lá longe)
      if (e.remaining > DANGER_TILES * TILE || e.threat < this.lives) continue;
      e.dangerSeen = true;
      this.speed = 1;
      this.toast = { text: t('PERIGO! Velocidade normal'), time: 2.6, tone: 'alert' };
      this.sound.play('error');
      return;
    }
  }

  startRound() {
    const bonus = this.earlyBonus();
    if (!this.rounds.start()) return;
    if (this.rounds.started === 1) this.firstRoundAt = this.anim; // some o aviso das entradas
    this.tutorial?.on('round');
    this.nextIn = null;
    for (const t of this.towers) t.onRoundStart();
    if (bonus > 0) {
      this.money += bonus;
      this.coinBump = 1;
    }
    // Juros (Dark Net): rende uma parte do dinheiro guardado (no Bug Bounty não)
    const interest = this.app.perks?.minerador4 && !this.bounty && this.money > 0 ? Math.min(INTEREST.max, Math.floor(this.money * INTEREST.rate)) : 0;
    if (interest > 0) {
      this.money += interest;
      this.coinBump = 1;
    }
    const juros = interest > 0 ? t('Juros: +${n}', { n: interest }) : null;
    if (this.platinum) {
      // a partir da 2ª onda, o bônus de rodada vem no começo de cada uma
      const wave = this.rounds.started;
      const pay = wave > 1 ? 100 + wave - 1 : 0;
      if (pay) {
        this.money += pay;
        this.coinBump = 1;
      }
      this.showBanner(t('ONDA {n}', { n: wave }), 0.9, '#bdeeff', 36, [pay ? `+$${pay}` : null, juros].filter(Boolean).join(' · ') || null);
    }
    else this.showBanner(t('RODADA {n}', { n: this.rounds.started }), 1.1, '#ffffff', 46, [bonus > 0 ? t('Chamou antes: +${n}', { n: bonus }) : null, juros].filter(Boolean).join(' · ') || null);
    this.sound.play('round');
  }

  coinTarget() {
    return { x: 30 - this.offsetX, y: 72 };
  }

  // ── Consultas usadas pelas defesas ────────────────────────

  isVisible(e) {
    return e.x > -this.offsetX - 5 && (!e.def.stealth || e.revealed);
  }

  // Spyware: só aparece (e pode levar dano) no alcance de um Robô NMAP
  revealStealth() {
    for (const e of this.enemies) {
      if (!e.def.stealth) continue;
      e.revealed = this.towers.some((t) => t.stats.reveals && !t.dead && Math.hypot(e.x - t.x, e.y - t.y) <= t.stats.range + e.r);
    }
  }

  // Cicada 3301: os vírus dentro da aura de criptografia ficam protegidos
  // (e.shielded: não levam dano). Uma Cicada não protege a outra
  encryptAuras() {
    const auras = this.enemies.filter((c) => c.def.aura && !c.dead);
    for (const e of this.enemies) {
      e.shielded = !e.def.aura && auras.some((c) => Math.hypot(e.x - c.x, e.y - c.y) <= c.def.aura + e.r * 0.5);
    }
  }

  // Nota de cada vírus pro modo de mira da defesa (maior = alvo).
  // Nos modos por atributo, o empate vai pro mais perto da base.
  score(tower, e, d) {
    switch (tower.targetMode) {
      case 'last': return e.remaining;
      case 'strong': return e.threat * 1e5 - e.remaining; // dano que dá se chegar
      case 'hp': return e.maxHp * 1e5 - e.remaining; // vida máxima, não a atual
      case 'fast': return e.speed * 1e5 - e.remaining;
      case 'close': return -d;
      default: return -e.remaining;
    }
  }

  findTargets(tower, n) {
    const range = tower.stats.range;
    const armored = tower.hitsArmored;
    const list = [];
    for (const e of this.enemies) {
      if (e.dead || !this.isVisible(e)) continue;
      if (e.def.armored && !armored) continue;
      const d = Math.hypot(e.x - tower.x, e.y - tower.y);
      if (d > range + e.r) continue;
      // protegido pela Cicada: só vira alvo se não tiver outro
      list.push({ e, score: this.score(tower, e, d) - (e.shielded ? 1e12 : 0) });
    }
    list.sort((a, b) => b.score - a.score);
    return list.slice(0, n).map((x) => x.e);
  }

  findTarget(tower) {
    return this.findTargets(tower, 1)[0] ?? null;
  }

  enemiesInRange(x, y, range) {
    return this.enemies
      .filter((e) => !e.dead && this.isVisible(e) && Math.hypot(e.x - x, e.y - y) <= range + e.r)
      .sort((a, b) => a.remaining - b.remaining);
  }

  spawnEnemy(enemy) {
    this.newEnemies.push(enemy);
    // ameaça nova entra no catálogo (e avisa no topo da tela)
    if (this.app.discover?.(enemy.type)) this.toast = { text: t('NOVA AMEAÇA NO CATÁLOGO: {name}', { name: enemy.def.name.toUpperCase() }), time: 5, total: 5, threat: enemy.type };
  }

  spawnProjectile(tower, angle, target = null) {
    this.projectiles.push(new Projectile(tower, angle, target));
    this.sound.play(tower.def.sound ?? 'throw');
  }

  // O Minerador consegue minerar onde está? Nas seasons 1 e 2 só em cima
  // de uma pilha de bitcoin (core/coinTiles.js; uma defesa por quadrado,
  // então um Minerador por pilha). Na season 3 minera em qualquer lugar
  // (vai precisar de upgrade: TODO)
  canMine(tower) {
    if (this.map.season >= COIN_SEASONS) return true;
    return !!coinTileAt(this.coinTiles, tower.x, tower.y);
  }

  // Toque de Midas (Minerador nível 3): cada vírus que entra na rodada tem a
  // chance de vir dourado (cada Minerador minerando com o upgrade rola a sua).
  // Destruído, solta uma moeda de goldenValue (Enemy.pop)
  rollGolden(enemy) {
    if (this.bounty) return; // Bug Bounty: vírus não dão dinheiro
    for (const t of this.towers) {
      const s = t.stats;
      if (!s.goldenChance || !this.canMine(t)) continue;
      if (Math.random() < s.goldenChance) {
        enemy.golden = s.goldenValue;
        return;
      }
    }
  }

  spawnPacket(x, y, value, big = false) {
    this.packets.push(new Packet(x, y, value, big));
  }

  // ── Defesas: colocar, selecionar, upgrade, vender ─────────

  // Cada defesa ocupa 1 quadrado da grade (core/grid.js): o ponto vale pelo
  // quadrado onde cai. Fora do caminho (o Honeypot é o contrário: só nele),
  // fora do servidor e dos obstáculos, em terra e sem outra defesa ali.
  canPlace(type, x, y) {
    const def = TOWERS[type];
    const [c, r] = tileOf(x, y);
    if (!inGrid(c, r)) return false;
    const k = tileKey(c, r);
    const v = this.view;
    if (v.serverTiles.has(k) || v.blockedTiles.has(k)) return false;
    if (!!def.onPath !== v.pathTiles.has(k)) return false;
    if (!def.onPath) {
      const p = snapToTile(x, y);
      if (!fitsTerrain(this.map, p.x, p.y, 10, 'land')) return false;
    }
    return this.towers.every((t) => tileKey(...tileOf(t.x, t.y)) !== k);
  }

  // Empréstimo (Dark Net): crédito da partida inteira (LOAN, + LOAN_EXTRA com
  // o Crédito Extra). Cada compra que passa do dinheiro que tem gasta do
  // crédito só o que faltou; dá pra usar em várias compras até acabar
  // (devolver o dinheiro depois não recarrega)
  get creditMax() {
    const p = this.app.perks;
    if (!p?.minerador4b || this.bounty) return 0;
    return LOAN + (p.minerador4d ? LOAN_EXTRA : 0);
  }

  get creditLeft() {
    return Math.max(0, this.creditMax - (this.creditUsed ?? 0));
  }

  // Quanto do crédito uma compra gasta (o que falta do dinheiro que tem)
  borrowFor(cost) {
    return Math.max(0, cost - Math.max(0, this.money));
  }

  // Dá pra pagar? Com dinheiro, ou completando com o crédito do Empréstimo
  canAfford(cost) {
    if (this.money >= cost) return true;
    return this.borrowFor(cost) <= this.creditLeft;
  }

  // Paga (o que faltar sai do crédito do Empréstimo)
  pay(cost) {
    this.creditUsed = (this.creditUsed ?? 0) + this.borrowFor(cost);
    this.money -= cost;
  }

  // Preço da defesa com os descontos da Dark Net (GPU de Segunda Mão)
  // Defesa indisponível nesta partida: o aliado bloqueado da platina ou as
  // que ainda não existem no tutorial (1-1)
  isLocked(type) {
    if (this.bounty && type === 'minerador') return true; // Bug Bounty: sem renda
    return type === this.blocked || !!this.lockedTowers?.has(type);
  }

  costOf(type) {
    if (this.freeTower) return 0; // consumível Defesa Grátis: a próxima sai de graça
    let cost = applyPerks({ ...TOWERS[type] }, type, this.app.perks).cost;
    // Inflação (desafio do dia): mais caras, de 5 em 5
    const k = modMul(this.mods, 'cost');
    if (k !== 1) cost = Math.round((cost * k) / 5) * 5;
    // Atacadão (Dark Net, Minerador): todas as defesas mais baratas
    return this.app.perks?.minerador2d ? Math.round(cost * (1 - BULK_DISCOUNT)) : cost;
  }

  place(type, x, y) {
    const cost = this.costOf(type);
    if (this.isLocked(type) || this.commanderFull(type) || !this.canAfford(cost) || !this.canPlace(type, x, y)) return false;
    ({ x, y } = snapToTile(x, y)); // a defesa fica no centro do quadrado
    this.pay(cost);
    this.freeTower = false; // (se era a grátis, já usou)
    const tower = new Tower(type, x, y, !this.rounds.active);
    tower.spent = cost; // vende pelo que pagou
    // bônus da Dark Net pra essa defesa (por cima dos status e dos upgrades)
    tower.perks = this.app.perks ?? {};
    tower.refresh();
    if (tower.stats.hp) tower.hp = tower.maxHp = tower.stats.hp;
    if (this.rounds.active) tower.onRoundStart();
    this.towers.push(tower);
    this.placedBy[type] = (this.placedBy[type] ?? 0) + 1;
    this.tutorial?.on('place', type);
    this.fx.burst(x, y, '#ffffff', 14, 160, 0.35, 5, true);
    this.sound.play('place');
    this.placing = null;
    buzz(12);
    return true;
  }

  towerAt(x, y) {
    let best = null;
    for (const t of this.towers) if (Math.hypot(t.x - x, t.y - (y + 8)) < t.r + 12) best = t;
    return best;
  }

  buyUpgrade(tower) {
    const up = tower.nextUpgrade;
    if (!up) return;
    if (!this.canAfford(up.cost)) {
      this.fx.text(tower.x, tower.y - 50, t('Sem dinheiro!'), '#ff7a8a', 18);
      this.sound.play('error');
      return;
    }
    this.pay(up.cost);
    tower.upgrade();
    this.tally.upgrades++;
    this.tutorial?.on('upgrade', tower.type);
    this.fx.burst(tower.x, tower.y - 10, '#ffd23f', 22, 190, 0.55, 5, true);
    this.sound.play('upgrade');
  }

  // Adware abre um anúncio enorme num lugar sorteado da tela (sem repetir o
  // último tipo). Com a chance `crypt`, vem o criptografado: o X dele foge
  // pra outra borda uma vez antes de fechar
  spawnAd(e) {
    const cfg = e.def.ads;
    if (this.ads.filter((a) => a.closing == null).length >= cfg.max) return;
    const normal = ADS.length - 1; // os tipos comuns vêm antes do criptografado
    let type = chance(cfg.crypt) ? CRYPT_AD : Math.floor(Math.random() * normal);
    if (type !== CRYPT_AD && type === this.lastAd) type = (type + 1) % normal;
    this.lastAd = type;
    const s = adScale(this.viewW);
    const { w, h } = adSize(s);
    const speed = 70 + Math.random() * 50;
    this.ads.push({
      type, s, w, h, ...adSpot(this.viewW, w, h, this.ads), t: 0, seed: Math.random() * 10,
      vx: chance(cfg.moving) ? (chance(0.5) ? speed : -speed) : 0,
      closeAt: 0,
      dodges: type === CRYPT_AD ? 1 : 0,
    });
    this.sound.play('star');
  }

  // Anúncios: entram pulando, os que andam batem nas bordas. Ficam até o
  // jogador fechar no X (mesmo depois de o Adware morrer)
  updateAds(dt) {
    if (!this.ads.length) return;
    for (const ad of this.ads) {
      ad.t += dt;
      if (ad.closing != null) ad.closing -= dt;
      if (!ad.vx) continue;
      ad.x += ad.vx * dt;
      if (ad.x < 8 || ad.x > this.viewW - ad.w - 8) {
        ad.vx = -ad.vx;
        ad.x = Math.max(8, Math.min(this.viewW - ad.w - 8, ad.x));
      }
    }
    this.ads = this.ads.filter((ad) => ad.closing == null || ad.closing > 0);
  }

  // Toque num anúncio (o de cima primeiro): o X fecha (o do criptografado
  // ainda foge pra outra borda enquanto tiver `dodges`); no resto do anúncio
  // (corpo ou botão) abre a enxurrada de anúncios (startAdStorm)
  adTap(sx, sy) {
    for (let i = this.ads.length - 1; i >= 0; i--) {
      const ad = this.ads[i];
      if (ad.closing != null || sx < ad.x || sx > ad.x + ad.w || sy < ad.y || sy > ad.y + ad.h) continue;
      // clicou no anúncio (fora do X): a música trava e vem a enxurrada
      if (!inRect(adClose(ad), sx, sy)) {
        this.startAdStorm();
        return true;
      }
      if (ad.dodges > 0) {
        ad.dodges--;
        let to = Math.floor(Math.random() * (CLOSE_SPOTS.length - 1));
        if (to >= ad.closeAt) to++; // sempre outra borda
        ad.closeAt = to;
        this.sound.play('error');
      } else {
        ad.closing = 0.18;
        this.sound.play('click');
      }
      return true;
    }
    return false;
  }

  // Caiu no anúncio: a música trava e os anúncios brotam cada vez mais
  // rápido até cobrir a tela; aí é game over (updateAdStorm)
  startAdStorm() {
    if (this.adStorm || this.state !== 'playing') return;
    this.adStorm = { t: 0, next: 0, n: 0 };
    this.sound.crashMusic?.();
    this.shake(6);
  }

  // Roda no tempo de verdade (não acelera com o 2x/3x)
  updateAdStorm(dt) {
    const st = this.adStorm;
    st.t += dt;
    st.next -= dt;
    while (st.next <= 0 && st.n < STORM.max) {
      const s0 = adScale(this.viewW);
      const s = s0 * (0.45 + Math.random() * 0.55);
      const { w, h } = adSize(s);
      this.ads.push({ type: Math.floor(Math.random() * (ADS.length - 1)), s, s0, w, h, ...adSpot(this.viewW, w, h, this.ads), t: 0, seed: Math.random() * 10, vx: 0, closeAt: 0, dodges: 0, snap: true });
      if (st.n % 3 === 0) this.sound.play(st.n % 2 ? 'error' : 'star');
      st.n++;
      st.next += Math.max(STORM.minGap, STORM.gap * STORM.accel ** st.n);
    }
    if (st.t >= STORM.time) {
      this.end(false);
    }
  }

  // Ransomware andou um quadrado: com defesa no alcance, sorteia a chance da
  // partida (a 1ª é certa; depois cai pra odds[N] e sobe step por quadrado)
  rollRansom(e) {
    const rs = e.def.ransom;
    this.ransomOdds ??= rs.odds[0];
    if (this.ransomTargets(e).length && chance(this.ransomOdds)) {
      this.ransomLocks++;
      this.ransomOdds = rs.odds[Math.min(this.ransomLocks, rs.odds.length - 1)];
      this.ransom(e);
    } else this.ransomOdds = Math.min(1, this.ransomOdds + rs.step);
  }

  // Ransomware: defesas no alcance dele que ainda não estão criptografadas
  ransomTargets(e) {
    const R = e.def.ransom.range * TILE;
    return this.towers.filter((t) => !t.dead && !t.ransom && Math.hypot(t.x - e.x, t.y - e.y) <= R);
  }

  // Ransomware para e treme um instante (CAST_TIME) e criptografa as defesas
  // em volta (param até pagar o resgate)
  ransom(e) {
    const rs = e.def.ransom;
    e.quake = CAST_TIME;
    this.shake(6);
    this.sound.play('zap');
    this.fx.ring(e.x, e.y, rs.range * TILE, 'ransom');
    this.fx.text(e.x, e.y - e.r - 24, t('CRIPTOGRAFADO!'), '#3dff9a', 20);
    for (const t of this.ransomTargets(e)) {
      t.ransom = rs.price;
      this.fx.burst(t.x, t.y - 20, '#3dff9a', 12, 140, 0.5, 3);
    }
  }

  // Paga o resgate de uma defesa criptografada: ela volta a funcionar
  payRansom(tower) {
    if (!tower.ransom) return false;
    if (!this.canAfford(tower.ransom)) {
      this.fx.text(tower.x, tower.y - 50, t('Sem dinheiro!'), '#ff7a8a', 16);
      this.sound.play('error');
      return false;
    }
    this.pay(tower.ransom);
    tower.ransom = 0;
    tower.spawnAnim = 1;
    this.fx.burst(tower.x, tower.y - 20, '#ffd23f', 14, 160, 0.5, 4, true);
    this.sound.play('upgrade');
    return true;
  }

  sell(tower) {
    if (tower.def.noSell) return; // Honeypot não vende
    this.money += tower.sellValue;
    tower.dead = true;
    this.towers = this.towers.filter((t) => t !== tower);
    this.selectedTower = null;
    this.fx.burst(tower.x, tower.y, '#ffd23f', 16, 160, 0.4, 5, true);
    this.fx.text(tower.x, tower.y - 40, `+$${tower.sellValue}`, '#ffd23f', 20);
    this.sound.play('sell');
  }

  // ── Input (coordenadas de tela já convertidas) ────────────

  key(k) {
    if (k === ' ' && this.state === 'playing' && (!this.tutorial || this.tutorial.done)) this.playPressed();
    else if ((k === 'b' || k === 'B') && this.state === 'playing') this.burnout();
    else if (k === 'Escape') {
      if (this.state === 'paused') this.resume();
      else this.pause();
    }
  }

  pointerDown(sx, sy, type = 'touch') {
    Object.assign(this.pointer, { x: sx, y: sy, down: true, type });
    if (this.state !== 'playing') return this.overlayTap(sx, sy);
    if (this.tutorial?.tap(sx, sy)) return; // tutorial: fala continua; fora do alvo não passa
    if (this.adTap(sx, sy)) return; // anúncio por cima: o toque não passa
    if (this.toast?.threat && this.toastInfo && inRect(this.toastInfo, sx, sy)) return this.openThreat(this.toast.threat);

    const L = layout(this);
    if (sx >= L.panel.x) return this.panelTap(sx, sy, L);
    if (inRect(L.pause, sx, sy)) return this.pause();
    if (this.commanders.length && inRect(L.burnout, sx, sy)) return this.burnout();
    // aba de informações da defesa: a alça abre/recolhe; tocar na aba não mexe no mapa
    const info = infoLayout(this);
    if (info && inRect(info.toggle, sx, sy)) return this.app.toggleInfo?.();
    if (info?.open && inRect(info.card, sx, sy)) return;

    const mx = sx - this.offsetX;
    // moeda no chão: o toque recolhe (antes de bater em vírus ou escolher defesa)
    if (!this.placing && this.tapCoins(mx, sy)) return;
    if (this.placing) {
      // decide no pointerUp: toque rápido coloca ali, arrastar ajusta a posição
      this.drag = { type: this.placing, x: sx, y: sy, moved: false, fromMap: true };
      return;
    }
    if (this.tapEnemy(mx, sy, type)) return; // tocou num vírus: bate nele
    this.inspect = null; // tocar no mapa fecha a defesa que estava só sendo olhada
    const tw = this.towerAt(mx, sy);
    if (tw) this.sound.play('click');
    this.selectedTower = tw;
    if (tw) this.tutorial?.on('select', tw.type);
  }

  // "i" do aviso de vírus novo: pausa e abre o catálogo na ficha dele (o
  // voltar do catálogo traz a partida pausada)
  openThreat(type) {
    this.toast = null;
    this.pause();
    this.app.go(() => new CatalogScene(this.app, { returnTo: this, select: type }));
  }

  // Toque do jogador num vírus: TAP.damage no mais perto do dedo (só 1 por
  // toque). Spyware escondido não conta (isVisible); quem voa é tocado onde
  // aparece, lá no alto. Protegido pela aura da Cicada não leva (takeDamage)
  tapEnemy(x, y, type) {
    const s = (this.tapStats ??= applyPerks({ damage: TAP.damage, critChance: 0, executeChance: 0, splashChance: 0, slowChance: 0 }, 'tap', this.app.perks ?? {}));
    const slack = type === 'mouse' ? TAP.slackMouse : TAP.slackTouch;
    let best = null;
    let bestD = Infinity;
    for (const e of this.enemies) {
      if (e.dead || !this.isVisible(e)) continue;
      const cy = e.y - (e.def.flying ? 30 : e.r * 0.3); // centro de onde ele é desenhado
      const d = Math.hypot(e.x - x, cy - y);
      if (d <= e.r + slack && d < bestD) {
        best = e;
        bestD = d;
      }
    }
    if (!best) return false;
    // ramo do Toque (Dark Net): crítico, estourar tudo, respingo e choque
    const crit = chance(s.critChance);
    const hit = (e) => {
      if (!e.def.boss && chance(s.executeChance)) e.takeDamage(Infinity, this, { armored: true });
      else e.takeDamage(s.damage * (crit ? 2 : 1), this, { armored: true });
      if (chance(s.slowChance)) e.slow(0.5, 2);
    };
    hit(best);
    if (chance(s.splashChance)) {
      const near = this.enemies
        .filter((e) => e !== best && !e.dead && this.isVisible(e) && Math.hypot(e.x - best.x, e.y - best.y) <= TAP.splash)
        .sort((a, b) => Math.hypot(a.x - best.x, a.y - best.y) - Math.hypot(b.x - best.x, b.y - best.y))[0];
      if (near) {
        hit(near);
        this.fx.spark(near.x, near.y - near.r, '#9fe8ff', 8);
      }
    }
    this.fx.spark(x, y, crit ? '#ffd23f' : '#ffffff', crit ? 14 : 10);
    this.sound.play('tap');
    this.tally.taps++;
    return true;
  }

  overlayTap(sx, sy) {
    const L = overlayLayout(this);
    if (this.state === 'paused') {
      if (inRect(L.resume, sx, sy)) this.resume();
      else if (inRect(L.restart, sx, sy)) {
        // desafio do dia: não reinicia, DESISTIR sai (a tentativa já foi)
        if (this.daily) this.leave();
        else this.app.startMap(this.mapIndex, this.mode);
      } else if (inRect(L.maps, sx, sy)) {
        // desafio do dia: o DIÁRIO só mostra a tela e volta pra esta partida
        if (this.daily) {
          this.sound.play('click');
          this.app.goDaily(this);
        } else this.leave();
      }
      else if (inRect(L.catalog, sx, sy)) {
        // catálogo por cima da partida: o voltar dele traz esta partida, ainda pausada
        this.sound.play('click');
        this.app.go(() => new CatalogScene(this.app, { returnTo: this }));
      } else if (inRect(L.music, sx, sy) || inRect(L.sfx, sx, sy)) {
        // barra de volume: toca ou arrasta
        this.volDrag = inRect(L.music, sx, sy) ? 'music' : 'sfx';
        this.app.setVolume(this.volDrag, sliderValue(L[this.volDrag], sx));
      } else if (inRect(L.auto, sx, sy)) this.app.toggleAuto();
      else if (inRect(L.lang, sx, sy)) {
        // idioma: troca na hora (a partida pausada já aparece no idioma novo)
        this.app.setLanguage(lang() === 'pt' ? 'en' : 'pt');
        this.sound.play('click');
      }
      return;
    }
    if (this.endDelay > 0) return;
    if (L.double && inRect(L.double, sx, sy)) return this.doubleCoffee();
    if (L.revive && inRect(L.revive, sx, sy)) return this.reviveAd();
    if (inRect(L.maps, sx, sy)) this.leave();
    else if (L.cont && inRect(L.cont, sx, sy)) this.continueEndless(); // platina infinita
    else if (L.retry && inRect(L.retry, sx, sy)) this.app.startMap(this.mapIndex, 'normal'); // tentar as 3 estrelas
    else if (L.next && inRect(L.next, sx, sy)) {
      // venceu: vai pro próximo mapa (normal); perdeu: tenta de novo no mesmo modo
      if (this.state === 'won' && this.nextMap) this.app.startMap(this.mapIndex + 1);
      else this.app.startMap(this.mapIndex, this.state === 'won' && !this.bounty && !this.daily ? 'normal' : this.mode);
    }
  }

  // Botão MAPAS (pausa e fim): o desafio do dia volta pra tela DIÁRIO
  leave() {
    if (this.daily) this.app.goDaily();
    else this.app.goMaps();
  }

  panelTap(sx, sy, L) {
    if (inRect(L.play, sx, sy)) return this.playPressed();
    if (inRect(L.speed, sx, sy)) return this.speedPressed();

    const tw = this.selectedTower;
    if (tw) {
      if (inRect(L.close, sx, sy)) {
        this.selectedTower = null;
        this.sound.play('click');
      } else if (inRect(L.sell, sx, sy)) this.sell(tw);
      else if (tw.ransom) {
        if (inRect(L.ransom, sx, sy)) this.payRansom(tw); // criptografada: só o resgate (sem upgrade nem alvo)
      } else if (tw.def.targeting && inRect(L.target, sx, sy)) {
        const i = TARGET_MODES.findIndex((m) => m.id === tw.targetMode);
        tw.targetMode = TARGET_MODES[(i + 1) % TARGET_MODES.length].id;
        this.sound.play('click');
      } else {
        tw.def.upgrades.forEach((_, i) => {
          if (inRect(L.upgrades[i], sx, sy) && tw.level === i) this.buyUpgrade(tw);
        });
      }
      return;
    }

    // abas DEFESAS / ITENS (sempre à mostra; ir pra ITENS larga a defesa escolhida)
    const tab = L.tabs.find((r) => inRect(r, sx, sy));
    if (tab) {
      if (tab.id !== this.panelTab) {
        this.panelTab = tab.id;
        if (tab.id === 'items') this.placing = this.inspect = null;
        this.sound.play('click');
      }
      this.tutorial?.on('tab', tab.id);
      return;
    }
    if (this.panelTab === 'items') {
      const tile = L.items.find((r) => inRect(r, sx, sy));
      if (tile) this.itemTapped(tile);
      return;
    }

    for (const tile of L.tiles) {
      if (!inRect(tile, sx, sy)) continue;
      const def = TOWERS[tile.type];
      if (this.isLocked(tile.type)) {
        this.fx.panelText(tile.x + tile.w / 2, tile.y + 30, t('Bloqueado!'), '#ff7a8a', 16);
        this.sound.play('error');
        return;
      }
      if (this.commanderFull(tile.type)) {
        this.fx.panelText(tile.x + tile.w / 2, tile.y + 30, t('Máx. {n}!', { n: COMMANDER_MAX }), '#ff7a8a', 16);
        this.sound.play('error');
        return;
      }
      const toggleOff = this.placing === tile.type;
      if (!toggleOff && !this.canAfford(this.costOf(tile.type))) {
        this.fx.panelText(tile.x + tile.w / 2, tile.y + 30, t('Sem dinheiro!'), '#ff7a8a', 16);
        this.sound.play('error');
        // mesmo sem dinheiro dá pra ver os atributos na aba de informações
        // (tocar de novo na mesma defesa fecha)
        this.inspect = this.inspect === tile.type ? null : tile.type;
        this.placing = null;
        return;
      }
      this.inspect = null;
      this.placing = tile.type;
      this.drag = { type: tile.type, x: sx, y: sy, moved: false, fromMap: false, toggleOff };
      this.sound.play('click');
      return;
    }
  }

  // Card da aba ITENS: usa o consumível e avisa no toast (texto em cima do
  // card ficaria por baixo do painel)
  itemTapped(tile) {
    const item = ITEM[tile.id];
    if (this.platinum) {
      this.toast = { text: t('Na platina não dá pra usar itens'), time: 2.2, tone: 'alert' };
      this.sound.play('error');
      return;
    }
    if (this.mods.includes('noitems')) {
      this.toast = { text: t('Desafio de hoje: sem itens'), time: 2.2, tone: 'alert' };
      this.sound.play('error');
      return;
    }
    const lives = BACKUP_LIVES;
    if (!((this.app.inventory?.[tile.id] ?? 0) > 0)) {
      this.toast = { text: t('Sem {item}! Compre na LOJA, na tela de mapas', { item: item.name }), time: 2.6, tone: 'alert' };
      this.sound.play('error');
      return;
    }
    if (useConsumable(this, tile.id)) {
      this.tutorial?.on('item', tile.id);
      trackDesign(`Item:Use:${tile.id}`);
      const done = { cash: `+$${CASH}`, free: t('a próxima defesa sai de graça'), freeze: t('vírus congelados'), lives: `+${lives} ${plural(lives, t('vida'), t('vidas'))}` };
      this.toast = { text: `${item.name.toUpperCase()}: ${done[tile.id] ?? t('usado')}`, time: 2.2 };
      if (tile.id === 'free') this.panelTab = 'towers'; // Defesa Grátis: já volta pras defesas pra escolher
    } else {
      // não deu pra usar agora (o item não foi gasto)
      const why = { free: t('Já tem uma defesa grátis esperando'), freeze: t('Nenhum vírus pra congelar'), cash: t('No Bug Bounty é só o orçamento') };
      this.toast = { text: why[tile.id] ?? t('Agora não dá pra usar'), time: 2.2, tone: 'alert' };
    }
  }

  pointerMove(sx, sy, type = 'touch') {
    Object.assign(this.pointer, { x: sx, y: sy, type });
    if (this.volDrag && this.state === 'paused') this.app.setVolume(this.volDrag, sliderValue(overlayLayout(this)[this.volDrag], sx));
    const d = this.drag;
    if (d && !d.moved && Math.hypot(sx - d.x, sy - d.y) > 10) d.moved = true;
  }

  pointerUp(sx, sy) {
    this.pointer.down = false;
    if (this.volDrag) {
      this.volDrag = null;
      this.sound.play('click'); // dá pra ouvir o volume novo dos efeitos
    }
    const d = this.drag;
    this.drag = null;
    if (!d || this.state !== 'playing') return;
    const overMap = sx < this.mapW;
    if (d.moved) {
      if (!overMap) this.placing = null; // soltou de volta no painel: cancela
      else this.tryPlace(d.type, sx - this.offsetX, sy - (this.pointer.type === 'mouse' ? 0 : TOUCH_LIFT));
    } else if (d.fromMap) {
      this.tryPlace(d.type, sx - this.offsetX, sy);
    } else if (d.toggleOff) {
      this.placing = null;
    }
  }

  tryPlace(type, x, y) {
    // tutorial: só no quadrado que a mãozinha mostra
    if (this.tutorial && !this.tutorial.allowPlace(type, x, y)) {
      this.tutorial.nudge = 1;
      this.fx.text(x, y - 30, t('Coloque no quadrado indicado!'), '#ff7a8a', 18);
      this.sound.play('error');
      return;
    }
    if (this.place(type, x, y)) return;
    const def = TOWERS[type];
    const why = this.commanderFull(type) ? t('Máx. {n} comandantes!', { n: COMMANDER_MAX }) : def.onPath ? t('Só no caminho!') : t('Aqui não dá!');
    this.fx.text(x, y - 30, why, '#ff7a8a', 18);
    this.sound.play('error');
  }

  pointerCancel() {
    this.pointer.down = false;
    this.drag = null;
  }

  // Onde a defesa "fantasma" aparece enquanto escolhe o lugar
  ghost() {
    if (!this.placing || this.state !== 'playing') return null;
    const p = this.pointer;
    const dragging = this.drag?.moved;
    if (!dragging && p.type !== 'mouse') return null;
    if (p.x >= this.mapW) return null;
    const lift = dragging && p.type !== 'mouse' ? TOUCH_LIFT : 0;
    const raw = { x: p.x - this.offsetX, y: p.y - lift };
    // a prévia já aparece encaixada no quadrado onde a defesa vai ficar
    const [c, r] = tileOf(raw.x, raw.y);
    return inGrid(c, r) ? { ...snapToTile(raw.x, raw.y), raw } : null;
  }

  // ── Desenho ───────────────────────────────────────────────

  render(ctx) {
    const t = this.anim;
    const shx = this.shakeAmt ? rand(-1, 1) * this.shakeAmt : 0;
    const shy = this.shakeAmt ? rand(-1, 1) * this.shakeAmt : 0;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, this.mapW, VIEW_H);
    ctx.clip();
    ctx.translate(shx, shy);
    this.view.draw(ctx, this.app.pixelScale);
    ctx.translate(this.offsetX, 0);
    this.view.animate(ctx, t);
    // coisas do chão (zonas elétricas e pilhas de bitcoin): a rua elevada é
    // redesenhada por cima delas, então o topo de uma rua logo abaixo tapa a
    // parte de baixo (perspectiva)
    drawHazards(ctx, this.hazards, t);
    drawCoinTiles(ctx, this.coinTiles, t, TOWERS[this.placing]?.attack === 'farm', this.towers);
    ctx.save();
    ctx.translate(-this.offsetX, 0);
    this.view.drawPath(ctx);
    ctx.restore();
    drawSpawns(ctx, this, t);

    ctx.save();
    ctx.translate(this.server.x, this.server.y);
    drawServer(ctx, t, this.hurt);
    ctx.restore();

    const sel = this.selectedTower;
    if (sel) drawRange(ctx, sel.x, sel.y, sel.stats.range, true, sel.def.attack === 'aura' ? 'rgba(255,207,74,0.2)' : null);

    // raio do Executivo: laranja meio transparente (onde ele acelera; mais
    // forte no BURNOUT). Criptografado ou atordoado não acelera: some
    for (const tw of this.towers) if (tw.def.commander && !tw.ransom && !(tw.stunned > 0)) drawCommandZone(ctx, tw, t, tw.burnLeft > 0);

    // armadilhas ficam no chão, embaixo dos vírus
    for (const tw of this.towers) if (tw.def.onPath) this.drawTowerAt(ctx, tw);
    // moedas dos vírus no chão (as que já voam pra carteira vão por cima do HUD)
    for (const p of this.packets) if (p.drop && p.state !== 'flying') this.drawPacket(ctx, p);

    // vírus e defesas ordenados pela altura (quem está mais embaixo fica na frente)
    const things = [
      ...this.enemies.map((e) => ({ y: e.y, e })),
      ...this.towers.filter((tw) => !tw.def.onPath).map((tw) => ({ y: tw.y, tw })),
    ].sort((a, b) => a.y - b.y);
    for (const th of things) {
      if (th.tw) {
        this.drawTowerAt(ctx, th.tw);
        // patrocinada por um Minerador: moedinha girando em cima
        if (this.sponsorBonus(th.tw)) {
          ctx.save();
          ctx.translate(th.tw.x + 16, th.tw.y - 50 + Math.sin(t * 3) * 2);
          drawCoin(ctx, 7, t * 2);
          ctx.restore();
        }
        continue;
      }
      const e = th.e;
      ctx.save();
      ctx.translate(e.x + (e.quake > 0 ? Math.sin(this.anim * 70) * 4 * Math.min(1, e.quake * 3) : 0), e.y); // treme lançando o Ransomware
      if (e.def.stealth && !e.revealed) ctx.globalAlpha = 0.25; // Spyware escondido: quase transparente
      if (e.def.aura) drawAura(ctx, e, t); // aura de criptografia da Cicada 3301
      drawEnemy(ctx, e);
      if (e.shielded) drawShielded(ctx, e, t);
      ctx.restore();
      if (e.def.boss && !e.def.topBar) drawBossBar(ctx, e); // (Ransomware: barra no topo, drawBossBars)
      if (e.vulnTimer > 0) drawVulnerable(ctx, e, t);
      if (e.markTimer > 0) drawMarked(ctx, e, t);
    }

    for (const p of this.projectiles) {
      ctx.save();
      ctx.translate(p.x, p.y);
      drawProjectile(ctx, p, t);
      ctx.restore();
    }

    this.fx.draw(ctx);

    const g = this.ghost();
    if (g) {
      const def = TOWERS[this.placing];
      const valid = this.canPlace(this.placing, g.x, g.y) && this.canAfford(this.costOf(this.placing));
      drawTileMark(ctx, g.x, g.y, valid);
      if (Number.isFinite(def.range) && def.range > 0) drawRange(ctx, g.x, g.y, def.range, valid);
      else drawRange(ctx, g.x, g.y, def.radius + 8, valid);
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.translate(g.x, g.y);
      drawCharacter(ctx, this.placing, { t, face: 1, level: 0 });
      ctx.restore();
      if (!def.onPath && this.hazards.at(g.x, g.y)) drawHazardWarning(ctx, g.x, g.y);
      // Minerador fora da pilha de bitcoin: avisa que ali ele não minera
      if (def.attack === 'farm' && this.map.season < COIN_SEASONS && !coinTileAt(this.coinTiles, g.x, g.y)) drawNoMine(ctx, g.x, g.y, t);
    }
    ctx.restore();

    drawHud(ctx, this);
    // Pato de Borracha boiando no canto de baixo do mapa
    if (this.app.perks?.duck) {
      ctx.save();
      ctx.translate(30, VIEW_H - 24);
      drawDuck(ctx, 13, { t, hop: this.duckHop });
      ctx.restore();
    }

    // moedas voando até o contador (por cima do HUD)
    ctx.save();
    ctx.translate(this.offsetX, 0);
    for (const p of this.packets) if (!p.drop || p.state === 'flying') this.drawPacket(ctx, p);
    ctx.restore();

    drawInfoPanel(ctx, this); // antes do painel: a alça recolhida "entra" embaixo dele
    drawPanel(ctx, this);
    this.fx.drawPanelTexts(ctx); // "Sem dinheiro!" nos cards: por cima do painel
    drawAds(ctx, this); // por cima do mapa e do painel
    drawTutorial(ctx, this); // fala do Hacker e a mãozinha (1-1)
    if (this.toast) drawToast(ctx, this);
    drawBanner(ctx, this);
    drawOverlay(ctx, this);
    this.fx.drawConfetti(ctx);
  }

  // Moeda (minerada ou de vírus): no chão gira devagar, com sombra e um
  // pulinho quando junta outra; voando pra carteira fica menor
  drawPacket(ctx, p) {
    const r = p.state === 'flying' ? Math.min(11, p.size) : p.size;
    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.drop && p.state === 'resting') {
      ctx.fillStyle = 'rgba(10,20,30,0.25)';
      ctx.beginPath();
      ctx.ellipse(0, r * 0.95, r * 0.8, r * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.translate(0, -Math.sin(p.bump * Math.PI) * 6);
    }
    drawCoin(ctx, r, p.spin);
    ctx.restore();
  }

  drawTowerAt(ctx, tw) {
    ctx.save();
    ctx.translate(tw.x, tw.y);
    const idle = tw.def.attack === 'farm' && !this.canMine(tw); // Minerador fora da pilha
    // criptografada: "verde de terminal", apagada e parada (desenho guardado)
    if (tw.ransom) drawEncryptedBody(ctx, tw.type, tw.level, tw.face);
    else drawCharacter(ctx, tw.type, { t: tw.anim, face: tw.face, attack: tw.def.commander && tw.burnLeft > 0 ? 1 : tw.attack, pulse: tw.pulse, spawn: tw.spawnAnim, level: tw.level, idle });
    if (tw.ransom) drawEncrypted(ctx, this.anim, tw.ransom);
    if (idle) drawNoMine(ctx, 0, 0, this.anim);
    if (tw.def.attack === 'decoy' && tw.hp < tw.maxHp) drawBaitBar(ctx, tw);
    if (tw.stunned > 0) drawStunned(ctx, this.anim);
    if (tw.haste > 1) drawHasted(ctx, this.anim, tw.haste, !!tw.burning, tw.type);
    ctx.restore();
  }
}

// Defesa que acelera com o Executivo e o BURNOUT: as que atacam com recarga
// (não o Executivo, o Minerador nem a isca)
const hastes = (t) => t.def.attack === 'projectile' || t.def.attack === 'beam' || t.def.attack === 'pulse';

// Vibraçãozinha no celular (Android). Onde não existe, não faz nada.
function buzz(ms) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // sem vibração
  }
}

// Quadrado onde a defesa vai ficar (verde = pode, vermelho = não pode)
function drawTileMark(ctx, x, y, valid) {
  const h = TILE / 2 - 2;
  rrect(ctx, x - h, y - h, h * 2, h * 2, 8);
  ctx.fillStyle = valid ? 'rgba(80,255,150,0.22)' : 'rgba(255,70,90,0.25)';
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = valid ? 'rgba(120,255,170,0.9)' : 'rgba(255,110,120,0.9)';
  ctx.stroke();
}

// Aviso de ameaça nova (catálogo), no topo do mapa
// Aviso no topo (nova ameaça, perigo...): no meio da tela, colado em cima
// (ou logo abaixo das barras de chefão), do tamanho do texto
function drawToast(ctx, game) {
  const toast = game.toast;
  // no meio da tela, mas sem passar por cima do contador de rodada (direita do mapa)
  game.toastInfo = terminalToast(ctx, {
    text: toast.text,
    cx: game.viewW / 2,
    y: Math.max(8, bossBarsBottom(game) + 6),
    maxRight: game.mapW - 150,
    alpha: Math.min(1, toast.time * 2, ((toast.total ?? 3) - toast.time) * 4),
    tone: toast.tone,
    t: game.anim,
    info: !!toast.threat, // vírus novo: "i" abre o catálogo nele
  });
}

// Vida da isca (Honeypot), em cima dela, quando começa a apanhar
function drawBaitBar(ctx, tw) {
  const w = 34;
  rrect(ctx, -w / 2, -34, w, 8, 4);
  fillOutline(ctx, '#2a1840', 2.5);
  const k = Math.max(0, tw.hp / tw.maxHp);
  if (k > 0) {
    rrect(ctx, -w / 2 + 1.5, -32.5, (w - 3) * k, 5, 2.5);
    ctx.fillStyle = k > 0.5 ? '#ffc62e' : '#ff7a3d';
    ctx.fill();
  }
}

// Vírus protegido pela aura da Cicada 3301: anel verde e um cadeadinho
function drawShielded(ctx, e, t) {
  const pulse = 0.5 + Math.sin(t * 6 + e.phase) * 0.5;
  circle(ctx, 0, -e.r * 0.3, e.r + 5);
  ctx.lineWidth = 2;
  ctx.strokeStyle = `rgba(61,255,154,${0.5 + 0.4 * pulse})`;
  ctx.stroke();
  ctx.save();
  ctx.translate(e.r * 0.8, -e.r * 1.1);
  ICONS.lock(ctx, 6);
  ctx.restore();
}

function drawBossBar(ctx, e) {
  const w = e.r * 2;
  const x = e.x - w / 2;
  const y = e.y - e.r - 34 - (e.def.flying ? 80 : 0); // quem voa tem a barra mais alta (acima das asas)
  rrect(ctx, x, y, w, 12, 6);
  fillOutline(ctx, '#2a1840', 3);
  const k = Math.max(0, e.hp / (e.maxHp ?? e.def.hp));
  if (k > 0) {
    rrect(ctx, x + 2, y + 2, (w - 4) * k, 8, 4);
    ctx.fillStyle = '#ff4d6d';
    ctx.fill();
  }
}

// Mira vermelha girando em volta do vírus marcado (Marcar Alvo do Robô NMAP)
function drawMarked(ctx, e, t) {
  const r = e.r + 7 + Math.sin(t * 8) * 1.5;
  const cy = e.y - e.r * 0.3;
  ctx.save();
  ctx.translate(e.x, cy);
  ctx.rotate(t * 1.5);
  ctx.globalAlpha = Math.min(1, e.markTimer * 3); // some no fim
  ctx.lineCap = 'round';
  for (const [w, color] of [[5, 'rgba(26,16,40,0.85)'], [2.5, '#ff4d6d']]) {
    ctx.lineWidth = w;
    ctx.strokeStyle = color;
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      ctx.beginPath();
      ctx.arc(0, 0, r, a + 0.25, a + Math.PI / 2 - 0.25);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * (r - 6), Math.sin(a) * (r - 6));
      ctx.lineTo(Math.cos(a) * (r + 5), Math.sin(a) * (r + 5));
      ctx.stroke();
    }
  }
  ctx.restore();
}

// Selinho "x2" em cima do vírus: está vulnerável e leva dano dobrado (Era do Gelo)
function drawVulnerable(ctx, e, t) {
  const x = e.x - e.r * 0.8;
  const y = e.y - e.r - (e.def.boss ? 30 : 18) + Math.sin(t * 6) * 1.5;
  circle(ctx, x, y, 10);
  fillOutline(ctx, '#3ec5ff', 2.5);
  text(ctx, `+${Math.round((e.vulnMul - 1) * 100)}%`, x, y + 1, { size: 9 }); // tudo em % (regra do jogo)
}

