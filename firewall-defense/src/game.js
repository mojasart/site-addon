import { LEVEL_W } from './config.js';
import { LEVEL, SLOT_KINDS } from './data/level.js';
import { DEFENDERS } from './data/defenders.js';
import { WAVES } from './data/waves.js';
import { Path } from './core/Path.js';
import { Defender } from './entities/Defender.js';
import { Projectile } from './entities/Projectile.js';
import { WaveManager } from './systems/WaveManager.js';
import { Effects } from './systems/Effects.js';
import { LevelView } from './render/levelView.js';
import { drawSlot, drawBase, drawLevelOverlay } from './render/level.js';
import { drawDefender, drawProjectile } from './render/defenders.js';
import { drawEnemy, DEATH_COLORS } from './render/enemies.js';
import { hudLayout, drawHud, sellLayout, drawSellBubble } from './render/hud.js';
import { overlayLayout, drawOverlay, drawBanner } from './render/screens.js';
import { ICONS } from './render/ui.js';
import { inRect, inCircle, circle } from './render/canvas.js';
import { rand } from './util.js';

const SLOT_TOUCH = 40; // raio de toque de um ponto de instalação
const DRAG_LIFT = 52; // ao arrastar com o dedo, o defensor aparece acima dele
const SNAP = 56; // distância pra "grudar" no ponto ao soltar o arraste

// A partida (a fase única do MVP)
export class Game {
  constructor(app) {
    this.app = app;
    this.sound = app.sound;
    this.anim = 0;
    this.path = new Path(LEVEL.path, LEVEL.pathWidth);
    this.levelView = new LevelView(LEVEL, this.path);
    this.pointer = { x: -1, y: -1, down: false, type: 'touch' };
    this.drag = null;
    this.resize(app.viewW);
    this.reset();
  }

  resize(viewW) {
    this.viewW = viewW;
    this.offsetX = (viewW - LEVEL_W) / 2; // mapa centralizado
    // inimigos nascem logo antes da borda esquerda visível
    this.spawnDist = 0;
    while (this.spawnDist < this.path.length && this.path.pointAt(this.spawnDist).x < -this.offsetX - 30) this.spawnDist += 2;
  }

  reset() {
    this.money = this.app.debug ? 99999 : LEVEL.money;
    this.lives = LEVEL.lives;
    this.slots = LEVEL.slots.map((s) => ({ ...s, defender: null }));
    this.defenders = [];
    this.enemies = [];
    this.projectiles = [];
    this.fx = new Effects();
    this.waves = new WaveManager(WAVES);
    this.state = 'build'; // build | wave | paused | won | lost
    this.resumeState = 'build';
    this.selectedType = null; // defensor escolhido no dock
    this.selectedDefender = null; // defensor instalado tocado (mostra alcance/vender)
    this.denied = null; // botão do dock que tremeu (sem dinheiro)
    this.hurt = 0;
    this.shakeAmt = 0;
    this.moneyBump = 0;
    this.endDelay = 0;
    this.overlayTime = 0;
    this.banner = null;
  }

  get playing() {
    return this.state === 'build' || this.state === 'wave';
  }

  // ── Fluxo da partida ──────────────────────────────────────

  startWave() {
    if (this.state !== 'build' || !this.waves.start()) return;
    this.state = 'wave';
    this.showBanner(`ONDA ${this.waves.index + 1}`);
    this.sound.play('waveStart');
  }

  onWaveCleared() {
    const n = this.waves.index;
    if (this.waves.finished) return this.end(true);
    this.state = 'build';
    const bonus = 25 + n * 5;
    this.earn(bonus, LEVEL.base.x, LEVEL.base.y - 60);
    this.showBanner(`ONDA ${n} CONCLUÍDA`, `+$${bonus}`);
    this.sound.play('waveClear');
  }

  pause() {
    if (!this.playing) return;
    this.resumeState = this.state;
    this.state = 'paused';
    this.overlayTime = 0;
    this.drag = null;
    this.sound.play('click');
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = this.resumeState;
    this.sound.play('click');
  }

  end(won) {
    this.state = won ? 'won' : 'lost';
    this.endDelay = 0.8;
    this.overlayTime = 0;
    this.selectedType = null;
    this.selectedDefender = null;
    this.drag = null;
    this.fx.flushCoins();
    this.sound.play(won ? 'win' : 'lose');
  }

  showBanner(title, sub = null) {
    this.banner = { title, sub, time: 1.6, total: 1.6 };
  }

  shake(amount) {
    this.shakeAmt = Math.max(this.shakeAmt, amount);
  }

  // Dinheiro entra sozinho: uma moeda voa até o contador e soma ao chegar
  earn(amount, x, y) {
    const L = hudLayout(this);
    const credit = () => {
      this.money += amount;
      this.moneyBump = 1;
      this.sound.play('coin');
    };
    if (this.fx.coins.length > 12) credit();
    else this.fx.coin(x + this.offsetX, y, L.money.x, L.money.y, credit);
  }

  onKill(e) {
    const boss = e.def.boss;
    this.fx.death(e.x, e.y - e.r, DEATH_COLORS[e.type], boss ? 2.4 : Math.max(1, e.r / 15));
    this.sound.play(boss ? 'popBig' : 'pop');
    if (boss) this.shake(8);
    this.earn(e.def.reward, e.x, e.y - e.r);
  }

  leak(e) {
    this.lives -= e.def.leak;
    this.hurt = 0.5;
    this.shake(4);
    this.sound.play('leak');
    this.fx.text(LEVEL.base.x, LEVEL.base.y - 80, `-${e.def.leak}`, '#ff5a6e', 24);
    this.app.vibrate(40);
  }

  // ── Atualização ───────────────────────────────────────────

  update(dt) {
    this.anim += dt;
    if (this.state === 'paused') {
      this.overlayTime += dt;
      return;
    }
    if (!this.playing) this.overlayTime += dt;
    this.endDelay = Math.max(0, this.endDelay - dt);
    this.hurt = Math.max(0, this.hurt - dt);
    this.shakeAmt = Math.max(0, this.shakeAmt - dt * 30);
    this.moneyBump = Math.max(0, this.moneyBump - dt * 5);
    if (this.banner && (this.banner.time -= dt) <= 0) this.banner = null;
    if (this.denied && (this.denied.t -= dt) <= 0) this.denied = null;
    this.fx.update(dt);
    if (!this.playing) return;
    let remaining = dt; // passos pequenos pra colisão não falhar
    while (remaining > 1e-6 && this.playing) {
      const step = Math.min(remaining, 1 / 60);
      remaining -= step;
      this.step(step);
    }
  }

  step(dt) {
    this.waves.update(dt, this);
    for (const d of this.defenders) d.update(dt, this);
    for (const p of this.projectiles) p.update(dt, this);
    for (const e of this.enemies) if (!e.dead) e.update(dt, this);
    this.enemies = this.enemies.filter((e) => !e.dead);
    this.projectiles = this.projectiles.filter((p) => !p.dead);
    if (this.lives <= 0) this.end(false);
  }

  // ── Consultas dos defensores ──────────────────────────────

  isVisible(e) {
    return e.x > -this.offsetX - 5;
  }

  enemiesInRange(x, y, range) {
    return this.enemies.filter((e) => !e.dead && this.isVisible(e) && Math.hypot(e.x - x, e.y - y) <= range + e.r);
  }

  // Alvo = o inimigo mais adiantado no caminho (que o defensor consegue ferir)
  findTarget(d) {
    let best = null;
    for (const e of this.enemiesInRange(d.x, d.y, d.def.range)) {
      if (e.def.armored && !d.def.pierceArmor) continue;
      if (!best || e.dist > best.dist) best = e;
    }
    return best;
  }

  spawnProjectile(source, target, angle) {
    this.projectiles.push(new Projectile(source, target, angle));
  }

  // ── Posicionamento ────────────────────────────────────────

  canPlaceOn(type, slot) {
    return !slot.defender && SLOT_KINDS[slot.kind].accepts.includes(type);
  }

  slotAt(x, y, radius = SLOT_TOUCH) {
    let best = null;
    let bestD = radius;
    for (const s of this.slots) {
      const d = Math.hypot(s.x - x, s.y - y);
      if (d <= bestD) {
        best = s;
        bestD = d;
      }
    }
    return best;
  }

  // Ponto válido mais perto (pra soltar o arraste)
  snapSlot(type, x, y) {
    let best = null;
    let bestD = SNAP;
    for (const s of this.slots) {
      if (!this.canPlaceOn(type, s)) continue;
      const d = Math.hypot(s.x - x, s.y - y);
      if (d < bestD) {
        best = s;
        bestD = d;
      }
    }
    return best;
  }

  tryPlace(type, slot) {
    const def = DEFENDERS[type];
    let why = null;
    if (slot.defender) why = 'Ocupado';
    else if (!SLOT_KINDS[slot.kind].accepts.includes(type)) why = `${SLOT_KINDS[slot.kind].name}: não serve`;
    else if (this.money < def.cost) why = `Falta $${def.cost - this.money}`;
    if (why) {
      this.fx.text(slot.x, slot.y - 60, why, '#ffffff', 16);
      this.sound.play('error');
      return false;
    }
    this.money -= def.cost;
    const d = new Defender(type, slot);
    slot.defender = d;
    this.defenders.push(d);
    this.fx.burst(slot.x, slot.y - 10, '#ffffff', 8, 140, 0.3, 5);
    this.sound.play('place');
    this.app.vibrate(12);
    this.selectedType = null;
    return true;
  }

  sell(d) {
    this.money += d.sellValue;
    d.slot.defender = null;
    this.defenders = this.defenders.filter((x) => x !== d);
    this.selectedDefender = null;
    this.fx.burst(d.x, d.y - 10, '#ffc83d', 8, 140, 0.35, 5);
    this.sound.play('sell');
  }

  // ── Toque (coordenadas de tela) ───────────────────────────

  key(k) {
    if (k === ' ') this.startWave();
    else if (k === 'Escape') this.state === 'paused' ? this.resume() : this.pause();
  }

  pointerDown(sx, sy, type = 'touch') {
    Object.assign(this.pointer, { x: sx, y: sy, down: true, type });
    if (!this.playing) return this.overlayTap(sx, sy);

    const L = hudLayout(this);
    if (inCircle(L.pause, sx, sy)) return this.pause();
    if (inCircle(L.waveBtn, sx, sy)) return this.startWave();
    for (const b of L.dock) {
      if (Math.hypot(sx - b.x, sy - b.y) > b.r + 8) continue;
      return this.dockTap(b.type, sx, sy);
    }
    if (this.selectedDefender && inRect(sellLayout(this, this.selectedDefender), sx, sy)) return this.sell(this.selectedDefender);

    const slot = this.slotAt(sx - this.offsetX, sy);
    if (this.selectedType) {
      if (slot) this.tryPlace(this.selectedType, slot);
      else this.selectedType = null; // tocou fora: cancela
      return;
    }
    if (slot?.defender) {
      this.selectedDefender = slot.defender === this.selectedDefender ? null : slot.defender;
      this.sound.play('click');
      return;
    }
    this.selectedDefender = null;
  }

  dockTap(type, sx, sy) {
    const def = DEFENDERS[type];
    this.selectedDefender = null;
    if (this.selectedType !== type && this.money < def.cost) {
      this.denied = { type, t: 0.35 };
      this.sound.play('error');
      return;
    }
    const toggleOff = this.selectedType === type;
    this.selectedType = type;
    this.drag = { type, x: sx, y: sy, moved: false, toggleOff };
    this.sound.play('click');
  }

  pointerMove(sx, sy, type = 'touch') {
    Object.assign(this.pointer, { x: sx, y: sy, type });
    const d = this.drag;
    if (d && !d.moved && Math.hypot(sx - d.x, sy - d.y) > 12) d.moved = true;
  }

  pointerUp(sx, sy) {
    this.pointer.down = false;
    const d = this.drag;
    this.drag = null;
    if (!d || !this.playing) return;
    if (d.moved) {
      const g = this.ghostPos();
      const slot = g && this.snapSlot(d.type, g.x, g.y);
      if (slot) this.tryPlace(d.type, slot);
      return; // soltou fora: continua selecionado pra tocar num ponto
    }
    if (d.toggleOff) this.selectedType = null;
  }

  pointerCancel() {
    this.pointer.down = false;
    this.drag = null;
  }

  overlayTap(sx, sy) {
    const L = overlayLayout(this);
    if (this.state === 'paused') {
      if (inRect(L.resume, sx, sy)) this.resume();
      else if (inRect(L.restart, sx, sy)) this.app.startGame();
      else if (inRect(L.menu, sx, sy)) this.app.goTitle();
      return;
    }
    if (this.endDelay > 0) return;
    if (inRect(L.again, sx, sy)) this.app.startGame();
    else if (inRect(L.menu, sx, sy)) this.app.goTitle();
  }

  // Onde o defensor arrastado aparece (coords da fase)
  ghostPos() {
    if (!this.drag?.moved) return null;
    const lift = this.pointer.type === 'mouse' ? 0 : DRAG_LIFT;
    return { x: this.pointer.x - this.offsetX, y: this.pointer.y - lift };
  }

  // ── Desenho ───────────────────────────────────────────────

  render(ctx) {
    const t = this.anim;
    ctx.save();
    if (this.shakeAmt) ctx.translate(rand(-1, 1) * this.shakeAmt, rand(-1, 1) * this.shakeAmt);
    this.levelView.draw(ctx, this.viewW, this.offsetX, this.app.pixelScale);
    ctx.translate(this.offsetX, 0);
    drawLevelOverlay(ctx, t);

    const placing = this.drag?.moved ? this.drag.type : this.selectedType;
    const ghost = this.ghostPos();
    const snap = ghost && this.snapSlot(this.drag.type, ghost.x, ghost.y);
    for (const s of this.slots) {
      let state = 'idle';
      if (s.defender) state = 'occupied';
      else if (placing) state = this.canPlaceOn(placing, s) ? 'valid' : 'dim';
      ctx.save();
      ctx.translate(s.x, s.y);
      drawSlot(ctx, s, { t, state, snap: s === snap });
      ctx.restore();
    }

    ctx.save();
    ctx.translate(LEVEL.base.x, LEVEL.base.y);
    drawBase(ctx, t, this.hurt);
    ctx.restore();

    const sel = this.selectedDefender;
    if (sel && sel.def.range) drawRangeRing(ctx, sel.x, sel.y, sel.def.range);
    if (snap && DEFENDERS[this.drag.type].range) drawRangeRing(ctx, snap.x, snap.y, DEFENDERS[this.drag.type].range);

    // defensores e inimigos ordenados pela altura (quem está mais embaixo fica na frente)
    const things = [...this.defenders.map((d) => ({ y: d.y, d })), ...this.enemies.map((e) => ({ y: e.y, e }))].sort((a, b) => a.y - b.y);
    for (const th of things) {
      ctx.save();
      if (th.d) {
        const d = th.d;
        ctx.translate(d.x, d.y);
        drawDefender(ctx, d.type, { t: d.anim, face: d.face, attack: d.attack, spawn: d.spawn });
      } else {
        ctx.translate(th.e.x, th.e.y);
        drawEnemy(ctx, th.e, t);
      }
      ctx.restore();
    }

    for (const p of this.projectiles) {
      ctx.save();
      ctx.translate(p.x, p.y);
      drawProjectile(ctx, p, t);
      ctx.restore();
    }
    this.fx.draw(ctx);

    if (ghost) {
      ctx.save();
      ctx.globalAlpha = 0.8;
      ctx.translate(snap ? snap.x : ghost.x, snap ? snap.y : ghost.y);
      drawDefender(ctx, this.drag.type, { t, face: 1 });
      ctx.restore();
    }
    ctx.restore();

    drawHud(ctx, this);
    for (const c of this.fx.coins) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ICONS.coin(ctx, 9);
      ctx.restore();
    }
    if (sel) drawSellBubble(ctx, this, sel);
    drawBanner(ctx, this);
    drawOverlay(ctx, this);
  }
}

function drawRangeRing(ctx, x, y, r) {
  circle(ctx, x, y, r);
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.setLineDash([10, 8]);
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.stroke();
  ctx.setLineDash([]);
}
