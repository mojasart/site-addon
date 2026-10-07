import { VIEW_H, PANEL_W, MAX_SPEED, NEXT_ROUND_DELAY, EARLY_BONUS } from './config.js';
import { MAPS } from './data/maps.js';
import { ROUNDS } from './data/rounds.js';
import { PLAT_TIME, WAVE_GAP, BOSS_HP, platinumScale, blockedAlly, platinumRounds, platinumBoss } from './data/platinum.js';
import { worth } from './data/enemies.js';
import { TOWERS, TARGET_MODES } from './data/towers.js';
import { fitsTerrain } from './core/terrain.js';
import { Tower } from './entities/Tower.js';
import { Projectile } from './entities/Projectile.js';
import { Packet } from './entities/Packet.js';
import { RoundManager } from './systems/RoundManager.js';
import { Effects } from './systems/Effects.js';
import { Hazards } from './systems/Hazards.js';
import { MapView } from './render/maps/index.js';
import { TILE, tileOf, tileKey, inGrid, snapToTile } from './core/grid.js';
import { layout, drawHud, drawPanel, drawRange } from './render/ui.js';
import { inRect } from './render/widgets.js';
import { drawBanner, drawOverlay, overlayLayout } from './render/screens.js';
import { drawInfoPanel, infoLayout } from './render/infoPanel.js';
import { drawCharacter, drawPips } from './render/characters.js';
import { drawEnemy } from './render/viruses.js';
import { drawProjectile, drawCoin, drawServer } from './render/sprites.js';
import { drawHazards, drawStunned, drawHazardWarning } from './render/hazards.js';
import { drawSpawns } from './render/spawns.js';
import { pickCoinTiles, coinTileAt, COIN_SEASONS } from './core/coinTiles.js';
import { drawCoinTiles, drawNoMine } from './render/coinTiles.js';
import { rrect, fillOutline, circle, text } from './render/canvas.js';
import { rand } from './util.js';

const TOUCH_LIFT = 46; // ao arrastar com o dedo, a defesa aparece acima dele
const BASE_HIT = 40; // raio da hitbox do servidor

// A partida em si (uma fase). Criada pelo App ao escolher um mapa.
// mode: 'normal' ou 'platinum' (ondas sem parar até o chefão; data/platinum.js)
export class Game {
  constructor(app, mapIndex, mode = 'normal') {
    this.app = app;
    this.sound = app.sound;
    this.mapIndex = mapIndex;
    this.map = MAPS[mapIndex];
    this.mode = mode;
    this.platinum = mode === 'platinum';
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
  get nextMap() { return MAPS[this.mapIndex + 1] ?? null; }

  resize(viewW) {
    const mapW = viewW - PANEL_W;
    if (this.view?.mapW !== mapW) this.view = new MapView(this.map, mapW);
    this.mapW = mapW;
  }

  reset() {
    this.money = this.app.debug ? 99999 : this.map.money;
    this.lives = this.map.lives;
    this.towers = [];
    this.coinTiles = pickCoinTiles(this); // pilhas de bitcoin (seasons 1 e 2)
    this.enemies = [];
    this.newEnemies = [];
    this.projectiles = [];
    this.packets = [];
    // platina: as ondas ganham a dificuldade calibrada do modo (k)
    const k = this.platinum ? platinumScale(this.mapIndex) : 1;
    this.rounds = new RoundManager(this.platinum ? platinumRounds(this.map) : ROUNDS.slice(0, this.map.rounds), {
      count: this.map.pressure * k,
      gap: this.map.gapMul,
      speed: this.map.speedMul,
      hp: this.map.pressure * k, // chefões e worms acompanham a pressão
    });
    this.fx = new Effects();
    this.hazards = new Hazards(this.map.hazards);
    this.spawnFlash = this.map.routes.map(() => 0); // clarão de cada entrada ao soltar um vírus
    this.speed = 1;
    this.nextIn = null; // contagem pra próxima rodada começar sozinha (null = espera o jogador)
    this.callCooldown = 0;
    this.placing = null; // tipo de defesa sendo posicionada
    this.selectedTower = null;
    this.banner = null;
    this.hurt = 0;
    this.coinBump = 0;
    this.shakeAmt = 0;
    this.endDelay = 0;
    this.overlayTime = 0;
    this.stars = 0;
    this.stats = { pops: 0 };
    this.state = 'playing'; // playing | paused | won | lost
    // platina: relógio das ondas, se o chefão já veio e o aliado bloqueado
    this.platTime = 0;
    this.bossCalled = false;
    this.waveGap = null;
    this.blocked = this.platinum ? blockedAlly(this.map) : null;
    if (this.platinum) {
      this.showBanner('MODO PLATINA', 3, '#bdeeff', 46, `${TOWERS[this.blocked].name} bloqueado · chefão em 3:00`);
      return;
    }
    // mapa com novidade (várias entradas, loop, zonas...) avisa no começo
    const special = this.map.entries > 1 || this.map.loop || this.map.hazards?.length;
    this.showBanner(this.map.name, 2.6, '#ffffff', 46, special ? this.map.desc : 'Arraste as defesas pro mapa!');
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
    this.selectedTower = null;
    this.drag = null;
    if (won) {
      const L = this.map.lives;
      this.stars = this.lives >= L ? 3 : this.lives >= L * 0.5 ? 2 : 1;
      const coffeeBefore = this.app.coffeeEarned ?? 0;
      if (this.platinum) {
        this.stars = 3; // vencer a platina já vale as 3 (em platina)
        this.app.recordPlatinum?.(this.map.id);
      }
      this.app.recordStars(this.map.id, this.stars);
      // cafés novos dessa vitória (só o que passou do recorde do mapa: data/darknet.js)
      this.coffeeGain = (this.app.coffeeEarned ?? 0) - coffeeBefore;
      this.fx.celebrate(this.viewW, VIEW_H);
      this.sound.play('win');
      for (let i = 0; i < this.stars; i++) setTimeout(() => this.sound.play('star'), 500 + i * 350);
    } else this.sound.play('lose');
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
    this.endDelay = Math.max(0, this.endDelay - dt);
    this.hurt = Math.max(0, this.hurt - dt);
    this.coinBump = Math.max(0, this.coinBump - dt * 4);
    this.shakeAmt = Math.max(0, this.shakeAmt - dt * 30);
    if (this.banner && (this.banner.time -= dt) <= 0) this.banner = null;
    if (this.toast && (this.toast.time -= dt) <= 0) this.toast = null;
    if (this.state !== 'playing') {
      this.fx.update(dt);
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
    this.callCooldown = Math.max(0, this.callCooldown - dt);
    if (this.nextIn != null && (this.nextIn -= dt) <= 0) this.startRound();
    if (this.platinum && this.rounds.started > 0) this.platinumStep(dt);
    this.rounds.update(dt, this);
    this.flushSpawns();
    for (const t of this.towers) t.update(dt, this);
    this.flushSpawns();
    for (const p of this.projectiles) p.update(dt, this);
    this.flushSpawns();
    for (const e of this.enemies) if (!e.dead) e.update(dt, this);
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

  // Filhos de vírus estourados entram na lista só entre etapas
  flushSpawns() {
    if (this.newEnemies.length === 0) return;
    for (const e of this.newEnemies) if (!e.dead) this.enemies.push(e);
    this.newEnemies.length = 0;
  }

  // Isca (Honeypot) que o vírus está encostando, se houver
  baitAt(e) {
    for (const t of this.towers) {
      if (t.def.attack !== 'decoy' || t.dead) continue;
      if (Math.hypot(e.x - t.x, e.y - t.y) < t.r + e.r * 0.8) return t;
    }
    return null;
  }

  // Hitbox da base: o vírus que encosta no servidor já invade
  // (antes ele só contava no fim da rota, depois de passar por cima)
  touchesBase(e) {
    const s = this.server;
    return Math.hypot(e.x - s.x, e.y - (s.y - 8)) < BASE_HIT + e.r * 0.5;
  }

  leak(enemy) {
    this.lives -= enemy.threat;
    this.hurt = 0.4;
    this.shake(4);
    this.sound.play('leak');
    this.fx.text(this.server.x, this.server.y - 50, `-${enemy.threat}`, '#ff5a6a', 26);
    buzz(40);
  }

  // Platina: a próxima onda começa assim que a anterior termina de entrar;
  // no fim do tempo (ou das ondas) vem o chefão
  platinumStep(dt) {
    if (this.bossCalled) return;
    const r = this.rounds;
    this.platTime += dt;
    if (this.platTime >= PLAT_TIME || !r.canStart) {
      this.callBoss();
      return;
    }
    if (r.pending[r.started - 1] > 0) return; // a última onda ainda está entrando
    this.waveGap = (this.waveGap ?? WAVE_GAP) - dt;
    if (this.waveGap <= 0) {
      this.waveGap = null;
      this.startRound();
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

  // Segundos que faltam pro chefão (modo platina)
  get platLeft() {
    return Math.max(0, PLAT_TIME - this.platTime);
  }

  onRoundEnd(n) {
    if (this.platinum) {
      // platina: o bônus da onda já veio quando ela começou (elas se acumulam)
      if (this.rounds.finished) this.end(true);
      return;
    }
    const bonus = 100 + n;
    this.money += bonus;
    this.coinBump = 1;
    // mapa limpo: os Mineradores entregam na hora o que faltou minerar
    if (!this.rounds.active) for (const t of this.towers) t.finishMining(this);
    if (this.rounds.finished) {
      this.end(true);
      return;
    }
    this.sound.play('roundEnd');
    this.showBanner(`RODADA ${n} COMPLETA!`, 1.6, '#3dff9a', 36, `+$${bonus}`);
    // mapa limpo: com turno automático, a próxima começa sozinha daqui a pouco
    if (!this.rounds.active && this.autoRound) this.nextIn = NEXT_ROUND_DELAY;
  }

  get autoRound() {
    return this.app.save?.autoRound !== false;
  }

  // Ligou/desligou o turno automático no menu com o mapa parado
  autoChanged() {
    if (this.rounds.active || !this.rounds.canStart || this.rounds.started === 0) return;
    this.nextIn = this.autoRound ? NEXT_ROUND_DELAY : null;
  }

  // Bônus por chamar a próxima rodada com outra ainda rolando:
  // uma parte do dinheiro que os vírus dela valem, proporcional ao que
  // ainda falta da rodada atual (com 1 vírus sobrando, é só $1)
  earlyBonus() {
    if (this.platinum || !this.rounds.active || !this.canCall()) return 0;
    const roundValue = (r) => this.rounds.rounds[r].reduce((sum, g) => sum + g.count * worth(g.type), 0);
    const cur = this.rounds.done;
    const alive = (e) => !e.dead && e.round === cur;
    let left = this.rounds.queue.reduce((sum, q) => sum + (q.round === cur ? worth(q.type) : 0), 0);
    for (const e of this.enemies) if (alive(e)) left += worth(e.type);
    for (const e of this.newEnemies) if (alive(e)) left += worth(e.type);
    const frac = Math.min(1, left / roundValue(cur));
    return Math.max(1, Math.round(roundValue(this.rounds.started) * EARLY_BONUS * frac));
  }

  // Dá pra chamar a próxima com no máximo 1 rodada rolando
  // (a 3 só depois de acabar com os vírus da 1)
  canCall() {
    if (this.platinum) return this.rounds.started === 0; // depois da 1ª, elas vêm sozinhas
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

  speedPressed() {
    this.speed = (this.speed % MAX_SPEED) + 1;
    this.sound.play('click');
  }

  startRound() {
    const bonus = this.earlyBonus();
    if (!this.rounds.start()) return;
    if (this.rounds.started === 1) this.firstRoundAt = this.anim; // some o aviso das entradas
    this.nextIn = null;
    for (const t of this.towers) {
      t.onRoundStart();
      // Minerador nível 3 (Fazenda de Mineração): um bitcoin a mais em toda rodada nova
      if (t.stats.roundBonus && this.canMine(t)) this.spawnPacket(t.x, t.y - 10, t.stats.roundBonus);
    }
    if (bonus > 0) {
      this.money += bonus;
      this.coinBump = 1;
    }
    if (this.platinum) {
      // a partir da 2ª onda, o bônus de rodada vem no começo de cada uma
      const wave = this.rounds.started;
      const pay = wave > 1 ? 100 + wave - 1 : 0;
      if (pay) {
        this.money += pay;
        this.coinBump = 1;
      }
      this.showBanner(`ONDA ${wave}`, 0.9, '#bdeeff', 36, pay ? `+$${pay}` : null);
    }
    else this.showBanner(`RODADA ${this.rounds.started}`, 1.1, '#ffffff', 46, bonus > 0 ? `Chamou antes: +$${bonus}` : null);
    this.sound.play('round');
  }

  coinTarget() {
    return { x: 30 - this.offsetX, y: 72 };
  }

  // ── Consultas usadas pelas defesas ────────────────────────

  isVisible(e) {
    return e.x > -this.offsetX - 5;
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
      list.push({ e, score: this.score(tower, e, d) });
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
    if (this.app.discover?.(enemy.type)) this.toast = { text: `NOVA AMEAÇA NO CATÁLOGO: ${enemy.def.name.toUpperCase()}`, time: 3 };
  }

  spawnProjectile(tower, angle, target = null) {
    this.projectiles.push(new Projectile(tower, angle, target));
    this.sound.play(tower.def.sound ?? 'throw');
  }

  // O Minerador consegue minerar onde está? Nas seasons 1 e 2 só em cima
  // de uma pilha de bitcoin (core/coinTiles.js), um Minerador por pilha.
  // Na season 3 minera em qualquer lugar (vai precisar de upgrade: TODO)
  canMine(tower) {
    if (this.map.season >= COIN_SEASONS) return true;
    const tile = coinTileAt(this.coinTiles, tower.x, tower.y);
    if (!tile) return false;
    return this.towers.find((t) => t.def.attack === 'farm' && coinTileAt(this.coinTiles, t.x, t.y) === tile) === tower;
  }

  spawnPacket(x, y, value) {
    this.packets.push(new Packet(x, y, value));
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

  place(type, x, y) {
    const def = TOWERS[type];
    if (this.money < def.cost || !this.canPlace(type, x, y)) return false;
    ({ x, y } = snapToTile(x, y)); // a defesa fica no centro do quadrado
    this.money -= def.cost;
    const tower = new Tower(type, x, y, !this.rounds.active);
    if (this.rounds.active) tower.onRoundStart();
    this.towers.push(tower);
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
    if (this.money < up.cost) {
      this.fx.text(tower.x, tower.y - 50, 'Sem dinheiro!', '#ff7a8a', 18);
      this.sound.play('error');
      return;
    }
    this.money -= up.cost;
    tower.upgrade();
    this.fx.burst(tower.x, tower.y - 10, '#ffd23f', 22, 190, 0.55, 5, true);
    this.sound.play('upgrade');
  }

  sell(tower) {
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
    if (k === ' ' && this.state === 'playing') this.playPressed();
    else if (k === 'Escape') {
      if (this.state === 'paused') this.resume();
      else this.pause();
    }
  }

  pointerDown(sx, sy, type = 'touch') {
    Object.assign(this.pointer, { x: sx, y: sy, down: true, type });
    if (this.state !== 'playing') return this.overlayTap(sx, sy);

    const L = layout(this);
    if (sx >= L.panel.x) return this.panelTap(sx, sy, L);
    if (inRect(L.pause, sx, sy)) return this.pause();
    // aba de informações da defesa: a alça abre/recolhe; tocar na aba não mexe no mapa
    const info = infoLayout(this);
    if (info && inRect(info.toggle, sx, sy)) return this.app.toggleInfo?.();
    if (info?.open && inRect(info.card, sx, sy)) return;

    const mx = sx - this.offsetX;
    if (this.placing) {
      // decide no pointerUp: toque rápido coloca ali, arrastar ajusta a posição
      this.drag = { type: this.placing, x: sx, y: sy, moved: false, fromMap: true };
      return;
    }
    const tw = this.towerAt(mx, sy);
    if (tw) this.sound.play('click');
    this.selectedTower = tw;
  }

  overlayTap(sx, sy) {
    const L = overlayLayout(this);
    if (this.state === 'paused') {
      if (inRect(L.resume, sx, sy)) this.resume();
      else if (inRect(L.restart, sx, sy)) this.app.startMap(this.mapIndex, this.mode);
      else if (inRect(L.maps, sx, sy)) this.app.goMaps();
      else if (inRect(L.music, sx, sy)) this.app.toggleMusic();
      else if (inRect(L.sfx, sx, sy)) this.app.toggleSfx();
      else if (inRect(L.auto, sx, sy)) this.app.toggleAuto();
      return;
    }
    if (this.endDelay > 0) return;
    if (inRect(L.maps, sx, sy)) this.app.goMaps();
    else if (inRect(L.next, sx, sy)) {
      // venceu: vai pro próximo mapa (normal); perdeu: tenta de novo no mesmo modo
      if (this.state === 'won' && this.nextMap) this.app.startMap(this.mapIndex + 1);
      else this.app.startMap(this.mapIndex, this.state === 'won' ? 'normal' : this.mode);
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
      else if (tw.def.targeting && inRect(L.target, sx, sy)) {
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

    for (const tile of L.tiles) {
      if (!inRect(tile, sx, sy)) continue;
      const def = TOWERS[tile.type];
      if (tile.type === this.blocked) {
        this.fx.text(tile.x + tile.w / 2 - this.offsetX, tile.y + 30, 'Bloqueado!', '#ff7a8a', 16);
        this.sound.play('error');
        return;
      }
      const toggleOff = this.placing === tile.type;
      if (!toggleOff && this.money < def.cost) {
        this.fx.text(tile.x + tile.w / 2 - this.offsetX, tile.y + 30, 'Sem dinheiro!', '#ff7a8a', 16);
        this.sound.play('error');
        return;
      }
      this.placing = tile.type;
      this.drag = { type: tile.type, x: sx, y: sy, moved: false, fromMap: false, toggleOff };
      this.sound.play('click');
      return;
    }
  }

  pointerMove(sx, sy, type = 'touch') {
    Object.assign(this.pointer, { x: sx, y: sy, type });
    const d = this.drag;
    if (d && !d.moved && Math.hypot(sx - d.x, sy - d.y) > 10) d.moved = true;
  }

  pointerUp(sx, sy) {
    this.pointer.down = false;
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
    if (this.place(type, x, y)) return;
    const def = TOWERS[type];
    this.fx.text(x, y - 30, def.onPath ? 'Só no caminho!' : 'Aqui não dá!', '#ff7a8a', 18);
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
    drawHazards(ctx, this.hazards, t);
    drawSpawns(ctx, this, t);
    drawCoinTiles(ctx, this.coinTiles, t, TOWERS[this.placing]?.attack === 'farm');

    ctx.save();
    ctx.translate(this.server.x, this.server.y);
    drawServer(ctx, t, this.hurt);
    ctx.restore();

    const sel = this.selectedTower;
    if (sel) drawRange(ctx, sel.x, sel.y, sel.stats.range, true);

    // armadilhas ficam no chão, embaixo dos vírus
    for (const tw of this.towers) if (tw.def.onPath) this.drawTowerAt(ctx, tw);

    // vírus e defesas ordenados pela altura (quem está mais embaixo fica na frente)
    const things = [
      ...this.enemies.map((e) => ({ y: e.y, e })),
      ...this.towers.filter((tw) => !tw.def.onPath).map((tw) => ({ y: tw.y, tw })),
    ].sort((a, b) => a.y - b.y);
    for (const th of things) {
      if (th.tw) {
        this.drawTowerAt(ctx, th.tw);
        continue;
      }
      const e = th.e;
      ctx.save();
      ctx.translate(e.x, e.y);
      drawEnemy(ctx, e);
      ctx.restore();
      if (e.def.boss) drawBossBar(ctx, e);
      if (e.vulnTimer > 0) drawVulnerable(ctx, e, t);
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
      const valid = this.canPlace(this.placing, g.x, g.y) && this.money >= def.cost;
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

    // moedas voando até o contador (por cima do HUD)
    ctx.save();
    ctx.translate(this.offsetX, 0);
    for (const p of this.packets) {
      ctx.save();
      ctx.translate(p.x, p.y);
      drawCoin(ctx, p.state === 'flying' ? 11 : 13, p.spin);
      ctx.restore();
    }
    ctx.restore();

    drawInfoPanel(ctx, this); // antes do painel: a alça recolhida "entra" embaixo dele
    drawPanel(ctx, this);
    if (this.toast) drawToast(ctx, this);
    drawBanner(ctx, this);
    drawOverlay(ctx, this);
    this.fx.drawConfetti(ctx);
  }

  drawTowerAt(ctx, tw) {
    ctx.save();
    ctx.translate(tw.x, tw.y);
    const idle = tw.def.attack === 'farm' && !this.canMine(tw); // Minerador fora da pilha
    drawCharacter(ctx, tw.type, { t: tw.anim, face: tw.face, attack: tw.attack, pulse: tw.pulse, spawn: tw.spawnAnim, level: tw.level, idle });
    drawPips(ctx, tw.level, tw.r);
    if (idle) drawNoMine(ctx, 0, 0, this.anim);
    if (tw.def.attack === 'decoy' && tw.hp < tw.maxHp) drawBaitBar(ctx, tw);
    if (tw.stunned > 0) drawStunned(ctx, this.anim);
    ctx.restore();
  }
}

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
function drawToast(ctx, game) {
  const a = Math.min(1, game.toast.time * 2, (3 - game.toast.time) * 4);
  const w = 360;
  const x = game.mapW / 2 - w / 2;
  ctx.save();
  ctx.globalAlpha = a;
  rrect(ctx, x, 70, w, 34, 17);
  fillOutline(ctx, '#0b2416', 3);
  ctx.strokeStyle = '#3dff9a';
  ctx.lineWidth = 2;
  rrect(ctx, x + 4, 74, w - 8, 26, 13);
  ctx.stroke();
  text(ctx, game.toast.text, game.mapW / 2, 88, { size: 14, color: '#3dff9a' });
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

function drawBossBar(ctx, e) {
  const w = e.r * 2;
  const x = e.x - w / 2;
  const y = e.y - e.r - 34;
  rrect(ctx, x, y, w, 12, 6);
  fillOutline(ctx, '#2a1840', 3);
  const k = Math.max(0, e.hp / (e.maxHp ?? e.def.hp));
  if (k > 0) {
    rrect(ctx, x + 2, y + 2, (w - 4) * k, 8, 4);
    ctx.fillStyle = '#ff4d6d';
    ctx.fill();
  }
}

// Selinho "x2" em cima do vírus: está vulnerável e leva dano dobrado (Era do Gelo)
function drawVulnerable(ctx, e, t) {
  const x = e.x - e.r * 0.8;
  const y = e.y - e.r - (e.def.boss ? 30 : 18) + Math.sin(t * 6) * 1.5;
  circle(ctx, x, y, 10);
  fillOutline(ctx, '#3ec5ff', 2.5);
  text(ctx, 'x2', x, y + 1, { size: 12 });
}
