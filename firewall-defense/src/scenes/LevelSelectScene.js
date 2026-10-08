import { VIEW_H, OUTLINE, GOLD } from '../config.js';
import { MAPS, SEASONS, MAPS_PER_SEASON } from '../data/maps.js';
import { renderThumb } from '../render/maps/index.js';
import { rrect, fillOutline, text, button, setFont } from '../render/canvas.js';
import { iconButton, inRect, stars, ribbon, bigButton, starTier, volumeSlider, sliderValue } from '../render/widgets.js';
import { ICONS } from '../render/sprites.js';
import { BOT_WIN } from '../data/botStats.js';
import { DARKNET_STARS } from '../data/darknet.js';
import { drawEnergyBadge } from '../render/energy.js';

const DIFF_COLOR = { 'FÁCIL': '#3fd16b', 'MÉDIO': '#ff9a2e', 'DIFÍCIL': '#ff5a6a', 'EXTREMO': '#b65cff' };
// Dificuldade pela % de partidas de bots que venceram o mapa (data/botStats.js)
const TIERS = [
  { min: 90, name: 'FÁCIL', color: '#3fd16b' },
  { min: 65, name: 'MÉDIO', color: '#ffd23f' },
  { min: 45, name: 'HARD', color: '#ff9a2e' },
  { min: 25, name: 'MUITO DIFÍCIL', color: '#ff4d5e' },
  { min: 0, name: 'INSANO', color: '#9b1626' },
];
const tierOf = (rate) => TIERS.find((t) => rate >= t.min);

// Seleção de mapas por season: abas no topo (Placa-Mãe, Data Center,
// Cabo Submarino) e uma grade 5×3 com os 15 mapas da season escolhida.
// Os mapas abrem em sequência: vencer um libera o próximo.
// Tocar num mapa abre a escolha NORMAL / PLATINA; a platina só libera com
// 3 estrelas (antes disso aparece trancada). Platina vencida: estrelas azul-gelo e o card de platina.
// (O aliado bloqueado só aparece dentro da partida.)
// No canto de cima: o saldo de cafés, a Dark Net (libera com
// DARKNET_STARS estrelas; antes disso fica trancada), o catálogo e as
// configurações (música, efeitos e turno automático).
export class LevelSelectScene {
  constructor(app) {
    this.app = app;
    this.t = 0;
    this.thumbs = {};
    this.thumbKey = '';
    this.pressed = -1;
    this.wiggle = { i: -1, t: 0 };
    this.pick = -1; // mapa com a janela de escolha do modo aberta
    this.settings = false; // janela de configurações aberta
    this.toast = null; // aviso no topo (ex.: Dark Net trancada)
    this.darkWiggle = 0;
    // abre na season do mapa mais avançado já liberado
    let last = 0;
    for (let i = 0; i < MAPS.length; i++) if (app.isUnlocked(i)) last = i;
    this.season = MAPS[last].season;
  }

  layout() {
    const W = this.app.viewW;
    const tabW = Math.min(250, (W - 200) / SEASONS.length - 12);
    const tabs0 = (W - (SEASONS.length * tabW + (SEASONS.length - 1) * 12)) / 2;
    const cols = 5;
    const gap = 12;
    const gw = Math.min(W - 60, 900);
    const tw = (gw - gap * (cols - 1)) / cols;
    const th = 112;
    const gx = (W - gw) / 2;
    const gy = 160;
    const card = { x: W / 2 - 240, y: 110, w: 480, h: 330 };
    return {
      modal: {
        card,
        close: { x: card.x + card.w - 54, y: card.y + 14, w: 42, h: 42 },
        normal: { x: card.x + 40, y: card.y + 84, w: card.w - 80, h: 70 },
        platinum: { x: card.x + 40, y: card.y + 172, w: card.w - 80, h: 70 },
        locked: { x: card.x + 24, y: card.y + 162, w: card.w - 48, h: card.h - 176 }, // cobre a platina
        // configurações: uma linha por opção (música, efeitos, turno automático)
        rows: [0, 1, 2].map((k) => ({ x: card.x + 40, y: card.y + 74 + k * 82, w: card.w - 80, h: 70 })),
      },
      back: { x: 18, y: 16, w: 56, h: 56 },
      settings: { x: W - 74, y: 16, w: 56, h: 56 }, // no canto
      catalog: { x: W - 140, y: 16, w: 56, h: 56 },
      darknet: { x: W - 206, y: 16, w: 56, h: 56 }, // do lado do catálogo
      shop: { x: W - 272, y: 16, w: 56, h: 56 }, // loja de consumíveis
      tabs: SEASONS.map((_, s) => ({ x: tabs0 + s * (tabW + 12), y: 92, w: tabW, h: 52 })),
      tiles: Array.from({ length: MAPS_PER_SEASON }, (_, k) => ({
        x: gx + (k % cols) * (tw + gap),
        y: gy + Math.floor(k / cols) * (th + gap),
        w: tw,
        h: th,
      })),
    };
  }

  thumb(i, w, h) {
    const key = `${w}x${h}@${this.app.pixelScale}`;
    if (key !== this.thumbKey) {
      this.thumbs = {};
      this.thumbKey = key;
    }
    this.thumbs[i] ??= renderThumb(MAPS[i], w, h, this.app.pixelScale);
    return this.thumbs[i];
  }

  seasonStars(s) {
    let n = 0;
    for (let k = 0; k < MAPS_PER_SEASON; k++) n += this.app.save.stars[MAPS[s * MAPS_PER_SEASON + k].id] ?? 0;
    return n;
  }

  update(dt) {
    this.t += dt;
    this.wiggle.t = Math.max(0, this.wiggle.t - dt);
    this.darkWiggle = Math.max(0, this.darkWiggle - dt);
    if (this.toast && (this.toast.time -= dt) <= 0) this.toast = null;
  }

  render(ctx) {
    const W = this.app.viewW;
    const t = this.t;
    const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    grad.addColorStop(0, '#4468b8');
    grad.addColorStop(1, '#1f2b52');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, VIEW_H);
    // listras diagonais andando
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = '#ffffff';
    const off = (t * 20) % 80;
    for (let x = -VIEW_H + off; x < W; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, VIEW_H);
      ctx.lineTo(x + 40, VIEW_H);
      ctx.lineTo(x + 40 + VIEW_H, 0);
      ctx.lineTo(x + VIEW_H, 0);
      ctx.fill();
    }
    ctx.restore();
    // energia no canto de cima (cada partida gasta 1)
    drawEnergyBadge(ctx, this.app, 88, 24);

    const L = this.layout();
    ribbon(ctx, W / 2, 46, 340, 'ESCOLHA O MAPA', '#ff9a2e', 28);
    iconButton(ctx, L.back, '#5fb4ff', 'back');
    iconButton(ctx, L.settings, '#5fb4ff', 'settings');
    iconButton(ctx, L.catalog, '#3fd16b', 'catalog');
    iconButton(ctx, L.shop, '#ffb020', 'shop');
    this.drawDarkNet(ctx, L.darknet);

    SEASONS.forEach((season, s) => this.drawTab(ctx, L.tabs[s], season, s));
    L.tiles.forEach((tile, k) => this.drawTile(ctx, tile, this.season * MAPS_PER_SEASON + k));
    if (this.pick >= 0) this.drawModePicker(ctx, L.modal, this.pick);
    if (this.settings) this.drawSettings(ctx, L.modal);
    if (this.toast) this.drawToast(ctx, W / 2, 118);
  }

  // Botão da Dark Net: roxo quando liberada; cinza com cadeado antes
  drawDarkNet(ctx, r) {
    const open = this.app.darkNetOpen();
    ctx.save();
    if (this.darkWiggle > 0) {
      ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
      ctx.rotate(Math.sin(this.darkWiggle * 40) * 0.12);
      ctx.translate(-(r.x + r.w / 2), -(r.y + r.h / 2));
    }
    iconButton(ctx, r, open ? '#7b3fe0' : '#5d6680', 'darknet');
    if (!open) {
      ctx.translate(r.x + r.w - 9, r.y + r.h - 12);
      ICONS.lock(ctx, 9);
    }
    ctx.restore();
  }

  drawToast(ctx, x, y) {
    const a = Math.min(1, this.toast.time * 3);
    ctx.save();
    ctx.globalAlpha = a;
    setFont(ctx, 18);
    const w = ctx.measureText(this.toast.text).width + 40;
    rrect(ctx, x - w / 2, y - 21, w, 42, 21);
    fillOutline(ctx, '#2a1840', 4);
    text(ctx, this.toast.text, x, y + 1, { size: 18, color: '#e3c9ff' });
    ctx.restore();
  }

  // Face de botão platinada (aba da season toda platinada): o mesmo metal do
  // card de mapa, com o brilho passando
  platinumFace(ctx, f, i) {
    rrect(ctx, f.x, f.y, f.w, f.h, 14);
    this.platinumCard(ctx, f, i);
  }

  // Card de mapa com a platina vencida: prata azulado metálico, com faixas
  // de reflexo e um brilho passando devagar (o rrect do card já está no path)
  platinumCard(ctx, c, i) {
    const g = ctx.createLinearGradient(c.x, c.y, c.x + c.w, c.y + c.h);
    g.addColorStop(0, '#e9f2fb');
    g.addColorStop(0.3, '#a9bdd4');
    g.addColorStop(0.5, '#dbe7f4');
    g.addColorStop(0.72, '#8ea6c2');
    g.addColorStop(1, '#c7d6e6');
    fillOutline(ctx, g, 3);
    ctx.save();
    rrect(ctx, c.x, c.y, c.w, c.h, 16);
    ctx.clip();
    const k = ((this.t * 0.35 + i * 0.13) % 1.6) - 0.3; // vai de -0.3 a 1.3 do card
    const bx = c.x + k * c.w;
    // faixa de brilho inclinada (gradiente na diagonal)
    const sheen = ctx.createLinearGradient(bx - 34, c.y + c.h * 0.7, bx + 34, c.y + c.h * 0.3);
    sheen.addColorStop(0, 'rgba(255,255,255,0)');
    sheen.addColorStop(0.5, 'rgba(255,255,255,0.55)');
    sheen.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sheen;
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.restore();
    // filete claro por dentro (borda polida)
    rrect(ctx, c.x + 4, c.y + 4, c.w - 8, c.h - 8, 13);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.stroke();
  }

  // Janela "NORMAL ou PLATINA" (mapa com 3 estrelas)
  drawModePicker(ctx, M, i) {
    const W = this.app.viewW;
    const map = MAPS[i];
    ctx.fillStyle = 'rgba(10,18,40,0.7)';
    ctx.fillRect(0, 0, W, VIEW_H);
    const c = M.card;
    rrect(ctx, c.x, c.y + 10, c.w, c.h, 28);
    ctx.fillStyle = 'rgba(10,16,40,0.55)';
    ctx.fill();
    rrect(ctx, c.x, c.y, c.w, c.h, 28);
    fillOutline(ctx, '#34497f', 5);
    ribbon(ctx, W / 2, c.y + 4, 240, `MAPA ${map.season + 1}-${map.number}`, '#ff9a2e', 24);
    iconButton(ctx, M.close, '#ff5a5a', 'close');

    bigButton(ctx, M.normal, '#3fd16b', 'NORMAL', { icon: 'play', size: 26 });
    bigButton(ctx, M.platinum, '#5fb4e8', 'PLATINA', { size: 26 });
    // platina já vencida nesse mapa: um ✔ no canto do botão
    const p = M.platinum;
    if (this.app.hasPlatinum(map.id)) text(ctx, '✔', p.x + 34, p.y + (p.h - 6) / 2 + 1, { size: 26, color: '#ffffff' });
    // dificuldade de cada modo: bolinha + nome
    for (const [r, mode] of [[M.normal, 'normal'], [M.platinum, 'platinum']]) {
      const rate = BOT_WIN[mode][i];
      if (rate == null) continue;
      const tier = tierOf(rate);
      const cy = r.y + (r.h - 6) / 2;
      diffDot(ctx, r.x + r.w - 26, cy, tier.color, 9);
      text(ctx, tier.name, r.x + r.w - 42, cy + 1, { size: 13, align: 'right' });
    }

    text(ctx, 'Ondas sem parar por 3:00, depois vem o chefão', W / 2, c.y + 272, { size: 16, color: '#d8e6ff' });
    text(ctx, 'Um aliado fica bloqueado', W / 2, c.y + 298, { size: 15, color: '#ff9aa5' });

    // sem as 3 estrelas: a parte da platina fica trancada
    if (!this.app.platinumOpen(i)) {
      const lk = M.locked;
      rrect(ctx, lk.x, lk.y, lk.w, lk.h, 18);
      ctx.fillStyle = 'rgba(15,22,48,0.92)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.stroke();
      ctx.save();
      ctx.translate(W / 2, lk.y + lk.h / 2 - 14);
      ICONS.lock(ctx, 20);
      ctx.restore();
      text(ctx, 'Consiga 3 estrelas pra liberar', W / 2, lk.y + lk.h / 2 + 30, { size: 17, color: '#d8e6ff' });
    }
  }

  // Opções da janela de configurações: [ícone, nome, valor, ação]. Música e
  // efeitos são barras de volume (valor 0 a 1, ação = qual volume); o turno
  // automático liga/desliga (valor = ligado?, ação = alternar)
  options() {
    const app = this.app;
    const auto = app.save.autoRound !== false;
    return [
      ['music', 'MÚSICA', app.save.musicVol, 'music'],
      ['sfx', 'EFEITOS SONOROS', app.save.sfxVol, 'sfx'],
      ['auto', 'TURNO AUTOMÁTICO', auto, () => app.toggleAuto()],
    ];
  }

  // Janela de configurações: cada linha liga/desliga uma opção
  drawSettings(ctx, M) {
    const W = this.app.viewW;
    ctx.fillStyle = 'rgba(10,18,40,0.7)';
    ctx.fillRect(0, 0, W, VIEW_H);
    const c = M.card;
    rrect(ctx, c.x, c.y + 10, c.w, c.h, 28);
    ctx.fillStyle = 'rgba(10,16,40,0.55)';
    ctx.fill();
    rrect(ctx, c.x, c.y, c.w, c.h, 28);
    fillOutline(ctx, '#34497f', 5);
    ribbon(ctx, W / 2, c.y + 4, 280, 'CONFIGURAÇÕES', '#5fb4ff', 24);
    iconButton(ctx, M.close, '#ff5a5a', 'close');
    this.options().forEach(([icon, name, on, act], k) => {
      const r = M.rows[k];
      if (typeof act === 'string') {
        volumeSlider(ctx, r, icon, on, name);
        return;
      }
      button(ctx, r, on ? '#3fd16b' : '#7d8fa8', { radius: 16, depth: 6 });
      const cy = r.y + (r.h - 6) / 2;
      ctx.save();
      ctx.translate(r.x + 40, cy);
      ICONS[icon](ctx, 15, on);
      ctx.restore();
      text(ctx, name, r.x + 76, cy + 1, { size: 21, align: 'left' });
      text(ctx, on ? 'LIGADO' : 'DESLIGADO', r.x + r.w - 20, cy + 1, { size: 15, align: 'right', color: on ? '#eaffef' : '#e3e8f2' });
    });
  }

  drawTab(ctx, r, season, s) {
    const active = this.season === s;
    const first = s * MAPS_PER_SEASON;
    const open = this.app.isUnlocked(first);
    ctx.save();
    if (!active) ctx.globalAlpha = 0.75;
    button(ctx, r, active ? season.color : '#4a5d92', { radius: 14, depth: 5, pressed: active });
    // season inteira platinada: botão prata azulado metálico
    if (open && this.app.seasonPlatinum(s)) this.platinumFace(ctx, { x: r.x, y: r.y + (active ? 4 : 0), w: r.w, h: r.h - 5 }, s);
    const cy = r.y + (r.h - 5) / 2 + (active ? 4 : 0);
    text(ctx, season.name.toUpperCase(), r.x + r.w / 2, cy - 7, { size: 17 });
    if (open) {
      text(ctx, `★ ${this.seasonStars(s)}/${MAPS_PER_SEASON * 3}`, r.x + r.w / 2, cy + 12, { size: 13, color: GOLD });
    } else {
      ctx.save();
      ctx.translate(r.x + r.w / 2 - 34, cy + 12);
      ICONS.lock(ctx, 8);
      ctx.restore();
      text(ctx, 'BLOQUEADA', r.x + r.w / 2 + 8, cy + 12, { size: 12, color: '#d8e6ff' });
    }
    ctx.restore();
  }

  drawTile(ctx, c, i) {
    const map = MAPS[i];
    const unlocked = this.app.isUnlocked(i);
    const got = this.app.save.stars[map.id] ?? 0;
    const plat = this.app.hasPlatinum(map.id);
    const cx = c.x + c.w / 2;
    ctx.save();
    let dx = 0;
    if (this.wiggle.i === i && this.wiggle.t > 0) dx = Math.sin(this.wiggle.t * 60) * 5 * this.wiggle.t * 3;
    const s = this.pressed === i ? 0.95 : 1;
    ctx.translate(cx + dx, c.y + c.h / 2);
    ctx.scale(s, s);
    ctx.translate(-cx, -(c.y + c.h / 2));

    rrect(ctx, c.x, c.y + 5, c.w, c.h, 16);
    ctx.fillStyle = 'rgba(10,16,40,0.5)';
    ctx.fill();
    rrect(ctx, c.x, c.y, c.w, c.h, 16);
    if (plat) this.platinumCard(ctx, c, i);
    else fillOutline(ctx, '#34497f', 3);

    // miniatura do mapa
    const tw = c.w - 12;
    const th = 66;
    ctx.save();
    rrect(ctx, c.x + 6, c.y + 6, tw, th, 11);
    ctx.clip();
    ctx.drawImage(this.thumb(i, Math.round(tw), th), c.x + 6, c.y + 6, tw, th);
    ctx.restore();
    rrect(ctx, c.x + 6, c.y + 6, tw, th, 11);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();

    // número (season-mapa) e selo de dificuldade
    const label = `${map.season + 1}-${map.number}`;
    rrect(ctx, c.x + 10, c.y + 10, 40, 22, 11);
    fillOutline(ctx, 'rgba(20,28,60,0.85)', 2);
    text(ctx, label, c.x + 30, c.y + 21, { size: 14 });

    // estrelas embaixo (bronze, prata, ouro ou platina)
    const sy = c.y + c.h - 18;
    // bolinha de dificuldade à direita das estrelas:
    // pela % de bots que venceram; sem dados, a dificuldade do mapa
    const rate = BOT_WIN.normal[i];
    diffDot(ctx, cx + 58, sy - 2, rate != null ? tierOf(rate).color : DIFF_COLOR[map.difficulty], 7);
    stars(ctx, cx, sy, got, 9, 22, null, starTier(got, plat));
    if (!unlocked) {
      rrect(ctx, c.x, c.y, c.w, c.h, 16);
      ctx.fillStyle = 'rgba(15,22,48,0.72)';
      ctx.fill();
      ctx.save();
      ctx.translate(cx, c.y + c.h / 2 - 4);
      ICONS.lock(ctx, 18);
      ctx.restore();
    }
    ctx.restore();
  }

  pointerDown(x, y) {
    const L = this.layout();
    if (this.settings) {
      const M = L.modal;
      const k = M.rows.findIndex((r) => inRect(r, x, y));
      const act = k >= 0 ? this.options()[k][3] : null;
      if (typeof act === 'string') {
        // barra de volume: toca ou arrasta
        this.volDrag = { kind: act, row: M.rows[k] };
        this.app.setVolume(act, sliderValue(M.rows[k], x, true));
      } else if (act) act(); // (o toggle já toca o clique)
      else if (inRect(M.close, x, y) || !inRect(M.card, x, y)) {
        this.settings = false;
        this.app.sound.play('click');
      }
      return;
    }
    if (this.pick >= 0) {
      const M = L.modal;
      const i = this.pick;
      if (inRect(M.normal, x, y)) this.launch(i, 'normal');
      else if (inRect(M.platinum, x, y)) {
        if (this.app.platinumOpen(i)) this.launch(i, 'platinum');
        else this.app.sound.play('error');
      }
      else if (inRect(M.close, x, y) || !inRect(M.card, x, y)) {
        this.pick = -1;
        this.app.sound.play('click');
      }
      return;
    }
    if (inRect(L.back, x, y)) {
      this.app.sound.play('click');
      this.app.goTitle();
      return;
    }
    if (inRect(L.settings, x, y)) {
      this.app.sound.play('click');
      this.settings = true;
      return;
    }
    if (inRect(L.catalog, x, y)) {
      this.app.sound.play('click');
      this.app.goCatalog();
      return;
    }
    if (inRect(L.shop, x, y)) {
      this.app.sound.play('click');
      this.app.goShop();
      return;
    }
    if (inRect(L.darknet, x, y)) {
      if (this.app.darkNetOpen()) {
        this.app.sound.play('click');
        this.app.goDarkNet();
      } else {
        this.app.sound.play('error');
        this.darkWiggle = 0.35;
        this.toast = { text: `DARK NET: junte ${DARKNET_STARS} estrelas pra liberar (${this.app.totalStars}/${DARKNET_STARS})`, time: 2.6 };
      }
      return;
    }
    L.tabs.forEach((r, s) => {
      if (!inRect(r, x, y) || this.season === s) return;
      this.season = s;
      this.app.sound.play('click');
    });
    L.tiles.forEach((c, k) => {
      if (!inRect(c, x, y)) return;
      const i = this.season * MAPS_PER_SEASON + k;
      if (this.app.isUnlocked(i)) this.pressed = i;
      else {
        this.wiggle = { i, t: 0.35 };
        this.app.sound.play('error');
      }
    });
  }

  pointerMove(x) {
    const d = this.volDrag;
    if (d) this.app.setVolume(d.kind, sliderValue(d.row, x, true));
  }

  pointerUp(x, y) {
    if (this.volDrag) {
      this.volDrag = null;
      this.app.sound.play('click'); // dá pra ouvir o volume novo dos efeitos
    }
    const i = this.pressed;
    this.pressed = -1;
    if (i < 0) return;
    const tile = this.layout().tiles[i - this.season * MAPS_PER_SEASON];
    if (!tile || !inRect(tile, x, y)) return;
    this.app.sound.play('click');
    // sempre pergunta o modo (sem 3 estrelas, a platina aparece trancada)
    this.pick = i;
  }

  launch(i, mode) {
    this.pick = -1;
    this.app.sound.play('click');
    this.app.startMap(i, mode);
  }

  key(k) {
    if (this.settings) {
      if (k === 'Escape') this.settings = false;
      return;
    }
    if (this.pick >= 0) {
      if (k === 'Escape') this.pick = -1;
      return;
    }
    if (k === 'Escape') this.app.goTitle();
    if (k === 'ArrowRight') this.season = Math.min(SEASONS.length - 1, this.season + 1);
    if (k === 'ArrowLeft') this.season = Math.max(0, this.season - 1);
  }
}

// Bolinha de dificuldade (com contorno e brilhinho)
function diffDot(ctx, x, y, color, r = 6) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  fillOutline(ctx, color, 2);
  ctx.beginPath();
  ctx.arc(x - r * 0.3, y - r * 0.35, r * 0.3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fill();
}
