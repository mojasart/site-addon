import { TOWERS } from '../data/towers.js';
import { SELL_RATE } from '../config.js';
import { rand, chance } from '../util.js';
import { laserOrigin } from '../render/characters.js';

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
    for (; this.dropped < s.packetsPerRound; this.dropped++) this.mine(game);
    this.attack = 1;
  }

  // Solta um bitcoin; com Overclock (Dark Net) às vezes vem dobrado
  mine(game) {
    const s = this.stats;
    const lucky = chance(s.doubleChance);
    game.spawnPacket(this.x, this.y - 10, s.packetValue * (lucky ? 2 : 1));
    if (lucky) game.fx.text(this.x, this.y - 44, 'x2!', '#ffd84a', 16);
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
    // Mel Turbinado (Dark Net): às vezes volta com metade da vida
    if (chance(this.stats.reviveChance)) {
      this.hp = this.maxHp / 2;
      this.spawnAnim = 1;
      game.fx.text(this.x, this.y - 30, 'VOLTOU!', '#ffd84a', 16);
      game.fx.burst(this.x, this.y, '#f5a524', 12, 120, 0.45, 4, true);
      return;
    }
    this.dead = true;
    game.fx.burst(this.x, this.y, '#f5a524', 20, 170, 0.55, 5, true);
    game.sound.play('pop');
  }

  // Laser perfurante: até n vírus atrás do alvo, na linha do tiro (os mais
  // perto do alvo primeiro), dentro do alcance
  behind(game, target, x0, y0, n) {
    if (n <= 0) return [];
    const len = Math.hypot(target.x - x0, target.y - y0) || 1;
    const dx = (target.x - x0) / len;
    const dy = (target.y - y0) / len;
    const list = [];
    for (const e of game.enemies) {
      if (e === target || e.dead || !game.isVisible(e)) continue;
      const along = (e.x - x0) * dx + (e.y - y0) * dy; // distância ao longo do raio
      const side = Math.abs((e.x - x0) * dy - (e.y - y0) * dx); // distância até a linha
      if (along <= len || along > this.stats.range + e.r || side > e.r + 6) continue;
      list.push({ e, along });
    }
    return list.sort((a, b) => a.along - b.along).slice(0, n).map((h) => h.e);
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
        // o laser sai do olho vermelho, do lado pra onde ele está olhando
        // (0,8: o meio do bote que ele dá enquanto o raio aparece)
        const eye = laserOrigin(this.type, this.level, 0.8);
        const x0 = this.x + this.face * eye.x;
        const y0 = this.y + eye.y;
        // Feixe Perfurante: o laser segue reto e acerta quem está atrás do alvo
        // Lente Calibrada (Dark Net): às vezes atravessa mais um
        const lucky = chance(s.pierceChance);
        const hits = [target, ...this.behind(game, target, x0, y0, (s.pierce ?? 1) - 1 + (lucky ? 1 : 0))];
        if (lucky && hits.length > (s.pierce ?? 1)) game.fx.text(target.x, target.y - target.r - 6, 'ATRAVESSOU!', '#ff8a8a', 14);
        const last = hits[hits.length - 1];
        game.fx.beam(x0, y0, last.x, last.y);
        for (const e of hits) e.takeDamage(s.damage, game, this.opts());
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
          // bônus de sorte da Dark Net: empurrão (Golem) e congelamento (Penguin),
          // antes do dano: os filhos nascem já empurrados/congelados
          if (chance(s.knockChance) && e.knockBack(28)) game.fx.text(e.x, e.y - e.r - 6, 'EMPURRÃO!', '#ffb36b', 14);
          if (chance(s.freezeChance) && e.freeze(1)) game.fx.text(e.x, e.y - e.r - 6, 'CONGELOU!', '#9fe6ff', 14);
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
          this.mine(game);
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
