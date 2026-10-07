import { DEFENDERS, SELL_RATE } from '../data/defenders.js';
import { rand } from '../util.js';

// Um defensor instalado num ponto do mapa (slot)
export class Defender {
  constructor(type, slot) {
    this.type = type;
    this.def = DEFENDERS[type];
    this.slot = slot;
    this.x = slot.x;
    this.y = slot.y;
    this.cooldown = 0.3;
    this.face = 1; // 1 = olhando pra direita, -1 = esquerda
    this.attack = 0; // animação de ataque (1 → 0)
    this.spawn = 1; // "pulinho" ao ser instalado (1 → 0)
    this.mineTimer = this.def.every ?? 0;
    this.anim = rand(0, 10);
  }

  get sellValue() {
    return Math.floor(this.def.cost * SELL_RATE);
  }

  lookAt(x) {
    if (Math.abs(x - this.x) > 4) this.face = x < this.x ? -1 : 1;
  }

  update(dt, game) {
    const d = this.def;
    this.anim += dt;
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.attack = Math.max(0, this.attack - dt * 4);
    this.spawn = Math.max(0, this.spawn - dt * 3);

    if (d.attack === 'mine') {
      if (game.state !== 'wave') return;
      this.mineTimer -= dt;
      if (this.mineTimer <= 0) {
        this.mineTimer = d.every;
        this.attack = 1;
        game.earn(d.income, this.x, this.y - 30);
      }
      return;
    }
    if (this.cooldown > 0) return;

    if (d.attack === 'shockwave') {
      const targets = game.enemiesInRange(this.x, this.y, d.range);
      if (!targets.length) return;
      for (const e of targets) {
        e.stunFor(e.def.boss ? d.stun * 0.35 : d.stun);
        e.hit(d.damage, game, this);
      }
      game.fx.ring(this.x, this.y, d.range, 'shock');
      game.sound.play('shock');
      game.shake(2);
      this.fire();
      return;
    }

    if (d.attack === 'burst') {
      if (!game.enemiesInRange(this.x, this.y, d.range).length) return;
      const offset = (this.anim * 0.9) % (Math.PI * 2);
      for (let i = 0; i < d.count; i++) game.spawnProjectile(this, null, offset + (i / d.count) * Math.PI * 2);
      game.sound.play('burst');
      this.fire();
      return;
    }

    const target = game.findTarget(this);
    if (!target) return;
    this.lookAt(target.x);
    if (d.attack === 'laser') {
      game.fx.beam(this.x + this.face * 6, this.y - 30, target.x, target.y - target.r * 0.6);
      target.hit(d.damage, game, this);
      game.sound.play('laser');
    } else {
      game.spawnProjectile(this, target);
      game.sound.play(d.attack === 'bomb' ? 'throw' : 'dart');
    }
    this.fire();
  }

  fire() {
    this.cooldown = this.def.rate;
    this.attack = 1;
  }
}
