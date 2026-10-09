import { rand } from '../util.js';

// Moedas de bitcoin no mapa. Dois tipos:
//  - minerada (Minerador): pula pra perto dele e, logo depois, voa sozinha
//    até o contador de dinheiro (não precisa tocar);
//  - drop (vírus estourado, Game.dropCoin): pula um pouquinho e fica no
//    chão girando; vai pra carteira quando o jogador toca nela (collect) ou
//    sozinha depois de DROP_WAIT s. Drops perto um do outro viram uma moeda
//    só (Game.dropCoin soma o valor), pra não encher o mapa de moedas.
export const DROP_WAIT = 2; // segundos no chão antes de ir sozinha pra carteira

export class Packet {
  constructor(x, y, value, big = false, drop = false) {
    const a = rand(0, Math.PI * 2);
    const d = drop ? rand(6, 16) : rand(24, 44);
    this.x = x;
    this.y = y;
    this.fromX = x;
    this.fromY = y;
    this.toX = x + Math.cos(a) * d;
    this.toY = y + Math.sin(a) * d * 0.6;
    this.value = value;
    this.big = big; // Bloco Raro (Dark Net): moeda maior
    this.drop = drop;
    this.t = 0;
    this.wait = drop ? DROP_WAIT : 0.35;
    this.state = 'jumping'; // jumping → resting → flying
    this.spin = rand(0, 6);
    this.bump = 0; // pulinho quando outra moeda junta nela
    this.dead = false;
  }

  // Tamanho da moeda no chão: cresce com o valor juntado
  get size() {
    if (!this.drop) return 13 * (this.big ? 1.5 : 1);
    return 9 + Math.min(7, Math.log2(this.value + 1) * 1.6);
  }

  // Tocou na moeda: vai já pra carteira
  collect() {
    if (this.state === 'flying') return;
    this.state = 'flying';
  }

  update(dt, game) {
    this.spin += dt * (this.drop && this.state !== 'flying' ? 0.6 : 1);
    this.bump = Math.max(0, this.bump - dt * 4);
    if (this.state === 'jumping') {
      this.t = Math.min(1, this.t + dt * (this.drop ? 3.2 : 2.4));
      this.x = this.fromX + (this.toX - this.fromX) * this.t;
      this.y = this.fromY + (this.toY - this.fromY) * this.t - Math.sin(this.t * Math.PI) * (this.drop ? 22 : 38);
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
