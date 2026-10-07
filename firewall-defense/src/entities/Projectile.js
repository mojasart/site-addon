// Projéteis: o teclado que o Hacker arremessa.
//
// Depois de sair da mão o tiro é TELEGUIADO: a cada passo ele vira na
// direção do alvo (até TURN_RATE rad/s), então vírus rápidos ou que
// mudam de direção não escapam. Exceção: se o alvo anda mais rápido que
// a munição, o tiro não persegue (segue reto). Se o alvo morre antes,
// ele procura o vírus mais perto e continua.
const TURN_RATE = 16; // quanto o tiro consegue virar por segundo (radianos)
const RETARGET_R = 140; // raio pra achar um alvo novo quando o dele morre

export class Projectile {
  constructor(tower, angle, target = null) {
    const s = tower.stats;
    this.kind = s.projectile;
    this.angle = angle;
    this.speed = s.projectileSpeed;
    this.x = tower.x + Math.cos(angle) * 16;
    this.y = tower.y - 14 + Math.sin(angle) * 16;
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;
    this.damage = s.damage;
    this.pierce = s.pierce;
    this.armored = tower.hitsArmored;
    this.source = tower;
    this.target = target;
    this.r = 7;
    this.life = (s.range * 1.6) / this.speed;
    this.spin = 0;
    this.hit = new Set(); // não acerta o mesmo vírus duas vezes
    this.dead = false;
  }

  // O tiro consegue perseguir esse vírus? (não persegue quem é mais rápido)
  canChase(e) {
    return e && !e.dead && !this.hit.has(e) && e.speed <= this.speed && (this.armored || !e.def.armored);
  }

  retarget(game) {
    let best = null;
    let bestD = RETARGET_R;
    for (const e of game.enemies) {
      if (!this.canChase(e) || !game.isVisible(e)) continue;
      const d = Math.hypot(e.x - this.x, e.y - this.y);
      if (d < bestD) {
        best = e;
        bestD = d;
      }
    }
    return best;
  }

  update(dt, game) {
    if (!this.canChase(this.target)) {
      // alvo morreu, já foi acertado ou é rápido demais: procura outro
      // (um rápido demais nunca é perseguido: aí o tiro segue reto)
      this.target = this.target && this.target.speed > this.speed ? null : this.retarget(game);
    }
    if (this.target) {
      const want = Math.atan2(this.target.y - this.y, this.target.x - this.x);
      let diff = want - this.angle;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff)); // -π..π
      const turn = TURN_RATE * dt;
      this.angle += Math.max(-turn, Math.min(turn, diff));
      this.vx = Math.cos(this.angle) * this.speed;
      this.vy = Math.sin(this.angle) * this.speed;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.spin += dt * 14;
    this.life -= dt;
    if (this.life <= 0) {
      this.dead = true;
      return;
    }
    for (const e of game.enemies) {
      if (e.dead || this.hit.has(e)) continue;
      const rr = e.r + this.r;
      if ((e.x - this.x) ** 2 + (e.y - this.y) ** 2 >= rr * rr) continue;
      this.hit.add(e);
      e.takeDamage(this.damage, game, { armored: this.armored, source: this.source, hitSet: this.hit });
      if (--this.pierce <= 0) {
        this.dead = true;
        return;
      }
    }
  }
}
