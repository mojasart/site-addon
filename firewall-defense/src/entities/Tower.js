import { TOWERS } from '../data/towers.js';
import { SELL_RATE } from '../config.js';
import { rand } from '../util.js';

export class Tower {
  constructor(type, x, y) {
    this.type = type;
    this.def = TOWERS[type];
    this.x = x;
    this.y = y;
    this.r = this.def.radius;
    this.level = 0;
    this.spent = this.def.cost;
    this.stats = { ...this.def }; // cópia: upgrades mexem aqui, não no original
    this.buff = { rate: 1, armored: false }; // vem do Sysadmin (game.recomputeBuffs)
    this.cooldown = 0.2;
    this.face = 1; // 1 = olhando pra direita, -1 = esquerda
    this.attack = 0; // animação de ataque (1 → 0)
    this.pulse = 0;
    this.spawnAnim = 1; // "pulinho" ao ser colocado
    this.targetMode = this.def.defaultTarget ?? 'first';
    this.capacity = this.def.capacity ?? 0;
    this.trapHits = new Set();
    this.dropped = 0;
    this.dropTimer = 0;
    this.anim = rand(0, 10);
    this.pops = 0;
    this.dead = false;
  }

  get nextUpgrade() {
    return this.def.upgrades[this.level] ?? null;
  }

  get sellValue() {
    return Math.floor(this.spent * SELL_RATE);
  }

  get rate() {
    return this.stats.fireRate * this.buff.rate;
  }

  get hitsArmored() {
    return !!(this.stats.canHitArmored || this.buff.armored);
  }

  upgrade() {
    const up = this.nextUpgrade;
    up.apply(this.stats);
    this.spent += up.cost;
    this.level++;
    this.spawnAnim = 1;
  }

  onRoundStart() {
    this.dropped = 0;
    this.dropTimer = rand(1, 2.5);
  }

  lookAt(x) {
    if (Math.abs(x - this.x) > 4) this.face = x < this.x ? -1 : 1;
  }

  opts() {
    return { armored: this.hitsArmored, source: this };
  }

  update(dt, game) {
    const s = this.stats;
    this.anim += dt;
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.attack = Math.max(0, this.attack - dt * 4);
    this.pulse = Math.max(0, this.pulse - dt * 4);
    this.spawnAnim = Math.max(0, this.spawnAnim - dt * 3);

    switch (s.attack) {
      case 'projectile': {
        if (this.cooldown > 0) break;
        const target = game.findTarget(this);
        if (!target) break;
        // mira na frente do alvo, onde ele vai estar quando o tiro chegar
        // o projétil sai da mão (14px acima da base)
        const handY = this.y - 14;
        const t = Math.hypot(target.x - this.x, target.y - handY) / s.projectileSpeed;
        const p = game.path.pointAt(target.dist + target.speed * t);
        const angle = Math.atan2(p.y - handY, p.x - this.x);
        const shots = s.multishot ?? 1;
        for (let i = 0; i < shots; i++) game.spawnProjectile(this, angle + (i - (shots - 1) / 2) * 0.22);
        this.lookAt(p.x);
        this.fire();
        break;
      }
      case 'spray': {
        if (this.cooldown > 0) break;
        if (game.enemiesInRange(this.x, this.y, s.range).length === 0) break;
        const offset = (this.anim * 0.7) % (Math.PI * 2);
        for (let i = 0; i < s.count; i++) game.spawnProjectile(this, offset + (i / s.count) * Math.PI * 2);
        this.fire();
        break;
      }
      case 'beam': {
        if (this.cooldown > 0) break;
        const target = game.findTarget(this);
        if (!target) break;
        this.lookAt(target.x);
        game.fx.beam(this.x + this.face * 4, this.y - 26, target.x, target.y);
        target.takeDamage(s.damage, game, this.opts());
        this.fire();
        break;
      }
      case 'pulse': {
        if (this.cooldown > 0) break;
        const targets = game.enemiesInRange(this.x, this.y, s.range);
        if (targets.length === 0) break;
        for (const e of targets.slice(0, s.maxTargets)) {
          if (s.slow) e.slow(s.slow, s.slowTime);
          if (s.damage) e.takeDamage(s.damage, game, this.opts());
        }
        game.fx.ring(this.x, this.y, s.range, s.effect);
        this.pulse = 1;
        this.fire();
        break;
      }
      case 'hook': {
        if (this.cooldown > 0) break;
        const targets = game.findTargets(this, s.hooks);
        if (targets.length === 0) break;
        for (const e of targets) {
          game.fx.hook(this.x + this.face * 26, this.y - 40, e.x, e.y);
          e.takeDamage(s.damage, game, this.opts());
          if (!e.dead) e.pullBack(s.pull, game);
        }
        this.lookAt(targets[0].x);
        this.fire();
        break;
      }
      case 'trap': {
        for (const e of game.enemies) {
          if (e.dead || this.trapHits.has(e)) continue;
          if (Math.hypot(e.x - this.x, e.y - this.y) < e.r + this.r) {
            this.trapHits.add(e);
            e.takeDamage(s.damage, game, this.opts());
            this.pulse = 1;
            if (--this.capacity <= 0) {
              this.dead = true;
              game.fx.burst(this.x, this.y, '#f5a524', 18, 160, 0.5);
              break;
            }
          }
        }
        break;
      }
      case 'farm': {
        if (!game.rounds.active || this.dropped >= s.packetsPerRound) break;
        this.dropTimer -= dt;
        if (this.dropTimer <= 0) {
          game.spawnPacket(this.x, this.y - 10, s.packetValue);
          this.dropped++;
          this.dropTimer = s.packetInterval;
          this.attack = 1;
        }
        break;
      }
      // 'buff' não faz nada sozinho: o jogo aplica o bônus nas torres vizinhas
    }
  }

  fire() {
    this.cooldown = this.rate;
    this.attack = 1;
  }
}
