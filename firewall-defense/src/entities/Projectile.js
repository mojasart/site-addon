// Projéteis: dardo do Hacker, pacote do Roteador e bomba do Engenheiro.
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
    this.splash = s.splash ?? 0;
    this.splashTargets = s.splashTargets ?? 0;
    this.source = tower;
    this.r = this.kind === 'bomb' ? 9 : 7;
    this.life = (s.range * (this.kind === 'packet' ? 1 : 1.6)) / s.projectileSpeed;
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
      if (this.splash) {
        this.explode(game);
        return;
      }
      this.hit.add(e);
      e.takeDamage(this.damage, game, { armored: this.armored, source: this.source, hitSet: this.hit });
      if (--this.pierce <= 0) {
        this.dead = true;
        return;
      }
    }
  }

  explode(game) {
    this.dead = true;
    const opts = { armored: true, source: this.source };
    const targets = game.enemiesInRange(this.x, this.y, this.splash).slice(0, this.splashTargets);
    for (const e of targets) e.takeDamage(this.damage, game, opts);
    game.fx.explosion(this.x, this.y, this.splash);
    game.sound.play('boom');
    game.shake(3);
  }
}
