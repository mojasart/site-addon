import { VIEW_H, OUTLINE, GOLD } from '../config.js';
import { rrect, fillOutline, text, button } from '../render/canvas.js';
import { inRect } from '../render/widgets.js';
import { drawCharacter } from '../render/characters.js';
import { drawDuck } from '../render/duck.js';
import { ICONS } from '../render/sprites.js';
import { easeOutBack } from '../util.js';

/* ════════════════════════════════════════════════════════════
 *  NOME DO JOGADOR
 *  Depois do JOGAR (só enquanto não tem nome salvo): uma janelinha no
 *  estilo dos anúncios do Adware (render/ads.js) abre por cima da tela
 *  inicial, e o Hacker pergunta "Olá, podemos te chamar de ___?". O X
 *  fecha e volta pra tela inicial. O campo é um <input> de verdade (abre
 *  o teclado no celular) posicionado em cima da caixa desenhada no canvas.
 *  Só letras (com acento) e espaço, até MAX_NAME caracteres; o resto é
 *  apagado enquanto digita. O Hacker usa o nome pra falar (app.playerName).
 * ════════════════════════════════════════════════════════════ */

export const MAX_NAME = 30;

// Deixa só letras e espaço (sem número nem símbolo), sem espaço repetido
export function cleanName(str) {
  return str.replace(/[^\p{L} ]/gu, '').replace(/ {2,}/g, ' ').replace(/^ +/, '').slice(0, MAX_NAME);
}

const BAR = 40; // barra de título da janela

export class NameScene {
  // behind: a tela que fica por baixo da janela (a inicial)
  constructor(app, behind = null) {
    this.app = app;
    this.behind = behind;
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
    const card = { x: W / 2 - 290, y: 115, w: 580, h: 300 };
    const cx = card.x + 365; // centro da coluna da direita
    return {
      card,
      close: { x: card.x + card.w - 40, y: card.y + 6, w: 30, h: 30 },
      field: { x: cx - 150, y: card.y + 104, w: 300, h: 50 },
      ok: { x: cx - 110, y: card.y + 208, w: 220, h: 60 },
      cx,
    };
  }

  get name() {
    return this.input.value.trim();
  }

  update(dt) {
    this.t += dt;
    this.shake = Math.max(0, this.shake - dt * 3);
    this.behind?.update(dt);
  }

  render(ctx) {
    const W = this.app.viewW;
    const L = this.layout();
    const c = L.card;
    // a tela inicial por baixo, escurecida
    if (this.behind) this.behind.render(ctx);
    else {
      ctx.fillStyle = '#101a3d';
      ctx.fillRect(0, 0, W, VIEW_H);
    }
    ctx.fillStyle = `rgba(10,18,40,${0.6 * Math.min(1, this.t * 5)})`;
    ctx.fillRect(0, 0, W, VIEW_H);

    // a janela entra pulando, como os anúncios
    const k = easeOutBack(Math.min(1, this.t / 0.25));
    ctx.save();
    ctx.globalAlpha = Math.min(1, this.t * 6);
    ctx.translate(c.x + c.w / 2, c.y + c.h / 2);
    ctx.scale(0.6 + 0.4 * k, 0.6 + 0.4 * k);
    ctx.translate(-(c.x + c.w / 2), -(c.y + c.h / 2));
    this.drawWindow(ctx, L);
    ctx.restore();

    // o <input> só aparece com a janela parada no lugar
    this.input.style.visibility = this.t >= 0.25 ? 'visible' : 'hidden';
    this.placeInput(L.field);
  }

  drawWindow(ctx, L) {
    const c = L.card;
    // sombra + janela creme com a barra de título azul
    rrect(ctx, c.x, c.y + 6, c.w, c.h, 16);
    ctx.fillStyle = 'rgba(10,16,40,0.45)';
    ctx.fill();
    rrect(ctx, c.x, c.y, c.w, c.h, 16);
    fillOutline(ctx, '#fffaf0', 4);
    ctx.save();
    rrect(ctx, c.x, c.y, c.w, c.h, 16);
    ctx.clip();
    ctx.fillStyle = '#3f8cff';
    ctx.fillRect(c.x, c.y, c.w, BAR + 2);
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(c.x, c.y + BAR + 2);
    ctx.lineTo(c.x + c.w, c.y + BAR + 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
    rrect(ctx, c.x, c.y, c.w, c.h, 16);
    ctx.lineWidth = 4;
    ctx.stroke();
    text(ctx, 'NOVO JOGADOR', c.x + 16, c.y + BAR / 2 + 2, { size: 17, align: 'left' });
    button(ctx, L.close, '#ff5a5a', { radius: 8, depth: 3 });
    ctx.save();
    ctx.translate(L.close.x + L.close.w / 2, L.close.y + (L.close.h - 3) / 2);
    ICONS.close(ctx, L.close.w * 0.22);
    ctx.restore();

    // o Hacker criança à esquerda, falando, com o Pato de Borracha no pé
    ctx.save();
    ctx.translate(c.x + 100, c.y + 232 + Math.sin(this.t * 2.2) * 3);
    ctx.scale(2.4, 2.4);
    drawCharacter(ctx, 'hacker', { t: this.t, face: 1, level: 0 });
    ctx.restore();
    ctx.save();
    ctx.translate(c.x + 160, c.y + 258);
    drawDuck(ctx, 15, { t: this.t });
    ctx.restore();

    text(ctx, 'Olá, podemos te chamar de', L.cx, c.y + 76, { size: 22, color: '#2a1840', stroke: null });
    // caixa do campo (o <input> fica em cima) + o "?" no fim
    ctx.save();
    ctx.translate(Math.sin(this.shake * 40) * 6 * this.shake, 0);
    rrect(ctx, L.field.x, L.field.y + 4, L.field.w, L.field.h, 14);
    ctx.fillStyle = 'rgba(42,24,64,0.18)';
    ctx.fill();
    rrect(ctx, L.field.x, L.field.y, L.field.w, L.field.h, 14);
    fillOutline(ctx, '#ffffff', 3);
    ctx.restore();
    text(ctx, '?', L.field.x + L.field.w + 18, L.field.y + L.field.h / 2 + 2, { size: 30, color: '#2a1840', stroke: null });
    const n = this.input.value.length;
    text(ctx, `${n}/${MAX_NAME}`, L.cx, L.field.y + L.field.h + 18, { size: 12, color: '#5d6680', stroke: null });

    const ready = this.name.length > 0;
    button(ctx, L.ok, ready ? '#3fd16b' : '#7d8aa8', { radius: 16, depth: 5 });
    text(ctx, 'CONFIRMAR', L.ok.x + L.ok.w / 2, L.ok.y + (L.ok.h - 5) / 2 + 1, { size: 24 });
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
    s.fontSize = `${22 * k}px`;
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

  // X da janela: fecha e a tela inicial volta na hora (sem transição)
  close() {
    this.app.sound.play('click');
    this.leave(() => {
      if (this.behind) this.app.scene = this.behind;
      else this.app.goTitle();
    });
  }

  pointerDown(x, y) {
    const L = this.layout();
    if (inRect(L.ok, x, y)) return this.confirm();
    if (inRect(L.close, x, y)) return this.close();
    this.input.focus(); // tocou em qualquer lugar: volta pro campo (teclado)
  }

  key(k) {
    if (k === 'Escape') this.close();
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
