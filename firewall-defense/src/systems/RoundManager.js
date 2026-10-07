import { Enemy } from '../entities/Enemy.js';

// Controla as rodadas: os vírus entram conforme a lista de data/rounds.js.
// Dá pra chamar a próxima rodada com outra ainda rolando (as filas se somam);
// cada rodada acaba quando tudo dela já entrou e morreu (filhos contam junto).
export class RoundManager {
  constructor(rounds) {
    this.rounds = rounds;
    this.started = 0; // quantas rodadas já começaram
    this.done = 0; // quantas já terminaram
    this.queue = []; // { type, t, round } em ordem de entrada
    this.pending = []; // por rodada: quantos vírus ainda vão entrar
    this.time = 0;
  }

  get total() {
    return this.rounds.length;
  }

  get finished() {
    return this.done >= this.rounds.length;
  }

  get active() {
    return this.started > this.done;
  }

  get canStart() {
    return this.started < this.rounds.length;
  }

  // rodada mostrada no HUD (a mais recente que começou)
  get current() {
    return Math.max(1, Math.min(this.started, this.total));
  }

  start() {
    if (!this.canStart) return false;
    const round = this.started++;
    let n = 0;
    for (const g of this.rounds[round]) {
      for (let i = 0; i < g.count; i++, n++) this.queue.push({ type: g.type, t: this.time + (g.at ?? 0) + i * g.gap, round });
    }
    this.pending[round] = n;
    this.queue.sort((a, b) => a.t - b.t);
    return true;
  }

  update(dt, game) {
    if (!this.active) return;
    this.time += dt;
    while (this.queue.length && this.queue[0].t <= this.time) {
      const q = this.queue.shift();
      const enemy = new Enemy(q.type, game.spawnDist);
      enemy.round = q.round;
      enemy.place(game.path);
      game.spawnEnemy(enemy);
      this.pending[q.round]--;
    }
    // as rodadas terminam em ordem: a mais antiga aberta acaba primeiro
    while (this.active) {
      const r = this.done;
      const alive = (e) => !e.dead && e.round === r;
      if (this.pending[r] > 0 || game.enemies.some(alive) || game.newEnemies.some(alive)) break;
      this.done++;
      game.onRoundEnd(this.done);
    }
  }
}
