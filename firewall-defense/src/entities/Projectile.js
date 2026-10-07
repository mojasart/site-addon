// Projéteis: o teclado que o Hacker arremessa.
export class Projectile {
  constructor(tower, angle) {
    const s = tower.stats;
    this.kind = s.projectile;
    this.angle = angle;
    this.x = tower.x + Math.cos(angle) * 16;
    this.y = tower.y - 14 + Math.sin(angle) * 16;
    this.vx = Math.cos(angle) * s.projectileSpeed;
    this.vy = Math.sin(angle) * s.projectileSpeed;
    this.damage = s.damage;
    this.pierce = s.pierce;
    this.armored = tower.hitsArmored;
    this.source = tower;
    this.r = 7;
    this.life = (s.range * 1.6) / s.projectileSpeed;
    this.spin = 0;
    this.hit = new Set(); // não acerta o mesmo vírus duas vezes
    this.dead = false;
  }

  update(dt, game) {
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
