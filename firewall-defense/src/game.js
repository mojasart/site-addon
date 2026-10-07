import {
  ROWS, COLS, CELL_W, BOARD_X, BOARD_Y, BOARD_RIGHT, BOARD_BOTTOM, MIN_VIEW_W, CORE_X,
  START_BITS, PACKET_VALUE, SKY_PACKET_INTERVAL, cellAt, colX, rowY,
} from './config.js';
import { DEFENDERS } from './data/defenders.js';
import { LEVELS } from './data/levels.js';
import { Defender } from './entities/Defender.js';
import { Enemy } from './entities/Enemy.js';
import { Projectile } from './entities/Projectile.js';
import { Packet } from './entities/Packet.js';
import { Backup } from './entities/Backup.js';
import { WaveDirector } from './systems/WaveDirector.js';
import { Effects } from './systems/Effects.js';
import { rand } from './util.js';
import { drawBoard, drawCore, drawPlacementHints } from './render/board.js';
import { drawHud, hudLayout, inRect } from './render/hud.js';
import { drawBanner, drawOverlay } from './render/screens.js';
import { drawDefender, drawEnemy, drawProjectile, drawPacket, drawBackup, drawTrash } from './render/sprites.js';

export class Game {
  constructor({ debug = false } = {}) {
    this.debug = debug;
    this.viewW = MIN_VIEW_W; // atualizado pelo main.js conforme a tela
    this.anim = 0; // relógio das animações (roda até no menu)
    this.pointer = { x: -1, y: -1, down: false, type: 'touch' };
    this.drag = null;
    this.load(0);
  }

  // ── Ciclo de vida ─────────────────────────────────────────

  load(levelIndex) {
    this.levelIndex = levelIndex;
    this.level = LEVELS[levelIndex];
    this.state = 'menu'; // menu | playing | paused | won | lost
    this.endDelay = 0;
    this.bits = this.debug ? 5000 : (this.level.startBits ?? START_BITS);
    this.cooldownMul = this.debug ? 0.1 : 1;
    this.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    this.defenders = [];
    this.enemies = [];
    this.projectiles = [];
    this.packets = [];
    this.backups = Array.from({ length: ROWS }, (_, r) => new Backup(r));
    this.cooldowns = Object.fromEntries(this.level.defenders.map((type) => [type, 0]));
    this.selected = null; // id do defensor, 'shovel' ou null
    this.skyTimer = 5;
    this.director = new WaveDirector(this.level);
    this.fx = new Effects();
    this.banner = null;
    this.stats = { kills: 0 };
  }

  start() {
    this.state = 'playing';
    this.showBanner(this.level.name, 2.5, '#3dd6ff');
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.drag = null;
  }

  end(won) {
    this.state = won ? 'won' : 'lost';
    this.endDelay = 1; // evita reiniciar sem querer com um toque atrasado
    this.selected = null;
    this.drag = null;
  }

  showBanner(text, duration = 2.5, color = '#ffffff') {
    this.banner = { text, color, time: duration, total: duration };
  }

  // ── Atualização ───────────────────────────────────────────

  update(dt) {
    this.anim += dt;
    if (this.state !== 'paused') this.fx.update(dt);
    if (this.state !== 'playing') {
      this.endDelay = Math.max(0, this.endDelay - dt);
      return;
    }

    for (const type in this.cooldowns) this.cooldowns[type] = Math.max(0, this.cooldowns[type] - dt);

    this.skyTimer -= dt;
    if (this.skyTimer <= 0) {
      this.skyTimer = SKY_PACKET_INTERVAL + rand(-2, 2);
      this.spawnSkyPacket();
    }

    this.director.update(dt, this);
    for (const d of this.defenders) d.update(dt, this);
    for (const e of this.enemies) e.update(dt, this);
    for (const p of this.projectiles) p.update(dt, this);
    for (const b of this.backups) b.update(dt, this);
    for (const p of this.packets) p.update(dt);

    // limpeza
    this.defenders = this.defenders.filter((d) => {
      if (!d.dead) return true;
      if (this.grid[d.row][d.col] === d) this.grid[d.row][d.col] = null;
      return false;
    });
    this.enemies = this.enemies.filter((e) => !e.dead);
    this.projectiles = this.projectiles.filter((p) => !p.dead);
    this.packets = this.packets.filter((p) => !p.dead);

    if (this.banner) {
      this.banner.time -= dt;
      if (this.banner.time <= 0) this.banner = null;
    }

    if (this.enemies.some((e) => e.x <= CORE_X)) this.end(false);
    else if (this.director.finished && this.enemies.length === 0) this.end(true);
  }

  // ── Consultas usadas pelas entidades ──────────────────────

  hasEnemyAhead(row, x) {
    return this.enemies.some((e) => !e.dead && e.row === row && e.x > x - 10 && e.x < BOARD_RIGHT + 25);
  }

  enemyNear(row, x, range) {
    return this.enemies.some((e) => !e.dead && e.row === row && Math.abs(e.x - x) < range);
  }

  // Inimigo mais à esquerda que o projétil está tocando
  enemyHitBy(p) {
    let best = null;
    for (const e of this.enemies) {
      if (e.dead || e.row !== p.row || e.x > BOARD_RIGHT + 60) continue;
      if (Math.abs(e.x - p.x) < e.halfW + p.r && (!best || e.x < best.x)) best = e;
    }
    return best;
  }

  // Defensor que está na frente do inimigo (ele para e começa a corromper)
  defenderBlocking(e) {
    const front = e.x - e.halfW;
    let best = null;
    for (const d of this.defenders) {
      if (d.dead || d.row !== e.row) continue;
      if (front <= d.x + CELL_W * 0.3 && e.x >= d.x - CELL_W * 0.3 && (!best || d.x > best.x)) best = d;
    }
    return best;
  }

  // ── Criação de entidades ──────────────────────────────────

  spawnEnemy(type, row) {
    this.enemies.push(new Enemy(type, row));
  }

  spawnProjectile(shooter) {
    this.projectiles.push(new Projectile(shooter));
  }

  spawnPacket(x, y, value) {
    this.packets.push(Packet.fromProducer(x, y, value));
  }

  spawnSkyPacket() {
    const x = rand(BOARD_X + 30, BOARD_RIGHT - 30);
    const targetY = rand(BOARD_Y + 30, BOARD_BOTTOM - 30);
    this.packets.push(Packet.fromSky(x, targetY, PACKET_VALUE));
  }

  // ── Ações do jogador ──────────────────────────────────────

  canBuy(type) {
    return this.cooldowns[type] <= 0 && this.bits >= DEFENDERS[type].cost;
  }

  place(type, row, col) {
    if (this.grid[row][col] || !this.canBuy(type)) return false;
    const def = DEFENDERS[type];
    this.bits -= def.cost;
    this.cooldowns[type] = def.cooldown * this.cooldownMul;
    const d = new Defender(type, row, col);
    this.grid[row][col] = d;
    this.defenders.push(d);
    this.fx.burst(d.x, d.y, '#3dd6ff', 12, 120, 0.4);
    this.selected = null;
    return true;
  }

  remove(row, col) {
    const d = this.grid[row][col];
    if (!d) return false;
    d.dead = true;
    this.grid[row][col] = null;
    this.fx.burst(d.x, d.y, '#ff5d73', 14, 140, 0.5);
    return true;
  }

  useSelectedOn(cell) {
    if (this.selected === 'shovel') {
      this.remove(cell.row, cell.col);
      this.selected = null;
    } else if (this.selected) {
      this.place(this.selected, cell.row, cell.col);
    }
  }

  collectAt(x, y) {
    for (let i = this.packets.length - 1; i >= 0; i--) {
      const p = this.packets[i];
      if (p.hit(x, y)) {
        p.state = 'collected';
        this.bits += p.value;
        this.fx.text(p.x, p.y - 26, `+${p.value}`, '#ffd23f');
        return true;
      }
    }
    return false;
  }

  // ── Input (coordenadas já convertidas pro mundo do jogo) ──

  pointerDown(x, y, type = 'touch') {
    Object.assign(this.pointer, { x, y, down: true, type });

    if (this.state === 'menu') return this.start();
    if (this.state === 'paused') {
      this.state = 'playing';
      return;
    }
    if (this.state === 'won' || this.state === 'lost') {
      if (this.endDelay <= 0) {
        this.load(this.levelIndex);
        this.start();
      }
      return;
    }

    // 1) pacotes têm prioridade sobre tudo
    if (this.collectAt(x, y)) return;

    // 2) HUD
    const L = hudLayout(this);
    if (inRect(L.pause, x, y)) return this.pause();
    if (inRect(L.shovel, x, y)) return this.selectTool('shovel', x, y);
    for (const c of L.cards) {
      if (!inRect(c, x, y)) continue;
      if (this.canBuy(c.type) || this.selected === c.type) this.selectTool(c.type, x, y);
      else {
        const why = this.cooldowns[c.type] > 0 ? 'Recarregando...' : 'Bits insuficientes';
        this.fx.text(c.x + c.w / 2, c.y + c.h + 14, why, '#ff5d73');
      }
      return;
    }

    // 3) tabuleiro
    const cell = cellAt(x, y);
    if (cell && this.selected) this.useSelectedOn(cell);
    else this.selected = null;
  }

  // Toque numa carta: seleciona e já prepara pra arrastar
  selectTool(tool, x, y) {
    const toggleOff = this.selected === tool;
    this.selected = tool;
    this.drag = { x, y, moved: false, toggleOff };
  }

  pointerMove(x, y, type = 'touch') {
    Object.assign(this.pointer, { x, y, type });
    if (this.drag && !this.drag.moved && Math.hypot(x - this.drag.x, y - this.drag.y) > 12) this.drag.moved = true;
    // passar o dedo por cima também coleta pacotes
    if (this.pointer.down && !this.drag && this.state === 'playing') this.collectAt(x, y);
  }

  pointerUp(x, y) {
    this.pointer.down = false;
    const drag = this.drag;
    this.drag = null;
    if (!drag || this.state !== 'playing') return;
    if (drag.moved) {
      const cell = cellAt(x, y);
      if (cell && this.selected) this.useSelectedOn(cell);
      else this.selected = null; // soltou fora do tabuleiro: cancela
    } else if (drag.toggleOff) {
      this.selected = null; // tocou de novo na mesma carta: desmarca
    }
  }

  pointerCancel() {
    this.pointer.down = false;
    this.drag = null;
  }

  // ── Desenho ───────────────────────────────────────────────

  render(ctx) {
    const t = this.anim;

    drawBoard(ctx, this);
    drawCore(ctx, this);
    drawPlacementHints(ctx, this);

    for (const b of this.backups) {
      if (b.state === 'gone') continue;
      ctx.save();
      ctx.translate(b.x, b.y);
      drawBackup(ctx, b.state === 'active', t);
      ctx.restore();
    }

    const defenders = [...this.defenders].sort((a, b) => a.row - b.row);
    for (const d of defenders) {
      ctx.save();
      ctx.translate(d.x + (d.hurt > 0 ? Math.sin(t * 70) * 1.5 : 0), d.y);
      drawDefender(ctx, d.type, d.spriteState(t));
      ctx.restore();
      if (d.hp < d.maxHp) drawBar(ctx, d.x, d.y + 38, 50, d.hp / d.maxHp, 0, '#3dff9a');
    }

    this.drawGhost(ctx, t);

    // linhas de cima primeiro; na mesma linha, quem está mais à frente fica por cima
    const enemies = [...this.enemies].sort((a, b) => a.row - b.row || b.x - a.x);
    for (const e of enemies) {
      ctx.save();
      ctx.translate(e.x, e.y);
      drawEnemy(ctx, e.type, {
        phase: e.phase,
        eating: e.eating,
        flash: e.flash,
        slowed: e.slowed,
        armor: e.armor > 0,
        color: e.def.color,
      });
      ctx.restore();
      const total = e.maxHp + e.maxArmor;
      if (e.hp + e.armor < total) drawBar(ctx, e.x, e.y - 46, 38, e.hp / total, e.armor / total, '#ff3b5c');
    }

    for (const p of this.projectiles) {
      ctx.save();
      ctx.translate(p.x, p.y);
      drawProjectile(ctx, p.kind);
      ctx.restore();
    }

    for (const p of this.packets) if (p.state !== 'collected') this.drawPacketAt(ctx, p, t);

    this.fx.draw(ctx);
    drawHud(ctx, this);
    for (const p of this.packets) if (p.state === 'collected') this.drawPacketAt(ctx, p, t);
    this.drawDragPreview(ctx, t);
    drawBanner(ctx, this);
    drawOverlay(ctx, this);
  }

  drawPacketAt(ctx, p, t) {
    if (!p.visible) return;
    ctx.save();
    ctx.translate(p.x, p.y);
    drawPacket(ctx, t + p.spin, p.state === 'collected' ? 12 : 16);
    ctx.restore();
  }

  // "Fantasma" do defensor na célula sob o dedo/mouse
  drawGhost(ctx, t) {
    const sel = this.selected;
    if (!sel || sel === 'shovel' || this.state !== 'playing') return;
    if (!(this.drag?.moved || this.pointer.type === 'mouse')) return;
    const cell = cellAt(this.pointer.x, this.pointer.y);
    if (!cell || this.grid[cell.row][cell.col]) return;
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.translate(colX(cell.col), rowY(cell.row));
    drawDefender(ctx, sel, { t, hpRatio: 1, armed: true });
    ctx.restore();
  }

  // Enquanto arrasta no celular, mostra o item acima do dedo (pro dedo não tapar)
  drawDragPreview(ctx, t) {
    if (!this.drag?.moved || !this.selected) return;
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.translate(this.pointer.x, this.pointer.y - (this.pointer.type === 'mouse' ? 0 : 40));
    ctx.scale(0.8, 0.8);
    if (this.selected === 'shovel') drawTrash(ctx);
    else drawDefender(ctx, this.selected, { t, hpRatio: 1, armed: true });
    ctx.restore();
  }
}

function drawBar(ctx, cx, y, w, ratio, extra, color) {
  const x = cx - w / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(x - 1, y - 1, w + 2, 6);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * Math.max(0, ratio), 4);
  if (extra > 0) {
    ctx.fillStyle = '#cfd6e6';
    ctx.fillRect(x + w * Math.max(0, ratio), y, w * extra, 4);
  }
}
