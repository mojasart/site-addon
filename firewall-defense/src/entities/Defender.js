import { DEFENDERS } from '../data/defenders.js';
import { colX, rowY } from '../config.js';
import { rand } from '../util.js';

export class Defender {
  constructor(type, row, col) {
    this.type = type;
    this.def = DEFENDERS[type];
    this.row = row;
    this.col = col;
    this.x = colX(col);
    this.y = rowY(row);
    this.hp = this.maxHp = this.def.hp;
    this.dead = false;
    this.hurt = 0; // > 0 enquanto está sendo corrompido (faz tremer)
    this.recoil = 0; // animação do tiro
    this.armed = false; // usado pelas armadilhas

    switch (this.def.behavior) {
      case 'producer':
        this.timer = rand(...this.def.firstProduce);
        break;
      case 'shooter':
        this.timer = 0.3;
        break;
      case 'trap':
        this.timer = this.def.armTime;
        break;
      default:
        this.timer = 0;
    }
  }

  update(dt, game) {
    this.hurt = Math.max(0, this.hurt - dt);
    this.recoil = Math.max(0, this.recoil - dt * 5);
    const def = this.def;

    if (def.behavior === 'producer') {
      this.timer -= dt;
      if (this.timer <= 0) {
        game.spawnPacket(this.x, this.y, def.produceValue);
        this.timer = def.produceEvery;
      }
    } else if (def.behavior === 'shooter') {
      this.timer = Math.max(0, this.timer - dt);
      if (this.timer === 0 && game.hasEnemyAhead(this.row, this.x)) {
        game.spawnProjectile(this);
        this.timer = def.fireRate;
        this.recoil = 1;
      }
    } else if (def.behavior === 'trap') {
      if (!this.armed) {
        this.timer -= dt;
        if (this.timer <= 0) {
          this.armed = true;
          game.fx.burst(this.x, this.y, '#ffd23f', 10, 90, 0.4);
        }
      } else if (game.enemyNear(this.row, this.x, def.triggerRange)) {
        this.explode(game);
      }
    }
  }

  explode(game) {
    for (const e of game.enemies) {
      if (e.row === this.row && Math.abs(e.x - this.x) < this.def.blastRange) {
        e.takeDamage(this.def.damage, game);
      }
    }
    game.fx.explosion(this.x, this.y, '#ffb03b');
    game.fx.text(this.x, this.y - 44, 'PEGO!', '#ffd23f');
    this.dead = true;
  }

  takeDamage(amount) {
    this.hp -= amount;
    this.hurt = 0.15;
    if (this.hp <= 0) this.dead = true;
  }

  // Estado visual repassado para o desenho (render/sprites.js)
  spriteState(t) {
    const def = this.def;
    return {
      t: t + this.col * 0.37 + this.row * 0.71, // dessincroniza as animações
      hpRatio: this.hp / this.maxHp,
      recoil: this.recoil,
      armed: this.armed,
      armProgress: def.behavior === 'trap' ? 1 - Math.max(0, this.timer) / def.armTime : 1,
      glow: def.behavior === 'producer' ? Math.max(0, 1 - this.timer / 1.5) : 0,
    };
  }
}
