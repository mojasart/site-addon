import { LAYER_HP, OUTLINE } from '../config.js';
import { ENEMIES } from '../data/enemies.js';
import { rrect, circle, text } from './canvas.js';
import { drawEnemy, drawAura } from './viruses.js';
import { drawCharacter } from './characters.js';
import { drawProjectile, ICONS } from './sprites.js';

/* ════════════════════════════════════════════════════════════
 *  PREVIEW DA AMEAÇA (catálogo)
 *  Um "videozinho" em loop do que cada vírus faz: uma estrada do portal
 *  até o servidor, umas defesas atirando e o vírus mostrando a habilidade
 *  dele (estoura em outro, solta vírus pelo caminho, blindado, invisível,
 *  voa com a aura, anúncios, criptografa defesa...). É uma cena
 *  roteirizada e simplificada (não é o jogo de verdade), em coordenadas
 *  próprias W × H, escalada pra caixa onde é desenhada.
 *  new ThreatPreview(type) → update(dt) → draw(ctx, box)
 * ════════════════════════════════════════════════════════════ */

const W = 440;
const H = 150;
const ROAD_Y = 112; // chão da estrada (pés dos vírus)
const S = 0.62; // escala dos vírus (raio) e da aura
const SERVER_X = W - 26;
const LOOP_GAP = 1.2; // segundos de tela vazia antes de recomeçar
const SPAWN_EVERY = 0.8; // Worm: solta um vírus a cada (mais rápido que no jogo)
const MAX_TIME = 16; // recomeça mesmo se algo travar

// Defesas de cada cena: [tipo, x]. Padrão: um Hacker no meio
const CAST = {
  trojan: [['hacker', 150], ['firewall', 290]],
  locker: [['hacker', 150], ['firewall', 290]],
  ransomware: [['hacker', 120], ['hacker', 330], ['firewall', 250]],
  spyware: [['hacker', 170], ['scanner', 300]],
  cicada: [['hacker', 230]],
};
const TOWER = {
  hacker: { range: 170, every: 0.3 },
  firewall: { range: 85, every: 1.4 },
  scanner: { range: 120, every: 0.7 },
};
// quem acompanha na cena (mostra a habilidade agindo nos outros)
const ESCORT = { cicada: [['v1', -60], ['v2', -95], ['v1', 40]] };

const hitsOf = (def) => Math.max(1, Math.min(10, Math.round(def.hp / LAYER_HP)));

export class ThreatPreview {
  constructor(type) {
    this.type = type;
    this.reset();
  }

  reset() {
    this.t = 0;
    this.empty = 0;
    this.enemies = [];
    this.shots = [];
    this.fx = [];
    this.pulses = [];
    this.ads = [];
    this.adT = 0.8;
    this.towers = (CAST[this.type] ?? [['hacker', 220]]).map(([type, x], i) => ({ type, x, y: 62 + (i % 2) * 6, cd: 0.6 + i * 0.2, attack: 0, locked: false, beam: null }));
    this.add(this.type, -30, true);
    for (const [type, dx] of ESCORT[this.type] ?? []) this.add(type, -30 + dx);
  }

  add(type, x, star = false) {
    const def = ENEMIES[type];
    // o da ficha aguenta o dobro (dá tempo de mostrar a habilidade)
    const hits = hitsOf(def) * (star && hitsOf(def) > 1 && !def.boss ? 2 : 1);
    const e = {
      type,
      def,
      star, // o vírus da ficha (os outros são filhos e acompanhantes)
      x,
      r: (def.radius ?? 14) * S,
      hp: hits,
      maxHp: hits,
      speed: Math.max(45, Math.min(150, def.speed * 0.7)),
      phase: Math.random(),
      face: 1,
      flash: 0,
      slowTimer: 0,
      burnTimer: 0,
      auraT: 0,
      spawnT: def.spawn ? SPAWN_EVERY : 0,
      revealed: false,
      dead: false,
    };
    this.enemies.push(e);
    return e;
  }

  // a origem do vírus no chão (y: pés)
  inAura(e) {
    return this.enemies.some((o) => o !== e && !o.dead && o.def.aura && Math.abs(o.x - e.x) <= o.def.aura * S);
  }

  update(dt) {
    this.t += dt;
    for (const e of this.enemies) this.moveEnemy(e, dt);
    for (const tw of this.towers) this.fire(tw, dt);
    this.moveShots(dt);
    this.pulses = this.pulses.filter((p) => (p.life -= dt) > 0);
    this.fx = this.fx.filter((f) => (f.life -= dt) > 0);
    for (const f of this.fx) f.y -= dt * 18;
    this.updateAds(dt);
    this.enemies = this.enemies.filter((e) => !e.dead);
    if (!this.enemies.length) this.empty += dt;
    if (this.empty > LOOP_GAP || this.t > MAX_TIME) this.reset();
  }

  moveEnemy(e, dt) {
    e.x += e.speed * dt;
    e.phase += dt * (e.speed / 70);
    e.auraT += dt;
    e.flash = Math.max(0, e.flash - dt * 4);
    e.burnTimer = Math.max(0, e.burnTimer - dt);
    if (e.def.stealth) e.revealed = this.towers.some((t) => t.type === 'scanner' && Math.abs(t.x - e.x) <= TOWER.scanner.range);
    // Worm: vai largando vírus pelo caminho
    if (e.def.spawn) {
      e.spawnT -= dt;
      if (e.spawnT <= 0 && e.x > 10) {
        e.spawnT = SPAWN_EVERY;
        const kid = this.add(e.def.spawn.type, e.x - 6);
        kid.speed *= 0.8;
      }
    }
    // Ransomware: criptografa as defesas perto dele
    if (e.def.ransom) {
      for (const tw of this.towers) {
        if (tw.locked || Math.abs(tw.x - e.x) > 70) continue;
        tw.locked = true;
        this.say(tw.x, tw.y - 44, 'CRIPTOGRAFADO!', '#ff5a6a');
      }
    }
    if (e.x >= SERVER_X) {
      e.dead = true;
      this.say(SERVER_X - 10, ROAD_Y - 40, '-VIDA', '#ff5a6a');
    }
  }

  // A defesa mira o vírus que está mais na frente, no alcance e visível
  fire(tw, dt) {
    tw.attack = Math.max(0, tw.attack - dt * 4);
    tw.beam = null;
    if (tw.locked) return;
    const spec = TOWER[tw.type];
    tw.cd -= dt;
    const seen = (e) => !e.dead && Math.abs(e.x - tw.x) <= spec.range && e.x > 0 && (!e.def.stealth || e.revealed);
    if (tw.type === 'firewall') {
      // onda no chão: acerta todos em volta (quem voa passa por cima)
      const near = this.enemies.filter((e) => seen(e) && !e.def.flying);
      if (tw.cd > 0 || !near.length) return;
      tw.cd = spec.every;
      tw.attack = 1;
      this.pulses.push({ x: tw.x, life: 0.5 });
      for (const e of near) {
        e.burnTimer = 1.5;
        this.damage(e, false);
      }
      return;
    }
    const target = this.enemies.filter(seen).sort((a, b) => b.x - a.x)[0];
    if (tw.type === 'scanner') {
      if (target) tw.beam = target;
      if (tw.cd > 0 || !target) return;
      tw.cd = spec.every;
      tw.attack = 1;
      this.damage(target, false);
      return;
    }
    if (tw.cd > 0 || !target) {
      // Spyware passando escondido: o Hacker não acha ninguém
      const hidden = this.enemies.find((e) => !e.dead && e.def.stealth && !e.revealed && Math.abs(e.x - tw.x) <= spec.range);
      if (hidden && !target && Math.sin(this.t * 6) > 0.95) this.say(tw.x, tw.y - 46, '?', '#ffd23f');
      return;
    }
    tw.cd = spec.every;
    tw.attack = 1;
    this.shots.push({ kind: 'keyboard', x: tw.x, y: tw.y - 20, target, spin: 0 });
  }

  moveShots(dt) {
    for (const p of this.shots) {
      const e = p.target;
      const ty = ROAD_Y - e.r * 1.2 - (e.def.flying ? 30 : 0);
      const dx = e.x - p.x;
      const dy = ty - p.y;
      const d = Math.hypot(dx, dy);
      const step = 430 * dt;
      p.spin += dt * 14;
      if (e.dead || d <= step) {
        p.done = true;
        if (!e.dead) this.damage(e, true);
        continue;
      }
      p.x += (dx / d) * step;
      p.y += (dy / d) * step;
    }
    this.shots = this.shots.filter((p) => !p.done);
  }

  // keyboard: teclado do Hacker (não fura blindagem)
  damage(e, keyboard) {
    const top = ROAD_Y - e.r * 2.6 - (e.def.flying ? 30 : 0);
    if (keyboard && e.def.armored) return this.say(e.x, top, 'BLINDADO', '#c9d1de');
    if (this.inAura(e)) return this.say(e.x, top, 'IMUNE', '#3dff9a');
    e.flash = 1;
    e.hp--;
    if (e.hp > 0) return;
    e.dead = true;
    const kids = e.def.children;
    if (kids.length) {
      let i = 0;
      for (const [type, n] of kids) for (let k = 0; k < n; k++) this.add(type, e.x - 8 - i++ * 14);
    } else this.say(e.x, top, `+$${e.def.reward ?? 1}`, '#ffd23f');
    if (e.def.ads) this.ads.forEach((a) => (a.close = 0.8)); // anúncios somem um pouco depois
  }

  // Adware: anúncios pulando na tela (no máximo 2)
  updateAds(dt) {
    const boss = this.enemies.find((e) => e.def.ads && !e.dead && e.x > 0);
    for (const a of this.ads) {
      a.t += dt;
      if (a.close != null) a.close -= dt;
    }
    this.ads = this.ads.filter((a) => a.close == null || a.close > 0);
    if (!boss) return;
    this.adT -= dt;
    if (this.adT > 0 || this.ads.length >= 2) return;
    this.adT = 1.6;
    const left = this.ads.length ? this.ads[0].x > W / 2 : Math.random() < 0.5;
    this.ads.push({ x: left ? 70 + Math.random() * 60 : 250 + Math.random() * 60, y: 14 + Math.random() * 20, t: 0, hue: ['#ff5ab4', '#3d8bff', '#ffb020'][Math.floor(Math.random() * 3)] });
  }

  say(x, y, str, color) {
    // (o mesmo aviso ali perto ainda subindo: não empilha)
    if (this.fx.some((f) => f.str === str && f.life > 0.55 && Math.abs(f.x - x) < 40)) return;
    this.fx.push({ x, y, str, color, life: 0.9 });
  }

  // ── Desenho ──
  draw(ctx, box) {
    const k = Math.min(box.w / W, box.h / H);
    ctx.save();
    ctx.beginPath();
    ctx.rect(box.x, box.y, box.w, box.h);
    ctx.clip();
    ctx.translate(box.x + (box.w - W * k) / 2, box.y + (box.h - H * k) / 2);
    ctx.scale(k, k);
    this.drawGround(ctx);
    for (const p of this.pulses) this.drawPulse(ctx, p);
    for (const tw of this.towers) this.drawTower(ctx, tw);
    const list = [...this.enemies].sort((a, b) => (a.def.flying ? 1 : 0) - (b.def.flying ? 1 : 0));
    for (const e of list) this.drawEnemy(ctx, e);
    for (const p of this.shots) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(0.8, 0.8);
      drawProjectile(ctx, p, this.t);
      ctx.restore();
    }
    for (const a of this.ads) this.drawAd(ctx, a);
    for (const f of this.fx) text(ctx, f.str, f.x, f.y, { size: 13, color: f.color });
    ctx.restore();
  }

  drawGround(ctx) {
    ctx.fillStyle = '#245a2c';
    ctx.fillRect(0, 0, W, H);
    // trilhas de placa-mãe no fundo
    ctx.strokeStyle = 'rgba(120,220,140,0.18)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 80 + 10, 0);
      ctx.lineTo(i * 80 + 10, 30);
      ctx.lineTo(i * 80 + 40, 44);
      ctx.stroke();
    }
    // estrada
    const top = ROAD_Y - 26;
    ctx.fillStyle = '#8a92a6';
    ctx.fillRect(0, top + 4, W, 36);
    ctx.fillStyle = '#c9cfdb';
    ctx.fillRect(0, top, W, 34);
    ctx.strokeStyle = '#9aa2b6';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    const off = (this.t * 30) % 40;
    for (let x = off - 40; x < W; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x - 4, top + 11);
      ctx.lineTo(x + 3, top + 17);
      ctx.lineTo(x - 4, top + 23);
      ctx.stroke();
    }
    // portal (esquerda) e servidor (direita)
    const g = ctx.createRadialGradient(0, top + 17, 2, 0, top + 17, 26);
    g.addColorStop(0, 'rgba(255,90,180,0.9)');
    g.addColorStop(1, 'rgba(255,90,180,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, top - 10, 30, 54);
    rrect(ctx, SERVER_X, top - 14, 22, 40, 4);
    ctx.fillStyle = '#3d6fff';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = Math.sin(this.t * 6 + i) > 0 ? '#3dff9a' : '#1f8a52';
      ctx.fillRect(SERVER_X + 5, top - 8 + i * 11, 12, 4);
    }
  }

  drawPulse(ctx, p) {
    const k = 1 - p.life / 0.5;
    ctx.save();
    ctx.globalAlpha = 1 - k;
    ctx.beginPath();
    ctx.ellipse(p.x, ROAD_Y - 4, 20 + k * 70, 8 + k * 22, 0, 0, Math.PI * 2);
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#ff9a2e';
    ctx.stroke();
    ctx.restore();
  }

  drawTower(ctx, tw) {
    if (tw.beam) {
      // laser do Robô NMAP
      ctx.beginPath();
      ctx.moveTo(tw.x, tw.y - 18);
      ctx.lineTo(tw.beam.x, ROAD_Y - tw.beam.r * 1.4);
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(255,90,122,0.85)';
      ctx.stroke();
    }
    ctx.save();
    ctx.translate(tw.x, tw.y - 12);
    ctx.scale(0.72, 0.72);
    drawCharacter(ctx, tw.type, { t: this.t, face: 1, level: 0, attack: tw.attack > 0.5 ? 1 : 0 });
    ctx.restore();
    if (tw.locked) {
      ctx.save();
      ctx.translate(tw.x, tw.y - 20);
      ctx.globalAlpha = 0.9;
      circle(ctx, 0, 0, 15);
      ctx.fillStyle = 'rgba(40,0,10,0.7)';
      ctx.fill();
      ICONS.lock(ctx, 10);
      ctx.restore();
    }
  }

  drawEnemy(ctx, e) {
    ctx.save();
    ctx.translate(e.x, ROAD_Y - e.r * 0.9);
    if (e.def.aura) {
      ctx.save();
      ctx.scale(S, S);
      drawAura(ctx, { ...e, def: e.def }, this.t);
      ctx.restore();
    }
    if (e.def.stealth && !e.revealed) ctx.globalAlpha = 0.25;
    drawEnemy(ctx, e);
    ctx.restore();
    // barra de vida (só de quem leva mais de 1 acerto)
    if (e.maxHp > 1 && e.hp < e.maxHp) {
      const w = Math.max(24, e.r * 2);
      const y = ROAD_Y - e.r * 3 - (e.def.flying ? 34 : 0);
      ctx.fillStyle = 'rgba(10,16,40,0.8)';
      ctx.fillRect(e.x - w / 2 - 1, y - 1, w + 2, 6);
      ctx.fillStyle = e.def.boss ? '#ff5a6a' : '#3dff9a';
      ctx.fillRect(e.x - w / 2, y, (w * e.hp) / e.maxHp, 4);
    }
  }

  // anúncio do Adware: janelinha colorida com título, chamada e o X
  drawAd(ctx, a) {
    const s = Math.min(1, a.t * 6) * (a.close != null ? Math.max(0, a.close / 0.8) : 1);
    if (s <= 0) return;
    const w = 120;
    const h = 66;
    ctx.save();
    ctx.translate(a.x + w / 2, a.y + h / 2);
    ctx.scale(s, s);
    ctx.translate(-w / 2, -h / 2);
    rrect(ctx, 0, 0, w, h, 6);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
    ctx.fillStyle = a.hue;
    ctx.fillRect(1, 1, w - 2, 15);
    text(ctx, 'GANHE JÁ!', w / 2 - 8, 9, { size: 10 });
    rrect(ctx, w - 15, 3, 11, 11, 2);
    ctx.fillStyle = '#ff5a5a';
    ctx.fill();
    text(ctx, '×', w - 9.5, 8.5, { size: 10 });
    text(ctx, 'iPhone 19', w / 2, 33, { size: 15, color: a.hue });
    text(ctx, 'clique aqui!', w / 2, 52, { size: 11, color: '#3a3f52', stroke: null });
    ctx.restore();
  }
}
