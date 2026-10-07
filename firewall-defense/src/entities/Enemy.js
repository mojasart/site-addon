import { ENEMIES } from '../data/enemies.js';
import { SPAWN_X, rowY } from '../config.js';
import { rand } from '../util.js';

export class Enemy {
  constructor(type, row) {
    this.type = type;
    this.def = ENEMIES[type];
    this.row = row;
    this.x = SPAWN_X + rand(0, 40);
    this.y = rowY(row);
    this.hp = this.maxHp = this.def.hp;
    this.armor = this.maxArmor = this.def.armor || 0;
    this.halfW = 20; // metade da largura da "caixa de colisão"
    this.dead = false;
    this.eating = false;
    this.slowTimer = 0;
    this.flash = 0;
    this.phase = rand(0, 10); // relógio da animação
  }

  get slowed() {
    return this.slowTimer > 0;
  }

  update(dt, game) {
    const mul = this.slowed ? 0.5 : 1;
    this.phase += dt * mul;
    this.flash = Math.max(0, this.flash - dt);
    this.slowTimer = Math.max(0, this.slowTimer - dt);

    const target = game.defenderBlocking(this);
    this.eating = !!target;
    if (target) target.takeDamage(this.def.dps * mul * dt);
    else this.x -= this.def.speed * mul * dt;
  }

  takeDamage(amount, game) {
    if (this.dead) return;
    this.flash = 0.08;
    if (this.armor > 0) {
      const absorbed = Math.min(this.armor, amount);
      this.armor -= absorbed;
      amount -= absorbed;
      if (this.armor <= 0) game.fx.burst(this.x, this.y - 20, this.def.armorColor, 14, 160, 0.6);
    }
    this.hp -= amount;
    if (this.hp <= 0) this.kill(game);
  }

  slow(duration) {
    this.slowTimer = Math.max(this.slowTimer, duration);
  }

  kill(game) {
    if (this.dead) return;
    this.dead = true;
    this.hp = 0;
    this.armor = 0;
    game.stats.kills++;
    game.fx.burst(this.x, this.y, this.def.color, 20, 180, 0.7);
  }
}
