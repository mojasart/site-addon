import { Enemy } from '../entities/Enemy.js';

// Controla as rodadas: o jogador aperta "iniciar", os vírus entram
// conforme a lista de data/rounds.js e a rodada acaba quando o mapa limpa.
export class RoundManager {
  constructor(rounds) {
    this.rounds = rounds;
    this.index = 0; // rodada atual (0 = primeira)
    this.active = false;
    this.queue = [];
    this.time = 0;
  }

  get total() {
    return this.rounds.length;
  }

  get finished() {
    return this.index >= this.rounds.length;
  }

  start() {
    if (this.active || this.finished) return false;
    this.queue = [];
    for (const g of this.rounds[this.index]) {
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
      const enemy = new Enemy(this.queue.shift().type, game.spawnDist);
      enemy.place(game.path);
      game.spawnEnemy(enemy);
    }
    if (this.queue.length === 0 && game.enemies.length === 0 && game.newEnemies.length === 0) {
      this.active = false;
      this.index++;
      game.onRoundEnd();
    }
  }
}
