import { TOWERS } from '../data/towers.js';
import { SELL_RATE, UPGRADE_RANGE } from '../config.js';
import { rand } from '../util.js';

export class Tower {
  // fresh: comprada antes de a rodada começar → vende pelo preço cheio
  constructor(type, x, y, fresh = false) {
    this.type = type;
    this.def = TOWERS[type];
    this.x = x;
    this.y = y;
    this.r = this.def.radius;
    this.level = 0;
    this.spent = this.def.cost;
    this.fresh = fresh;
    this.stats = { ...this.def }; // cópia: upgrades mexem aqui, não no original
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
    return this.fresh ? this.spent : Math.floor(this.spent * SELL_RATE);
  }

  get hitsArmored() {
    return !!this.stats.canHitArmored;
  }

  upgrade() {
    const up = this.nextUpgrade;
    up.apply(this.stats);
    if (this.stats.range > 0 && Number.isFinite(this.stats.range)) this.stats.range += UPGRADE_RANGE;
    this.spent += up.cost;
    this.level++;
    this.spawnAnim = 1;
  }

  onRoundStart() {
    this.fresh = false;
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
      case 'pulse': {
        if (this.cooldown > 0) break;
        const targets = game.enemiesInRange(this.x, this.y, s.range);
        if (targets.length === 0) break;
        for (const e of targets.slice(0, s.maxTargets)) {
          if (s.slow) e.slow(s.slow, s.slowTime);
          if (s.vulnerable) e.weaken(s.slowTime);
          if (s.damage) e.takeDamage(s.damage, game, this.opts());
        }
        game.fx.ring(this.x, this.y, s.range, s.effect);
        this.pulse = 1;
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
    }
  }

  fire() {
    this.cooldown = this.stats.fireRate;
    this.attack = 1;
  }
}
