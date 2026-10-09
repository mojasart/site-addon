import { TOWERS, LEVEL_RANGE } from '../data/towers.js';
import { SELL_RATE, LAYER_HP } from '../config.js';
import { rand, chance } from '../util.js';
import { laserOrigin } from '../render/characters.js';
import { applyPerks } from '../data/darknet.js';

const SWARM_R = 70; // alcance das abelhas da Colmeia
const RECHARGE = 0.3; // recarga instantânea (Avalanche, Varredura Dupla): dispara de novo nesse tempo

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
    this.perks = {}; // nós da Dark Net comprados (Game.place passa os do jogador)
    this.stats = { ...this.def }; // cópia: upgrades mexem aqui, não no original
    this.cooldown = 0.2;
    this.haste = 1; // velocidade de ataque (Executivo e BURNOUT; Game.updateHaste)
    this.teamRecharge = 0; // chance de atacar de novo na hora (Hora Extra do Executivo; Game.updateHaste)
    this.face = 1; // 1 = olhando pra direita, -1 = esquerda
    this.attack = 0; // animação de ataque (1 → 0)
    this.pulse = 0;
    this.spawnAnim = 1; // "pulinho" ao ser colocado
    this.stunned = 0; // atordoada por zona eletrificada (segundos)
    this.ransom = 0; // criptografada pelo Ransomware: resgate a pagar (0 = livre)
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
    return this.fresh ? this.spent : Math.floor(this.spent * (this.stats.sellRate ?? SELL_RATE)); // Revenda (Dark Net): preço cheio
  }

  get hitsArmored() {
    return !!this.stats.canHitArmored;
  }

  upgrade() {
    this.spent += this.nextUpgrade.cost;
    this.level++;
    this.refresh();
    this.spawnAnim = 1;
  }

  // Status = base + upgrades até o nível + bônus da Dark Net POR CIMA (upgrade
  // que troca um valor, tipo s.slow = 0.3, não apaga o bônus de lentidão)
  refresh() {
    const s = { ...this.def };
    for (let i = 0; i < this.level; i++) this.def.upgrades[i].apply(s);
    // +LEVEL_RANGE de alcance a cada nível (antes dos bônus da Dark Net)
    if (Number.isFinite(s.range)) s.range *= (1 + LEVEL_RANGE) ** this.level;
    this.stats = applyPerks(s, this.type, this.perks);
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
    if (s.attack !== 'farm' || this.ransom || !game.canMine(this)) return;
    for (; this.dropped < s.packetsPerRound; this.dropped++) this.mine(game);
    this.attack = 1;
  }

  // Solta um bitcoin. Sorte da Dark Net: Bloco Raro (5×, moeda grande)
  // e Overclock (2×)
  mine(game) {
    const s = this.stats;
    const gold = chance(s.goldChance);
    const mul = gold ? 5 : chance(s.doubleChance) ? 2 : 1;
    game.spawnPacket(this.x, this.y - 10, s.packetValue * mul, gold);
    if (mul > 1) game.fx.spark(this.x, this.y - 34);
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
      game.fx.spark(this.x, this.y - 24);
      game.fx.burst(this.x, this.y, '#f5a524', 12, 120, 0.45, 4, true);
      return;
    }
    this.dead = true;
    game.fx.burst(this.x, this.y, '#f5a524', 20, 170, 0.55, 5, true);
    game.sound.play('pop');
    // Colmeia (Dark Net): às vezes solta abelhas que tiram 1 camada de quem está em volta
    if (chance(this.stats.swarmChance)) {
      game.fx.burst(this.x, this.y, '#ffd23f', 14, 220, 0.6, 3, true);
      game.fx.burst(this.x, this.y, '#2b2118', 8, 200, 0.6, 3, true);
      for (const e of game.enemiesInRange(this.x, this.y, SWARM_R)) e.takeDamage(LAYER_HP, game, { armored: true, source: this });
    }
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
    this.cooldown = Math.max(0, this.cooldown - dt * this.haste);
    this.attack = Math.max(0, this.attack - dt * 4);
    this.pulse = Math.max(0, this.pulse - dt * 4);
    this.spawnAnim = Math.max(0, this.spawnAnim - dt * 3);
    // isca: o tempo corre nas rodadas (antes de começar dá pra posicionar com calma)
    if (s.attack === 'decoy' && game.rounds.active) this.wear(this.decay * dt, game);
    if (this.ransom) return; // criptografada: parada até pagarem o resgate
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
        // Ctrl+C Ctrl+V (Dark Net): às vezes sai um teclado a mais, num outro vírus
        const copy = chance(s.extraShotChance);
        const n = shots + (copy ? 1 : 0);
        const targets = n > 1 ? game.findTargets(this, n) : [target];
        for (let i = 0; i < n; i++) game.spawnProjectile(this, angle + (i - (n - 1) / 2) * 0.22, targets[i] ?? target);
        if (copy) game.fx.spark(this.x, this.y - 40, '#bfe3ff', 8);
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
        const last = hits[hits.length - 1];
        if (lucky && hits.length > (s.pierce ?? 1)) game.fx.spark(last.x, last.y - last.r, '#ffb3c0');
        game.fx.beam(x0, y0, last.x, last.y);
        // Ping da Morte (Dark Net): às vezes o tiro dá dano triplo (Sobrecarga: quádruplo)
        const triple = chance(s.tripleChance);
        if (triple) game.fx.spark(target.x, target.y - target.r, '#ff6b81', 12);
        for (const e of hits) {
          if (s.markTime) e.mark(s.markTime, s.markMul); // Marcar Alvo: antes do dano (os filhos já nascem marcados)
          e.takeDamage(s.damage * (triple ? s.tripleMul ?? 3 : 1), game, this.opts());
        }
        this.fire();
        // Varredura Dupla (Dark Net): às vezes recarrega na hora
        if (chance(s.rechargeChance)) this.cooldown = RECHARGE;
        break;
      }
      case 'pulse': {
        if (this.cooldown > 0) break;
        // a onda (Golem e Pinguim) corre pelo chão: não pega quem voa (Bug)
        const grounded = (list) => list.filter((e) => !e.def.flying);
        let range = s.range;
        let targets = grounded(game.enemiesInRange(this.x, this.y, range));
        if (targets.length === 0) break;
        // Erupção (Dark Net): às vezes a onda sai com o dobro do alcance
        if (chance(s.bigPulseChance)) {
          range *= 2;
          targets = grounded(game.enemiesInRange(this.x, this.y, range));
        }
        // vira o corpo pro inimigo mais adiantado que está acertando
        this.lookAt(targets.reduce((a, b) => (b.remaining < a.remaining ? b : a)).x);
        for (const e of targets.slice(0, s.maxTargets)) {
          if (s.slow) e.slow(s.slow, s.slowTime);
          if (s.shatterChance) e.shatter = s.shatterChance; // Estilhaço: vale enquanto estiver no gelo
          if (s.vulnerable) e.weaken(s.slowTime, s.vulnMul ?? 2);
          // fogo (Chama Alta e Inferno, da Dark Net, deixam mais forte e mais longo)
          const burnMul = s.burnMul ?? 1;
          const burnExtra = s.burnExtra ?? 0;
          if (s.burn) e.ignite(s.burn * burnMul, s.burnTime + burnExtra, this); // antes do dano: os filhos já nascem pegando fogo
          // bônus de sorte da Dark Net, antes do dano (os filhos já nascem com eles):
          // Tremor de Terra e Brasa Viva (empurrão), Kernel Gelado (congela)
          if (chance(s.knockChance) && e.knockBack(28)) game.fx.spark(e.x, e.y - e.r, '#ffb36b', 7);
          if (chance(s.freezeChance) && e.freeze(1)) game.fx.spark(e.x, e.y - e.r, '#c8f4ff', 8);
          if (s.damage) e.takeDamage(s.damage, game, this.opts());
        }
        game.fx.ring(this.x, this.y, range, s.effect);
        this.pulse = 1;
        this.fire();
        // Avalanche (Dark Net): às vezes vem outra onda logo em seguida
        if (chance(s.repeatChance)) this.cooldown = RECHARGE;
        break;
      }
      case 'decoy':
        // a isca não ataca: quem faz tudo são os vírus mordendo (bite)
        break;
      case 'aura':
        // o Executivo não ataca: acelera quem está em volta (Game.updateHaste)
        break;
      case 'farm': {
        if (s.sponsor) this.updateSponsor(game);
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

  // Patrocínio (2º upgrade do Minerador): escolhe uma defesa que ataca, de
  // preferência uma que ainda não tem patrocinador; se ela for vendida ou
  // quebrar, escolhe outra
  updateSponsor(game) {
    const t = this.sponsorOf;
    if (t && !t.dead && game.towers.includes(t)) return;
    const fighters = game.towers.filter((o) => o !== this && !o.dead && o.def.attack !== 'farm' && o.def.attack !== 'decoy');
    if (!fighters.length) {
      this.sponsorOf = null;
      return;
    }
    const count = (o) => game.towers.filter((m) => m.sponsorOf === o).length;
    const least = Math.min(...fighters.map(count));
    const pool = fighters.filter((o) => count(o) === least);
    this.sponsorOf = pool[Math.floor(Math.random() * pool.length)];
    game.fx.spark(this.sponsorOf.x, this.sponsorOf.y - 40, '#ffd23f', 12);
  }

  fire() {
    // Hora Extra (Executivo por perto, Dark Net): às vezes já recarrega
    this.cooldown = chance(this.teamRecharge) ? RECHARGE : this.stats.fireRate;
    this.attack = 1;
  }
}
