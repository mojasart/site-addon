import { VIEW_H } from '../config.js';
import { rrect, fillOutline } from '../render/canvas.js';
import { inRect } from '../render/widgets.js';
import { drawCharacter } from '../render/characters.js';
import { drawDuck } from '../render/duck.js';
import { easeOutBack } from '../util.js';

/* ════════════════════════════════════════════════════════════
 *  NOME DO JOGADOR
 *  Depois do JOGAR (só enquanto não tem nome salvo): uma janelinha de
 *  terminal hacker (fósforo verde, como a loja e o catálogo) abre por cima
 *  da tela inicial, entrando com o pulinho dos anúncios do Adware, e o
 *  Hacker pergunta "Olá, podemos te chamar de ___?". O X
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

const BAR = 34; // barra de título da janela

// Terminal (mesmas cores da loja e do catálogo)
const MONO = '"Courier New", ui-monospace, Menlo, Consolas, monospace';
const GREEN = '#3dff9a';
const DIM = '#1f8a52';
const SCREEN = '#03130a';
const RED = '#ff5a6a';

// Texto de terminal: fonte de máquina com brilho de fósforo
function mono(ctx, str, x, y, size, color, align = 'left', bold = true) {
  ctx.font = `${bold ? 'bold ' : ''}${size}px ${MONO}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 6;
  ctx.fillText(str, x, y);
  ctx.shadowBlur = 0;
}

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
      close: { x: card.x + card.w - 34, y: card.y + 5, w: 26, h: 24 },
      field: { x: cx - 150, y: card.y + 108, w: 300, h: 50 },
      ok: { x: cx - 120, y: card.y + 206, w: 240, h: 54 },
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
    // sombra + moldura escura com borda de fósforo
    rrect(ctx, c.x, c.y + 6, c.w, c.h, 12);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fill();
    rrect(ctx, c.x - 4, c.y - 4, c.w + 8, c.h + 8, 14);
    fillOutline(ctx, '#0a1f14', 4);
    ctx.save();
    rrect(ctx, c.x, c.y, c.w, c.h, 10);
    ctx.clip();
    ctx.fillStyle = SCREEN;
    ctx.fillRect(c.x, c.y, c.w, c.h);
    // barra de título com o "programa" e o [X]
    ctx.fillStyle = '#0c3a22';
    ctx.fillRect(c.x, c.y, c.w, BAR);
    mono(ctx, 'C:\\FIREWALL\\NOVO_USUARIO.EXE', c.x + 14, c.y + BAR / 2 + 1, 15, GREEN);
    const x = L.close;
    ctx.strokeStyle = RED;
    ctx.lineWidth = 2;
    ctx.strokeRect(x.x + 1, x.y + 1, x.w - 2, x.h - 2);
    mono(ctx, 'X', x.x + x.w / 2, x.y + x.h / 2 + 1, 17, RED, 'center');

    // o Hacker criança à esquerda, num brilho verde, com o Pato de Borracha
    const glow = ctx.createRadialGradient(c.x + 105, c.y + 190, 10, c.x + 105, c.y + 190, 110);
    glow.addColorStop(0, 'rgba(61,255,154,0.16)');
    glow.addColorStop(1, 'rgba(61,255,154,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(c.x, c.y + BAR, 220, c.h - BAR);
    ctx.save();
    ctx.translate(c.x + 100, c.y + 232 + Math.sin(this.t * 2.2) * 3);
    ctx.scale(2.4, 2.4);
    drawCharacter(ctx, 'hacker', { t: this.t, face: 1, level: 0 });
    ctx.restore();
    ctx.save();
    ctx.translate(c.x + 160, c.y + 258);
    drawDuck(ctx, 15, { t: this.t });
    ctx.restore();

    // a pergunta como saída de terminal
    const lx = L.field.x;
    mono(ctx, '> novo usuário detectado...', lx, c.y + 58, 12, DIM, 'left', false);
    mono(ctx, '> Olá, podemos te chamar de', lx, c.y + 82, 18, GREEN);
    // campo (o <input> fica em cima) + o "?" no fim; treme vermelho se vazio
    ctx.save();
    ctx.translate(Math.sin(this.shake * 40) * 6 * this.shake, 0);
    ctx.fillStyle = 'rgba(61,255,154,0.06)';
    ctx.fillRect(L.field.x, L.field.y, L.field.w, L.field.h);
    ctx.strokeStyle = this.shake > 0 ? RED : GREEN;
    ctx.lineWidth = 2;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 8;
    ctx.strokeRect(L.field.x + 1, L.field.y + 1, L.field.w - 2, L.field.h - 2);
    ctx.shadowBlur = 0;
    ctx.restore();
    mono(ctx, '?', L.field.x + L.field.w + 18, L.field.y + L.field.h / 2 + 1, 28, GREEN, 'center');
    const n = this.input.value.length;
    mono(ctx, `${n}/${MAX_NAME}`, L.field.x + L.field.w, L.field.y + L.field.h + 14, 12, DIM, 'right', false);

    // [ CONFIRMAR ]: cheio quando já tem nome, só o contorno quando vazio
    const ok = L.ok;
    const ready = this.name.length > 0;
    if (ready) {
      ctx.fillStyle = GREEN;
      ctx.shadowColor = GREEN;
      ctx.shadowBlur = 10;
      ctx.fillRect(ok.x, ok.y, ok.w, ok.h);
      ctx.shadowBlur = 0;
    } else {
      ctx.strokeStyle = DIM;
      ctx.lineWidth = 2;
      ctx.strokeRect(ok.x + 1, ok.y + 1, ok.w - 2, ok.h - 2);
    }
    ctx.font = `bold 22px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = ready ? SCREEN : DIM;
    ctx.fillText('[ CONFIRMAR ]', ok.x + ok.w / 2, ok.y + ok.h / 2 + 1);

    // efeito CRT: linhas de varredura, faixa passando e vinheta
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    for (let y = c.y; y < c.y + c.h; y += 3) ctx.fillRect(c.x, y, c.w, 1);
    const band = c.y + ((this.t * 60) % (c.h + 80)) - 40;
    const bg = ctx.createLinearGradient(0, band - 40, 0, band + 40);
    bg.addColorStop(0, 'rgba(61,255,154,0)');
    bg.addColorStop(0.5, 'rgba(61,255,154,0.05)');
    bg.addColorStop(1, 'rgba(61,255,154,0)');
    ctx.fillStyle = bg;
    ctx.fillRect(c.x, band - 40, c.w, 80);
    const v = ctx.createRadialGradient(c.x + c.w / 2, c.y + c.h / 2, c.h * 0.4, c.x + c.w / 2, c.y + c.h / 2, c.w * 0.62);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = v;
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.restore();
    // borda de fósforo por cima de tudo
    rrect(ctx, c.x, c.y, c.w, c.h, 10);
    ctx.strokeStyle = GREEN;
    ctx.lineWidth = 2;
    ctx.shadowColor = GREEN;
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;
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
    color: GREEN,
    textAlign: 'left',
    fontFamily: MONO,
    fontWeight: 'bold',
    textShadow: `0 0 6px ${GREEN}`,
    caretColor: GREEN,
    padding: '0',
  });
  document.body.appendChild(el);
  return el;
}
