import { BACKUP_X, rowY } from '../config.js';

// Backup: última linha de defesa de cada linha (o "cortador de grama").
// Quando um inimigo chega nele, ele varre a linha inteira uma única vez.
export class Backup {
  constructor(row) {
    this.row = row;
    this.x = BACKUP_X;
    this.y = rowY(row);
    this.state = 'idle'; // idle → active → gone
  }

  update(dt, game) {
    if (this.state === 'idle') {
      const triggered = game.enemies.some(
        (e) => !e.dead && e.row === this.row && e.x - e.halfW <= this.x + 16,
      );
      if (triggered) {
        this.state = 'active';
        game.fx.text(this.x + 50, this.y - 40, 'BACKUP!', '#7df9ff');
      }
    } else if (this.state === 'active') {
      this.x += 520 * dt;
      for (const e of game.enemies) {
        if (!e.dead && e.row === this.row && Math.abs(e.x - this.x) < 36) e.kill(game);
      }
      if (this.x > game.viewW + 80) this.state = 'gone';
    }
  }
}
