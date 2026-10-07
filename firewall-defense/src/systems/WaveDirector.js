import { ROWS } from '../config.js';
import { rand, shuffle } from '../util.js';

// Controla quando cada onda de inimigos entra no tabuleiro.
export class WaveDirector {
  constructor(level) {
    this.waves = level.waves;
    this.index = 0; // próxima onda a ser lançada
    this.timer = this.waves[0].delay; // segundos até a próxima onda
    this.queue = []; // inimigos esperando pra entrar
    this.spawnTimer = 0;
    this.spawnGap = [1.2, 2.8];
    this.lastRow = -1;
    this.announced = -1;
  }

  get finished() {
    return this.index >= this.waves.length && this.queue.length === 0;
  }

  // 0..1 pra barra de progresso do HUD
  get progress() {
    const n = this.waves.length;
    if (this.index >= n) return 1;
    const wave = this.waves[this.index];
    const partial = Math.min(1, Math.max(0, 1 - this.timer / wave.delay));
    return (this.index + partial) / n;
  }

  update(dt, game) {
    if (this.index < this.waves.length) {
      const wave = this.waves[this.index];

      // Campo limpo? Adianta a próxima onda pra não ficar esperando à toa
      if (this.index > 0 && this.queue.length === 0 && game.enemies.length === 0) {
        this.timer = Math.min(this.timer, 4);
      }

      this.timer -= dt;

      if (wave.big && this.announced < this.index && this.timer <= 3) {
        this.announced = this.index;
        game.showBanner(wave.banner || 'ATAQUE MASSIVO DETECTADO!', 3, '#ff3b5c');
      }

      if (this.timer <= 0) this.launch(wave);
    }

    if (this.queue.length > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        game.spawnEnemy(this.queue.shift(), this.nextRow());
        this.spawnTimer = rand(...this.spawnGap);
      }
    }
  }

  launch(wave) {
    if (this.queue.length === 0) this.spawnTimer = 0;
    this.queue.push(...shuffle([...wave.enemies]));
    this.spawnGap = wave.big ? [0.3, 0.8] : [1.2, 2.8];
    this.index++;
    if (this.index < this.waves.length) this.timer = this.waves[this.index].delay;
  }

  // Linha aleatória, evitando repetir a mesma duas vezes seguidas
  nextRow() {
    let row;
    do {
      row = Math.floor(Math.random() * ROWS);
    } while (row === this.lastRow && ROWS > 1);
    this.lastRow = row;
    return row;
  }
}
