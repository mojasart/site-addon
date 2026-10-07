import { HUD_H, HUD_BITS_POS, PACKET_LIFETIME } from '../config.js';
import { rand } from '../util.js';

// Pacote de bits: o recurso do jogo (o "sol" do Plants vs Zombies).
// Cai da rede de tempos em tempos ou é gerado pelos Mineradores.
export class Packet {
  constructor({ x, y, targetY, value, vx = 0, vy = 0, gravity = 0 }) {
    this.x = x;
    this.y = y;
    this.targetY = targetY;
    this.value = value;
    this.vx = vx;
    this.vy = vy;
    this.gravity = gravity;
    this.life = PACKET_LIFETIME;
    this.state = 'falling'; // falling → resting → collected
    this.spin = rand(0, 6);
    this.dead = false;
  }

  static fromSky(x, targetY, value) {
    return new Packet({ x, y: HUD_H - 20, targetY, value, vy: 45 });
  }

  static fromProducer(x, y, value) {
    return new Packet({ x, y: y - 20, targetY: y + 14, value, vx: rand(-35, 35), vy: -170, gravity: 520 });
  }

  update(dt) {
    this.spin += dt;

    if (this.state === 'collected') {
      // voa até o contador de bits no HUD
      const k = Math.min(1, dt * 7);
      this.x += (HUD_BITS_POS.x - this.x) * k;
      this.y += (HUD_BITS_POS.y - this.y) * k;
      if (Math.hypot(HUD_BITS_POS.x - this.x, HUD_BITS_POS.y - this.y) < 8) this.dead = true;
      return;
    }

    if (this.state === 'falling') {
      this.vy += this.gravity * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      if (this.vy > 0 && this.y >= this.targetY) {
        this.y = this.targetY;
        this.state = 'resting';
      }
    } else {
      this.life -= dt;
      if (this.life <= 0) this.dead = true;
    }
  }

  // Área de toque generosa: dedo é maior que cursor
  hit(x, y) {
    return this.state !== 'collected' && Math.hypot(x - this.x, y - this.y) < 36;
  }

  // Pisca quando está pra sumir
  get visible() {
    return this.state === 'collected' || this.life > 2 || Math.sin(this.life * 20) > 0;
  }
}
