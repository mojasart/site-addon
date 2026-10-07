// ─────────────────────────────────────────────────────────────
//  ZONAS ELETRIFICADAS (o diferencial do Data Center)
//
//  Cada zona é um retângulo no chão (map.hazards) que dá uma descarga a
//  cada `period` segundos. Quem estiver dentro na hora fica atordoado
//  por STUN_TIME segundos (não ataca nem minera). Antes da descarga a
//  zona avisa (pisca) por WARN_TIME segundos.
// ─────────────────────────────────────────────────────────────
export const STUN_TIME = 2.5;
export const WARN_TIME = 1.2;

export class Hazards {
  constructor(list = []) {
    // t começa no offset: assim as zonas não disparam todas juntas
    this.zones = list.map((z) => ({ ...z, t: z.offset ?? 0, flash: 0 }));
  }

  update(dt, game) {
    for (const z of this.zones) {
      z.flash = Math.max(0, z.flash - dt * 2.5);
      z.t += dt;
      if (z.t >= z.period) {
        z.t -= z.period;
        this.zap(z, game);
      }
    }
  }

  zap(z, game) {
    z.flash = 1;
    let hit = false;
    for (const tw of game.towers) {
      if (tw.def.onPath || !contains(z, tw.x, tw.y)) continue;
      tw.stun(STUN_TIME);
      game.fx.burst(tw.x, tw.y - 18, '#7df9ff', 10, 160, 0.35, 4);
      hit = true;
    }
    game.sound.play('zap');
    if (hit) game.shake(3);
  }

  // Zona embaixo de (x, y), se houver
  at(x, y) {
    return this.zones.find((z) => contains(z, x, y)) ?? null;
  }

  // 0 → longe da descarga, 1 → descarga agora (pra piscar o aviso)
  static warning(z) {
    return Math.max(0, 1 - (z.period - z.t) / WARN_TIME);
  }
}

function contains(z, x, y) {
  return x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h;
}
