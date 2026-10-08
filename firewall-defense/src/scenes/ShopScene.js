import { VIEW_H, GOLD } from '../config.js';
import { rrect, fillOutline, text, setFont, button } from '../render/canvas.js';
import { iconButton, inRect } from '../render/widgets.js';
import { ICONS } from '../render/sprites.js';
import { drawImage } from '../render/images.js';
import { wrapText } from '../render/ui.js';
import { drawItemIcon } from '../render/consumables.js';
import { CONSUMABLES, COFFEE_PACKS } from '../data/consumables.js';
import { formatCoffee } from '../data/darknet.js';

/* ════════════════════════════════════════════════════════════
 *  LOJA DE CONSUMÍVEIS
 *  Itens pagos com café (data/consumables.js) que vão pro inventário e
 *  são usados na partida (aba de itens do painel). À direita, os pacotes
 *  de café com dinheiro de verdade aparecem como "EM BREVE": ainda não
 *  vendem nem pedem nada (falta o meio de pagamento).
 * ════════════════════════════════════════════════════════════ */

const BG = ['#141a3a', '#0b0f24'];
const COFFEE_TXT = '#ffe0b0';

export class ShopScene {
  constructor(app) {
    this.app = app;
    this.t = 0;
    this.flash = {}; // brilho de compra por item (1 → 0)
    this.shake = {}; // card treme quando falta café
  }

  layout() {
    const W = this.app.viewW;
    const side = Math.min(250, W * 0.27); // coluna dos pacotes de café
    const gx = 24;
    const gw = W - side - gx - 40;
    const cw = (gw - 16) / 2;
    const ch = 176;
    const cards = CONSUMABLES.map((item, i) => {
      const x = gx + (i % 2) * (cw + 16);
      const y = 124 + Math.floor(i / 2) * (ch + 14);
      return { item, x, y, w: cw, h: ch, buy: { x: x + 14, y: y + ch - 50, w: cw - 28, h: 40 } };
    });
    const px = W - side - 20;
    const packs = COFFEE_PACKS.map((p, i) => ({ pack: p, x: px, y: 152 + i * 104, w: side, h: 92 }));
    return { back: { x: 18, y: 16, w: 56, h: 56 }, cards, packs, side: { x: px, w: side } };
  }

  update(dt) {
    this.t += dt;
    for (const k of Object.keys(this.flash)) this.flash[k] = Math.max(0, this.flash[k] - dt * 2);
    for (const k of Object.keys(this.shake)) this.shake[k] = Math.max(0, this.shake[k] - dt * 3);
  }

  render(ctx) {
    const W = this.app.viewW;
    const L = this.layout();
    const bg = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    bg.addColorStop(0, BG[0]);
    bg.addColorStop(1, BG[1]);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, VIEW_H);
    // vitrine: listras de luz bem fracas
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = '#ffffff';
    for (let x = -VIEW_H; x < W; x += 70) {
      ctx.beginPath();
      ctx.moveTo(x, VIEW_H);
      ctx.lineTo(x + VIEW_H, 0);
      ctx.lineTo(x + VIEW_H + 26, 0);
      ctx.lineTo(x + 26, VIEW_H);
      ctx.fill();
    }
    ctx.restore();

    text(ctx, 'LOJA', W / 2, 46, { size: 46, color: GOLD, strokeWidth: 10 });
    coffeeLabel(ctx, formatCoffee(this.app.coffee), W / 2, 92, 24, COFFEE_TXT);
    iconButton(ctx, L.back, '#5fb4ff', 'back');

    for (const c of L.cards) this.drawCard(ctx, c);

    // pacotes de café (dinheiro de verdade): em breve
    text(ctx, 'PACOTES DE CAFÉ', L.side.x + L.side.w / 2, 132, { size: 16, color: COFFEE_TXT });
    for (const p of L.packs) this.drawPack(ctx, p);
  }

  drawCard(ctx, c) {
    const { item } = c;
    const have = this.app.inventory[item.id] ?? 0;
    const can = this.app.coffee >= item.cost;
    const sh = this.shake[item.id] ?? 0;
    const fl = this.flash[item.id] ?? 0;
    ctx.save();
    ctx.translate(Math.sin(sh * 40) * 5 * sh, 0);
    rrect(ctx, c.x, c.y + 5, c.w, c.h, 16);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fill();
    rrect(ctx, c.x, c.y, c.w, c.h, 16);
    fillOutline(ctx, '#1d2552', 3);
    rrect(ctx, c.x + 3, c.y + 3, c.w - 6, c.h - 6, 13);
    ctx.lineWidth = 2;
    ctx.strokeStyle = item.color;
    ctx.globalAlpha = 0.6 + fl * 0.4;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // desenho à esquerda, nome e texto à direita
    ctx.save();
    ctx.translate(c.x + 46, c.y + 56 - fl * 8);
    drawItemIcon(ctx, item.id, 24, this.t);
    ctx.restore();
    const tx = c.x + 90;
    text(ctx, item.name.toUpperCase(), tx, c.y + 26, { size: 17, align: 'left', color: item.color });
    wrapText(ctx, item.desc, tx + (c.w - 104) / 2, c.y + 50, c.w - 104, 12, '#d8e6ff', 3);
    text(ctx, `NO INVENTÁRIO: ${have}`, c.x + c.w / 2, c.y + c.h - 64, { size: 12, color: have ? '#3dff9a' : '#8d9bc4', stroke: null });

    // botão de comprar: o preço em cafés
    const b = c.buy;
    button(ctx, b, can ? '#3fd16b' : '#5d5675', { radius: 12, depth: 4 });
    coffeeLabel(ctx, `${item.cost}`, b.x + b.w / 2, b.y + (b.h - 4) / 2 + 1, 20, '#ffffff');
    ctx.restore();
  }

  drawPack(ctx, p) {
    const { pack } = p;
    rrect(ctx, p.x, p.y + 4, p.w, p.h, 14);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fill();
    rrect(ctx, p.x, p.y, p.w, p.h, 14);
    fillOutline(ctx, '#2a2148', 3);
    // desenho do pacote (grãos, xícara ou saco); sem a sprite, o ícone de café
    ctx.save();
    ctx.translate(p.x + 34, p.y + 44);
    if (!drawImage(ctx, pack.sprite, 58)) ICONS.coffee(ctx, 18);
    ctx.restore();
    text(ctx, `+${pack.coffee} CAFÉS`, p.x + 66, p.y + 30, { size: 19, align: 'left', color: COFFEE_TXT });
    text(ctx, pack.price, p.x + 66, p.y + 54, { size: 15, align: 'left', color: '#bcd0f5', stroke: null });
    // ainda não vende: etiqueta "EM BREVE"
    rrect(ctx, p.x + p.w - 96, p.y + p.h - 34, 84, 24, 10);
    fillOutline(ctx, '#5d6680', 2);
    text(ctx, 'EM BREVE', p.x + p.w - 54, p.y + p.h - 21, { size: 12 });
  }

  pointerDown(x, y) {
    const L = this.layout();
    if (inRect(L.back, x, y)) {
      this.app.sound.play('click');
      this.app.goMaps();
      return;
    }
    for (const c of L.cards) {
      if (!inRect(c.buy, x, y)) continue;
      if (this.app.buyConsumable(c.item.id)) {
        this.flash[c.item.id] = 1;
        this.app.sound.play('upgrade');
      } else {
        this.shake[c.item.id] = 1;
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

// Ícone do café + valor, centralizados em x
function coffeeLabel(ctx, value, x, y, size, color) {
  setFont(ctx, size);
  const icon = size * 1.2;
  const x0 = x - (icon + ctx.measureText(value).width) / 2;
  ctx.save();
  ctx.translate(x0 + size * 0.5, y - 2);
  ICONS.coffee(ctx, size * 0.48);
  ctx.restore();
  text(ctx, value, x0 + icon, y, { size, color, align: 'left' });
}
