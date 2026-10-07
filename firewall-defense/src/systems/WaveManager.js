import { Enemy } from '../entities/Enemy.js';

// Controla as ondas: o jogador aperta "onda", os inimigos entram conforme
// data/waves.js e a onda acaba quando o mapa limpa.
export class WaveManager {
  constructor(waves) {
    this.waves = waves;
    this.index = 0; // próxima onda (0 = primeira)
    this.active = false;
    this.queue = [];
    this.time = 0;
  }

  get total() {
    return this.waves.length;
  }

  get finished() {
    return this.index >= this.waves.length;
  }

  // Quantos inimigos ainda faltam entrar nesta onda
  get pending() {
    return this.queue.length;
  }

  start() {
    if (this.active || this.finished) return false;
    this.queue = [];
    for (const g of this.waves[this.index]) {
      for (let i = 0; i < g.count; i++) this.queue.push({ type: g.type, t: (g.at ?? 0) + i * g.gap });
    }
    this.queue.sort((a, b) => a.t - b.t);
    this.time = 0;
    this.active = true;
    return true;
  }

  update(dt, game) {
    if (!this.active) return;
    this.time += dt;
    while (this.queue.length && this.queue[0].t <= this.time) {
      const e = new Enemy(this.queue.shift().type, game.spawnDist);
      e.place(game.path);
      game.enemies.push(e);
    }
    if (this.queue.length === 0 && game.enemies.length === 0) {
      this.active = false;
      this.index++;
      game.onWaveCleared();
    }
  }
}
