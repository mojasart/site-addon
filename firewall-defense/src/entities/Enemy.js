import { ENEMIES, threat } from '../data/enemies.js';
import { rand } from '../util.js';

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
    this.slowMul = 1;
    this.vulnTimer = 0; // vulnerável (Pinguim com Era do Gelo): leva dano dobrado
    this.flash = 0;
    this.phase = rand(0, 10); // relógio da animação
    this.dead = false;
    this.speedMul = 1; // dificuldade do mapa (RoundManager)
  }

  // Vida dos inimigos de várias camadas (Worm, Locker, Ransomware) muda
  // com a dificuldade do mapa; os vírus comuns têm 1 de vida por camada
  scaleHp(mul) {
    if (this.def.hp <= 1) return;
    this.hp = this.maxHp = Math.max(1, Math.round(this.def.hp * mul));
  }

  get speed() {
    return this.def.speed * this.speedMul * (this.slowTimer > 0 ? this.slowMul : 1);
  }

  // vidas que tira se escapar: o que sobrou dessa camada + todos os filhos
  get threat() {
    return this.hp + threat(this.type) - this.def.hp;
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
    this.vulnTimer = Math.max(0, this.vulnTimer - dt);
    this.flash = Math.max(0, this.flash - dt);
    this.phase += dt * (this.slowTimer > 0 ? this.slowMul : 1);
    // vira aos poucos pro lado em que anda (o desenho "gira" na curva)
    this.turn = this.turn == null ? this.face : this.turn + (this.face - this.turn) * Math.min(1, dt * 9);
    // Honeypot no caminho: para e fica mordendo a isca até ela quebrar
    const bait = game.baitAt?.(this);
    if (bait) {
      this.biting = bait;
      if (Math.abs(bait.x - this.x) > 4) this.face = bait.x < this.x ? -1 : 1;
      bait.bite(this.biteDps * dt, game);
      return;
    }
    this.biting = null;
    this.dist += this.speed * dt;
    if (this.dist >= this.route.length) {
      this.dead = true;
      game.leak(this);
      return;
    }
    this.place();
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

  // quanto tira da isca por segundo (chefão morde forte)
  get biteDps() {
    if (this.def.boss) return 8;
    return this.def.hp > 1 ? 2 : 1;
  }

  slow(mul, time) {
    if (this.def.boss) return; // chefão não fica lento
    this.slowMul = Math.min(this.slowTimer > 0 ? this.slowMul : 1, mul);
    this.slowTimer = Math.max(this.slowTimer, time);
  }

  // Era do Gelo: enquanto durar, cada acerto tira o dobro (vale pro chefão também)
  weaken(time) {
    this.vulnTimer = Math.max(this.vulnTimer, time);
  }

  // opts: { armored (fura blindagem?), source (torre que atacou), hitSet,
  //         overflow (dano que sobrou da camada de cima: não dobra de novo) }
  takeDamage(amount, game, opts = {}) {
    if (this.dead || amount <= 0) return;
    if (this.def.armored && !opts.armored) {
      game.fx.blocked(this.x, this.y - this.r);
      game.sound.play('block');
      return;
    }
    if (this.vulnTimer > 0 && !opts.overflow) amount *= 2;
    this.flash = 0.08;
    this.hp -= amount;
    if (this.hp <= 0) this.pop(game, -this.hp, opts);
  }

  pop(game, overflow, opts) {
    this.dead = true;
    game.money += this.def.reward ?? 1;
    game.stats.pops++;
    if (opts.source) opts.source.pops++;
    game.fx.pop(this.x, this.y - this.r * 0.3, this.def.color, this.r);
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
        child.slowMul = this.slowMul;
        child.vulnTimer = this.vulnTimer;
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
