const SPEED = 330;

export class Projectile {
  constructor(shooter) {
    const def = shooter.def;
    this.kind = def.projectile;
    this.damage = def.damage;
    this.slowDuration = def.slowDuration || 0;
    this.row = shooter.row;
    this.x = shooter.x + 30;
    this.y = shooter.y - 4;
    this.r = 6;
    this.dead = false;
  }

  update(dt, game) {
    this.x += SPEED * dt;
    const target = game.enemyHitBy(this);
    if (target) {
      target.takeDamage(this.damage, game);
      if (this.slowDuration) target.slow(this.slowDuration);
      game.fx.burst(this.x, this.y, this.kind === 'crypto' ? '#6fd3ff' : '#2ee584', 6, 90, 0.25, 3);
      this.dead = true;
    } else if (this.x > game.viewW + 30) {
      this.dead = true;
    }
  }
}
