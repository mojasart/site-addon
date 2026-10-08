import { VIEW_H, OUTLINE, GOLD } from '../config.js';
import { rrect, fillOutline, text, button } from '../render/canvas.js';
import { iconButton, inRect } from '../render/widgets.js';
import { drawCharacter } from '../render/characters.js';
import { drawDuck } from '../render/duck.js';

/* ════════════════════════════════════════════════════════════
 *  NOME DO JOGADOR
 *  Depois do JOGAR (só enquanto não tem nome salvo): o Hacker pergunta
 *  "Olá, podemos te chamar de ___?". O campo é um <input> de verdade (abre
 *  o teclado no celular) posicionado em cima da caixa desenhada no canvas.
 *  Só letras (com acento) e espaço, até MAX_NAME caracteres; o resto é
 *  apagado enquanto digita. O Hacker usa o nome pra falar (app.playerName).
 * ════════════════════════════════════════════════════════════ */

export const MAX_NAME = 30;

// Deixa só letras e espaço (sem número nem símbolo), sem espaço repetido
export function cleanName(str) {
  return str.replace(/[^\p{L} ]/gu, '').replace(/ {2,}/g, ' ').replace(/^ +/, '').slice(0, MAX_NAME);
}

export class NameScene {
  constructor(app) {
    this.app = app;
    this.t = 0;
    this.shake = 0;
    this.input = makeInput(app.save.playerName ?? '');
    this.input.addEventListener('input', () => {
      const clean = cleanName(this.input.value);
      if (clean !== this.input.value) this.input.value = clean;
    });
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.confirm();
    });
    setTimeout(() => this.input.focus(), 50);
  }

  layout() {
    const W = this.app.viewW;
    const cx = W / 2 + 70;
    return {
      back: { x: 18, y: 16, w: 56, h: 56 },
      field: { x: cx - 190, y: 214, w: 380, h: 58 },
      ok: { x: cx - 120, y: 330, w: 240, h: 66 },
      cx,
    };
  }

  get name() {
    return this.input.value.trim();
  }

  update(dt) {
    this.t += dt;
    this.shake = Math.max(0, this.shake - dt * 3);
  }

  render(ctx) {
    const W = this.app.viewW;
    const L = this.layout();
    const bg = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    bg.addColorStop(0, '#1d2c66');
    bg.addColorStop(1, '#101a3d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, VIEW_H);

    // o Hacker criança à esquerda, falando, com o Pato de Borracha no pé
    ctx.save();
    ctx.translate(L.cx - 330, 410 + Math.sin(this.t * 2.2) * 4);
    ctx.scale(2.6, 2.6);
    drawCharacter(ctx, 'hacker', { t: this.t, face: 1, level: 0 });
    ctx.restore();
    ctx.save();
    ctx.translate(L.cx - 266, 428);
    drawDuck(ctx, 17, { t: this.t });
    ctx.restore();

    text(ctx, 'Olá, podemos te chamar de', L.cx, 168, { size: 30 });
    // caixa do campo (o <input> fica em cima) + o "?" no fim
    ctx.save();
    ctx.translate(Math.sin(this.shake * 40) * 6 * this.shake, 0);
    rrect(ctx, L.field.x, L.field.y + 5, L.field.w, L.field.h, 16);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fill();
    rrect(ctx, L.field.x, L.field.y, L.field.w, L.field.h, 16);
    fillOutline(ctx, '#ffffff', 4);
    ctx.restore();
    text(ctx, '?', L.field.x + L.field.w + 22, L.field.y + L.field.h / 2 + 2, { size: 38 });
    const n = this.input.value.length;
    text(ctx, `${n}/${MAX_NAME}`, L.cx, L.field.y + L.field.h + 22, { size: 13, color: '#bcd0f5', stroke: null });

    const ready = this.name.length > 0;
    button(ctx, L.ok, ready ? '#3fd16b' : '#7d8aa8', { radius: 18, depth: 6 });
    text(ctx, 'CONFIRMAR', L.ok.x + L.ok.w / 2, L.ok.y + (L.ok.h - 6) / 2 + 1, { size: 26 });
    iconButton(ctx, L.back, '#5fb4ff', 'back');

    this.placeInput(L.field);
  }

  // Põe o <input> exatamente em cima da caixa desenhada (escala da tela)
  placeInput(f) {
    const canvas = document.getElementById('game');
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    const k = Math.min(r.width / this.app.viewW, r.height / VIEW_H);
    const ox = r.left + (r.width - this.app.viewW * k) / 2;
    const oy = r.top + (r.height - VIEW_H * k) / 2;
    const s = this.input.style;
    s.left = `${ox + (f.x + 14) * k}px`;
    s.top = `${oy + (f.y + 4) * k}px`;
    s.width = `${(f.w - 28) * k}px`;
    s.height = `${(f.h - 8) * k}px`;
    s.fontSize = `${26 * k}px`;
  }

  confirm() {
    const name = this.name;
    if (!name) {
      this.shake = 1;
      this.app.sound.play('error');
      this.input.focus();
      return;
    }
    this.app.setPlayerName(name);
    this.app.sound.play('upgrade');
    this.leave(() => this.app.goMaps());
  }

  leave(go) {
    this.input.remove();
    go();
  }

  pointerDown(x, y) {
    const L = this.layout();
    if (inRect(L.ok, x, y)) return this.confirm();
    if (inRect(L.back, x, y)) {
      this.app.sound.play('click');
      return this.leave(() => this.app.goTitle());
    }
    this.input.focus(); // tocou em qualquer lugar: volta pro campo (teclado)
  }

  key(k) {
    if (k === 'Escape') this.leave(() => this.app.goTitle());
  }
}

// Campo de texto de verdade, por cima do canvas (some ao sair da tela)
function makeInput(value) {
  const el = document.createElement('input');
  el.type = 'text';
  el.value = cleanName(value);
  el.maxLength = MAX_NAME;
  el.autocomplete = 'off';
  el.spellcheck = false;
  el.setAttribute('autocapitalize', 'words');
  el.setAttribute('aria-label', 'Seu nome');
  Object.assign(el.style, {
    position: 'fixed',
    zIndex: 10,
    border: 'none',
    outline: 'none',
    background: 'transparent',
    color: OUTLINE,
    textAlign: 'center',
    fontFamily: '"Lilita One", "Arial Rounded MT Bold", "Arial Black", sans-serif',
    caretColor: GOLD,
    padding: '0',
  });
  document.body.appendChild(el);
  return el;
}
