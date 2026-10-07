import { VIEW_H } from '../config.js';
import { rrect, fillOutline, text, setFont, button } from '../render/canvas.js';
import { iconButton, inRect } from '../render/widgets.js';
import { ICONS } from '../render/sprites.js';
import { drawCharacter } from '../render/characters.js';
import { TREE, NODE } from '../data/darknet.js';

/* ════════════════════════════════════════════════════════════
 *  DARK NET: a árvore de upgrades paga com cafés
 *  Um nó central (Acesso Root) liga os 6 ramos, um por defesa. Tocar num
 *  nó mostra o upgrade no terminal à direita; o botão compra (cafés saem
 *  do saldo e o bônus vale em todas as fases). De cada ramo sai um traço
 *  apagado com "?": é por onde a árvore vai crescer nas próximas fases.
 *  Libera com DARKNET_STARS estrelas (data/darknet.js).
 * ════════════════════════════════════════════════════════════ */

const MONO = '"Courier New", ui-monospace, Menlo, Consolas, monospace';
const PURPLE = '#b77bff';
const GREEN = '#3dff9a';
const COFFEE_TXT = '#ffe0b0';
const CHARS = '01₿#$%<>/{}';
const COLS = 64;
const RADIUS = 150; // distância do centro da árvore até os ramos
const BRANCH_ORDER = ['hacker', 'firewall', 'pinguim', 'scanner', 'minerador', 'honeypot'];

export class DarkNetScene {
  constructor(app) {
    this.app = app;
    this.t = 0;
    this.sel = 'root';
    this.flash = {}; // brilho de compra por nó (1 → 0)
    this.shake = 0; // painel treme quando não dá pra comprar
    // cada coluna da chuva tem sua velocidade e seu ponto de partida
    this.rain = Array.from({ length: COLS }, (_, i) => ({ speed: 60 + ((i * 37) % 90), start: (i * 131) % 700 }));
  }

  layout() {
    const W = this.app.viewW;
    const panel = { x: W - 330, y: 128, w: 300, h: 330 };
    const cx = (panel.x - 20) / 2 + 10; // centro da árvore: no meio do espaço à esquerda do painel
    const cy = 300;
    const nodes = { root: { x: cx, y: cy, r: 40 } };
    BRANCH_ORDER.forEach((id, i) => {
      const a = -Math.PI / 2 + (i * Math.PI * 2) / BRANCH_ORDER.length;
      nodes[id] = { x: cx + Math.cos(a) * RADIUS, y: cy + Math.sin(a) * RADIUS, r: 32, a };
    });
    return {
      back: { x: 18, y: 16, w: 56, h: 56 },
      panel,
      buy: { x: panel.x + 24, y: panel.y + panel.h - 74, w: panel.w - 48, h: 54 },
      nodes,
    };
  }

  update(dt) {
    this.t += dt;
    for (const k of Object.keys(this.flash)) this.flash[k] = Math.max(0, this.flash[k] - dt * 1.6);
    this.shake = Math.max(0, this.shake - dt * 3);
  }

  // estado do nó: 'owned' (comprado), 'open' (dá pra comprar se tiver café), 'locked'
  state(id) {
    const n = NODE[id];
    if (this.app.perks[id]) return 'owned';
    return !n.parent || this.app.perks[n.parent] ? 'open' : 'locked';
  }

  render(ctx) {
    const W = this.app.viewW;
    const t = this.t;
    const L = this.layout();
    ctx.fillStyle = '#07020f';
    ctx.fillRect(0, 0, W, VIEW_H);
    this.drawRain(ctx, W, t);
    const vig = ctx.createRadialGradient(W / 2, VIEW_H / 2, 120, W / 2, VIEW_H / 2, W * 0.65);
    vig.addColorStop(0, 'rgba(7,2,15,0)');
    vig.addColorStop(1, 'rgba(7,2,15,0.9)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, VIEW_H);

    text(ctx, 'DARK NET', W / 2, 46, { size: 46, color: PURPLE, strokeWidth: 10 });
    this.drawCoffee(ctx, W / 2, 92);

    this.drawLinks(ctx, L, t);
    for (const n of TREE) this.drawNode(ctx, n, L.nodes[n.id], t);
    this.drawPanel(ctx, L);
    iconButton(ctx, L.back, '#5fb4ff', 'back');
  }

  // saldo de cafés (ícone + número, sem fundo), centralizado em x
  drawCoffee(ctx, x, y) {
    const n = this.app.coffee;
    const label = `${fmt(n)} ${n === 1 ? 'CAFÉ' : 'CAFÉS'}`;
    setFont(ctx, 24);
    const lw = ctx.measureText(label).width;
    const x0 = x - (lw + 32) / 2;
    ctx.save();
    ctx.translate(x0 + 12, y - 2);
    ICONS.coffee(ctx, 11);
    ctx.restore();
    text(ctx, label, x0 + 32, y, { size: 24, color: COFFEE_TXT, align: 'left' });
  }

  // Ligações: centro → ramos (verde e com dados correndo quando o ramo é
  // comprado) e, de cada ramo, um traço apagado pra fora com "?" (próxima fase)
  drawLinks(ctx, L, t) {
    const root = L.nodes.root;
    ctx.lineCap = 'round';
    for (const id of BRANCH_ORDER) {
      const p = L.nodes[id];
      const owned = this.state(id) === 'owned';
      const lit = owned || this.state(id) === 'open';
      ctx.lineWidth = owned ? 5 : 3;
      ctx.strokeStyle = owned ? GREEN : lit ? 'rgba(183,123,255,0.7)' : 'rgba(110,80,160,0.35)';
      ctx.shadowColor = owned ? GREEN : PURPLE;
      ctx.shadowBlur = owned || lit ? 10 * this.app.pixelScale : 0;
      ctx.beginPath();
      ctx.moveTo(root.x, root.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ctx.shadowBlur = 0;
      if (owned) {
        // pacotinhos de dados indo do centro pro ramo
        for (let k = 0; k < 2; k++) {
          const f = (t * 0.7 + k / 2) % 1;
          ctx.beginPath();
          ctx.arc(root.x + (p.x - root.x) * f, root.y + (p.y - root.y) * f, 3, 0, Math.PI * 2);
          ctx.fillStyle = '#d6ffe9';
          ctx.fill();
        }
      }
      // próxima fase: traço tracejado pra fora + "?"
      const ox = p.x + Math.cos(p.a) * 62;
      const oy = p.y + Math.sin(p.a) * 62;
      ctx.setLineDash([4, 6]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(183,123,255,0.25)';
      ctx.beginPath();
      ctx.moveTo(p.x + Math.cos(p.a) * (p.r + 4), p.y + Math.sin(p.a) * (p.r + 4));
      ctx.lineTo(ox, oy);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(ox, oy, 11, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(30,12,55,0.85)';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(183,123,255,0.35)';
      ctx.stroke();
      text(ctx, '?', ox, oy + 1, { size: 13, color: 'rgba(200,170,255,0.6)', stroke: null });
    }
  }

  drawNode(ctx, n, p, t) {
    const st = this.state(n.id);
    const selected = this.sel === n.id;
    const canBuy = this.app.canBuyPerk(n.id);
    const pulse = canBuy ? 0.5 + Math.sin(t * 4) * 0.5 : 0;
    ctx.save();
    // anel: verde comprado, roxo aberto (pulsando se dá pra comprar), cinza trancado
    const ring = st === 'owned' ? GREEN : st === 'open' ? PURPLE : '#4a3f63';
    ctx.shadowColor = ring;
    ctx.shadowBlur = (st === 'locked' ? 0 : 14 + pulse * 10 + (this.flash[n.id] ?? 0) * 30) * this.app.pixelScale;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = st === 'owned' ? '#0f2a1f' : '#170a2c';
    ctx.fill();
    ctx.lineWidth = selected ? 5 : 3.5;
    ctx.strokeStyle = ring;
    ctx.stroke();
    ctx.shadowBlur = 0;
    // conteúdo: a cebola no centro, o boneco (adulto) nos ramos
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r - 3, 0, Math.PI * 2);
    ctx.clip();
    if (st === 'locked') ctx.globalAlpha = 0.35;
    if (n.tower) {
      const k = (p.r * 1.7) / 62;
      ctx.translate(p.x, p.y + 16 * k);
      ctx.scale(k, k);
      drawCharacter(ctx, n.tower, { t: t + p.x * 0.01, face: 1 });
    } else {
      ctx.translate(p.x, p.y);
      ICONS.darknet(ctx, p.r * 0.5);
    }
    ctx.restore();
    if (st === 'locked') {
      ctx.save();
      ctx.translate(p.x + p.r * 0.55, p.y + p.r * 0.55);
      ICONS.lock(ctx, 9);
      ctx.restore();
    }
    // selo embaixo: custo ou ✔
    const by = p.y + p.r + 2;
    rrect(ctx, p.x - 24, by - 10, 48, 20, 10);
    fillOutline(ctx, st === 'owned' ? '#14532d' : '#2a1748', 2);
    if (st === 'owned') text(ctx, '✔', p.x, by + 1, { size: 14, color: GREEN });
    else {
      ctx.save();
      ctx.translate(p.x - 10, by - 1);
      ICONS.coffee(ctx, 6);
      ctx.restore();
      text(ctx, `${n.cost}`, p.x + 8, by + 1, { size: 14, color: canBuy ? COFFEE_TXT : '#9a8bb5' });
    }
    // ondinha de compra
    const f = this.flash[n.id] ?? 0;
    if (f > 0) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + (1 - f) * 40, 0, Math.PI * 2);
      ctx.lineWidth = 3;
      ctx.strokeStyle = `rgba(61,255,154,${f})`;
      ctx.stroke();
    }
    ctx.restore();
  }

  // Terminal com o upgrade escolhido e o botão de comprar
  drawPanel(ctx, L) {
    const n = NODE[this.sel];
    const st = this.state(n.id);
    const can = this.app.canBuyPerk(n.id);
    const P = L.panel;
    ctx.save();
    ctx.translate(Math.sin(this.shake * 40) * 6 * this.shake, 0);
    rrect(ctx, P.x, P.y, P.w, P.h, 10);
    ctx.fillStyle = 'rgba(14,4,28,0.92)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#6a3fb0';
    ctx.stroke();
    ctx.font = `bold 13px ${MONO}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = GREEN;
    ctx.fillText(`> upgrade://${n.id}`, P.x + 18, P.y + 24);

    text(ctx, n.name.toUpperCase(), P.x + 18, P.y + 60, { size: 24, color: '#ffffff', align: 'left' });
    wrap(ctx, n.desc, P.x + 18, P.y + 98, P.w - 36, 17, '#e6d0ff');

    // requisito / estado
    ctx.font = `bold 13px ${MONO}`;
    ctx.textAlign = 'left';
    let status;
    if (st === 'owned') status = ['> instalado. ativo em todas as fases', GREEN];
    else if (st === 'locked') status = [`> requer: ${NODE[n.parent].name}`, '#ff8aa0'];
    else if (!can) status = [`> faltam ${fmt(n.cost - this.app.coffee)} café(s)`, '#ffc62e'];
    else status = ['> pronto pra instalar', PURPLE];
    ctx.fillStyle = status[1];
    ctx.fillText(status[0], P.x + 18, P.y + 196);

    // custo
    if (st !== 'owned') {
      ctx.save();
      ctx.translate(P.x + 30, P.y + 230);
      ICONS.coffee(ctx, 10);
      ctx.restore();
      text(ctx, `${n.cost} ${n.cost === 1 ? 'café' : 'cafés'}`, P.x + 50, P.y + 232, { size: 20, color: COFFEE_TXT, align: 'left' });
    }

    // botão
    const B = L.buy;
    const label = st === 'owned' ? 'INSTALADO' : st === 'locked' ? 'TRANCADO' : 'COMPRAR';
    button(ctx, B, st === 'owned' ? '#2f8f5b' : can ? '#3fd16b' : '#5d5675', { radius: 14, depth: 5 });
    text(ctx, label, B.x + B.w / 2, B.y + (B.h - 5) / 2 + 1, { size: 22 });
    ctx.restore();
  }

  // Chuva de código roxa caindo devagar ao fundo
  drawRain(ctx, W, t) {
    ctx.font = `15px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const step = W / COLS;
    this.rain.forEach((c, i) => {
      const head = ((c.start + t * c.speed) % (VIEW_H + 240)) - 120;
      for (let k = 0; k < 8; k++) {
        const y = head - k * 17;
        if (y < -10 || y > VIEW_H + 10) continue;
        ctx.globalAlpha = (1 - k / 8) * 0.35;
        ctx.fillStyle = k === 0 ? '#e6d0ff' : '#7b3fe0';
        ctx.fillText(CHARS[(i * 7 + k * 3 + Math.floor(t * 4)) % CHARS.length], i * step + step / 2, y);
      }
    });
    ctx.globalAlpha = 1;
  }

  pointerDown(x, y) {
    const L = this.layout();
    if (inRect(L.back, x, y)) {
      this.app.sound.play('click');
      this.app.goMaps();
      return;
    }
    if (inRect(L.buy, x, y)) {
      if (this.app.buyPerk(this.sel)) {
        this.flash[this.sel] = 1;
        this.app.sound.play('upgrade');
      } else if (this.state(this.sel) !== 'owned') {
        this.shake = 1;
        this.app.sound.play('error');
      }
      return;
    }
    for (const n of TREE) {
      const p = L.nodes[n.id];
      if (Math.hypot(x - p.x, y - p.y) <= p.r + 6) {
        this.sel = n.id;
        this.app.sound.play('click');
        return;
      }
    }
  }

  key(k) {
    if (k === 'Escape') this.app.goMaps();
  }
}

// Cafés com até 2 casas e vírgula ("12,35"): o saldo pode ser quebrado
const fmt = (v) => String(Math.round(v * 100) / 100).replace('.', ',');

// Texto quebrado em linhas (fonte do jogo)
function wrap(ctx, str, x, y, maxW, size, color) {
  setFont(ctx, size);
  const lines = [];
  let line = '';
  for (const w of str.split(' ')) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  lines.forEach((l, i) => text(ctx, l, x, y + i * (size + 6), { size, color, align: 'left', stroke: null }));
}
