import { VIEW_H, OUTLINE } from '../config.js';
import { rrect, fillOutline } from '../render/canvas.js';
import { iconButton, inRect } from '../render/widgets.js';
import { ICONS } from '../render/sprites.js';
import { drawImage } from '../render/images.js';
import { drawItemIcon } from '../render/consumables.js';
import { CONSUMABLES, COFFEE_PACKS } from '../data/consumables.js';
import { formatCoffee } from '../data/darknet.js';

/* ════════════════════════════════════════════════════════════
 *  LOJA DE CONSUMÍVEIS
 *  Um programa no monitor, igual ao catálogo: tela preta de terminal
 *  verde ("C:\DARKWEB\LOJA.EXE"). Cada item (data/consumables.js) é um
 *  "arquivo" à venda (> congelar_tudo.exe) pago com café; vai pro
 *  inventário e é usado na partida (aba de itens do painel). À direita, a
 *  pasta dos pacotes de café com dinheiro de verdade, ainda "EM BREVE"
 *  (falta o meio de pagamento: não vendem nem pedem nada).
 * ════════════════════════════════════════════════════════════ */

const MONO = '"Courier New", ui-monospace, Menlo, Consolas, monospace';
const GREEN = '#3dff9a';
const DIM = '#1f8a52';
const SCREEN = '#03130a';
const RED = '#ff5a6a';

// "Bitcoin Extra" → "bitcoin_extra.exe"
const fileName = (name) =>
  `${name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '_')}.exe`;

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

// Quebra em linhas pelo tamanho (fonte de máquina)
function monoWrap(ctx, str, x, y, maxW, size, color, maxLines = 2) {
  ctx.font = `${size}px ${MONO}`;
  const words = str.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = t;
  }
  if (line) lines.push(line);
  lines.slice(0, maxLines).forEach((l, i) => mono(ctx, l, x, y + i * (size + 4), size, color, 'left', false));
}

export class ShopScene {
  constructor(app) {
    this.app = app;
    this.t = 0;
    this.flash = {}; // brilho de compra por item (1 → 0)
    this.shake = {}; // linha treme quando falta café
  }

  layout() {
    const W = this.app.viewW;
    const mon = { x: 76, y: 14, w: W - 152, h: 470 };
    const scr = { x: mon.x + 22, y: mon.y + 20, w: mon.w - 44, h: mon.h - 76 };
    const side = Math.min(230, scr.w * 0.3); // pasta dos pacotes de café
    const top = scr.y + 52;
    const listW = scr.w - side - 42;
    const rowH = (scr.h - 66) / CONSUMABLES.length;
    const rows = CONSUMABLES.map((item, i) => {
      const y = top + i * rowH;
      const r = { item, x: scr.x + 14, y, w: listW, h: rowH - 8 };
      r.buy = { x: r.x + r.w - 150, y: y + r.h / 2 - 17, w: 140, h: 34 };
      return r;
    });
    const px = scr.x + scr.w - side - 14;
    const packH = (scr.h - 94) / COFFEE_PACKS.length;
    const packs = COFFEE_PACKS.map((p, i) => ({ pack: p, x: px, y: top + 28 + i * packH, w: side, h: packH - 10 }));
    return { back: { x: 10, y: 14, w: 56, h: 56 }, mon, scr, rows, packs, side: { x: px, y: top, w: side } };
  }

  update(dt) {
    this.t += dt;
    for (const k of Object.keys(this.flash)) this.flash[k] = Math.max(0, this.flash[k] - dt * 2);
    for (const k of Object.keys(this.shake)) this.shake[k] = Math.max(0, this.shake[k] - dt * 3);
  }

  render(ctx) {
    const W = this.app.viewW;
    const L = this.layout();
    // fundo: parede escura com o brilho verde vindo da tela
    const g = ctx.createRadialGradient(W / 2, 250, 60, W / 2, 250, W * 0.7);
    g.addColorStop(0, '#1d3a3a');
    g.addColorStop(1, '#0d1422');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, VIEW_H);
    this.drawMonitor(ctx, L);
    this.drawScreen(ctx, L);
    iconButton(ctx, L.back, '#5fb4ff', 'back');
  }

  // Monitor igual ao do catálogo (carcaça, pé e luz de ligado)
  drawMonitor(ctx, L) {
    const { mon, scr } = L;
    ctx.beginPath();
    ctx.moveTo(mon.x + mon.w / 2 - 70, mon.y + mon.h - 4);
    ctx.lineTo(mon.x + mon.w / 2 + 70, mon.y + mon.h - 4);
    ctx.lineTo(mon.x + mon.w / 2 + 110, VIEW_H - 12);
    ctx.lineTo(mon.x + mon.w / 2 - 110, VIEW_H - 12);
    ctx.closePath();
    fillOutline(ctx, '#9aa1b2', 3);
    rrect(ctx, mon.x, mon.y + 6, mon.w, mon.h, 28);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fill();
    rrect(ctx, mon.x, mon.y, mon.w, mon.h, 28);
    fillOutline(ctx, '#cfd3dc', 4);
    rrect(ctx, mon.x + 6, mon.y + 6, mon.w - 12, mon.h * 0.45, 24);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fill();
    rrect(ctx, scr.x - 8, scr.y - 8, scr.w + 16, scr.h + 16, 20);
    fillOutline(ctx, '#7e8597', 3);
    const by = scr.y + scr.h + 30;
    mono(ctx, 'FIREWALL OS', mon.x + 40, by, 15, '#6b7283');
    const on = 0.6 + Math.sin(this.t * 3) * 0.4;
    ctx.beginPath();
    ctx.arc(mon.x + mon.w - 46, by, 6, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(61,255,154,${on})`;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
  }

  drawScreen(ctx, L) {
    const { scr } = L;
    ctx.save();
    rrect(ctx, scr.x, scr.y, scr.w, scr.h, 14);
    ctx.clip();
    ctx.fillStyle = SCREEN;
    ctx.fillRect(scr.x, scr.y, scr.w, scr.h);
    // barra de título da janela, com o saldo de cafés
    ctx.fillStyle = '#0c3a22';
    ctx.fillRect(scr.x, scr.y, scr.w, 32);
    mono(ctx, 'C:\\DARKWEB\\LOJA.EXE', scr.x + 14, scr.y + 17, 15, GREEN);
    const bal = `SALDO: ${formatCoffee(this.app.coffee)}`;
    mono(ctx, bal, scr.x + scr.w - 40, scr.y + 17, 14, GREEN, 'right');
    ctx.save();
    ctx.translate(scr.x + scr.w - 24, scr.y + 16);
    ICONS.coffee(ctx, 9);
    ctx.restore();

    for (const r of L.rows) this.drawRow(ctx, r);
    this.drawPacks(ctx, L);

    // efeito CRT: linhas de varredura, faixa passando e vinheta
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    for (let y = scr.y; y < scr.y + scr.h; y += 3) ctx.fillRect(scr.x, y, scr.w, 1);
    const band = scr.y + ((this.t * 60) % (scr.h + 80)) - 40;
    const bg = ctx.createLinearGradient(0, band - 40, 0, band + 40);
    bg.addColorStop(0, 'rgba(61,255,154,0)');
    bg.addColorStop(0.5, 'rgba(61,255,154,0.05)');
    bg.addColorStop(1, 'rgba(61,255,154,0)');
    ctx.fillStyle = bg;
    ctx.fillRect(scr.x, band - 40, scr.w, 80);
    const v = ctx.createRadialGradient(scr.x + scr.w / 2, scr.y + scr.h / 2, scr.h * 0.35, scr.x + scr.w / 2, scr.y + scr.h / 2, scr.w * 0.65);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = v;
    ctx.fillRect(scr.x, scr.y, scr.w, scr.h);
    ctx.restore();
  }

  // Um item à venda: "> arquivo.exe", o que faz, quantos tem e [ COMPRAR ]
  drawRow(ctx, r) {
    const { item } = r;
    const have = this.app.inventory[item.id] ?? 0;
    const can = this.app.coffee >= item.cost;
    const sh = this.shake[item.id] ?? 0;
    const fl = this.flash[item.id] ?? 0;
    ctx.save();
    ctx.translate(Math.sin(sh * 40) * 5 * sh, 0);
    // moldura da linha (acende quando compra)
    ctx.strokeStyle = fl > 0 ? GREEN : DIM;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
    if (fl > 0) {
      ctx.fillStyle = `rgba(61,255,154,${0.15 * fl})`;
      ctx.fillRect(r.x, r.y, r.w, r.h);
    }
    // desenho do item
    ctx.save();
    ctx.translate(r.x + 34, r.y + r.h / 2);
    drawItemIcon(ctx, item.id, 18, this.t);
    ctx.restore();
    const tx = r.x + 66;
    mono(ctx, `> ${fileName(item.name)}`, tx, r.y + 16, 15, GREEN);
    monoWrap(ctx, item.desc, tx, r.y + 36, r.buy.x - tx - 14, 11, '#9fe8c0', 2);
    mono(ctx, `INV: ${have}`, r.buy.x - 12, r.y + r.h - 12, 11, have ? GREEN : DIM, 'right');
    // [ COMPRAR  N ☕ ]: cheio quando dá pra pagar, só o contorno quando falta café
    const b = r.buy;
    if (can) {
      ctx.fillStyle = GREEN;
      ctx.fillRect(b.x, b.y, b.w, b.h);
    } else {
      ctx.strokeStyle = sh > 0 ? RED : DIM;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
    }
    const ink = can ? SCREEN : sh > 0 ? RED : DIM;
    ctx.shadowBlur = 0;
    ctx.font = `bold 14px ${MONO}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = ink;
    ctx.fillText(`[COMPRAR ${item.cost}`, b.x + 10, b.y + b.h / 2 + 1);
    const cw = ctx.measureText(`[COMPRAR ${item.cost}`).width;
    ctx.save();
    ctx.translate(b.x + 10 + cw + 12, b.y + b.h / 2);
    ICONS.coffee(ctx, 8);
    ctx.restore();
    ctx.fillStyle = ink;
    ctx.fillText(']', b.x + 10 + cw + 22, b.y + b.h / 2 + 1);
    ctx.restore();
  }

  // Pasta dos pacotes de café (dinheiro de verdade): ainda "EM BREVE"
  drawPacks(ctx, L) {
    const s = L.side;
    mono(ctx, '> pacotes_cafe/', s.x, s.y + 8, 15, GREEN);
    for (const p of L.packs) {
      const { pack } = p;
      ctx.strokeStyle = DIM;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(p.x + 0.5, p.y + 0.5, p.w - 1, p.h - 1);
      ctx.setLineDash([]);
      ctx.save();
      ctx.translate(p.x + 36, p.y + p.h / 2);
      if (!drawImage(ctx, pack.sprite, Math.min(60, p.h - 8))) ICONS.coffee(ctx, 16);
      ctx.restore();
      mono(ctx, `+${pack.coffee} CAFÉS`, p.x + 74, p.y + p.h / 2 - 14, 15, GREEN);
      mono(ctx, pack.price, p.x + 74, p.y + p.h / 2 + 4, 12, '#9fe8c0', 'left', false);
      // pisca como cursor: ainda não vende
      if (Math.sin(this.t * 4) > -0.3) mono(ctx, '[EM BREVE]', p.x + 74, p.y + p.h / 2 + 22, 11, DIM);
    }
  }

  pointerDown(x, y) {
    const L = this.layout();
    if (inRect(L.back, x, y)) {
      this.app.sound.play('click');
      this.app.goMaps();
      return;
    }
    for (const r of L.rows) {
      if (!inRect(r.buy, x, y)) continue;
      if (this.app.buyConsumable(r.item.id)) {
        this.flash[r.item.id] = 1;
        this.app.sound.play('upgrade');
      } else {
        this.shake[r.item.id] = 1;
        this.app.sound.play('error');
      }
      return;
    }
    // pacote de café: ainda não vende (só avisa)
    if (L.packs.some((p) => inRect(p, x, y))) this.app.sound.play('error');
  }

  key(k) {
    if (k === 'Escape') this.app.goMaps();
  }
}
