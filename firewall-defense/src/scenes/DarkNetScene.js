import { VIEW_H } from '../config.js';
import { rrect, fillOutline, text, setFont, button } from '../render/canvas.js';
import { iconButton, inRect } from '../render/widgets.js';
import { ICONS } from '../render/sprites.js';
import { drawCharacter } from '../render/characters.js';
import { TREE, NODE, formatCoffee } from '../data/darknet.js';
import { seeded } from '../util.js';

/* ════════════════════════════════════════════════════════════
 *  DARK NET: a árvore de upgrades paga com cafés
 *  Um nó central (Acesso Root) liga os 6 ramos, um por defesa. Tocar num
 *  nó mostra o upgrade no terminal à direita; o botão compra (cafés saem
 *  do saldo e o bônus vale em todas as fases). Só aparecem os nós comprados
 *  e os vizinhos diretos deles (os que dá pra comprar agora); o resto da
 *  árvore fica escondido até chegar lá. O grafo não é simétrico: cada ramo
 *  sai num ângulo e distância próprios e vai virando (semente fixa, sempre
 *  igual), e os nós flutuam devagar.
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
const RADIUS = [125, 185]; // distância do centro da árvore até os ramos (sorteada)
const STEP = [88, 115]; // distância entre um nó e o seguinte no mesmo ramo (sorteada)
const TURN = 0.25; // quanto cada braço pode virar a cada nó (radianos, pra cada lado)
const FORK = 0.45; // ramo em Y: quanto cada braço abre pra um lado (radianos)
const SEED = 1938; // semente do layout (o grafo sai sempre igual)
const FLOAT = 5; // quanto os nós flutuam (px no mundo)
const HOME_ZOOM = [0.45, 1.15]; // zoom inicial: enquadra os nós visíveis, dentro desses limites
const FOCUS_ZOOM = 1.1; // tocou num nó: aproxima até esse zoom (se estiver mais longe)
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
    const nodes = this.graph();
    const home = this.home(nodes, panel);
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

  // Nós em coordenadas do mundo (a raiz no 0,0), sem simetria: cada ramo sai
  // num ângulo e distância sorteados e os nós seguintes vão virando um pouco.
  // Semente fixa: o grafo sai sempre igual. Calculado uma vez só
  graph() {
    if (this.nodes) return this.nodes;
    const rnd = seeded(SEED);
    const rr = (a, b) => a + rnd() * (b - a);
    const nodes = { root: { x: 0, y: 0, r: 40, a: 0, ph: 0 } };
    const slice = (Math.PI * 2) / BRANCH_ORDER.length;
    BRANCH_ORDER.forEach((id, i) => {
      const a = -Math.PI / 2 + i * slice + rr(-0.22, 0.22) * slice;
      const d = rr(RADIUS[0], RADIUS[1]);
      nodes[id] = { x: Math.cos(a) * d, y: Math.sin(a) * d, r: 32, a, ph: rr(0, Math.PI * 2) };
    });
    for (const n of TREE) {
      if (nodes[n.id]) continue;
      const p = nodes[n.parent];
      // irmãos (ramo em Y) abrem pra lados opostos; filho único vai virando
      const sibs = TREE.filter((m) => m.parent === n.parent);
      const k = sibs.indexOf(n) - (sibs.length - 1) / 2;
      const a = sibs.length > 1 ? p.a + k * 2 * FORK + rr(-0.12, 0.12) : p.a + rr(-TURN, TURN);
      const d = rr(STEP[0], STEP[1]);
      nodes[n.id] = { x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d, r: 28, a, ph: rr(0, Math.PI * 2) };
    }
    this.nodes = nodes;
    return nodes;
  }

  // Espaço livre pra árvore na tela: à esquerda do painel, entre o título e os botões de zoom
  area(panel) {
    const w = panel.x - 40;
    const h = VIEW_H - 214;
    return { w, h, cx: 20 + w / 2, cy: 132 + h / 2 };
  }

  // Câmera inicial: enquadra os nós visíveis no espaço livre
  home(nodes, panel) {
    const box = this.bounds(nodes);
    const a = this.area(panel);
    const fit = Math.min(a.w / (box.x1 - box.x0 + 120), a.h / (box.y1 - box.y0 + 120));
    const z = Math.min(HOME_ZOOM[1], Math.max(HOME_ZOOM[0], fit));
    return { x: a.cx - ((box.x0 + box.x1) / 2) * z, y: a.cy - ((box.y0 + box.y1) / 2) * z, z };
  }

  // Câmera com o nó no meio do espaço livre, aproximada (nunca afasta)
  focus(id) {
    const L = this.layout();
    const p = L.nodes[id];
    const a = this.area(L.panel);
    const z = Math.max(this.cam.z, FOCUS_ZOOM);
    return { x: a.cx - p.x * z, y: a.cy - p.y * z, z };
  }

  // Retângulo que contém os nós visíveis (pra câmera)
  bounds(nodes) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const n of TREE) {
      if (!this.visible(n.id)) continue;
      const p = nodes[n.id];
      x0 = Math.min(x0, p.x);
      y0 = Math.min(y0, p.y);
      x1 = Math.max(x1, p.x);
      y1 = Math.max(y1, p.y);
    }
    return { x0, y0, x1, y1 };
  }

  // Aparece na árvore? Os comprados e os vizinhos diretos deles (dá pra comprar)
  visible(id) {
    return this.state(id) !== 'locked';
  }

  // Onde o nó está agora: flutuando devagar em volta do lugar dele
  at(p, t = this.t) {
    return { x: p.x + Math.sin(t * 0.9 + p.ph) * FLOAT, y: p.y + Math.cos(t * 0.7 + p.ph * 1.3) * FLOAT, r: p.r, a: p.a };
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
    const { x0, y0, x1, y1 } = this.bounds(this.graph()); // só os visíveis
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
    // câmera deslizando: pro começo (botão de centralizar, homing = true)
    // ou pra um nó que foi tocado (homing = { x, y, z })
    if (this.homing) {
      const c = this.cam;
      const h = this.homing === true ? this.layout().home : this.homing;
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
    if (!this.visible(this.sel)) this.sel = 'root'; // (vendeu e o escolhido sumiu)
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
    for (const n of TREE) if (this.visible(n.id)) this.drawNode(ctx, n, this.at(L.nodes[n.id], t), t);
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

  // Ligações entre nós visíveis: verde e com dados correndo quando o nó é
  // comprado, roxa quando dá pra comprar. Seguem os nós flutuando
  drawLinks(ctx, L, t) {
    ctx.lineCap = 'round';
    for (const n of TREE) {
      if (!n.parent || !this.visible(n.id)) continue;
      const from = this.at(L.nodes[n.parent], t);
      const p = this.at(L.nodes[n.id], t);
      const owned = this.state(n.id) === 'owned';
      ctx.lineWidth = owned ? 5 : 3;
      ctx.strokeStyle = owned ? GREEN : 'rgba(183,123,255,0.7)';
      ctx.shadowColor = owned ? GREEN : PURPLE;
      ctx.shadowBlur = 10 * this.app.pixelScale * this.cam.z;
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
      // +10: o relógio da animação nunca fica negativo (nós à esquerda têm x < 0)
      drawCharacter(ctx, n.tower, { t: t + 10 + p.x * 0.01, face: 1 });
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
      if (!this.visible(n.id)) continue; // escondido: não dá pra tocar
      const p = this.at(L.nodes[n.id]);
      if (Math.hypot(w.x - p.x, w.y - p.y) <= p.r + 6 / this.cam.z) {
        this.sel = n.id;
        this.homing = this.focus(n.id); // aproxima e centraliza no nó
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
