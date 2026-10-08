import { VIEW_H, GOLD, OUTLINE } from '../config.js';
import { drawImage } from '../render/images.js';
import { rrect, fillOutline, text, setFont } from '../render/canvas.js';
import { bigButton, iconButton, inRect } from '../render/widgets.js';
import { easeOutBack, clamp } from '../util.js';

// Tela de título "VERSUS": a tela dividida na diagonal, os defensores no
// azul contra as ameaças no vermelho, um VS pulsando no meio e o "JOGAR".
// Os dois lados entram deslizando e o VS estoura logo depois.
// Medidas numa tela de 960 de largura: o que é da esquerda fica preso na
// esquerda e o que é da direita na direita (em telas mais largas só o meio
// cresce).

const BLUE = ['#2f6bff', '#2257d6'];
const RED = ['#c2265a', '#a11c4b'];

// Sprites grandes: centro (x, y) e lado da imagem. Os defensores usam as
// medidas dos pés de render/characters.js (foot) pra pose de ataque do
// Golem não "pular" quando troca de imagem.
const GOLEM = { x: 190, feet: 462, scale: 4.7 };
const HACKER = { x: 340, y: 360, size: 220 };
const BOSS = { x: 760, y: 320, size: 400 };
const TROJAN = { x: 595, y: 415, size: 150 };
const WORM = { x: 885, y: 445, size: 170 };

const easeOut = (k) => 1 - (1 - k) ** 3;

export class TitleScene {
  constructor(app) {
    this.app = app;
    this.t = 0;
    this.pressed = false;
  }

  layout() {
    const W = this.app.viewW;
    return {
      play: { x: W / 2 - 140, y: 448, w: 280, h: 76 },
      music: { x: W - 144, y: 16, w: 60, h: 60 },
      sfx: { x: W - 76, y: 16, w: 60, h: 60 },
    };
  }

  update(dt) {
    this.t += dt;
    this.wormJump = Math.max(0, (this.wormJump ?? 0) - dt * 2);
    this.debugNote = Math.max(0, (this.debugNote ?? 0) - dt);
  }

  // Easter egg: tocar no worm liga o modo debug (app.enableDebug)
  wormHit(x, y) {
    const cx = this.app.viewW - (960 - WORM.x);
    return Math.abs(x - cx) < WORM.size * 0.42 && Math.abs(y - WORM.y) < WORM.size * 0.32;
  }

  render(ctx) {
    const W = this.app.viewW;
    const t = this.t;
    const R = (x) => W - (960 - x); // posição presa no lado direito

    this.drawSides(ctx, W, t);

    // os lados entram deslizando
    const slide = (1 - easeOut(clamp(t * 1.4, 0, 1))) * 520;
    ctx.save();
    ctx.translate(-slide, 0);
    this.drawGolem(ctx, t);
    sprite(ctx, 'hacker', HACKER.x, HACKER.y + Math.sin(t * 2.2) * 4, HACKER.size, 1, this.app.pixelScale);
    badge(ctx, 46, 132, 'DEFENSORES', '#5fb4ff', -0.07);
    ctx.restore();

    ctx.save();
    ctx.translate(slide, 0);
    const hop = (p) => -Math.abs(Math.sin(t * 3.2 + p)) * 10;
    sprite(ctx, 'trojan', R(TROJAN.x), TROJAN.y + hop(0), TROJAN.size, -1, this.app.pixelScale);
    ctx.save();
    ctx.translate(R(BOSS.x), BOSS.y + Math.sin(t * 1.6) * 9);
    ctx.rotate(Math.sin(t * 1.1) * 0.03);
    sprite(ctx, 'ransomware', 0, 0, BOSS.size, -1, this.app.pixelScale);
    ctx.restore();
    sprite(ctx, 'worm', R(WORM.x), WORM.y + hop(1.3) - Math.sin((this.wormJump ?? 0) * Math.PI) * 60, WORM.size, -1, this.app.pixelScale);
    badge(ctx, R(914), 132, 'AMEAÇAS', '#ff5a6a', 0.07, 'right');
    ctx.restore();

    this.drawVs(ctx, W / 2, 280, t);
    this.drawLogo(ctx, W / 2, 58, t);
    if (this.debugNote > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, this.debugNote * 2);
      text(ctx, 'MODO DEBUG ATIVADO', W / 2, 118, { size: 22, color: '#3dff9a' });
      ctx.restore();
    }

    const L = this.layout();
    ctx.save();
    const p = this.pressed ? 0.95 : 1 + Math.sin(t * 4) * 0.035;
    ctx.translate(L.play.x + L.play.w / 2, L.play.y + L.play.h / 2);
    ctx.scale(p, p);
    ctx.translate(-(L.play.x + L.play.w / 2), -(L.play.y + L.play.h / 2));
    bigButton(ctx, L.play, '#3fd16b', 'JOGAR', { icon: 'play', size: 40, depth: 8 });
    ctx.restore();
    const s = this.app.save;
    // volume em degraus (roxo = com som, cinza = mudo)
    for (const [kind, key] of [['music', 'musicVol'], ['sfx', 'sfxVol']]) {
      const v = s[key];
      iconButton(ctx, L[kind], v > 0 ? '#8a7dff' : '#7d8fa8', kind, v > 0);
    }
  }

  // Fundo: as duas metades com raios girando devagar e o corte escuro no meio
  drawSides(ctx, W, t) {
    const H = VIEW_H;
    const top = W * 0.57;
    const bottom = W * 0.43;
    const half = (pts, cx, colors, rot) => {
      ctx.save();
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.clip();
      sunburst(ctx, cx, H * 0.6, colors, rot);
      ctx.restore();
    };
    half([[0, 0], [top, 0], [bottom, H], [0, H]], W * 0.25, BLUE, t * 0.06);
    half([[top, 0], [W, 0], [W, H], [bottom, H]], W * 0.75, RED, -t * 0.06);
    const band = W * 0.014;
    ctx.beginPath();
    ctx.moveTo(top - band, 0);
    ctx.lineTo(top + band, 0);
    ctx.lineTo(bottom + band, H);
    ctx.lineTo(bottom - band, H);
    ctx.closePath();
    ctx.fillStyle = OUTLINE;
    ctx.fill();
  }

  // Golem: a cada 2,6 s bate no chão (pose de ataque por um instante)
  drawGolem(ctx, t) {
    const slam = t % 2.6 > 2.2;
    const meta = slam ? { name: 'firewall_attack', size: 75, foot: 0.434, dx: -1.7 } : { name: 'firewall', size: 64, foot: 0.473, dx: 0 };
    const k = GOLEM.scale;
    const size = meta.size * k;
    const breath = slam ? 1 : 1 + Math.sin(t * 2.4) * 0.015;
    ctx.save();
    ctx.translate(GOLEM.x, GOLEM.feet);
    ctx.scale(1 / breath, breath); // respira ancorado nos pés
    sprite(ctx, meta.name, meta.dx * k, -size * meta.foot, size, 1, this.app.pixelScale);
    ctx.restore();
  }

  drawVs(ctx, x, y, t) {
    const pop = easeOutBack(clamp((t - 0.45) * 2.6, 0, 1));
    if (pop <= 0) return;
    const pulse = 1 + Math.sin(t * 7) * 0.05;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.14);
    ctx.scale(pop * pulse, pop * pulse);
    text(ctx, 'VS', 0, 9, { size: 124, color: OUTLINE, strokeWidth: 18 });
    text(ctx, 'VS', 0, 0, { size: 124, color: GOLD, strokeWidth: 18 });
    ctx.restore();
  }

  // "FIREWALL DEFENSE" numa linha, cada palavra de uma cor
  drawLogo(ctx, x, y, t) {
    const k = easeOutBack(clamp(t * 1.6, 0, 1));
    const size = 66;
    setFont(ctx, size);
    const a = ctx.measureText('FIREWALL ').width;
    const b = ctx.measureText('DEFENSE').width;
    const x0 = -(a + b) / 2;
    ctx.save();
    ctx.translate(x, y + Math.sin(t * 1.8) * 3);
    ctx.scale(k, k);
    for (const [dy, c1, c2] of [[7, OUTLINE, OUTLINE], [0, '#5fd8ff', GOLD]]) {
      text(ctx, 'FIREWALL', x0, dy, { size, color: c1, align: 'left', strokeWidth: 13 });
      text(ctx, 'DEFENSE', x0 + a, dy, { size, color: c2, align: 'left', strokeWidth: 13 });
    }
    ctx.restore();
  }

  pointerDown(x, y) {
    const L = this.layout();
    if (inRect(L.music, x, y)) this.app.stepVolume('music');
    else if (inRect(L.sfx, x, y)) this.app.stepVolume('sfx');
    else if (inRect(L.play, x, y)) this.pressed = true;
    else if (this.wormHit(x, y)) {
      this.wormJump = 1;
      this.debugNote = 2.5;
      this.app.sound.play(this.app.debug ? 'click' : 'upgrade');
      this.app.enableDebug();
    }
  }

  pointerUp(x, y) {
    if (!this.pressed) return;
    this.pressed = false;
    if (inRect(this.layout().play, x, y)) {
      this.app.sound.play('click');
      this.app.goPlay();
    }
  }

  key(k) {
    if (k === 'Enter' || k === ' ') this.app.goPlay();
  }
}

// Raios saindo de (cx, cy), alternando as duas cores (estilo cartaz)
function sunburst(ctx, cx, cy, [c1, c2], rot) {
  const n = 30;
  const r = 1600;
  ctx.fillStyle = c2;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.fillStyle = c1;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a0 = rot + (i / n) * Math.PI * 2;
    const a1 = a0 + Math.PI / n;
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r);
    ctx.lineTo(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r);
    ctx.closePath();
  }
  ctx.fill();
}

// Sprite grande com sombra chapada pro lado de fora da tela (face: -1 vira)
function sprite(ctx, name, x, y, size, face, pixelScale) {
  ctx.save();
  ctx.translate(x, y);
  if (face < 0) ctx.scale(-1, 1);
  ctx.shadowColor = 'rgba(10,15,40,0.35)';
  ctx.shadowOffsetX = 8 * face * pixelScale; // a sombra não segue o transform
  ctx.shadowOffsetY = 8 * pixelScale;
  drawImage(ctx, name, size, 0, 0);
  ctx.restore();
}

// Etiqueta inclinada ("DEFENSORES" / "AMEAÇAS")
function badge(ctx, x, y, label, color, rot, align = 'left') {
  setFont(ctx, 23);
  const w = ctx.measureText(label).width + 34;
  const h = 42;
  ctx.save();
  ctx.translate(align === 'left' ? x + w / 2 : x - w / 2, y + h / 2);
  ctx.rotate(rot);
  rrect(ctx, -w / 2, -h / 2, w, h, 12);
  fillOutline(ctx, color, 4);
  text(ctx, label, 0, 1, { size: 23, strokeWidth: 6 });
  ctx.restore();
}
