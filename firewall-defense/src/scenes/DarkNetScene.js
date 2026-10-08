import { VIEW_H } from '../config.js';
import { rrect, fillOutline, text, setFont, button } from '../render/canvas.js';
import { iconButton, inRect } from '../render/widgets.js';
import { ICONS } from '../render/sprites.js';
import { drawCharacter } from '../render/characters.js';
import { TREE, NODE, formatCoffee } from '../data/darknet.js';

/* ════════════════════════════════════════════════════════════
 *  DARK NET: a árvore de upgrades paga com cafés
 *  Um nó central (Acesso Root) liga os 6 ramos, um por defesa. Tocar num
 *  nó mostra o upgrade no terminal à direita; o botão compra (cafés saem
 *  do saldo e o bônus vale em todas as fases). De cada ramo sai um traço
 *  apagado com "?": é por onde a árvore vai crescer nas próximas fases.
 *  A árvore fica num plano "infinito": arrastar move a câmera, roda do
 *  mouse / pinça / botões +- dão zoom (o painel e o título ficam por cima).
 *  Libera com DARKNET_STARS estrelas (data/darknet.js).
 * ════════════════════════════════════════════════════════════ */

const MONO = '"Courier New", ui-monospace, Menlo, Consolas, monospace';
const PURPLE = '#b77bff';
const GREEN = '#3dff9a';
const COFFEE_TXT = '#ffe0b0';
const CHARS = '01₿#$%<>/{}';
const COLS = 64;
const RADIUS = 150; // distância do centro da árvore até os ramos
const STEP = 100; // distância entre um nó e o seguinte no mesmo ramo
const HOME_ZOOM = 0.55; // zoom inicial: a árvore inteira cabe na tela
const BRANCH_ORDER = ['hacker', 'firewall', 'pinguim', 'scanner', 'minerador', 'honeypot'];
const ZOOM_MIN = 0.45;
const ZOOM_MAX = 2.4;
const ROAM = 450; // quanto dá pra passear além da borda da árvore
const DRAG_SLOP = 8; // até quantos px um toque ainda é toque (e não arrasto)
const DOT_GAP = 48; // pontinhos do chão, pra sentir o movimento

export class DarkNetScene {
  constructor(app) {
    this.app = app;
    this.t = 0;
    this.sel = 'root';
    this.flash = {}; // brilho de compra por nó (1 → 0)
    this.shake = 0; // painel treme quando não dá pra comprar
    this.cam = null; // { x, y, z }: onde fica a raiz na tela e o zoom (começa no meio, no 1º layout)
    this.drag = null; // arrasto em andamento
    // cada coluna da chuva tem sua velocidade e seu ponto de partida
    this.rain = Array.from({ length: COLS }, (_, i) => ({ speed: 60 + ((i * 37) % 90), start: (i * 131) % 700 }));
  }

  layout() {
    const W = this.app.viewW;
    const panel = { x: W - 330, y: 128, w: 300, h: 330 };
    // nós em coordenadas do mundo: a raiz no (0, 0)
    const nodes = { root: { x: 0, y: 0, r: 40 } };
    BRANCH_ORDER.forEach((id, i) => {
      const a = -Math.PI / 2 + (i * Math.PI * 2) / BRANCH_ORDER.length;
      nodes[id] = { x: Math.cos(a) * RADIUS, y: Math.sin(a) * RADIUS, r: 32, a };
    });
    // os outros nós de cada ramo seguem em linha reta pra fora, um depois do outro
    for (const n of TREE) {
      if (nodes[n.id]) continue;
      const p = nodes[n.parent];
      nodes[n.id] = { x: p.x + Math.cos(p.a) * STEP, y: p.y + Math.sin(p.a) * STEP, r: 28, a: p.a };
    }
    // câmera inicial: raiz no meio do espaço à esquerda do painel
    const home = { x: (panel.x - 20) / 2 + 10, y: 302, z: HOME_ZOOM };
    if (!this.cam) this.cam = { ...home };
    const zy = VIEW_H - 64;
    return {
      back: { x: 18, y: 16, w: 56, h: 56 },
      panel,
      buy: { x: panel.x + 24, y: panel.y + panel.h - 74, w: panel.w - 48, h: 54 },
      zoomIn: { x: 18, y: zy, w: 46, h: 46, label: '+' },
      zoomOut: { x: 72, y: zy, w: 46, h: 46, label: '−' },
      center: { x: 126, y: zy, w: 46, h: 46, label: 'center' },
      nodes,
      home,
    };
  }

  // tela -> mundo
  toWorld(x, y) {
    const c = this.cam;
    return { x: (x - c.x) / c.z, y: (y - c.y) / c.z };
  }

  // Zoom mantendo fixo o ponto da tela (x, y)
  zoomAt(x, y, f) {
    const c = this.cam;
    const z = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, c.z * f));
    c.x = x - ((x - c.x) * z) / c.z;
    c.y = y - ((y - c.y) * z) / c.z;
    c.z = z;
    this.clampCam();
  }

  // Zoom pelos botões/teclado: em volta do meio da árvore na tela
  zoomStep(f) {
    this.homing = false;
    this.zoomAt(this.layout().home.x, VIEW_H / 2, f);
  }

  // Não deixa a árvore sumir de vez: o centro da tela fica perto dela
  clampCam() {
    const c = this.cam;
    const L = this.layout();
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of Object.values(L.nodes)) {
      x0 = Math.min(x0, p.x);
      y0 = Math.min(y0, p.y);
      x1 = Math.max(x1, p.x);
      y1 = Math.max(y1, p.y);
    }
    const mid = this.toWorld(this.app.viewW / 2, VIEW_H / 2);
    const mx = Math.min(x1 + ROAM, Math.max(x0 - ROAM, mid.x));
    const my = Math.min(y1 + ROAM, Math.max(y0 - ROAM, mid.y));
    c.x -= (mx - mid.x) * c.z;
    c.y -= (my - mid.y) * c.z;
  }

  update(dt) {
    this.t += dt;
    for (const k of Object.keys(this.flash)) this.flash[k] = Math.max(0, this.flash[k] - dt * 1.6);
    this.shake = Math.max(0, this.shake - dt * 3);
    // botão de centralizar: volta deslizando
    if (this.homing) {
      const c = this.cam;
      const h = this.layout().home;
      const k = Math.min(1, dt * 8);
      for (const key of ['x', 'y', 'z']) c[key] += (h[key] - c[key]) * k;
      if (Math.abs(c.x - h.x) + Math.abs(c.y - h.y) + Math.abs(c.z - h.z) * 100 < 0.5) {
        Object.assign(c, { x: h.x, y: h.y, z: h.z });
        this.homing = false;
      }
    }
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

    // árvore (com a câmera)
    const c = this.cam;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.scale(c.z, c.z);
    this.drawDots(ctx, W);
    this.drawLinks(ctx, L, t);
    for (const n of TREE) this.drawNode(ctx, n, L.nodes[n.id], t);
    ctx.restore();

    // por cima: faixa escura atrás do título, título, painel e botões
    const top = ctx.createLinearGradient(0, 0, 0, 120);
    top.addColorStop(0, 'rgba(7,2,15,0.95)');
    top.addColorStop(1, 'rgba(7,2,15,0)');
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, W, 120);
    text(ctx, 'DARK NET', W / 2, 46, { size: 46, color: PURPLE, strokeWidth: 10 });
    this.drawCoffee(ctx, W / 2, 92);
    this.drawPanel(ctx, L);
    iconButton(ctx, L.back, '#5fb4ff', 'back');
    for (const b of [L.zoomIn, L.zoomOut, L.center]) this.drawZoomButton(ctx, b);
  }

  // Pontinhos fixos no mundo: mostram o chão andando quando arrasta
  drawDots(ctx, W) {
    const a = this.toWorld(0, 0);
    const b = this.toWorld(W, VIEW_H);
    ctx.fillStyle = 'rgba(183,123,255,0.16)';
    const r = 1.6 / this.cam.z;
    for (let x = Math.floor(a.x / DOT_GAP) * DOT_GAP; x <= b.x; x += DOT_GAP) {
      for (let y = Math.floor(a.y / DOT_GAP) * DOT_GAP; y <= b.y; y += DOT_GAP) {
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
    }
  }

  // Botões de zoom no canto: "+", "-" e centralizar (alvo)
  drawZoomButton(ctx, b) {
    rrect(ctx, b.x, b.y, b.w, b.h, 12);
    fillOutline(ctx, 'rgba(42,23,72,0.92)', 2.5);
    ctx.strokeStyle = PURPLE;
    ctx.lineWidth = 2;
    ctx.stroke();
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    if (b.label === 'center') {
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#e6d0ff';
      ctx.beginPath();
      ctx.arc(cx, cy, 9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#e6d0ff';
      ctx.fill();
    } else text(ctx, b.label, cx, cy + 1, { size: 28, color: '#e6d0ff' });
  }

  // saldo de cafés (ícone + número, sem fundo), centralizado em x
  drawCoffee(ctx, x, y) {
    coffeeLabel(ctx, formatCoffee(this.app.coffee), x, y, 24, COFFEE_TXT); // com fração: os monstros abatidos dão cafés quebrados
  }

  // Ligações: centro → ramos (verde e com dados correndo quando o ramo é
  // comprado) e, de cada ramo, um traço apagado pra fora com "?" (próxima fase)
  // Ligações: cada nó com o anterior (verde e com dados correndo quando
  // comprado) e, na ponta de cada ramo, um traço apagado com "?" (próxima fase)
  drawLinks(ctx, L, t) {
    ctx.lineCap = 'round';
    const parents = new Set(TREE.map((n) => n.parent));
    for (const n of TREE) {
      if (!n.parent) continue;
      const from = L.nodes[n.parent];
      const p = L.nodes[n.id];
      const owned = this.state(n.id) === 'owned';
      const lit = owned || this.state(n.id) === 'open';
      ctx.lineWidth = owned ? 5 : 3;
      ctx.strokeStyle = owned ? GREEN : lit ? 'rgba(183,123,255,0.7)' : 'rgba(110,80,160,0.35)';
      ctx.shadowColor = owned ? GREEN : PURPLE;
      ctx.shadowBlur = owned || lit ? 10 * this.app.pixelScale * this.cam.z : 0;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ctx.shadowBlur = 0;
      if (owned) {
        // pacotinhos de dados indo do nó anterior pro comprado
        for (let k = 0; k < 2; k++) {
          const f = (t * 0.7 + k / 2) % 1;
          ctx.beginPath();
          ctx.arc(from.x + (p.x - from.x) * f, from.y + (p.y - from.y) * f, 3, 0, Math.PI * 2);
          ctx.fillStyle = '#d6ffe9';
          ctx.fill();
        }
      }
      if (!parents.has(n.id)) this.drawStub(ctx, p);
    }
  }

  // Próxima fase: traço tracejado pra fora + "?"
  drawStub(ctx, p) {
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

  drawNode(ctx, n, p, t) {
    const st = this.state(n.id);
    const selected = this.sel === n.id;
    const canBuy = this.app.canBuyPerk(n.id);
    const pulse = canBuy ? 0.5 + Math.sin(t * 4) * 0.5 : 0;
    ctx.save();
    // anel: verde comprado, roxo aberto (pulsando se dá pra comprar), cinza trancado
    const ring = st === 'owned' ? GREEN : st === 'open' ? PURPLE : '#4a3f63';
    ctx.shadowColor = ring;
    ctx.shadowBlur = (st === 'locked' ? 0 : 14 + pulse * 10 + (this.flash[n.id] ?? 0) * 30) * this.app.pixelScale * this.cam.z;
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

    // estado (trancado não diz nada: a árvore já mostra o caminho)
    ctx.font = `bold 13px ${MONO}`;
    ctx.textAlign = 'left';
    let status = null;
    const extra = st === 'owned' ? this.app.perkRollbackSet(n.id).length - 1 : 0;
    if (extra > 0) status = [`> vender leva junto ${extra} upgrade${extra > 1 ? 's' : ''}`, '#ffc62e'];
    else if (st === 'owned') status = ['> instalado', GREEN];
    else if (st === 'open' && !can) status = [`> faltam ${formatCoffee(n.cost - this.app.coffee)} café(s)`, '#ffc62e'];
    else if (st === 'open') status = ['> pronto pra instalar', PURPLE];
    if (status) {
      ctx.fillStyle = status[1];
      ctx.fillText(status[0], P.x + 18, P.y + 196);
    }

    // botão: o custo em cafés (verde quando dá pra comprar); comprado vira
    // vender, que desfaz e devolve os cafés
    const B = L.buy;
    const cy = B.y + (B.h - 5) / 2 + 1;
    button(ctx, B, st === 'owned' ? '#e0703a' : can ? '#3fd16b' : '#5d5675', { radius: 14, depth: 5 });
    if (st === 'owned') coffeeLabel(ctx, `+${this.app.perkRefund(n.id)}`, B.x + B.w / 2, cy, 22, '#ffffff', 'VENDER');
    else coffeeLabel(ctx, `${n.cost}`, B.x + B.w / 2, cy, 22, '#ffffff');
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
      if (this.state(this.sel) === 'owned') {
        this.app.refundPerk(this.sel);
        this.app.sound.play('sell');
      } else if (this.app.buyPerk(this.sel)) {
        this.flash[this.sel] = 1;
        this.app.sound.play('upgrade');
      } else {
        this.shake = 1;
        this.app.sound.play('error');
      }
      return;
    }
    if (inRect(L.zoomIn, x, y) || inRect(L.zoomOut, x, y)) {
      this.zoomStep(inRect(L.zoomIn, x, y) ? 1.25 : 0.8);
      this.app.sound.play('click');
      return;
    }
    if (inRect(L.center, x, y)) {
      this.homing = true;
      this.app.sound.play('click');
      return;
    }
    if (inRect(L.panel, x, y)) return;
    // começa um arrasto; se soltar sem mexer, vira toque no nó
    this.homing = false;
    this.drag = { x, y, cx: this.cam.x, cy: this.cam.y, moved: false };
  }

  pointerMove(x, y) {
    const d = this.drag;
    if (!d || this.pinching) return;
    if (!d.moved && Math.hypot(x - d.x, y - d.y) < DRAG_SLOP) return;
    d.moved = true;
    this.cam.x = d.cx + x - d.x;
    this.cam.y = d.cy + y - d.y;
    this.clampCam();
  }

  pointerUp(x, y) {
    const d = this.drag;
    const pinched = this.pinching;
    this.drag = null;
    this.pinching = false;
    if (!d || d.moved || pinched) return;
    const L = this.layout();
    const w = this.toWorld(x, y);
    for (const n of TREE) {
      const p = L.nodes[n.id];
      if (Math.hypot(w.x - p.x, w.y - p.y) <= p.r + 6 / this.cam.z) {
        this.sel = n.id;
        this.app.sound.play('click');
        return;
      }
    }
  }

  pointerCancel() {
    this.drag = null;
    this.pinching = false;
  }

  // roda do mouse / trackpad: zoom em volta do cursor
  wheel(x, y, dy) {
    this.homing = false;
    this.zoomAt(x, y, Math.exp(-dy * 0.0015));
  }

  // pinça com dois dedos: f = quanto a distância mudou, (dx, dy) = quanto o meio andou
  pinch(x, y, f, dx, dy) {
    this.homing = false;
    this.pinching = true;
    this.cam.x += dx;
    this.cam.y += dy;
    this.zoomAt(x, y, f);
  }

  key(k) {
    if (k === 'Escape') this.app.goMaps();
    if (k === '+' || k === '=') this.zoomStep(1.25);
    if (k === '-') this.zoomStep(0.8);
    if (k === '0') this.homing = true;
  }
}

// Ícone do café + valor, centralizados em x (com um texto antes, se tiver)
function coffeeLabel(ctx, value, x, y, size, color, prefix = '') {
  setFont(ctx, size);
  const pw = prefix ? ctx.measureText(prefix).width + size * 0.5 : 0;
  const icon = size * 1.2;
  const total = pw + icon + ctx.measureText(value).width;
  let x0 = x - total / 2;
  if (prefix) {
    text(ctx, prefix, x0, y, { size, color, align: 'left' });
    x0 += pw;
  }
  ctx.save();
  ctx.translate(x0 + size * 0.5, y - 2);
  ICONS.coffee(ctx, size * 0.48);
  ctx.restore();
  text(ctx, value, x0 + icon, y, { size, color, align: 'left' });
}

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
