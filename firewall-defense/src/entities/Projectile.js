// Projéteis: dardo do Hacker (teleguiado), pacote do Roteador (reto)
// e bomba do Engenheiro (arco até o alvo, explode em área).
export class Projectile {
  constructor(source, target, angle) {
    const d = source.def;
    this.kind = d.attack; // 'dart' | 'burst' | 'bomb'
    this.source = source;
    this.target = target;
    this.damage = d.damage;
    this.x = source.x + source.face * 10;
    this.y = source.y - 26;
    this.dead = false;
    this.spin = 0;
    if (this.kind === 'burst') {
      this.speed = 380;
      this.angle = angle;
      this.vx = Math.cos(angle) * this.speed;
      this.vy = Math.sin(angle) * this.speed;
      this.life = d.range / this.speed;
      this.r = 7;
    } else if (this.kind === 'bomb') {
      this.fromX = this.x;
      this.fromY = this.y;
      this.toX = target.x;
      this.toY = target.y;
      this.t = 0;
      this.flight = 0.55;
      this.splash = d.splash;
    } else {
      this.speed = 560;
      this.r = 6;
      this.angle = 0;
    }
  }

  update(dt, game) {
    this.spin += dt * 12;
    if (this.kind === 'burst') return this.updateBurst(dt, game);
    if (this.kind === 'bomb') return this.updateBomb(dt, game);
    // dardo: persegue o alvo; se ele sumir, segue reto até o último ponto
    if (this.target && !this.target.dead) {
      this.tx = this.target.x;
      this.ty = this.target.y - this.target.r * 0.6;
    }
    const dx = this.tx - this.x;
    const dy = this.ty - this.y;
    const dist = Math.hypot(dx, dy);
    this.angle = Math.atan2(dy, dx);
    const step = this.speed * dt;
    if (dist <= step + 4) {
      this.dead = true;
      if (this.target && !this.target.dead) {
        this.target.hit(this.damage, game, this.source);
        game.fx.spark(this.tx, this.ty, '#ffffff');
      }
      return;
    }
    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;
  }

  updateBurst(dt, game) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    if (this.life <= 0) {
      this.dead = true;
      return;
    }
    for (const e of game.enemies) {
      if (e.dead) continue;
      const rr = e.r + this.r;
      if ((e.x - this.x) ** 2 + (e.y - e.r * 0.5 - this.y) ** 2 < rr * rr) {
        e.hit(this.damage, game, this.source);
        game.fx.spark(this.x, this.y, '#ffffff');
        this.dead = true;
        return;
      }
    }
  }

  updateBomb(dt, game) {
    this.t = Math.min(1, this.t + dt / this.flight);
    this.x = this.fromX + (this.toX - this.fromX) * this.t;
    this.y = this.fromY + (this.toY - this.fromY) * this.t - Math.sin(this.t * Math.PI) * 60;
    if (this.t < 1) return;
    this.dead = true;
    for (const e of game.enemiesInRange(this.toX, this.toY, this.splash)) e.hit(this.damage, game, this.source);
    game.fx.explosion(this.toX, this.toY, this.splash);
    game.sound.play('boom');
    game.shake(3);
  }
}
