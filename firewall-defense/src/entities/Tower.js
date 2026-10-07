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
    this.cooldown = 0.2;
    this.angle = -Math.PI / 2;
    this.recoil = 0;
    this.pulse = 0;
    this.targetMode = 'first';
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

  upgrade() {
    const up = this.nextUpgrade;
    up.apply(this.stats);
    this.spent += up.cost;
    this.level++;
  }

  onRoundStart() {
    this.dropped = 0;
    this.dropTimer = rand(1, 2.5);
  }

  update(dt, game) {
    const s = this.stats;
    this.anim += dt;
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.recoil = Math.max(0, this.recoil - dt * 6);
    this.pulse = Math.max(0, this.pulse - dt * 4);

    switch (s.attack) {
      case 'projectile': {
        if (this.cooldown > 0) break;
        const target = game.findTarget(this);
        if (!target) break;
        // mira na frente do alvo, onde ele vai estar quando o tiro chegar
        const t = Math.hypot(target.x - this.x, target.y - this.y) / s.projectileSpeed;
        const p = game.path.pointAt(target.dist + target.speed * t);
        this.angle = Math.atan2(p.y - this.y, p.x - this.x);
        game.spawnProjectile(this, this.angle);
        this.cooldown = s.fireRate;
        this.recoil = 1;
        break;
      }
      case 'beam': {
        if (this.cooldown > 0) break;
        const target = game.findTarget(this);
        if (!target) break;
        this.angle = Math.atan2(target.y - this.y, target.x - this.x);
        game.fx.beam(this.x + Math.cos(this.angle) * 20, this.y + Math.sin(this.angle) * 20, target.x, target.y);
        target.takeDamage(s.damage, game, { armored: s.canHitArmored, source: this });
        this.cooldown = s.fireRate;
        this.recoil = 1;
        break;
      }
      case 'pulse': {
        if (this.cooldown > 0) break;
        const targets = game.enemiesInRange(this.x, this.y, s.range);
        if (targets.length === 0) break;
        for (const e of targets.slice(0, s.maxTargets)) {
          if (s.slow) e.slow(s.slow, s.slowTime);
          if (s.damage) e.takeDamage(s.damage, game, { armored: s.canHitArmored, source: this });
        }
        game.fx.ring(this.x, this.y, s.range, s.effect);
        this.cooldown = s.fireRate;
        this.pulse = 1;
        break;
      }
      case 'trap': {
        for (const e of game.enemies) {
          if (e.dead || this.trapHits.has(e)) continue;
          if (Math.hypot(e.x - this.x, e.y - this.y) < e.r + this.r) {
            this.trapHits.add(e);
            e.takeDamage(s.damage, game, { armored: s.canHitArmored, source: this });
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
          game.spawnPacket(this.x, this.y, s.packetValue);
          this.dropped++;
          this.dropTimer = s.packetInterval;
          this.pulse = 1;
        }
        break;
      }
    }
  }
}
