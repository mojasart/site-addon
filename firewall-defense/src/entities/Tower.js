import { TOWERS } from '../data/towers.js';
import { SELL_RATE } from '../config.js';
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
    this.stunned = 0; // atordoada por zona eletrificada (segundos)
    this.targetMode = this.def.defaultTarget ?? 'first';
    this.hp = this.maxHp = this.def.hp ?? 0; // vida da isca (Honeypot)
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
    this.spent += up.cost;
    this.level++;
    this.spawnAnim = 1;
  }

  onRoundStart() {
    this.fresh = false;
    this.dropped = 0;
    this.dropTimer = rand(1, 2.5);
  }

  // Minerador: a rodada acabou antes de minerar tudo → solta na hora as
  // moedas que faltaram (ninguém perde bitcoin por rodada curta)
  finishMining(game) {
    const s = this.stats;
    if (s.attack !== 'farm' || !game.canMine(this)) return;
    for (; this.dropped < s.packetsPerRound; this.dropped++) game.spawnPacket(this.x, this.y - 10, s.packetValue);
    this.attack = 1;
  }

  lookAt(x) {
    if (Math.abs(x - this.x) > 4) this.face = x < this.x ? -1 : 1;
  }

  // Isca (Honeypot) apanhando de um vírus parado nela
  bite(amount, game) {
    if (this.dead) return;
    this.pulse = Math.max(this.pulse, 0.35);
    this.wear(amount, game);
  }

  // Segundos que a isca ainda dura se ninguém morder
  get timeLeft() {
    return Math.max(0, this.hp) / this.decay;
  }

  // Vida que a isca perde sozinha por segundo (dura `duration` s)
  get decay() {
    return this.maxHp / this.stats.duration;
  }

  wear(amount, game) {
    if (this.dead) return;
    this.hp -= amount;
    if (this.hp > 0) return;
    this.dead = true;
    game.fx.burst(this.x, this.y, '#f5a524', 20, 170, 0.55, 5, true);
    game.sound.play('pop');
  }

  stun(time) {
    this.stunned = Math.max(this.stunned, time);
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
    // isca: o tempo corre nas rodadas (antes de começar dá pra posicionar com calma)
    if (s.attack === 'decoy' && game.rounds.active) this.wear(this.decay * dt, game);
    if (this.stunned > 0) {
      this.stunned = Math.max(0, this.stunned - dt);
      return;
    }

    switch (s.attack) {
      case 'projectile': {
        if (this.cooldown > 0) break;
        const target = game.findTarget(this);
        if (!target) break;
        // mira na frente do alvo, onde ele vai estar quando o tiro chegar
        // o projétil sai da mão (14px acima da base)
        const handY = this.y - 14;
        const t = Math.hypot(target.x - this.x, target.y - handY) / s.projectileSpeed;
        const p = target.route.pointAt(target.dist + target.speed * t);
        const angle = Math.atan2(p.y - handY, p.x - this.x);
        const shots = s.multishot ?? 1;
        // tiros teleguiados: no triplo, cada teclado vai num alvo diferente (se houver)
        const targets = shots > 1 ? game.findTargets(this, shots) : [target];
        for (let i = 0; i < shots; i++) game.spawnProjectile(this, angle + (i - (shots - 1) / 2) * 0.22, targets[i] ?? target);
        this.lookAt(p.x);
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
        // vira o corpo pro inimigo mais adiantado que está acertando
        this.lookAt(targets.reduce((a, b) => (b.remaining < a.remaining ? b : a)).x);
        for (const e of targets.slice(0, s.maxTargets)) {
          if (s.slow) e.slow(s.slow, s.slowTime);
          if (s.vulnerable) e.weaken(s.slowTime);
          if (s.burn) e.ignite(s.burn, s.burnTime, this); // antes do dano: os filhos já nascem pegando fogo
          if (s.damage) e.takeDamage(s.damage, game, this.opts());
        }
        game.fx.ring(this.x, this.y, s.range, s.effect);
        this.pulse = 1;
        this.fire();
        break;
      }
      case 'decoy':
        // a isca não ataca: quem faz tudo são os vírus mordendo (bite)
        break;
      case 'farm': {
        if (!game.rounds.active || this.dropped >= s.packetsPerRound || !game.canMine(this)) break;
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
