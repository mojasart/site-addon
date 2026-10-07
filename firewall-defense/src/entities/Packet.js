import { rand } from '../util.js';

// Moeda minerada pelo Minerador: pula pra perto dele e, logo depois,
// voa sozinha até o contador de dinheiro (não precisa tocar).
export class Packet {
  constructor(x, y, value) {
    const a = rand(0, Math.PI * 2);
    const d = rand(24, 44);
    this.x = x;
    this.y = y;
    this.fromX = x;
    this.fromY = y;
    this.toX = x + Math.cos(a) * d;
    this.toY = y + Math.sin(a) * d * 0.6;
    this.value = value;
    this.t = 0;
    this.wait = 0.35;
    this.state = 'jumping'; // jumping → resting → flying
    this.spin = rand(0, 6);
    this.dead = false;
  }

  update(dt, game) {
    this.spin += dt;
    if (this.state === 'jumping') {
      this.t = Math.min(1, this.t + dt * 2.4);
      this.x = this.fromX + (this.toX - this.fromX) * this.t;
      this.y = this.fromY + (this.toY - this.fromY) * this.t - Math.sin(this.t * Math.PI) * 38;
      if (this.t >= 1) this.state = 'resting';
      return;
    }
    if (this.state === 'resting') {
      this.wait -= dt;
      if (this.wait <= 0) this.state = 'flying';
      return;
    }
    const target = game.coinTarget();
    const k = Math.min(1, dt * 7);
    this.x += (target.x - this.x) * k;
    this.y += (target.y - this.y) * k;
    if (Math.hypot(target.x - this.x, target.y - this.y) < 12) {
      this.dead = true;
      game.money += this.value;
      game.coinBump = 1;
      game.sound.play('coin');
    }
  }
}
