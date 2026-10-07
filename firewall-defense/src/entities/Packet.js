import { PACKET_LIFETIME } from '../config.js';
import { rand } from '../util.js';

// Pacote de bits gerado pelo Minerador (a "banana" do Bloons).
// Pula pra perto do minerador e fica esperando um toque.
export class Packet {
  constructor(x, y, value) {
    const a = rand(0, Math.PI * 2);
    const d = rand(28, 55);
    this.x = x;
    this.y = y;
    this.fromX = x;
    this.fromY = y;
    this.toX = x + Math.cos(a) * d;
    this.toY = y + Math.sin(a) * d;
    this.value = value;
    this.t = 0; // progresso do pulo (0..1)
    this.life = PACKET_LIFETIME;
    this.state = 'jumping'; // jumping → resting → collected
    this.target = null; // pra onde voa quando coletado (contador de bits)
    this.spin = rand(0, 6);
    this.dead = false;
  }

  update(dt) {
    this.spin += dt;
    if (this.state === 'collected') {
      const k = Math.min(1, dt * 8);
      this.x += (this.target.x - this.x) * k;
      this.y += (this.target.y - this.y) * k;
      if (Math.hypot(this.target.x - this.x, this.target.y - this.y) < 10) this.dead = true;
      return;
    }
    if (this.state === 'jumping') {
      this.t = Math.min(1, this.t + dt * 2.2);
      this.x = this.fromX + (this.toX - this.fromX) * this.t;
      this.y = this.fromY + (this.toY - this.fromY) * this.t - Math.sin(this.t * Math.PI) * 40;
      if (this.t >= 1) this.state = 'resting';
      return;
    }
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }

  hit(x, y) {
    return this.state !== 'collected' && Math.hypot(x - this.x, y - this.y) < 34;
  }

  get visible() {
    return this.state !== 'resting' || this.life > 3 || Math.sin(this.life * 18) > 0;
  }
}
