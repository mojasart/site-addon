import { VIEW_H } from '../config.js';
import { text } from './canvas.js';
import { ICONS } from './sprites.js';

/* ════════════════════════════════════════════════════════════
 *  ANIMAÇÃO "DARK NET LIBERADA" (tela de mapas, uma vez só)
 *  Quando o jogador junta DARKNET_STARS estrelas e volta pros mapas:
 *    0,0 s  a tela escurece e chove código roxo
 *    0,3 s  a cebola da Dark Net cresce no meio, com um cadeado na frente
 *    1,0 s  o cadeado treme cada vez mais...
 *    1,6 s  ...e quebra: clarão, anel roxo e faíscas
 *    1,7 s  "DARK NET LIBERADA!" se decifra letra por letra
 *  Um toque (ou 6 s) e a cebola voa pro botão da Dark Net, que fica
 *  pulsando um pouco (LevelSelectScene).
 * ════════════════════════════════════════════════════════════ */

const PURPLE = '#b77bff';
const GLYPHS = '#$%&@*!?<>/{}[]=+~^01ØΣΞ¥';
const BREAK = 1.6; // quando o cadeado quebra
const TAP_FROM = 1.9; // antes disso o toque não pula
const AUTO = 6; // sozinho, voa pro botão aqui
const FLY = 0.6; // duração do voo até o botão
const TITLE = 'DARK NET LIBERADA!';

const ease = (x) => 1 - (1 - x) ** 3;
const easeBack = (x) => 1 + 2.7 * (x - 1) ** 3 + 1.7 * (x - 1) ** 2;
const clamp01 = (x) => Math.max(0, Math.min(1, x));

export class DarkNetUnlock {
  // target: centro do botão da Dark Net (pra onde a cebola voa no fim);
  // sound(name): toca um efeito
  constructor(target, sound = () => {}) {
    this.target = target;
    this.sound = sound;
    this.t = 0;
    this.fly = null; // tempo do voo (null = ainda no meio da tela)
    this.done = false;
    this.broke = false;
    // faíscas da quebra (ângulo, velocidade e tamanho sorteados uma vez)
    this.sparks = Array.from({ length: 30 }, (_, i) => ({
      a: (i / 30) * Math.PI * 2 + Math.random() * 0.3,
      v: 180 + Math.random() * 260,
      r: 2 + Math.random() * 3,
    }));
    // colunas da chuva de código
    this.cols = Array.from({ length: 48 }, (_, i) => ({ x: i * 26 + 8, v: 60 + ((i * 37) % 70), o: (i * 131) % VIEW_H }));
  }

  update(dt) {
    this.t += dt;
    if (!this.broke && this.t >= BREAK) {
      this.broke = true;
      this.sound('upgrade');
      setTimeout(() => this.sound('star'), 250);
    }
    if (this.fly == null && this.t >= AUTO) this.fly = 0;
    if (this.fly != null && (this.fly += dt) >= FLY) this.done = true;
  }

  // Toque: depois do texto aparecer, manda a cebola pro botão
  tap() {
    if (this.fly == null && this.t >= TAP_FROM) this.fly = 0;
  }

  draw(ctx, W) {
    const t = this.t;
    const k = this.fly == null ? 0 : ease(clamp01(this.fly / FLY)); // 0 → 1 no voo
    const cx = W / 2;
    const cy = 200;
    ctx.save();

    // fundo escuro + chuva de código roxo (somem durante o voo)
    const dark = clamp01(t / 0.5) * (1 - k);
    ctx.fillStyle = `rgba(8,4,20,${0.86 * dark})`;
    ctx.fillRect(0, 0, W, VIEW_H);
    ctx.globalAlpha = 0.35 * dark;
    ctx.font = '16px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = PURPLE;
    for (const c of this.cols) {
      if (c.x > W) break;
      const y0 = (c.o + t * c.v) % (VIEW_H + 200) - 100;
      for (let j = 0; j < 6; j++) {
        ctx.globalAlpha = 0.35 * dark * (1 - j / 6);
        ctx.fillText(GLYPHS[(Math.floor(t * 8) + c.x + j * 7) % GLYPHS.length], c.x, y0 - j * 18);
      }
    }
    ctx.globalAlpha = 1;

    // clarão da quebra
    if (this.broke && t < BREAK + 0.25) {
      ctx.fillStyle = `rgba(230,210,255,${0.6 * (1 - (t - BREAK) / 0.25)})`;
      ctx.fillRect(0, 0, W, VIEW_H);
    }

    // anel roxo e faíscas saindo do centro
    if (this.broke && k === 0) {
      const e = t - BREAK;
      if (e < 0.8) {
        ctx.beginPath();
        ctx.arc(cx, cy, 40 + e * 260, 0, Math.PI * 2);
        ctx.lineWidth = 6 * (1 - e / 0.8);
        ctx.strokeStyle = PURPLE;
        ctx.stroke();
      }
      if (e < 1) {
        ctx.fillStyle = '#e3c9ff';
        for (const s of this.sparks) {
          const d = s.v * ease(Math.min(1, e));
          ctx.globalAlpha = 1 - e;
          ctx.beginPath();
          ctx.arc(cx + Math.cos(s.a) * d, cy + Math.sin(s.a) * d, s.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    }

    // cebola da Dark Net: cresce no meio; no voo vai pro botão encolhendo
    const grow = easeBack(clamp01((t - 0.3) / 0.6));
    const size = 46 * grow * (1 - k) + 14 * k;
    const ox = cx + (this.target.x - cx) * k;
    const oy = cy + (this.target.y - cy) * k + Math.sin(t * 3) * 4 * (1 - k);
    if (grow > 0) {
      // brilho roxo atrás
      const glow = ctx.createRadialGradient(ox, oy, 0, ox, oy, size * 2.4);
      glow.addColorStop(0, `rgba(183,123,255,${0.55 * (1 - k)})`);
      glow.addColorStop(1, 'rgba(183,123,255,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(ox - size * 2.4, oy - size * 2.4, size * 4.8, size * 4.8);
      ctx.save();
      ctx.translate(ox, oy);
      ICONS.darknet(ctx, size);
      ctx.restore();
    }

    // cadeado na frente: treme cada vez mais e quebra em duas metades
    if (grow > 0 && t < BREAK + 0.7) {
      const ls = 26 * grow;
      const lx = cx;
      const ly = cy + 30;
      if (!this.broke) {
        const shake = t > 1 ? Math.sin(t * 70) * 6 * ((t - 1) / (BREAK - 1)) : 0;
        ctx.save();
        ctx.translate(lx + shake, ly);
        ctx.rotate(shake * 0.02);
        ICONS.lock(ctx, ls);
        ctx.restore();
      } else {
        const e = (t - BREAK) / 0.7;
        for (const side of [-1, 1]) {
          ctx.save();
          ctx.globalAlpha = 1 - e;
          ctx.translate(lx + side * e * 90, ly + e * e * 160);
          ctx.rotate(side * e * 1.6);
          ctx.beginPath();
          ctx.rect(side < 0 ? -ls * 1.2 : 0, -ls * 1.4, ls * 1.2, ls * 2.6);
          ctx.clip();
          ICONS.lock(ctx, ls);
          ctx.restore();
        }
      }
    }

    // título se decifrando letra por letra, depois as legendas
    if (t > BREAK + 0.1 && k < 1) {
      ctx.globalAlpha = 1 - k;
      const n = Math.floor(clamp01((t - BREAK - 0.1) / 0.8) * TITLE.length);
      let title = TITLE.slice(0, n);
      for (let i = n; i < TITLE.length; i++) title += TITLE[i] === ' ' ? ' ' : GLYPHS[(Math.floor(t * 20) + i * 7) % GLYPHS.length];
      text(ctx, title, cx, cy + 110, { size: 44, color: PURPLE, strokeWidth: 10 });
      if (t > BREAK + 1) {
        ctx.globalAlpha = (1 - k) * clamp01((t - BREAK - 1) / 0.4);
        text(ctx, 'Troque seus cafés por upgrades permanentes', cx, cy + 160, { size: 20, color: '#e3c9ff' });
      }
      if (t > TAP_FROM + 0.4 && this.fly == null && Math.sin(t * 5) > -0.3) {
        ctx.globalAlpha = 1;
        text(ctx, 'toque pra continuar', cx, cy + 200, { size: 15, color: '#c9a8ff', stroke: null });
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
}
