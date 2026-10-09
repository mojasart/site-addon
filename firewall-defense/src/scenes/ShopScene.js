import { VIEW_H, OUTLINE } from '../config.js';
import { rrect, fillOutline } from '../render/canvas.js';
import { iconButton, inRect } from '../render/widgets.js';
import { ICONS } from '../render/sprites.js';
import { drawImage } from '../render/images.js';
import { drawItemIcon } from '../render/consumables.js';
import { CONSUMABLES, COFFEE_PACKS, ITEM, VIP } from '../data/consumables.js';
import { drawBolt } from '../render/energy.js';
import { formatCoffee } from '../data/darknet.js';

/* ════════════════════════════════════════════════════════════
 *  LOJA DE CONSUMÍVEIS
 *  Um programa no monitor, igual ao catálogo: tela preta de terminal
 *  verde ("C:\DARKWEB\LOJA.EXE"). Cada item (data/consumables.js) é um
 *  "arquivo" à venda (> congelar_tudo.exe) pago com café; vai pro
 *  inventário e é usado na partida (aba de itens do painel). À direita, o
 *  brinde do dia (1 item de graça por dia assistindo um anúncio: app.js
 *  freeOffer) e a pasta dos pacotes de café com dinheiro de verdade, ainda
 *  "EM BREVE" (falta o meio de pagamento: não vendem nem pedem nada).
 * ════════════════════════════════════════════════════════════ */

const MONO = '"Courier New", ui-monospace, Menlo, Consolas, monospace';
const GREEN = '#3dff9a';
const DIM = '#1f8a52';
const SCREEN = '#03130a';
const RED = '#ff5a6a';
const VIP_GOLD = '#ffd23f';

// "Bitcoin Extra" → "bitcoin_extra.exe"
const fileName = (name) =>
  `${name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '_')}.exe`;

// hh:mm:ss
const clock = (ms) => {
  const t = Math.max(0, Math.ceil(ms / 1000));
  const p = (n) => String(n).padStart(2, '0');
  return `${p(Math.floor(t / 3600))}:${p(Math.floor((t % 3600) / 60))}:${p(t % 60)}`;
};

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
    // brinde do dia em cima; os pacotes de café (ainda "em breve") embaixo, compactos
    const free = { x: px, y: top + 24, w: side, h: 100 };
    free.btn = { x: free.x + 10, y: free.y + free.h - 42, w: free.w - 20, h: 32 };
    // pacotes e, no fim da pasta, o modo VIP (mesmo tamanho de linha)
    const packTop = free.y + free.h + 34;
    const packH = (scr.y + scr.h - 12 - packTop) / (COFFEE_PACKS.length + 1);
    const packs = COFFEE_PACKS.map((p, i) => ({ pack: p, x: px, y: packTop + i * packH, w: side, h: packH - 8 }));
    const vip = { x: px, y: packTop + COFFEE_PACKS.length * packH, w: side, h: packH - 8 };
    return { back: { x: 10, y: 14, w: 56, h: 56 }, mon, scr, rows, packs, vip, free, side: { x: px, y: packTop - 20, w: side } };
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
    this.drawFree(ctx, L);
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

  // Brinde do dia: 1 item de graça assistindo um anúncio; depois de pego,
  // o tempo até o próximo (meia-noite)
  drawFree(ctx, L) {
    const f = L.free;
    const offer = this.app.freeOffer;
    const item = ITEM[offer.id];
    const fl = this.flash.free ?? 0;
    mono(ctx, '> brinde_do_dia/', f.x, f.y - 16, 15, GREEN);
    // moldura pulsando enquanto o brinde está esperando
    const glow = offer.claimed ? 0 : 0.5 + Math.sin(this.t * 4) * 0.5;
    ctx.fillStyle = `rgba(61,255,154,${0.04 + 0.06 * glow + 0.2 * fl})`;
    ctx.fillRect(f.x, f.y, f.w, f.h);
    ctx.strokeStyle = offer.claimed ? DIM : GREEN;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = GREEN;
    ctx.shadowBlur = 8 * glow;
    ctx.strokeRect(f.x + 0.5, f.y + 0.5, f.w - 1, f.h - 1);
    ctx.shadowBlur = 0;
    ctx.save();
    ctx.translate(f.x + 34, f.y + 38);
    drawItemIcon(ctx, item.id, 18, this.t);
    ctx.restore();
    mono(ctx, fileName(item.name), f.x + 62, f.y + 28, 13, GREEN);
    mono(ctx, offer.claimed ? 'PEGO HOJE' : 'GRÁTIS', f.x + 62, f.y + 48, 13, offer.claimed ? DIM : '#ffd23f');
    const b = f.btn;
    ctx.font = `bold 13px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (!offer.claimed) {
      // [ASSISTIR ANÚNCIO]: cheio, como o botão de comprar
      ctx.fillStyle = GREEN;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = SCREEN;
      ctx.fillText('[ASSISTIR ANÚNCIO]', b.x + b.w / 2, b.y + b.h / 2 + 1);
    } else {
      ctx.strokeStyle = DIM;
      ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
      ctx.fillStyle = DIM;
      ctx.fillText(`PRÓXIMO EM ${clock(this.app.freeOfferNextMs())}`, b.x + b.w / 2, b.y + b.h / 2 + 1);
    }
  }

  // Pasta dos pacotes de café (dinheiro de verdade): ainda "EM BREVE"
  drawPacks(ctx, L) {
    const s = L.side;
    mono(ctx, '> pacotes_cafe/', s.x, s.y + 8, 15, GREEN);
    // pisca como cursor: ainda não vende
    if (Math.sin(this.t * 4) > -0.3) mono(ctx, '[EM BREVE]', s.x + s.w, s.y + 8, 11, DIM, 'right');
    for (const p of L.packs) {
      const { pack } = p;
      ctx.strokeStyle = DIM;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(p.x + 0.5, p.y + 0.5, p.w - 1, p.h - 1);
      ctx.setLineDash([]);
      ctx.save();
      ctx.translate(p.x + 28, p.y + p.h / 2);
      if (!drawImage(ctx, pack.sprite, Math.min(44, p.h - 4))) ICONS.coffee(ctx, 13);
      ctx.restore();
      mono(ctx, `+${pack.coffee} CAFÉS`, p.x + 56, p.y + p.h / 2 - 8, 14, GREEN);
      mono(ctx, pack.price, p.x + 56, p.y + p.h / 2 + 9, 11, '#9fe8c0', 'left', false);
    }
    this.drawVip(ctx, L.vip);
  }

  // Modo VIP: moldura dourada brilhando. Selo do VIP com um saquinho de café
  // na frente; em cima "+100 [café] [energia]∞", embaixo o preço (no mesmo
  // lugar dos pacotes); com o VIP ativo, [ATIVO]
  drawVip(ctx, v) {
    const on = this.app.vip;
    const fl = this.flash.vip ?? 0;
    const glow = 0.5 + Math.sin(this.t * 3) * 0.5;
    ctx.fillStyle = `rgba(255,210,63,${0.06 + 0.05 * glow + 0.25 * fl})`;
    ctx.fillRect(v.x, v.y, v.w, v.h);
    ctx.strokeStyle = VIP_GOLD;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = VIP_GOLD;
    ctx.shadowBlur = 4 + 8 * glow;
    ctx.strokeRect(v.x + 0.5, v.y + 0.5, v.w - 1, v.h - 1);
    ctx.shadowBlur = 0;
    const cy = v.y + v.h / 2;
    ctx.save();
    ctx.translate(v.x + 26, cy - 2);
    // selo do VIP (assets/sprites/vip.png); sem ele, o raio
    if (!drawImage(ctx, 'vip', Math.min(42, v.h + 2))) drawBolt(ctx, Math.min(14, v.h / 2 - 3));
    // saquinho de café na frente, embaixo à direita do selo
    drawImage(ctx, 'coffee_sack', 22, 13, 9);
    ctx.restore();
    // linha de cima: +100 [café] [energia]∞
    const ty = cy - 8;
    let x = v.x + 56;
    mono(ctx, `+${VIP.coffee}`, x, ty, 14, VIP_GOLD);
    ctx.font = `bold 14px ${MONO}`;
    x += ctx.measureText(`+${VIP.coffee}`).width + 11;
    if (!drawImage(ctx, 'coffee_cup', 20, x, ty)) {
      ctx.save();
      ctx.translate(x, ty);
      ICONS.coffee(ctx, 7);
      ctx.restore();
    }
    x += 22;
    ctx.save();
    ctx.translate(x, ty);
    drawBolt(ctx, 8);
    ctx.restore();
    if (!drawImage(ctx, 'icon_infinity', 22, x + 17, ty)) mono(ctx, '∞', x + 10, ty, 14, VIP_GOLD);
    // linha de baixo: o preço (ou [ATIVO])
    mono(ctx, on ? '[ATIVO]' : VIP.price, v.x + 56, cy + 9, 11, '#ffe9a0', 'left', on);
  }

  // o anúncio do brinde acabou (app.energyTap): brilho no quadro
  rewarded() {
    this.flash.free = 1;
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
    // brinde do dia: abre o anúncio (já pego hoje: só avisa)
    if (inRect(L.free.btn, x, y)) {
      this.app.sound.play(this.app.watchAdForFree() ? 'click' : 'error');
      return;
    }
    // VIP: ainda não vende (no modo debug ativa, pra testar)
    if (inRect(L.vip, x, y)) {
      if (this.app.debug && this.app.grantVip()) {
        this.flash.vip = 1;
        this.app.sound.play('upgrade');
      } else this.app.sound.play('error');
      return;
    }
    // pacote de café: ainda não vende (só avisa)
    if (L.packs.some((p) => inRect(p, x, y))) this.app.sound.play('error');
  }

  key(k) {
    if (k === 'Escape') this.app.goMaps();
  }
}
