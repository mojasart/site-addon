import { ENEMIES, threat, lives } from '../data/enemies.js';
import { LAYER_HP } from '../config.js';
import { rand, chance } from '../util.js';
import { TILE } from '../core/grid.js';

const SHATTER_R = 45; // alcance do Estilhaço
const STICKY = { mul: 0.5, time: 2 }; // Mel Pegajoso: 50% mais lento por 2 s

export class Enemy {
  constructor(type, dist, route = null) {
    this.type = type;
    this.def = ENEMIES[type];
    this.dist = dist; // quanto já andou na rota
    this.route = route; // rota (core/Path.js) que ele segue até a base
    this.hp = this.maxHp = this.def.hp;
    this.r = this.def.radius;
    this.x = -999;
    this.y = -999;
    this.angle = 0;
    this.face = 1;
    this.slowTimer = 0;
    this.freezeTimer = 0; // congelado (Kernel Gelado, Dark Net): parado
    this.shatter = 0; // Estilhaço (Dark Net): chance de estilhaçar se estourar no gelo
    this.sticky = false; // Mel Pegajoso (Dark Net): sai lento do Honeypot
    this.slowMul = 1;
    this.vulnTimer = 0; // vulnerável (Penguin com Gelo Quebradiço, Dark Net): leva vulnMul de dano
    this.vulnMul = 1;
    this.markTimer = 0; // marcado (Robô NMAP com Marcar Alvo): leva markMul de dano
    this.markMul = 1;
    this.burnTimer = 0; // pegando fogo (Golem com Incêndio): perde burnDps de vida por segundo
    this.burnDps = 0;
    this.burnSource = null;
    this.hpMul = 1; // vida extra de cada camada (modo platina)
    this.flash = 0;
    this.phase = rand(0, 10); // relógio da animação
    this.dead = false;
    this.speedMul = 1; // dificuldade do mapa (RoundManager)
    this.quake = 0; // tremendo parado (Ransomware lançando a criptografia)
  }

  // Vida dos inimigos de várias camadas (Worm, Locker, Ransomware) muda
  // com a dificuldade do mapa; os vírus comuns têm 1 de vida por camada
  scaleHp(mul) {
    if (this.def.hp <= LAYER_HP) return;
    this.hp = this.maxHp = Math.max(LAYER_HP, Math.round((this.def.hp * mul) / LAYER_HP) * LAYER_HP);
  }

  get speed() {
    if (this.freezeTimer > 0 || this.quake > 0) return 0;
    return this.def.speed * this.speedMul * (this.slowTimer > 0 ? this.slowMul : 1);
  }

  // Mais vida em cada camada (modo platina: os filhos ganham a mesma ao nascer)
  toughen(mul) {
    this.hpMul = mul;
    this.hp = this.maxHp = this.hp * mul;
  }

  // vidas que tira se escapar: o que sobrou dessa camada + todos os filhos.
  // Sempre inteiro (o fogo deixa vida quebrada) e sem contar a vida extra
  get threat() {
    const unit = this.def.lives ? this.def.hp / this.def.lives : LAYER_HP; // vida que vale 1 vida do jogador
    return Math.ceil(this.hp / this.hpMul / unit - 1e-6) + threat(this.type) - lives(this.def);
  }

  // quanto falta pra chegar na base (usado pra mirar no "primeiro")
  get remaining() {
    return this.route.length - this.dist;
  }

  place(route = this.route) {
    this.route = route;
    const p = route.pointAt(this.dist);
    this.x = p.x;
    this.y = p.y;
    this.angle = p.angle;
    const c = Math.cos(p.angle);
    if (Math.abs(c) > 0.2) this.face = c > 0 ? 1 : -1;
  }

  update(dt, game) {
    this.slowTimer = Math.max(0, this.slowTimer - dt);
    this.freezeTimer = Math.max(0, this.freezeTimer - dt);
    this.vulnTimer = Math.max(0, this.vulnTimer - dt);
    this.markTimer = Math.max(0, this.markTimer - dt);
    this.flash = Math.max(0, this.flash - dt);
    this.quake = Math.max(0, this.quake - dt);
    // barra do topo: a parte perdida some devagar atrás da vida (rastro do dano)
    if (this.def.topBar) this.ghostHp = Math.max(this.hp, (this.ghostHp ?? this.hp) - this.maxHp * 0.5 * dt);
    this.phase += dt * (this.slowTimer > 0 ? this.slowMul : 1);
    // vira aos poucos pro lado em que anda (o desenho "gira" na curva)
    this.turn = this.turn == null ? this.face : this.turn + (this.face - this.turn) * Math.min(1, dt * 9);
    // pegando fogo: queima aos poucos (inclusive parado mordendo a isca)
    if (this.burnTimer > 0) {
      this.burnTimer = Math.max(0, this.burnTimer - dt);
      this.takeDamage(this.burnDps * dt, game, { armored: true, source: this.burnSource, dot: true });
      if (this.dead) return;
    }
    // Honeypot no caminho: para e fica mordendo a isca até ela quebrar
    const bait = game.baitAt?.(this);
    if (bait) {
      // ao parar no pote: Mel Pegajoso (Dark Net) às vezes gruda; Ferrão às vezes tira 1 camada
      if (this.biting !== bait) {
        if (chance(bait.stats.stickyChance)) this.sticky = true;
        if (chance(bait.stats.stingChance)) {
          game.fx.spark(this.x, this.y - this.r, '#ffd23f', 8);
          this.takeDamage(LAYER_HP, game, { armored: true, source: bait });
          if (this.dead) return;
        }
      }
      this.biting = bait;
      if (Math.abs(bait.x - this.x) > 4) this.face = bait.x < this.x ? -1 : 1;
      bait.bite(this.biteDps * dt, game);
      return;
    }
    if (this.biting && this.sticky) {
      this.sticky = false;
      this.slow(STICKY.mul, STICKY.time);
      game.fx.spark(this.x, this.y - this.r, '#f5a524', 8);
    }
    this.biting = null;
    this.dist += this.speed * dt;
    if (this.dist >= this.route.length) {
      this.dead = true;
      game.leak(this);
      return;
    }
    this.place();
    this.tryRansom(game);
    // Adware: na tela, de tempos em tempos abre um anúncio (Game.spawnAd)
    const ads = this.def.ads;
    if (ads && game.isVisible(this) && (this.adTimer = (this.adTimer ?? rand(1, 2)) - dt) <= 0) {
      this.adTimer = rand(ads.every[0], ads.every[1]);
      game.spawnAd(this);
    }
    // encostou no servidor: já conta como invasão (não passa por cima dele)
    if (game.touchesBase(this)) {
      this.dead = true;
      game.leak(this);
      return;
    }
    // Worm: vai soltando vírus pelo caminho enquanto está vivo
    const sp = this.def.spawn;
    if (sp && (this.spawnTimer = (this.spawnTimer ?? sp.every) - dt) <= 0) {
      this.spawnTimer = sp.every;
      const child = new Enemy(sp.type, Math.max(0, this.dist - 16), this.route);
      child.round = this.round;
      child.speedMul = this.speedMul;
      child.place();
      game.spawnEnemy(child);
    }
  }

  // Ransomware: a cada quadrado novo que anda, tenta criptografar (game.rollRansom)
  tryRansom(game) {
    if (!this.def.ransom) return;
    const step = Math.floor(this.dist / TILE);
    if (this.ransomStep == null) this.ransomStep = step;
    if (step <= this.ransomStep) return;
    this.ransomStep = step;
    game.rollRansom(this);
  }

  // quanto tira da isca por segundo (chefão morde forte)
  get biteDps() {
    if (this.def.boss) return 8;
    return this.def.hp > LAYER_HP ? 2 : 1;
  }

  // Congela parado por `time` s (chefão não congela). true se pegou
  freeze(time) {
    if (this.def.boss) return false;
    this.freezeTimer = Math.max(this.freezeTimer, time);
    return true;
  }

  // Empurra `d` px pra trás no caminho (chefão não sai do lugar). true se pegou
  knockBack(d) {
    if (this.def.boss || this.dist <= 0) return false;
    this.dist = Math.max(0, this.dist - d);
    this.place();
    return true;
  }

  slow(mul, time) {
    if (this.def.boss) return; // chefão não fica lento
    this.slowMul = Math.min(this.slowTimer > 0 ? this.slowMul : 1, mul);
    this.slowTimer = Math.max(this.slowTimer, time);
  }

  // Era do Gelo: enquanto durar, cada acerto tira o dobro (vale pro chefão também)
  weaken(time, mul = 2) {
    this.vulnMul = this.vulnTimer > 0 ? Math.max(this.vulnMul, mul) : mul;
    this.vulnTimer = Math.max(this.vulnTimer, time);
  }

  // Marcar Alvo: por `time` s leva `mul` de dano de todas as defesas (vale pro chefão também)
  mark(time, mul) {
    this.markTimer = Math.max(this.markTimer, time);
    this.markMul = Math.max(this.markMul, mul);
  }

  // Incêndio: pega fogo por `time` s. Não acumula: enquanto estiver
  // queimando, outra onda não renova o tempo nem soma dano (no máximo
  // `time` s seguidos); só pega fogo de novo depois de apagar
  ignite(dps, time, source) {
    if (this.burnTimer > 0) return;
    this.burnDps = dps;
    this.burnTimer = time;
    this.burnSource = source;
  }

  // opts: { armored (fura blindagem?), source (torre que atacou), hitSet,
  //         overflow (dano que sobrou da camada de cima: não dobra de novo),
  //         dot (dano contínuo, do fogo: não pisca) }
  takeDamage(amount, game, opts = {}) {
    if (this.dead || amount <= 0) return;
    // protegido pela aura da Cicada 3301: não leva dano nenhum
    if (this.shielded) {
      if (!opts.dot) game.fx.spark(this.x, this.y - this.r, '#3dff9a', 6);
      return;
    }
    if (this.def.armored && !opts.armored) {
      game.fx.blocked(this.x, this.y - this.r);
      game.sound.play('block');
      return;
    }
    if (this.vulnTimer > 0 && !opts.overflow) amount *= this.vulnMul;
    if (this.markTimer > 0 && !opts.overflow) amount *= this.markMul;
    if (!opts.dot) this.flash = 0.08;
    this.hp -= amount;
    if (this.hp <= 0) this.pop(game, -this.hp, opts);
  }

  pop(game, overflow, opts) {
    this.dead = true;
    game.duckRoll?.(this); // Pato de Borracha (Dark Net): às vezes acha um café
    // Estilhaço (Dark Net): estourou no gelo do Penguin → às vezes acerta os vizinhos
    if (this.slowTimer > 0 && chance(this.shatter)) {
      game.fx.spark(this.x, this.y, '#c8f4ff', 12);
      game.fx.burst(this.x, this.y, '#c8f4ff', 10, 200, 0.4, 4);
      for (const e of game.enemiesInRange(this.x, this.y, SHATTER_R)) if (e !== this) e.takeDamage(LAYER_HP, game, { armored: true });
    }
    game.money += this.def.reward ?? 1;
    game.stats.pops++;
    game.bountyPop?.(this); // Bug Bounty: ponto e combo
    if (game.killsBy) game.killsBy[this.type] = (game.killsBy[this.type] ?? 0) + 1; // catálogo
    if (opts.source) {
      opts.source.pops++;
      game.money += game.sponsorBonus?.(opts.source) ?? 0; // Patrocínio do Minerador
    }
    game.fx.pop(this.x, this.y - this.r * 0.3, this.def.color, this.r);
    // vírus dourado (Toque de Midas): solta a moeda dele (os filhos não herdam)
    if (this.golden) {
      game.spawnPacket(this.x, this.y - this.r, this.golden, true); // moeda grande
      game.fx.burst(this.x, this.y - this.r * 0.3, '#ffd23f', 14, 170, 0.45, 4, true);
    }
    if (this.def.boss) {
      game.shake(this.r > 30 ? 10 : 6);
      game.sound.play('bigpop');
    } else game.sound.play('pop');

    // solta os filhos um pouquinho atrás no caminho
    let i = 0;
    for (const [type, n] of this.def.children) {
      for (let k = 0; k < n; k++, i++) {
        const child = new Enemy(type, Math.max(0, this.dist - i * 12), this.route);
        child.slowTimer = this.slowTimer;
        child.freezeTimer = this.freezeTimer;
        child.shatter = this.shatter;
        child.slowMul = this.slowMul;
        child.vulnTimer = this.vulnTimer;
        child.vulnMul = this.vulnMul;
        child.markTimer = this.markTimer;
        child.markMul = this.markMul;
        child.burnTimer = this.burnTimer;
        child.burnDps = this.burnDps;
        child.burnSource = this.burnSource;
        child.round = this.round;
        child.speedMul = this.speedMul;
        child.place();
        game.spawnEnemy(child);
        opts.hitSet?.add(child); // o mesmo tiro não acerta os filhos
        // dano que sobrou passa pra camada de baixo (como no Bloons)
        if (overflow > 0) child.takeDamage(overflow, game, { ...opts, overflow: true });
      }
    }
  }
}
