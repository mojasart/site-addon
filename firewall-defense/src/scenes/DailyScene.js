import { VIEW_H, OUTLINE, GOLD } from '../config.js';
import { MAPS } from '../data/maps.js';
import { TOWERS } from '../data/towers.js';
import { DAILY, MODS, MISSION, MISSION_COFFEE, dailyCoffee } from '../data/daily.js';
import { formatCoffee } from '../data/darknet.js';
import { renderThumb } from '../render/maps/index.js';
import { rrect, fillOutline, text, button, setFont } from '../render/canvas.js';
import { iconButton, inRect, ribbon, bigButton, menuBackground } from '../render/widgets.js';
import { ICONS } from '../render/sprites.js';
import { drawEnergyBadge } from '../render/energy.js';
import { easeOutBack, clamp } from '../util.js';
import { t as tr } from '../i18n.js';

// hh:mm:ss
const clock = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const p = (n) => String(n).padStart(2, '0');
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
};

// Tela DIÁRIO (botão na tela de mapas): à esquerda o desafio do dia (a fase,
// os 2 modificadores, a recompensa e a sequência de dias), à direita as 3
// missões do dia com a barra de progresso e o COLETAR. Tudo renova à
// meia-noite (data/daily.js). O desafio é 1 tentativa por dia: depois de
// jogar, o botão vira VOLTE AMANHÃ. Aberta pelo menu de pausa do desafio
// (returnTo = a partida pausada), a tela só mostra: o botão e o voltar
// levam de volta pra partida
export class DailyScene {
  constructor(app, { returnTo = null } = {}) {
    this.app = app;
    this.returnTo = returnTo;
    this.t = 0;
    this.pressed = null;
    this.thumbImg = null;
    this.thumbKey = '';
    this.gains = []; // "+1" subindo do botão COLETAR
  }

  layout() {
    const W = this.app.viewW;
    const gw = Math.min(W - 40, 940);
    const gap = 20;
    const cw = (gw - gap) / 2;
    const x0 = (W - gw) / 2;
    const y = 96;
    const h = 432;
    const left = { x: x0, y, w: cw, h };
    const right = { x: x0 + cw + gap, y, w: cw, h };
    return {
      back: { x: 18, y: 16, w: 56, h: 56 },
      left,
      right,
      thumb: { x: left.x + 20, y: left.y + 52, w: left.w - 40, h: 120 },
      play: { x: left.x + 40, y: left.y + h - 84, w: left.w - 80, h: 66 },
      rows: [0, 1, 2].map((k) => {
        const r = { x: right.x + 16, y: right.y + 56 + k * 124, w: right.w - 32, h: 112 };
        return { ...r, claim: { x: r.x + r.w - 128, y: r.y + r.h - 62, w: 116, h: 52 } };
      }),
    };
  }

  update(dt) {
    this.t += dt;
    for (const g of this.gains) g.t += dt;
    this.gains = this.gains.filter((g) => g.t < 1.2);
  }

  thumb(i, w, h) {
    const key = `${i}:${w}x${h}@${this.app.pixelScale}`;
    if (key !== this.thumbKey) {
      this.thumbImg = renderThumb(MAPS[i], w, h, this.app.pixelScale);
      this.thumbKey = key;
    }
    return this.thumbImg;
  }

  render(ctx) {
    const W = this.app.viewW;
    menuBackground(ctx, W, VIEW_H, this.t);
    drawEnergyBadge(ctx, this.app, 88, 24);
    const L = this.layout();
    ribbon(ctx, W / 2, 46, 260, tr('DIÁRIO'), '#ff9a2e', 28);
    iconButton(ctx, L.back, '#5fb4ff', 'back');
    this.drawCoffee(ctx, W - 18, 24);
    text(ctx, tr('Novo desafio e novas missões em {time}', { time: clock(this.app.dayNextMs()) }), W / 2, 84, { size: 14, color: '#d8e6ff' });
    this.drawChallenge(ctx, L);
    this.drawMissions(ctx, L);
    for (const g of this.gains) {
      const k = easeOutBack(clamp(g.t * 4, 0, 1));
      ctx.save();
      ctx.globalAlpha = clamp((1.2 - g.t) * 3, 0, 1);
      ctx.translate(g.x, g.y - g.t * 40);
      ctx.scale(k, k);
      text(ctx, `+${formatCoffee(MISSION_COFFEE)}`, 0, 0, { size: 26, color: '#ffe0b0' });
      ctx.restore();
    }
  }

  // Saldo de cafés no canto (pílula, como a energia), alinhado à direita em x
  drawCoffee(ctx, right, y) {
    const str = formatCoffee(this.app.coffee);
    setFont(ctx, 22);
    const w = 56 + ctx.measureText(str).width + 16;
    const h = 42;
    const x = right - w;
    rrect(ctx, x, y + 4, w, h, h / 2);
    ctx.fillStyle = 'rgba(10,16,40,0.45)';
    ctx.fill();
    rrect(ctx, x, y, w, h, h / 2);
    fillOutline(ctx, '#1b2550', 3);
    ctx.save();
    ctx.translate(x + 26, y + h / 2);
    ICONS.coffee(ctx, 11);
    ctx.restore();
    text(ctx, str, x + 52, y + h / 2 + 1, { size: 22, align: 'left', color: '#ffe0b0' });
  }

  card(ctx, r, title) {
    rrect(ctx, r.x, r.y + 8, r.w, r.h, 24);
    ctx.fillStyle = 'rgba(10,16,40,0.5)';
    ctx.fill();
    rrect(ctx, r.x, r.y, r.w, r.h, 24);
    fillOutline(ctx, '#34497f', 4);
    text(ctx, title, r.x + r.w / 2, r.y + 28, { size: 24, color: GOLD });
  }

  // ── Desafio do dia ──
  drawChallenge(ctx, L) {
    const app = this.app;
    const c = L.left;
    this.card(ctx, c, tr('DESAFIO DO DIA'));
    if (!app.dailyOpen()) {
      const cy = c.y + c.h / 2;
      ctx.save();
      ctx.translate(c.x + c.w / 2, cy - 40);
      ICONS.lock(ctx, 26);
      ctx.restore();
      const got = app.wonMaps().length;
      text(ctx, tr('Vença {n} fases pra liberar', { n: DAILY.unlock }), c.x + c.w / 2, cy + 20, { size: 20 });
      text(ctx, `${got}/${DAILY.unlock}`, c.x + c.w / 2, cy + 50, { size: 18, color: '#d8e6ff' });
      return;
    }
    const ch = app.challenge;
    const map = MAPS[ch.map];
    // miniatura da fase, com o número dela
    const th = L.thumb;
    ctx.save();
    rrect(ctx, th.x, th.y, th.w, th.h, 12);
    ctx.clip();
    ctx.drawImage(this.thumb(ch.map, Math.round(th.w), th.h), th.x, th.y, th.w, th.h);
    ctx.restore();
    rrect(ctx, th.x, th.y, th.w, th.h, 12);
    ctx.lineWidth = 3;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
    rrect(ctx, th.x + 8, th.y + 8, 52, 26, 13);
    fillOutline(ctx, 'rgba(20,28,60,0.85)', 2);
    text(ctx, `${map.season + 1}-${map.number}`, th.x + 34, th.y + 21, { size: 16 });
    // os modificadores
    ch.mods.forEach((id, k) => {
      const m = MODS[id];
      const y = th.y + th.h + 30 + k * 50;
      // restrição em vermelho, bônus em verde (com o − e o + na frente)
      const color = m.bonus ? '#3dff9a' : '#ff7a8a';
      rrect(ctx, c.x + 20, y - 18, 30, 36, 10);
      fillOutline(ctx, m.bonus ? '#2a8f55' : '#a8455a', 2.5);
      text(ctx, m.bonus ? '+' : '−', c.x + 35, y + 1, { size: 24 });
      text(ctx, tr(m.name), c.x + 62, y - 8, { size: 19, align: 'left', color });
      const [a, b] = ch.blocked;
      const desc = id === 'blocked' ? tr(m.desc, { a: TOWERS[a].name, b: TOWERS[b].name }) : tr(m.desc);
      text(ctx, desc, c.x + 62, y + 12, { size: 15, align: 'left', color: '#d8e6ff' });
    });
    // recompensa e sequência
    const ry = c.y + c.h - 120;
    const streak = app.dailyStreak;
    if (ch.won) {
      text(ctx, tr('✔ VENCIDO HOJE'), c.x + c.w / 2, ry, { size: 20, color: '#3dff9a' });
      text(ctx, tr(streak === 1 ? 'Sequência: {n} dia' : 'Sequência: {n} dias', { n: streak }), c.x + c.w / 2, ry + 24, { size: 15, color: '#ffe0b0' });
    } else if (ch.played && !this.returnTo) {
      // usou a tentativa e não venceu
      text(ctx, tr('Tentativa de hoje usada'), c.x + c.w / 2, ry + 10, { size: 20, color: '#ff9aa8' });
    } else {
      const coffee = dailyCoffee(streak + 1);
      const str = tr('Recompensa: +{n}', { n: coffee });
      setFont(ctx, 19);
      const w = ctx.measureText(str).width + 30;
      text(ctx, str, c.x + c.w / 2 - 15, ry, { size: 19, color: '#ffe0b0' });
      ctx.save();
      ctx.translate(c.x + c.w / 2 - 15 + w / 2, ry);
      ICONS.coffee(ctx, 9);
      ctx.restore();
      const sub = streak > 0
        ? tr(streak === 1 ? 'Sequência de {n} dia: vença hoje pra manter' : 'Sequência de {n} dias: vença hoje pra manter', { n: streak })
        : tr('Vença dias seguidos pra ganhar mais café');
      text(ctx, sub, c.x + c.w / 2, ry + 24, { size: 14, color: '#d8e6ff' });
    }
    // da pausa: volta pra partida; já jogou hoje: trancado até amanhã
    if (this.returnTo) bigButton(ctx, L.play, '#5fb4ff', tr('VOLTAR À PARTIDA'), { icon: 'play', size: 22, pressed: this.pressed === 'play' });
    else if (ch.played) bigButton(ctx, L.play, '#7d8fa8', tr('VOLTE AMANHÃ'), { icon: 'lock', size: 24 });
    else bigButton(ctx, L.play, '#3fd16b', tr('JOGAR'), { icon: 'play', size: 28, pressed: this.pressed === 'play' });
  }

  // ── Missões do dia ──
  drawMissions(ctx, L) {
    const c = L.right;
    this.card(ctx, c, tr('MISSÕES DO DIA'));
    this.app.missions.forEach((m, k) => {
      const r = L.rows[k];
      const def = MISSION[m.id];
      const done = m.n >= m.goal;
      rrect(ctx, r.x, r.y, r.w, r.h, 16);
      ctx.fillStyle = m.claimed ? 'rgba(61,255,154,0.08)' : 'rgba(10,16,40,0.35)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = done && !m.claimed ? '#3dff9a' : 'rgba(255,255,255,0.12)';
      ctx.stroke();
      const label = tr(def.text, { n: m.goal, tower: m.tower ? TOWERS[m.tower].name : '' });
      text(ctx, label, r.x + 16, r.y + 26, { size: 17, align: 'left', color: m.claimed ? '#9fb2d8' : '#ffffff' });
      // barra de progresso
      const bar = { x: r.x + 16, y: r.y + 58, w: r.w - 168, h: 26 };
      rrect(ctx, bar.x, bar.y, bar.w, bar.h, 13);
      fillOutline(ctx, '#1b2550', 2.5);
      const f = clamp(m.n / m.goal, 0, 1);
      if (f > 0) {
        rrect(ctx, bar.x + 3, bar.y + 3, Math.max(20, (bar.w - 6) * f), bar.h - 6, 10);
        ctx.fillStyle = done ? '#3fd16b' : '#5fb4ff';
        ctx.fill();
      }
      text(ctx, `${Math.floor(m.n)}/${m.goal}`, bar.x + bar.w / 2, bar.y + bar.h / 2 + 1, { size: 15 });
      // à direita: COLETAR, o ✔ de já coletada ou a recompensa
      const b = r.claim;
      if (m.claimed) text(ctx, '✔', b.x + b.w / 2, b.y + b.h / 2, { size: 30, color: '#3dff9a' });
      else if (done) {
        const pulse = 1 + Math.sin(this.t * 6) * 0.04;
        ctx.save();
        ctx.translate(b.x + b.w / 2, b.y + b.h / 2);
        ctx.scale(pulse, pulse);
        ctx.translate(-(b.x + b.w / 2), -(b.y + b.h / 2));
        button(ctx, b, '#3fd16b', { radius: 14, depth: 5, pressed: this.pressed === k });
        text(ctx, tr('COLETAR'), b.x + b.w / 2, b.y + (b.h - 5) / 2 + 1 + (this.pressed === k ? 4 : 0), { size: 19 });
        ctx.restore();
      } else {
        text(ctx, `+${formatCoffee(MISSION_COFFEE)}`, b.x + b.w / 2 - 12, b.y + b.h / 2, { size: 22, color: '#ffe0b0' });
        ctx.save();
        ctx.translate(b.x + b.w / 2 + 22, b.y + b.h / 2);
        ICONS.coffee(ctx, 10);
        ctx.restore();
      }
    });
  }

  pointerDown(x, y) {
    const L = this.layout();
    if (inRect(L.back, x, y)) {
      this.app.sound.play('click');
      this.leave();
      return;
    }
    if (this.app.dailyOpen() && inRect(L.play, x, y)) {
      if (!this.returnTo && this.app.dailyPlayed()) {
        this.app.sound.play('error');
        return;
      }
      this.pressed = 'play';
      return;
    }
    const k = L.rows.findIndex((r) => inRect(r.claim, x, y));
    const m = this.app.missions[k];
    if (m && !m.claimed && m.n >= m.goal) this.pressed = k;
  }

  pointerUp(x, y) {
    const p = this.pressed;
    this.pressed = null;
    if (p == null) return;
    const L = this.layout();
    if (p === 'play') {
      if (!inRect(L.play, x, y)) return;
      this.app.sound.play('click');
      if (this.returnTo) this.leave();
      else this.app.startMap(this.app.challenge.map, 'daily');
      return;
    }
    const b = L.rows[p].claim;
    if (!inRect(b, x, y) || !this.app.claimMission(p)) return;
    this.app.sound.play('upgrade');
    this.gains.push({ x: b.x + b.w / 2, y: b.y, t: 0 });
  }

  pointerCancel() {
    this.pressed = null;
  }

  // Voltar: pra partida pausada (se veio do menu de pausa) ou pros mapas
  leave() {
    const game = this.returnTo;
    if (game) this.app.go(() => game);
    else this.app.goMaps();
  }

  key(k) {
    if (k === 'Escape') this.leave();
    if (k === 'Enter' && this.app.dailyOpen() && !this.returnTo && !this.app.dailyPlayed()) this.app.startMap(this.app.challenge.map, 'daily');
  }
}
