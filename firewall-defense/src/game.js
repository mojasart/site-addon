import { VIEW_H, PANEL_W, SPEEDS, TURBO_SPEED, DANGER_TILES, TAP, EARLY_BONUS, EARLY_WAVES } from './config.js';
import { MAPS, BOUNTY_MAPS } from './data/maps.js';
import { roundsFor } from './data/rounds.js';
import { PLAT_WAVES, PLAT_LIVES, PLAT_WARMUP, PLAT_REWARD, WAVE_GAP, BOSS_HP, platinumScale, blockedAlly, platinumRounds, platinumBoss } from './data/platinum.js';
import { worth, ENEMIES } from './data/enemies.js';
import { BOUNTY, bountyRound, layers, comboMul, bountyStars } from './data/bounty.js';
import { TOWERS, TARGET_MODES, COMMANDER_MAX, BURNOUT } from './data/towers.js';
import { applyPerks, ROOT_MONEY, DUCK, INTEREST, LOAN } from './data/darknet.js';
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
import { inRect, sliderValue } from './render/widgets.js';
import { drawBanner, drawOverlay, overlayLayout } from './render/screens.js';
import { drawInfoPanel, infoLayout } from './render/infoPanel.js';
import { drawCharacter } from './render/characters.js';
import { drawEnemy, drawAura } from './render/viruses.js';
import { drawProjectile, drawCoin, drawServer, ICONS } from './render/sprites.js';
import { drawHazards, drawStunned, drawHazardWarning } from './render/hazards.js';
import { drawEncrypted, ENCRYPT_FILTER } from './render/ransom.js';
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

const TOUCH_LIFT = 46; // ao arrastar com o dedo, a defesa aparece acima dele
const BASE_HIT = 24; // raio da hitbox do servidor (ele ocupa 1 quadrado)
const CAST_TIME = 0.5; // Ransomware fica parado tremendo esse tempo ao criptografar
const WIN_DELAY = 0.5; // limpou a última rodada: espera o último vírus estourar de vez antes da vitória

// A partida em si (uma fase). Criada pelo App ao escolher um mapa.
// mode: 'normal', 'platinum' (ondas sem parar até o chefão; data/platinum.js)
// ou 'bounty' (sala do Bug Bounty: mapIndex = season; data/bounty.js)
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
    this.map = this.bounty ? BOUNTY_MAPS[mapIndex] : MAPS[mapIndex];
    this.anim = 0;
    this.pointer = { x: -1, y: -1, down: false, type: 'touch' };
    this.drag = null;
    this.resize(app.viewW);
    this.reset();
  }

  get viewW() { return this.app.viewW; }
  get path() { return this.view.path; }
  get server() { return this.view.server; }
  get spawnDist() { return this.view.spawnDist; }
  get offsetX() { return this.view.offsetX; }
  get nextMap() { return this.bounty ? null : MAPS[this.mapIndex + 1] ?? null; }

  resize(viewW) {
    const mapW = viewW - PANEL_W;
    if (this.view?.mapW !== mapW) this.view = new MapView(this.map, mapW);
    this.mapW = mapW;
  }

  reset() {
    // Acesso Root (Dark Net): dinheiro a mais no começo da fase
    // Bug Bounty: só o orçamento da partida (sem o Acesso Root)
    this.money = this.bounty ? BOUNTY.budget[this.map.season] : this.map.money + (this.app.perks?.root ? ROOT_MONEY : 0);
    this.lives = this.platinum ? PLAT_LIVES : this.bounty ? Infinity : this.map.lives;
    this.towers = [];
    this.coinTiles = pickCoinTiles(this); // pilhas de bitcoin (seasons 1 e 2)
    this.enemies = [];
    this.newEnemies = [];
    this.projectiles = [];
    this.packets = [];
    // platina: as ondas ganham a dificuldade calibrada do modo (k)
    const k = this.platinum ? platinumScale(this.mapIndex) : 1;
    const list = this.platinum ? platinumRounds(this.map) : this.bounty ? [bountyRound(this.map.d)] : roundsFor(this.map);
    this.rounds = new RoundManager(list, {
      count: this.bounty ? 1 : this.map.pressure * k, // Bug Bounty: a quantidade já vem pronta
      minCount: this.platinum ? 0 : 1,
      early: this.platinum || this.bounty ? null : EARLY_WAVES, // modo normal: primeiras ondas mais cheias
      // platina: a dificuldade k enche as ondas sem esticar elas (intervalo ÷ k)
      gap: this.map.gapMul / (this.platinum ? Math.max(1, k) : 1),
      warmup: this.platinum ? { k, waves: PLAT_WARMUP } : null, // platina: as primeiras ondas pegam leve
      speed: this.map.speedMul,
      hp: this.map.pressure * k, // chefões e worms acompanham a pressão
    });
    this.fx = new Effects();
    this.hazards = new Hazards(this.map.hazards);
    this.spawnFlash = this.map.routes.map(() => 0); // clarão de cada entrada ao soltar um vírus
    this.speed = 1;
    this.nextIn = null; // turno automático: 0 = a próxima rodada começa no próximo passo (null = espera o jogador)
    this.callCooldown = 0;
    this.burnoutLeft = 0; // BURNOUT ligado: segundos que faltam
    this.burnoutCd = 0; // segundos até poder usar o BURNOUT de novo
    this.placing = null; // tipo de defesa sendo posicionada
    this.inspect = null; // defesa da loja só sendo olhada (sem dinheiro pra comprar): mostra os atributos
    this.selectedTower = null;
    this.panelTab = 'towers'; // aba do painel: towers (DEFESAS) | items (ITENS)
    this.banner = null;
    this.hurt = 0;
    this.duckHop = 0; // pulinho do Pato de Borracha quando acha café
    this.duckCoffee = 0; // café que ele achou nesta partida
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
    this.lockedTowers = this.mapIndex === 0 && this.mode === 'normal' ? new Set(TUTORIAL_LOCKED) : null;
    this.tutorial = Tutorial.wanted(this) ? new Tutorial(this) : null;
    if (this.platinum) {
      this.showBanner('MODO PLATINA', 3, '#bdeeff', 46, `${TOWERS[this.blocked].name} bloqueado · chefão depois da onda ${PLAT_WAVES}`);
      return;
    }
    if (this.bounty) {
      this.showBanner('BUG BOUNTY', 3, '#ffd23f', 50, `5 minutos com $${this.money}: vírus não dão dinheiro!`);
      return;
    }
    // mapa com novidade (várias entradas, loop, zonas...) avisa no começo
    const special = this.map.entries > 1 || this.map.loop || this.map.hazards?.length;
    this.showBanner(this.map.name, 2.6, '#ffffff', 46, special ? this.map.desc : 'Arraste as defesas pro mapa!');
  }

  // Estrelas que a partida daria se vencesse com a vida de agora: 3 com 90%
  // das vidas ou mais, 2 com pelo menos metade, 1 com menos (cor da vida no HUD)
  get starsNow() {
    const L = this.map.lives;
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
        this.stars = 3; // vencer a platina já vale as 3 (em platina)
        const hadTurbo = this.app.seasonPlatinum?.(0);
        this.app.recordPlatinum?.(this.map.id);
        // fechou a platina da Placa-Mãe agora: libera o 5x (aviso na vitória)
        this.turboUnlocked = !hadTurbo && !!this.app.seasonPlatinum?.(0);
      }
      this.app.recordStars(this.map.id, this.stars);
      this.fx.celebrate(this.viewW, VIEW_H);
      this.sound.play('win');
      for (let i = 0; i < this.stars; i++) setTimeout(() => this.sound.play('star'), 500 + i * 350);
    } else this.sound.play('lose');
    // cafés novos da partida: o que passou do recorde do mapa e os monstros
    // abatidos (data/darknet.js)
    this.bankKills();
    this.coffeeGain = (this.app.coffeeEarned ?? 0) - coffeeBefore + this.duckCoffee; // (o do pato já entrou no save durante a partida)
  }

  // Monstros abatidos viram cafés: soma no save os desta partida que ainda
  // não foram contados (no fim da partida e ao sair dela no meio)
  bankKills() {
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
    this.burnoutLeft = Math.max(0, this.burnoutLeft - dt);
    this.burnoutCd = Math.max(0, this.burnoutCd - dt);
    const bosses = this.activeCommanders;
    const burning = this.burnoutLeft > 0;
    for (const t of this.towers) {
      // só quem ataca com recarga acelera (não o Executivo, o Minerador nem a isca)
      if (!hastes(t)) {
        t.haste = 1;
        t.teamRecharge = 0;
        continue;
      }
      let aura = 0;
      let near = false;
      let recharge = 0; // Hora Extra (Dark Net): o melhor Executivo que alcança
      for (const c of bosses) {
        if (Math.hypot(c.x - t.x, c.y - t.y) > c.stats.range) continue;
        near = true;
        aura = Math.max(aura, c.stats.haste);
        recharge = Math.max(recharge, c.stats.teamRecharge ?? 0);
      }
      t.teamRecharge = recharge;
      // BURNOUT: só no raio de um Executivo
      t.haste = (1 + aura) * (burning && near ? 1 + BURNOUT.haste : 1);
    }
  }

  // Executivos que estão mandando (criptografado ou atordoado não manda)
  get activeCommanders() {
    return this.commanders.filter((c) => !c.ransom && !(c.stunned > 0));
  }

  // Botão do BURNOUT: com um Executivo no mapa, a cada BURNOUT.cooldown s
  get canBurnout() {
    return this.commanders.length > 0 && this.burnoutCd <= 0 && this.state === 'playing';
  }

  burnout() {
    if (!this.canBurnout) {
      if (this.commanders.length) this.sound.play('error');
      return;
    }
    // o melhor Executivo manda (Meta Agressiva: dura mais e recarrega antes)
    const best = (key) => Math.max(0, ...this.commanders.map((c) => c.stats[key] ?? 0));
    this.burnoutLeft = BURNOUT.time + best('burnoutExtra');
    this.burnoutCd = this.burnoutMax = BURNOUT.cooldown - best('burnoutFaster');
    // Virada de Noite (Dark Net): às vezes o BURNOUT fica pronto de novo assim que este acaba
    if (chance(best('burnoutFree'))) this.burnoutCd = this.burnoutLeft;
    const bosses = this.activeCommanders;
    for (const t of this.towers) {
      if (!hastes(t) || !bosses.some((c) => Math.hypot(c.x - t.x, c.y - t.y) <= c.stats.range)) continue;
      t.spawnAnim = 1;
      this.fx.burst(t.x, t.y - 20, '#ff9a2e', 10, 150, 0.45, 4, true);
    }
    for (const c of this.commanders) {
      c.attack = 1; // punho pra cima
      this.fx.ring(c.x, c.y, c.stats.range, 'boost');
      this.fx.text(c.x, c.y - 56, 'BURNOUT!', '#ff9a2e', 18);
    }
    this.sound.play('burnout');
    buzz(30);
  }

  // Canto do botão do BURNOUT, em coordenadas de tela: embaixo à direita, a
  // não ser que o caminho, uma entrada de vírus ou a base passem ali; aí vai
  // pro canto que menos cobre o caminho
  get abilitySpot() {
    if (this.abilityFor === this.view) return this.ability;
    const W = POWER_BTN;
    const H = POWER_BTN;
    const left = this.app.perks?.duck ? 62 : 12;
    const right = this.mapW - 12 - W;
    const spots = [
      { x: right, y: VIEW_H - 12 - H },
      { x: left, y: VIEW_H - 12 - H },
      { x: right, y: VIEW_H - 24 - 2 * H },
      { x: left, y: 100 },
    ];
    const v = this.view;
    const covers = (s) => {
      let n = 0;
      for (let x = s.x - 10; x <= s.x + W + 10; x += TILE / 4) {
        for (let y = s.y - 10; y <= s.y + H + 10; y += TILE / 4) {
          const k = tileKey(...tileOf(x - this.offsetX, y));
          if (v.pathTiles.has(k) || v.serverTiles.has(k)) n++;
        }
      }
      return n;
    };
    let best = spots[0];
    let least = Infinity;
    for (const s of spots) {
      const n = covers(s);
      if (n < least) [best, least] = [s, n];
      if (n === 0) break;
    }
    this.ability = best;
    this.abilityFor = this.view;
    return this.ability;
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
      if (this.combo >= BOUNTY.comboStep) this.fx.text(this.server.x, this.server.y - 40, 'COMBO PERDIDO', '#ff7a8a', 18);
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
    if (!this.bounty) return;
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

  // Platina: a próxima onda começa assim que a anterior termina de entrar;
  // no fim do tempo (ou das ondas) vem o chefão
  platinumStep(dt) {
    if (this.bossCalled) return;
    const r = this.rounds;
    this.platTime += dt;
    if (r.pending[r.started - 1] > 0) return; // a última onda ainda está entrando
    this.waveGap = (this.waveGap ?? WAVE_GAP) - dt;
    if (this.waveGap <= 0) {
      this.waveGap = null;
      // acabaram as PLAT_WAVES ondas: vem o chefão
      if (r.canStart) this.startRound();
      else this.callBoss();
    }
  }

  callBoss() {
    this.bossCalled = true;
    this.rounds.finishWith(platinumBoss(this.map), BOSS_HP * Math.sqrt(this.map.pressure) * platinumScale(this.mapIndex));
    this.rounds.start();
    this.shake(8);
    this.showBanner('CHEFÃO!', 2, '#ff5a6a', 56, 'Derrote ele pra ganhar a platina');
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
      if (this.rounds.finished) this.winIn = WIN_DELAY;
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
      if (this.anyAlive()) this.showBanner('ÚLTIMA RODADA!', 2.4, '#3dff9a', 36, 'Derrote a Cicada 3301 pra vencer');
      return;
    }
    this.sound.play('roundEnd');
    this.showBanner(`RODADA ${n} COMPLETA!`, 1.6, '#3dff9a', 36, `+$${bonus}`);
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
  // vezes mais, guardando o quebrado pra próxima). Com a posição (x, y), cai
  // uma moeda no chão ali (dropCoin); sem ela, entra direto na carteira
  earnPop(reward, x, y) {
    if (this.bounty) return;
    let value = reward;
    if (this.platinum) {
      this.popCents = (this.popCents ?? 0) + reward * PLAT_REWARD;
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
      this.fx.text(this.mapW / 2 - this.offsetX, VIEW_H / 2, `Acabe com a rodada ${this.rounds.done + 1} primeiro!`, '#ff7a8a', 22);
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
      this.toast = { text: 'PERIGO! Velocidade normal', time: 2.6 };
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
    // Juros (Dark Net): rende uma parte do dinheiro guardado (na platina e no
    // Bug Bounty não: na platina são 50 ondas emendadas, renderia demais)
    const interest = this.app.perks?.minerador4 && this.mode === 'normal' && this.money > 0 ? Math.min(INTEREST.max, Math.floor(this.money * INTEREST.rate)) : 0;
    if (interest > 0) {
      this.money += interest;
      this.coinBump = 1;
    }
    const juros = interest > 0 ? `Juros: +$${interest}` : null;
    if (this.platinum) {
      // a partir da 2ª onda, o bônus de rodada vem no começo de cada uma
      const wave = this.rounds.started;
      const pay = wave > 1 ? 100 + wave - 1 : 0;
      if (pay) {
        this.money += pay;
        this.coinBump = 1;
      }
      this.showBanner(`ONDA ${wave}`, 0.9, '#bdeeff', 36, [pay ? `+$${pay}` : null, juros].filter(Boolean).join(' · ') || null);
    }
    else this.showBanner(`RODADA ${this.rounds.started}`, 1.1, '#ffffff', 46, [bonus > 0 ? `Chamou antes: +$${bonus}` : null, juros].filter(Boolean).join(' · ') || null);
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
    if (this.app.discover?.(enemy.type)) this.toast = { text: `NOVA AMEAÇA NO CATÁLOGO: ${enemy.def.name.toUpperCase()}`, time: 5, total: 5, threat: enemy.type };
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

  // Dá pra pagar? Com o Empréstimo (Dark Net), 1 vez por partida o dinheiro
  // pode ficar até LOAN no negativo
  canAfford(cost) {
    if (this.money >= cost) return true;
    return !!this.app.perks?.minerador4b && !this.bounty && !this.loanUsed && this.money - cost >= -LOAN;
  }

  // Paga (usando o empréstimo da partida se faltar dinheiro)
  pay(cost) {
    if (this.money < cost) this.loanUsed = true;
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
    return applyPerks({ ...TOWERS[type] }, type, this.app.perks).cost;
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
      this.fx.text(tower.x, tower.y - 50, 'Sem dinheiro!', '#ff7a8a', 18);
      this.sound.play('error');
      return;
    }
    this.pay(up.cost);
    tower.upgrade();
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
    this.fx.text(e.x, e.y - e.r - 24, 'CRIPTOGRAFADO!', '#3dff9a', 20);
    for (const t of this.ransomTargets(e)) {
      t.ransom = rs.price;
      this.fx.burst(t.x, t.y - 20, '#3dff9a', 12, 140, 0.5, 3);
    }
  }

  // Paga o resgate de uma defesa criptografada: ela volta a funcionar
  payRansom(tower) {
    if (!tower.ransom) return false;
    if (!this.canAfford(tower.ransom)) {
      this.fx.text(tower.x, tower.y - 50, 'Sem dinheiro!', '#ff7a8a', 16);
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
    return true;
  }

  overlayTap(sx, sy) {
    const L = overlayLayout(this);
    if (this.state === 'paused') {
      if (inRect(L.resume, sx, sy)) this.resume();
      else if (inRect(L.restart, sx, sy)) this.app.startMap(this.mapIndex, this.mode);
      else if (inRect(L.maps, sx, sy)) this.app.goMaps();
      else if (inRect(L.catalog, sx, sy)) {
        // catálogo por cima da partida: o voltar dele traz esta partida, ainda pausada
        this.sound.play('click');
        this.app.go(() => new CatalogScene(this.app, { returnTo: this }));
      } else if (inRect(L.music, sx, sy) || inRect(L.sfx, sx, sy)) {
        // barra de volume: toca ou arrasta
        this.volDrag = inRect(L.music, sx, sy) ? 'music' : 'sfx';
        this.app.setVolume(this.volDrag, sliderValue(L[this.volDrag], sx));
      } else if (inRect(L.auto, sx, sy)) this.app.toggleAuto();
      return;
    }
    if (this.endDelay > 0) return;
    if (inRect(L.maps, sx, sy)) this.app.goMaps();
    else if (L.retry && inRect(L.retry, sx, sy)) this.app.startMap(this.mapIndex, 'normal'); // tentar as 3 estrelas
    else if (inRect(L.next, sx, sy)) {
      // venceu: vai pro próximo mapa (normal); perdeu: tenta de novo no mesmo modo
      if (this.state === 'won' && this.nextMap) this.app.startMap(this.mapIndex + 1);
      else this.app.startMap(this.mapIndex, this.state === 'won' && !this.bounty ? 'normal' : this.mode);
    }
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

    // abas DEFESAS / ITENS (com o nome da defesa no lugar delas, o toque ali não troca)
    if (!this.placing && !this.inspect) {
      const tab = L.tabs.find((r) => inRect(r, sx, sy));
      if (tab) {
        if (tab.id !== this.panelTab) {
          this.panelTab = tab.id;
          this.sound.play('click');
        }
        this.tutorial?.on('tab', tab.id);
        return;
      }
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
        this.fx.panelText(tile.x + tile.w / 2, tile.y + 30, 'Bloqueado!', '#ff7a8a', 16);
        this.sound.play('error');
        return;
      }
      if (this.commanderFull(tile.type)) {
        this.fx.panelText(tile.x + tile.w / 2, tile.y + 30, `Máx. ${COMMANDER_MAX}!`, '#ff7a8a', 16);
        this.sound.play('error');
        return;
      }
      const toggleOff = this.placing === tile.type;
      if (!toggleOff && !this.canAfford(this.costOf(tile.type))) {
        this.fx.panelText(tile.x + tile.w / 2, tile.y + 30, 'Sem dinheiro!', '#ff7a8a', 16);
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
      this.toast = { text: 'Na platina não dá pra usar itens', time: 2.2 };
      this.sound.play('error');
      return;
    }
    const lives = BACKUP_LIVES;
    if (!((this.app.inventory?.[tile.id] ?? 0) > 0)) {
      this.toast = { text: `Sem ${item.name}! Compre na LOJA, na tela de mapas`, time: 2.6 };
      this.sound.play('error');
      return;
    }
    if (useConsumable(this, tile.id)) {
      this.tutorial?.on('item', tile.id);
      const done = { cash: `+$${CASH}`, free: 'a próxima defesa sai de graça', freeze: 'vírus congelados', lives: `+${lives} ${plural(lives, 'vida', 'vidas')}` };
      this.toast = { text: `${item.name.toUpperCase()}: ${done[tile.id] ?? 'usado'}`, time: 2.2 };
    } else {
      // não deu pra usar agora (o item não foi gasto)
      const why = { free: 'Já tem uma defesa grátis esperando', freeze: 'Nenhum vírus pra congelar', cash: 'No Bug Bounty é só o orçamento' };
      this.toast = { text: why[tile.id] ?? 'Agora não dá pra usar', time: 2.2 };
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
      this.fx.text(x, y - 30, 'Coloque no quadrado indicado!', '#ff7a8a', 18);
      this.sound.play('error');
      return;
    }
    if (this.place(type, x, y)) return;
    const def = TOWERS[type];
    const why = this.commanderFull(type) ? `Máx. ${COMMANDER_MAX} comandantes!` : def.onPath ? 'Só no caminho!' : 'Aqui não dá!';
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
    for (const tw of this.towers) if (tw.def.commander && !tw.ransom && !(tw.stunned > 0)) drawCommandZone(ctx, tw, t, this.burnoutLeft > 0);

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
    if (tw.ransom) ctx.filter = ENCRYPT_FILTER; // criptografada: "verde de terminal" e apagada
    drawCharacter(ctx, tw.type, { t: tw.anim, face: tw.face, attack: tw.def.commander && this.burnoutLeft > 0 ? 1 : tw.attack, pulse: tw.pulse, spawn: tw.spawnAnim, level: tw.level, idle });
    ctx.filter = 'none';
    if (tw.ransom) drawEncrypted(ctx, this.anim, tw.ransom);
    if (idle) drawNoMine(ctx, 0, 0, this.anim);
    if (tw.def.attack === 'decoy' && tw.hp < tw.maxHp) drawBaitBar(ctx, tw);
    if (tw.stunned > 0) drawStunned(ctx, this.anim);
    if (tw.haste > 1) drawHasted(ctx, this.anim, tw.haste, this.burnoutLeft > 0, tw.type);
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
  const a = Math.min(1, toast.time * 2, ((toast.total ?? 3) - toast.time) * 4);
  setFont(ctx, 14);
  const info = !!toast.threat; // vírus novo: "i" no canto direito abre o catálogo
  const w = ctx.measureText(toast.text).width + 44 + (info ? 30 : 0);
  const y = Math.max(8, bossBarsBottom(game) + 6);
  // no meio da tela, mas sem passar por cima do contador de rodada (direita do mapa)
  const x = Math.min(game.viewW / 2 - w / 2, game.mapW - 150 - w);
  const cx = x + w / 2;
  ctx.save();
  ctx.globalAlpha = a;
  rrect(ctx, x, y, w, 34, 17);
  fillOutline(ctx, '#0b2416', 3);
  ctx.strokeStyle = '#3dff9a';
  ctx.lineWidth = 2;
  rrect(ctx, x + 4, y + 4, w - 8, 26, 13);
  ctx.stroke();
  text(ctx, toast.text, cx - (info ? 15 : 0), y + 18, { size: 14, color: '#3dff9a' });
  if (info) {
    // "i" pulsando: toque pra ver o vírus no catálogo
    const ix = x + w - 22;
    const iy = y + 17;
    const p = 1 + Math.sin(game.anim * 6) * 0.12;
    ctx.save();
    ctx.translate(ix, iy);
    ctx.scale(p, p);
    ctx.shadowColor = '#3dff9a';
    ctx.shadowBlur = 8 + 6 * Math.sin(game.anim * 6);
    circle(ctx, 0, 0, 11);
    fillOutline(ctx, '#3dff9a', 2.5);
    ctx.shadowBlur = 0;
    text(ctx, 'i', 0, 1, { size: 15, color: '#0b2416', stroke: null });
    ctx.restore();
    game.toastInfo = { x: ix - 16, y: iy - 16, w: 32, h: 32 };
  } else game.toastInfo = null;
  ctx.restore();
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

