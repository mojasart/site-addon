import { VIEW_H, OUTLINE, GOLD } from '../config.js';
import { MAPS, SEASONS, MAPS_PER_SEASON } from '../data/maps.js';
import { ENEMIES } from '../data/enemies.js';
import { renderThumb } from '../render/maps/index.js';
import { rrect, fillOutline, text, button } from '../render/canvas.js';
import { iconButton, inRect, stars, ribbon, bigButton, starTier } from '../render/widgets.js';
import { drawVirusIcon } from '../render/viruses.js';
import { ICONS } from '../render/sprites.js';
import { drawImage } from '../render/images.js';

const DIFF_COLOR = { 'FÁCIL': '#3fd16b', 'MÉDIO': '#ff9a2e', 'DIFÍCIL': '#ff5a6a', 'EXTREMO': '#b65cff' };

// Seleção de mapas por season: abas no topo (Placa-Mãe, Data Center,
// Cabo Submarino) e uma grade 5×3 com os 15 mapas da season escolhida.
// Os mapas abrem em sequência: vencer um libera o próximo.
// Com 3 estrelas libera o modo platina do mapa: tocar nele abre a escolha
// NORMAL / PLATINA. Platina vencida: estrelas azul-gelo e a gema do lado.
// (O aliado bloqueado só aparece dentro da partida.)
export class LevelSelectScene {
  constructor(app) {
    this.app = app;
    this.t = 0;
    this.thumbs = {};
    this.thumbKey = '';
    this.pressed = -1;
    this.wiggle = { i: -1, t: 0 };
    this.pick = -1; // mapa com a janela de escolha do modo aberta
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
      },
      back: { x: 18, y: 16, w: 56, h: 56 },
      catalog: { x: W - 74, y: 16, w: 56, h: 56 },
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
    // vírus boiando nos cantos de cima
    [['v2', 120, 52], ['v5', W - 60, 50]].forEach(([type, x, y], i) => {
      ctx.save();
      ctx.translate(x, y + Math.sin(t * 2 + i) * 6);
      ctx.rotate(Math.sin(t + i) * 0.2);
      drawVirusIcon(ctx, type, ENEMIES[type], 16);
      ctx.restore();
    });

    const L = this.layout();
    ribbon(ctx, W / 2, 46, 340, 'ESCOLHA O MAPA', '#ff9a2e', 28);
    iconButton(ctx, L.back, '#5fb4ff', 'back');
    iconButton(ctx, L.catalog, '#3fd16b', 'catalog');

    SEASONS.forEach((season, s) => this.drawTab(ctx, L.tabs[s], season, s));
    L.tiles.forEach((tile, k) => this.drawTile(ctx, tile, this.season * MAPS_PER_SEASON + k));
    if (this.pick >= 0) this.drawModePicker(ctx, L.modal, this.pick);
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
    const p = M.platinum;
    ctx.save();
    ctx.translate(p.x + 40, p.y + (p.h - 6) / 2);
    ctx.scale(1 + Math.sin(this.t * 4) * 0.06, 1 + Math.sin(this.t * 4) * 0.06);
    drawImage(ctx, 'icon_gem', 38);
    ctx.restore();
    if (this.app.hasPlatinum(map.id)) text(ctx, '✔', p.x + p.w - 34, p.y + (p.h - 6) / 2, { size: 26, color: '#bdeeff' });

    text(ctx, 'Ondas sem parar por 3:00, depois vem o chefão', W / 2, c.y + 272, { size: 16, color: '#d8e6ff' });
    text(ctx, 'Um aliado fica bloqueado', W / 2, c.y + 298, { size: 15, color: '#ff9aa5' });
  }

  drawTab(ctx, r, season, s) {
    const active = this.season === s;
    const first = s * MAPS_PER_SEASON;
    const open = this.app.isUnlocked(first);
    ctx.save();
    if (!active) ctx.globalAlpha = 0.75;
    button(ctx, r, active ? season.color : '#4a5d92', { radius: 14, depth: 5, pressed: active });
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
    fillOutline(ctx, '#34497f', 3);

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
    rrect(ctx, c.x + c.w - 16, c.y + 12, 8, 8, 4);
    ctx.fillStyle = DIFF_COLOR[map.difficulty];
    ctx.fill();

    // estrelas embaixo (bronze, prata, ouro ou platina)
    const plat = this.app.hasPlatinum(map.id);
    const sy = c.y + c.h - 18;
    stars(ctx, cx, sy, got, 9, 22, null, starTier(got, plat));
    // gema da platina: só aparece depois de vencer a platina desse mapa
    if (plat) {
      ctx.save();
      ctx.translate(cx - 58, sy - 2);
      drawImage(ctx, 'icon_gem', 24);
      ctx.restore();
    }
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
    if (this.pick >= 0) {
      const M = L.modal;
      const i = this.pick;
      if (inRect(M.normal, x, y)) this.launch(i, 'normal');
      else if (inRect(M.platinum, x, y)) this.launch(i, 'platinum');
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
    if (inRect(L.catalog, x, y)) {
      this.app.sound.play('click');
      this.app.goCatalog();
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

  pointerUp(x, y) {
    const i = this.pressed;
    this.pressed = -1;
    if (i < 0) return;
    const tile = this.layout().tiles[i - this.season * MAPS_PER_SEASON];
    if (!tile || !inRect(tile, x, y)) return;
    this.app.sound.play('click');
    // com 3 estrelas pergunta o modo; senão já entra
    if (this.app.platinumOpen(i)) this.pick = i;
    else this.app.startMap(i);
  }

  launch(i, mode) {
    this.pick = -1;
    this.app.sound.play('click');
    this.app.startMap(i, mode);
  }

  key(k) {
    if (this.pick >= 0) {
      if (k === 'Escape') this.pick = -1;
      return;
    }
    if (k === 'Escape') this.app.goTitle();
    if (k === 'ArrowRight') this.season = Math.min(SEASONS.length - 1, this.season + 1);
    if (k === 'ArrowLeft') this.season = Math.max(0, this.season - 1);
  }
}
