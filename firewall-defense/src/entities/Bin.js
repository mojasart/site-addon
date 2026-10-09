import { BIN } from '../data/towers.js';

// Lixeira Turbo (poder do Executivo nível 2, data/towers.js BIN): a
// lixeira do sistema sai da base e rola pelo caminho AO CONTRÁRIO, na
// direção dos vírus. É um Honeypot andando: quem encosta para e morde
// (Game.baitAt → bite) e ela, parada segurando, deleta os encostados a cada
// BIN.every s. Some quando a vida acaba ou quando chega na entrada.
export class Bin {
  constructor(route) {
    this.route = route;
    this.dist = Math.max(0, route.length - 24); // sai de dentro da base
    this.r = BIN.r;
    this.hp = this.maxHp = BIN.hp;
    this.stats = {}; // sorte da Dark Net que a isca lê (a lixeira não tem)
    this.pops = 0; // vírus que ela deletou (Enemy.pop conta)
    this.tick = 0;
    this.face = -1;
    this.pulse = 0;
    this.anim = 0;
    this.pushing = false;
    this.dead = false;
    this.place();
  }

  // Posição no caminho e o lado pra onde está indo (de ré na rota)
  place() {
    const p = this.route.pointAt(this.dist);
    const q = this.route.pointAt(this.dist - 6);
    if (Math.abs(q.x - p.x) > 0.5) this.face = q.x < p.x ? -1 : 1;
    this.x = p.x;
    this.y = p.y;
  }

  // Vírus mordendo (Enemy.update, como no Honeypot)
  bite(amount, game) {
    if (this.dead) return;
    this.pulse = Math.max(this.pulse, 0.35);
    this.hp -= amount;
    if (this.hp <= 0) this.wreck(game);
  }

  wreck(game) {
    this.dead = true;
    game.fx.burst(this.x, this.y, '#7fd3ff', 18, 190, 0.5, 5, true);
    game.fx.burst(this.x, this.y, '#ffffff', 10, 150, 0.4, 4, true);
    game.sound.play('bigpop');
  }

  update(dt, game) {
    if (this.dead) return;
    this.anim += dt;
    this.pulse = Math.max(0, this.pulse - dt * 4);
    this.tick = Math.max(0, this.tick - dt);
    // vírus parados nele (os que a isca segura)
    const touching = game.enemies.filter((e) => !e.dead && game.baitAt(e) === this);
    this.pushing = touching.length > 0;
    if (this.pushing) {
      if (this.tick <= 0) {
        this.tick = BIN.every;
        for (const e of touching.slice(0, BIN.maxTargets)) e.takeDamage(BIN.hit, game, { armored: true, source: this });
        game.fx.burst(this.x + this.face * this.r, this.y - 6, '#bfe9ff', 6, 130, 0.3, 3, true);
      }
      return;
    }
    this.dist -= BIN.speed * dt;
    if (this.dist <= 0) {
      this.dead = true; // chegou na entrada: some
      return;
    }
    this.place();
  }
}
