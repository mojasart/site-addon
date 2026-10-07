import { VIEW_H, MIN_VIEW_W, PANEL_W, START_MONEY, START_LIVES, MAX_SPEED } from './config.js';
import { MAP } from './data/map.js';
import { ROUNDS } from './data/rounds.js';
import { TOWERS, TARGET_MODES } from './data/towers.js';
import { Path } from './core/Path.js';
import { Tower } from './entities/Tower.js';
import { Projectile } from './entities/Projectile.js';
import { Packet } from './entities/Packet.js';
import { RoundManager } from './systems/RoundManager.js';
import { Effects } from './systems/Effects.js';
import { MapRenderer, serverPos, layoutDecor, blocksTower } from './render/map.js';
import { layout, inRect, drawHud, drawPanel, drawRange } from './render/ui.js';
import { drawBanner, drawOverlay, screenButton } from './render/screens.js';
import { drawTower, drawPips, drawEnemy, drawProjectile, drawCoin, drawServer, setPixelScale } from './render/sprites.js';
import { rrect, fillOutline } from './render/canvas.js';

const TOUCH_LIFT = 46; // ao arrastar com o dedo, a torre aparece acima dele

export class Game {
  constructor({ debug = false } = {}) {
    this.debug = debug;
    this.anim = 0; // relógio das animações (roda até no menu)
    this.pixelScale = 1;
    this.path = new Path(MAP.points, MAP.pathWidth);
    this.mapRenderer = new MapRenderer();
    this.pointer = { x: -1, y: -1, down: false, type: 'touch' };
    this.drag = null;
    this.resize(MIN_VIEW_W, 1);
    this.reset();
    this.state = 'menu'; // menu | playing | paused | won | lost
  }

  // Chamado pelo main.js quando a tela muda de tamanho
  resize(viewW, pixelScale) {
    this.viewW = viewW;
    this.mapW = viewW - PANEL_W;
    this.offsetX = Math.max(0, (this.mapW - MAP.width) / 2); // centraliza o mapa
    this.pixelScale = pixelScale;
    setPixelScale(pixelScale);
    // inimigos nascem logo antes da borda esquerda visível
    this.spawnDist = 0;
    while (this.spawnDist < this.path.length && this.path.pointAt(this.spawnDist).x < -this.offsetX - 30) this.spawnDist += 2;
    this.server = serverPos(this.path);
    this.decor = layoutDecor(this);
  }

  reset() {
    this.money = this.debug ? 99999 : START_MONEY;
    this.lives = START_LIVES;
    this.towers = [];
    this.enemies = [];
    this.newEnemies = [];
    this.projectiles = [];
    this.packets = [];
    this.rounds = new RoundManager(ROUNDS);
    this.fx = new Effects();
    this.speed = 1;
    this.placing = null; // tipo de torre sendo posicionada
    this.selectedTower = null;
    this.banner = null;
    this.hurt = 0;
    this.endDelay = 0;
    this.stats = { pops: 0 };
  }

  start() {
    this.reset();
    this.state = 'playing';
  }

  pause() {
    if (this.state === 'playing') {
      this.state = 'paused';
      this.drag = null;
    }
  }

  end(won) {
    this.state = won ? 'won' : 'lost';
    this.endDelay = 0.8; // evita reiniciar com um toque atrasado
    this.placing = null;
    this.selectedTower = null;
    this.drag = null;
  }

  showBanner(text, duration = 1.2, color = '#ffffff', size = 46) {
    this.banner = { text, color, size, time: duration, total: duration };
  }

  // ── Atualização ───────────────────────────────────────────

  update(dt) {
    this.anim += dt;
    if (this.state === 'paused') return;
    this.endDelay = Math.max(0, this.endDelay - dt);
    this.hurt = Math.max(0, this.hurt - dt);
    if (this.banner && (this.banner.time -= dt) <= 0) this.banner = null;
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
    this.rounds.update(dt, this);
    this.flushSpawns();
    for (const t of this.towers) t.update(dt, this);
    this.flushSpawns();
    for (const p of this.projectiles) p.update(dt, this);
    this.flushSpawns();
    for (const e of this.enemies) if (!e.dead) e.update(dt, this);
    for (const p of this.packets) p.update(dt);
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

  leak(enemy) {
    this.lives -= enemy.threat;
    this.hurt = 0.4;
    buzz(40);
    this.fx.text(this.server.x, this.server.y - 50, `-${enemy.threat}`, '#ff5a6a', 26);
  }

  onRoundEnd() {
    const bonus = 100 + this.rounds.index;
    this.money += bonus;
    this.fx.text(150 - this.offsetX, 110, `+$${bonus} bônus`, '#ffd23f', 20);
    if (this.rounds.finished) this.end(true);
  }

  playPressed() {
    if (this.rounds.active) {
      this.speed = (this.speed % MAX_SPEED) + 1;
      return;
    }
    if (this.rounds.start()) {
      for (const t of this.towers) t.onRoundStart();
      this.showBanner(`RODADA ${this.rounds.index + 1}`, 1.1);
    }
  }

  // ── Consultas usadas pelas torres ─────────────────────────

  isVisible(e) {
    return e.x > -this.offsetX - 5;
  }

  findTarget(tower) {
    const s = tower.stats;
    let best = null;
    let bestScore = -Infinity;
    for (const e of this.enemies) {
      if (e.dead || !this.isVisible(e)) continue;
      if (e.def.armored && !s.canHitArmored) continue;
      const d = Math.hypot(e.x - tower.x, e.y - tower.y);
      if (d > s.range + e.r) continue;
      let score;
      switch (tower.targetMode) {
        case 'last': score = -e.dist; break;
        case 'strong': score = e.threat * 10000 + e.dist; break;
        case 'close': score = -d; break;
        default: score = e.dist;
      }
      if (score > bestScore) {
        bestScore = score;
        best = e;
      }
    }
    return best;
  }

  enemiesInRange(x, y, range) {
    return this.enemies
      .filter((e) => !e.dead && this.isVisible(e) && Math.hypot(e.x - x, e.y - y) <= range + e.r)
      .sort((a, b) => b.dist - a.dist);
  }

  spawnEnemy(enemy) {
    this.newEnemies.push(enemy);
  }

  spawnProjectile(tower, angle) {
    this.projectiles.push(new Projectile(tower, angle));
  }

  spawnPacket(x, y, value) {
    this.packets.push(new Packet(x, y, value));
  }

  // ── Torres: colocar, selecionar, upgrade, vender ──────────

  canPlace(type, x, y) {
    const def = TOWERS[type];
    const r = def.radius;
    if (x - r < -this.offsetX || x + r > this.mapW - this.offsetX || y - r < 0 || y + r > VIEW_H) return false;
    const d = this.path.distanceTo(x, y);
    if (def.onPath ? d > this.path.width / 2 - 6 : d < this.path.width / 2 + r - 6) return false;
    if (Math.hypot(x - this.server.x, y - this.server.y) < 44 + r) return false;
    if (!def.onPath && this.decor.parts.some((p) => blocksTower(p, x, y, r))) return false;
    return this.towers.every((t) => Math.hypot(t.x - x, t.y - y) >= t.r + r);
  }

  place(type, x, y) {
    const def = TOWERS[type];
    if (this.money < def.cost || !this.canPlace(type, x, y)) return false;
    this.money -= def.cost;
    const tower = new Tower(type, x, y);
    if (this.rounds.active) tower.onRoundStart();
    this.towers.push(tower);
    this.fx.burst(x, y, '#ffffff', 14, 160, 0.35, 5);
    buzz(12);
    this.placing = null;
    return true;
  }

  towerAt(x, y) {
    let best = null;
    for (const t of this.towers) if (Math.hypot(t.x - x, t.y - y) < t.r + 10) best = t;
    return best;
  }

  buyUpgrade(tower) {
    const up = tower.nextUpgrade;
    if (!up) return;
    if (this.money < up.cost) {
      this.fx.text(tower.x, tower.y - 40, 'Sem bits!', '#ff7a8a', 18);
      return;
    }
    this.money -= up.cost;
    tower.upgrade();
    this.fx.burst(tower.x, tower.y, '#ffd23f', 20, 180, 0.5, 5);
  }

  sell(tower) {
    this.money += tower.sellValue;
    tower.dead = true;
    this.towers = this.towers.filter((t) => t !== tower);
    this.selectedTower = null;
    this.fx.burst(tower.x, tower.y, '#ffd23f', 16, 160, 0.4, 5);
    this.fx.text(tower.x, tower.y - 30, `+$${tower.sellValue}`, '#ffd23f', 20);
  }

  collectAt(x, y) {
    for (let i = this.packets.length - 1; i >= 0; i--) {
      const p = this.packets[i];
      if (!p.hit(x, y)) continue;
      p.state = 'collected';
      p.target = { x: 30 - this.offsetX, y: 72 };
      this.money += p.value;
      this.fx.text(p.x, p.y - 24, `+$${p.value}`, '#ffd23f', 20);
      return true;
    }
    return false;
  }

  // ── Input (coordenadas de tela já convertidas) ────────────

  pointerDown(sx, sy, type = 'touch') {
    Object.assign(this.pointer, { x: sx, y: sy, down: true, type });

    if (this.state === 'menu') return this.start();
    if (this.state === 'paused') {
      this.state = 'playing';
      return;
    }
    if (this.state === 'won' || this.state === 'lost') {
      if (this.endDelay <= 0 && inRect(screenButton(this), sx, sy)) this.start();
      return;
    }

    const L = layout(this);
    if (sx >= L.panel.x) return this.panelTap(sx, sy, L);
    if (inRect(L.pause, sx, sy)) return this.pause();

    const mx = sx - this.offsetX;
    if (this.collectAt(mx, sy)) return;
    if (this.placing) {
      // decide no pointerUp: toque rápido coloca ali, arrastar ajusta a posição
      this.drag = { type: this.placing, x: sx, y: sy, moved: false, fromMap: true };
      return;
    }
    this.selectedTower = this.towerAt(mx, sy);
  }

  panelTap(sx, sy, L) {
    if (inRect(L.play, sx, sy)) return this.playPressed();

    const tw = this.selectedTower;
    if (tw) {
      if (inRect(L.close, sx, sy)) this.selectedTower = null;
      else if (inRect(L.sell, sx, sy)) this.sell(tw);
      else if (tw.def.targeting && inRect(L.target, sx, sy)) {
        const i = TARGET_MODES.findIndex((m) => m.id === tw.targetMode);
        tw.targetMode = TARGET_MODES[(i + 1) % TARGET_MODES.length].id;
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
      const toggleOff = this.placing === tile.type;
      if (!toggleOff && this.money < def.cost) {
        this.fx.text(tile.x + tile.w / 2 - this.offsetX, tile.y + 30, 'Sem bits!', '#ff7a8a', 18);
        return;
      }
      this.placing = tile.type;
      this.drag = { type: tile.type, x: sx, y: sy, moved: false, fromMap: false, toggleOff };
      return;
    }
  }

  pointerMove(sx, sy, type = 'touch') {
    Object.assign(this.pointer, { x: sx, y: sy, type });
    const d = this.drag;
    if (d && !d.moved && Math.hypot(sx - d.x, sy - d.y) > 10) d.moved = true;
    // passar o dedo por cima também coleta os pacotes
    if (this.pointer.down && !d && this.state === 'playing') this.collectAt(sx - this.offsetX, sy);
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
    if (!this.place(type, x, y)) this.fx.text(x, y - 30, 'Aqui não dá!', '#ff7a8a', 18);
  }

  pointerCancel() {
    this.pointer.down = false;
    this.drag = null;
  }

  // Onde a torre "fantasma" aparece enquanto escolhe o lugar
  ghost() {
    if (!this.placing || this.state !== 'playing') return null;
    const p = this.pointer;
    const dragging = this.drag?.moved;
    if (!dragging && p.type !== 'mouse') return null;
    if (p.x >= this.mapW) return null;
    const lift = dragging && p.type !== 'mouse' ? TOUCH_LIFT : 0;
    return { x: p.x - this.offsetX, y: p.y - lift };
  }

  // ── Desenho ───────────────────────────────────────────────

  render(ctx) {
    const t = this.anim;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, this.mapW, VIEW_H);
    ctx.clip();
    this.mapRenderer.draw(ctx, this);
    ctx.translate(this.offsetX, 0);

    ctx.save();
    ctx.translate(this.server.x, this.server.y);
    drawServer(ctx, t, this.hurt);
    ctx.restore();

    const sel = this.selectedTower;
    if (sel) drawRange(ctx, sel.x, sel.y, sel.stats.range);

    // armadilhas ficam no chão, embaixo dos vírus
    for (const tw of this.towers) if (tw.def.onPath) this.drawTowerAt(ctx, tw);

    for (const e of this.enemies) {
      ctx.save();
      ctx.translate(e.x, e.y);
      drawEnemy(ctx, e);
      ctx.restore();
      if (e.def.boss) drawBossBar(ctx, e);
    }

    const towers = this.towers.filter((tw) => !tw.def.onPath).sort((a, b) => a.y - b.y);
    for (const tw of towers) this.drawTowerAt(ctx, tw);
    if (sel) {
      ctx.beginPath();
      ctx.arc(sel.x, sel.y, sel.r + 8, 0, Math.PI * 2);
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
    }

    for (const p of this.projectiles) {
      ctx.save();
      ctx.translate(p.x, p.y);
      drawProjectile(ctx, p);
      ctx.restore();
    }

    this.fx.draw(ctx);

    const g = this.ghost();
    if (g) {
      const def = TOWERS[this.placing];
      const valid = this.canPlace(this.placing, g.x, g.y) && this.money >= def.cost;
      drawRange(ctx, g.x, g.y, def.range ?? 0, valid);
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.translate(g.x, g.y);
      drawTower(ctx, this.placing, { t, angle: -Math.PI / 2 });
      ctx.restore();
    }
    ctx.restore();

    drawHud(ctx, this);

    // pacotes por cima do HUD (os coletados voam até o contador)
    ctx.save();
    ctx.translate(this.offsetX, 0);
    for (const p of this.packets) {
      if (!p.visible) continue;
      ctx.save();
      ctx.translate(p.x, p.y);
      drawCoin(ctx, p.state === 'collected' ? 11 : 15, p.spin);
      ctx.restore();
    }
    ctx.restore();

    drawPanel(ctx, this);
    drawBanner(ctx, this);
    drawOverlay(ctx, this);
  }

  drawTowerAt(ctx, tw) {
    ctx.save();
    ctx.translate(tw.x, tw.y);
    drawTower(ctx, tw.type, { t: tw.anim, angle: tw.angle, recoil: tw.recoil, pulse: tw.pulse });
    drawPips(ctx, tw.level, tw.r);
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

function drawBossBar(ctx, e) {
  const w = 76;
  const x = e.x - w / 2;
  const y = e.y - e.r - 26;
  rrect(ctx, x, y, w, 12, 6);
  fillOutline(ctx, '#2a1840', 3);
  const k = Math.max(0, e.hp / e.def.hp);
  if (k > 0) {
    rrect(ctx, x + 2, y + 2, (w - 4) * k, 8, 4);
    ctx.fillStyle = '#ff4d6d';
    ctx.fill();
  }
}
