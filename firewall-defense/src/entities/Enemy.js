import { ENEMIES } from '../data/enemies.js';
import { rand } from '../util.js';

export class Enemy {
  constructor(type, dist) {
    this.type = type;
    this.def = ENEMIES[type];
    this.dist = dist; // quanto já andou no caminho
    this.hp = this.maxHp = this.def.hp;
    this.r = this.def.radius;
    this.x = -999;
    this.y = -999;
    this.angle = 0;
    this.face = 1;
    this.stun = 0; // travado pelo Firewall
    this.flash = 0; // piscada branca ao levar dano
    this.kick = 0; // "tranco" ao levar dano (1 → 0)
    this.phase = rand(0, 10); // relógio da animação de andar
    this.dead = false;
  }

  get speed() {
    return this.stun > 0 ? 0 : this.def.speed;
  }

  place(path) {
    const p = path.pointAt(this.dist);
    this.x = p.x;
    this.y = p.y;
    this.angle = p.angle;
    const c = Math.cos(p.angle);
    if (Math.abs(c) > 0.2) this.face = c > 0 ? 1 : -1;
  }

  update(dt, game) {
    this.flash = Math.max(0, this.flash - dt);
    this.kick = Math.max(0, this.kick - dt * 6);
    this.stun = Math.max(0, this.stun - dt);
    if (this.stun > 0) return;
    this.phase += dt;
    this.dist += this.def.speed * dt;
    if (this.dist >= game.path.length) {
      this.dead = true;
      game.leak(this);
      return;
    }
    this.place(game.path);
  }

  stunFor(t) {
    this.stun = Math.max(this.stun, t);
  }

  // Retorna true se o golpe feriu
  hit(damage, game, source) {
    if (this.dead) return false;
    if (this.def.armored && !source?.def.pierceArmor) {
      game.fx.blocked(this.x, this.y - this.r * 1.6);
      game.sound.play('block');
      return false;
    }
    this.hp -= damage;
    this.flash = 0.09;
    this.kick = 1;
    if (this.hp <= 0) {
      this.dead = true;
      game.onKill(this);
    } else game.sound.play('hit');
    return true;
  }
}
