import { Enemy } from '../entities/Enemy.js';

// Controla as rodadas: os vírus entram conforme a lista de data/rounds.js.
// Dá pra chamar a próxima rodada com outra ainda rolando (as filas se somam);
// cada rodada acaba quando tudo dela já entrou e morreu (filhos contam junto).
export class RoundManager {
  // mod: dificuldade do mapa { count, gap, speed, hp } (multiplicadores)
  constructor(rounds, mod = {}) {
    this.mod = { count: mod.count ?? 1, gap: mod.gap ?? 1, speed: mod.speed ?? 1, hp: mod.hp ?? 1 };
    this.rounds = rounds.map((r) => this.scale(r));
    this.started = 0; // quantas rodadas já começaram
    this.done = 0; // quantas já terminaram
    this.queue = []; // { type, t, round } em ordem de entrada
    this.pending = []; // por rodada: quantos vírus ainda vão entrar
    this.time = 0;
    this.spawned = 0; // contador pra alternar as entradas (rotas)
  }

  // Aplica a dificuldade do mapa numa rodada (count: false mantém a
  // quantidade, pros chefões não se multiplicarem)
  scale(round, { count = true } = {}) {
    return round.map((g) => ({
      ...g,
      count: count ? Math.max(1, Math.round(g.count * this.mod.count)) : g.count,
      gap: g.gap * this.mod.gap,
      at: (g.at ?? 0) * this.mod.gap,
    }));
  }

  // Modo platina: troca as rodadas que ainda não começaram pelo chefão
  // (hp: multiplicador de vida só dele, no lugar do da pressão do mapa)
  finishWith(round, hp = this.mod.hp) {
    this.rounds.length = this.started;
    this.rounds.push(this.scale(round, { count: false }).map((g) => ({ ...g, hp })));
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
      for (let i = 0; i < g.count; i++, n++) this.queue.push({ type: g.type, t: this.time + (g.at ?? 0) + i * g.gap, round, hp: g.hp });
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
      // com várias entradas, cada vírus sai por uma (em revezamento)
      const k = this.spawned++ % game.path.routes.length;
      const enemy = new Enemy(q.type, game.view.spawnDists[k], game.path.routes[k]);
      if (game.spawnFlash) game.spawnFlash[k] = 1;
      enemy.round = q.round;
      enemy.speedMul = this.mod.speed;
      enemy.scaleHp(q.hp ?? this.mod.hp);
      enemy.place();
      game.rollGolden?.(enemy); // Toque de Midas: pode vir dourado
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
