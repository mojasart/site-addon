import { MAPS } from '../data/maps.js';
import { VIEW_H, OUTLINE, LAYER_HP } from '../config.js';
import { fmt, plural } from '../util.js';
import { ENEMIES, worth, threat } from '../data/enemies.js';
import { TOWERS, TOWER_ORDER } from '../data/towers.js';
import { rrect, fillOutline, cachedSprite } from '../render/canvas.js';
import { iconButton, inRect } from '../render/widgets.js';
import { drawVirusIcon } from '../render/viruses.js';
import { drawCharacter } from '../render/characters.js';
import { AGES, statsAt, statRows } from '../data/towerInfo.js';

/* ════════════════════════════════════════════════════════════
 *  CATÁLOGO (ameaças e defesas)
 *  Um "computador" (monitor CRT com terminal verde) com duas abas:
 *  - AMEAÇAS (THREAT_DB.EXE): ameaça que ainda não apareceu em nenhuma
 *    fase vira silhueta, com cadeado, e a ficha mostra ACESSO NEGADO.
 *  - DEFESAS (AGENTS_DB.EXE): os personagens, com os status de cada
 *    nível e a evolução criança → adolescente → adulto.
 *  Lista à esquerda e a ficha da escolhida à direita.
 * ════════════════════════════════════════════════════════════ */

const ORDER = ['v1', 'v2', 'v3', 'v4', 'v5', 'worm', 'worm2', 'worm3', 'worm4', 'spyware', 'trojan', 'locker', 'adware', 'ransomware'];
const TABS = [
  { id: 'threats', label: 'AMEAÇAS', file: 'THREAT_DB.EXE', items: ORDER },
  { id: 'towers', label: 'DEFESAS', file: 'AGENTS_DB.EXE', items: TOWER_ORDER },
];
const ATTACK_KIND = { projectile: 'PROJÉTIL', pulse: 'ONDA', beam: 'LASER', farm: 'ECONOMIA', decoy: 'ISCA' };
const LEVEL_TIME = 2.2; // segundos de cada idade no retrato (quando nenhuma foi escolhida)
const MONO = '"Courier New", ui-monospace, Menlo, Consolas, monospace';
const GREEN = '#3dff9a';
const DIM = '#1f8a52';
const BG = '#03130a';
const RED = '#ff5a6a';

export class CatalogScene {
  // returnTo: partida pausada pra onde o voltar leva (aberto pelo menu de pausa)
  constructor(app, { returnTo = null } = {}) {
    this.app = app;
    this.returnTo = returnTo;
    this.t = 0;
    this.tab = 0;
    this.sel = [Math.max(0, ORDER.findIndex((k) => app.hasSeen(k))), 0]; // um por aba
    this.level = null; // idade escolhida na ficha da defesa (null = vai alternando)
    this.typed = 0; // letras já "digitadas" da frase da ficha
  }

  get items() {
    return TABS[this.tab].items;
  }

  layout() {
    const W = this.app.viewW;
    const mon = { x: 76, y: 14, w: W - 152, h: 470 };
    const scr = { x: mon.x + 22, y: mon.y + 20, w: mon.w - 44, h: mon.h - 76 };
    const list = { x: scr.x + 14, y: scr.y + 78, w: 236, h: scr.h - 92 };
    const rowH = list.h / this.items.length;
    const detail = { x: list.x + list.w + 16, y: list.y, w: scr.x + scr.w - 14 - (list.x + list.w + 16), h: list.h };
    const pr = { x: detail.x + 16, y: detail.y + 16, s: Math.min(150, detail.h * 0.48) };
    const evoY = pr.y + pr.s + 18;
    return {
      back: { x: 10, y: 14, w: 56, h: 56 },
      mon,
      scr,
      list,
      tabs: TABS.map((_, i) => ({ x: scr.x + 14 + i * 166, y: scr.y + 40, w: 156, h: 30 })),
      rows: this.items.map((_, i) => ({ x: list.x, y: list.y + i * rowH, w: list.w, h: rowH - 4 })),
      detail,
      pr,
      evoY,
      evo: [0, 1, 2].map((i) => ({ x: detail.x + 12, y: evoY + 12 + i * 20, w: detail.w - 24, h: 18 })),
    };
  }

  update(dt) {
    this.t += dt;
    this.typed += dt * 45;
  }

  select(i) {
    if (i === this.sel[this.tab] || i < 0 || i >= this.items.length) return;
    this.sel[this.tab] = i;
    this.level = null;
    this.typed = 0;
    this.app.sound.play('click');
  }

  setTab(i) {
    if (i === this.tab || i < 0 || i >= TABS.length) return;
    this.tab = i;
    this.level = null;
    this.typed = 0;
    this.app.sound.play('click');
  }

  render(ctx) {
    const W = this.app.viewW;
    const L = this.layout();
    // fundo: parede escura com um brilho verde vindo da tela
    const g = ctx.createRadialGradient(W / 2, 250, 60, W / 2, 250, W * 0.7);
    g.addColorStop(0, '#1d3a3a');
    g.addColorStop(1, '#0d1422');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, VIEW_H);

    this.drawMonitor(ctx, L);
    this.drawScreen(ctx, L);
    iconButton(ctx, L.back, '#5fb4ff', 'back');
  }

  drawMonitor(ctx, L) {
    const { mon, scr } = L;
    // pé do monitor
    ctx.beginPath();
    ctx.moveTo(mon.x + mon.w / 2 - 70, mon.y + mon.h - 4);
    ctx.lineTo(mon.x + mon.w / 2 + 70, mon.y + mon.h - 4);
    ctx.lineTo(mon.x + mon.w / 2 + 110, VIEW_H - 12);
    ctx.lineTo(mon.x + mon.w / 2 - 110, VIEW_H - 12);
    ctx.closePath();
    fillOutline(ctx, '#9aa1b2', 3);
    // carcaça
    rrect(ctx, mon.x, mon.y + 6, mon.w, mon.h, 28);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fill();
    rrect(ctx, mon.x, mon.y, mon.w, mon.h, 28);
    fillOutline(ctx, '#cfd3dc', 4);
    rrect(ctx, mon.x + 6, mon.y + 6, mon.w - 12, mon.h * 0.45, 24);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fill();
    // borda funda da tela
    rrect(ctx, scr.x - 8, scr.y - 8, scr.w + 16, scr.h + 16, 20);
    fillOutline(ctx, '#7e8597', 3);
    // nome e luz de "ligado" embaixo da tela
    const by = scr.y + scr.h + 30;
    mono(ctx, 'FIREWALL OS', mon.x + 40, by, 15, '#6b7283', 'left', true);
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
    ctx.fillStyle = BG;
    ctx.fillRect(scr.x, scr.y, scr.w, scr.h);

    // barra de título da "janela"
    ctx.fillStyle = '#0c3a22';
    ctx.fillRect(scr.x, scr.y, scr.w, 32);
    mono(ctx, `C:\\SEGURANCA\\${TABS[this.tab].file}`, scr.x + 14, scr.y + 17, 15, GREEN, 'left', true);
    if (this.tab === 0) {
      const seen = ORDER.filter((k) => this.app.hasSeen(k)).length;
      mono(ctx, `AMEAÇAS CATALOGADAS: ${seen}/${ORDER.length}`, scr.x + scr.w - 14, scr.y + 17, 13, GREEN, 'right', true);
    } else {
      mono(ctx, `DEFESAS DISPONÍVEIS: ${TOWER_ORDER.length}`, scr.x + scr.w - 14, scr.y + 17, 13, GREEN, 'right', true);
    }

    this.drawTabs(ctx, L);
    this.drawList(ctx, L);
    if (this.tab === 0) this.drawThreat(ctx, L);
    else this.drawTower(ctx, L);

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

  // Abas no estilo "[ AMEAÇAS ]": a ativa fica preenchida
  drawTabs(ctx, L) {
    L.tabs.forEach((r, i) => {
      const active = i === this.tab;
      if (active) {
        ctx.fillStyle = GREEN;
        ctx.fillRect(r.x, r.y, r.w, r.h);
      } else {
        ctx.strokeStyle = DIM;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
      }
      mono(ctx, `[ ${TABS[i].label} ]`, r.x + r.w / 2, r.y + r.h / 2, 15, active ? BG : GREEN, 'center', true);
    });
    const r = L.tabs.at(-1);
    ctx.fillStyle = DIM;
    ctx.fillRect(L.list.x, r.y + r.h + 1, L.scr.x + L.scr.w - 14 - L.list.x, 1.5);
  }

  drawList(ctx, L) {
    const sel = this.sel[this.tab];
    L.rows.forEach((r, i) => {
      const type = this.items[i];
      const seen = this.tab === 1 || this.app.hasSeen(type);
      const name = this.tab === 1 ? TOWERS[type].name : ENEMIES[type].name;
      const active = i === sel;
      if (active) {
        ctx.fillStyle = seen ? GREEN : RED;
        ctx.fillRect(r.x, r.y, r.w, r.h);
      } else {
        ctx.strokeStyle = DIM;
        ctx.lineWidth = 1;
        ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
      }
      const ink = active ? BG : seen ? GREEN : RED;
      const icon = Math.min(r.h - 2, 40);
      ctx.save();
      ctx.translate(r.x + 22, r.y + r.h / 2);
      if (this.tab === 1) drawTowerIcon(ctx, type, icon, 2, this.t + i, 0);
      else this.drawIcon(ctx, type, 30, seen);
      ctx.restore();
      mono(ctx, `${String(i + 1).padStart(2, '0')}`, r.x + 46, r.y + r.h / 2, 12, active ? BG : DIM, 'left', true);
      mono(ctx, seen ? name.toUpperCase() : '?????????', r.x + 72, r.y + r.h / 2, 15, ink, 'left', true);
    });
  }

  // Sprite da ameaça (imagem ou o desenho do jogo, pros que não têm imagem:
  // Spyware, Adware...); se ainda não foi descoberta, só a silhueta apagada
  drawIcon(ctx, type, size, seen) {
    const def = ENEMIES[type];
    if (seen) {
      drawVirusIcon(ctx, type, def, size / 3);
      return;
    }
    const c = cachedSprite(`sil:${type}:${size}`, size, (g) => {
      drawVirusIcon(g, type, def, size / 3);
      g.globalCompositeOperation = 'source-in';
      g.fillStyle = '#0f3a24'; // silhueta "apagada" (preta some na tela escura)
      g.fillRect(-size / 2, -size / 2, size, size);
    });
    ctx.drawImage(c, -size / 2, -size / 2, size, size);
  }

  // Moldura do retrato com o "radar" girando; draw desenha o conteúdo no centro
  drawPortrait(ctx, L, draw) {
    const { pr } = L;
    const cx = pr.x + pr.s / 2;
    const cy = pr.y + pr.s / 2;
    ctx.strokeStyle = DIM;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(pr.x + 0.5, pr.y + 0.5, pr.s, pr.s);
    ctx.save();
    ctx.beginPath();
    ctx.rect(pr.x, pr.y, pr.s, pr.s);
    ctx.clip();
    for (const k of [0.3, 0.45]) {
      ctx.beginPath();
      ctx.arc(cx, cy, pr.s * k, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(61,255,154,0.25)';
      ctx.stroke();
    }
    const a = this.t * 2.2;
    const sweep = ctx.createConicGradient ? ctx.createConicGradient(a, cx, cy) : null;
    if (sweep) {
      sweep.addColorStop(0, 'rgba(61,255,154,0.28)');
      sweep.addColorStop(0.12, 'rgba(61,255,154,0)');
      sweep.addColorStop(1, 'rgba(61,255,154,0)');
      ctx.fillStyle = sweep;
      ctx.fillRect(pr.x, pr.y, pr.s, pr.s);
    }
    ctx.translate(cx, cy);
    draw(pr.s);
    ctx.restore();
  }

  // Bloco de status "NOME....... valor" ao lado do retrato
  drawRows(ctx, rows, fx, y0, step = 24) {
    rows.forEach(([k, v], i) => {
      const y = y0 + i * step;
      mono(ctx, `${k}`.padEnd(11, '.'), fx, y, 14, DIM, 'left', true);
      mono(ctx, v, fx + 118, y, 14, GREEN, 'left', true);
    });
  }

  // Frase do personagem, digitada aos poucos
  drawLore(ctx, lore, x, y, w, size = 14) {
    const shown = lore.slice(0, Math.floor(this.typed));
    wrapMono(ctx, `"${shown}${shown.length < lore.length ? '█' : '"'}`, x, y, w, size, '#b9ffd8');
  }

  drawFrame(ctx, d) {
    ctx.strokeStyle = DIM;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(d.x + 0.5, d.y + 0.5, d.w - 1, d.h - 1);
  }

  drawThreat(ctx, L) {
    const { detail: d, pr } = L;
    const type = ORDER[this.sel[0]];
    const def = ENEMIES[type];
    const seen = this.app.hasSeen(type);
    this.drawFrame(ctx, d);
    this.drawPortrait(ctx, L, (s) => {
      ctx.translate(0, Math.sin(this.t * 3) * 3);
      this.drawIcon(ctx, type, s * 0.78, seen);
    });

    // dados ao lado do retrato
    const fx = pr.x + pr.s + 18;
    const fw = d.x + d.w - 16 - fx;
    if (!seen) {
      mono(ctx, 'ACESSO NEGADO', fx, pr.y + 22, 22, RED, 'left', true);
      wrapMono(ctx, 'Ameaça ainda não encontrada. Avance nas fases pra registrar o arquivo dela.', fx, pr.y + 56, fw, 14, DIM);
      return;
    }
    const cursor = Math.sin(this.t * 8) > 0 ? '_' : ' ';
    mono(ctx, `${def.name.toUpperCase()}${cursor}`, fx, pr.y + 18, 22, GREEN, 'left', true);
    const kind = [def.boss ? 'CHEFÃO' : null, def.armored ? 'BLINDADO' : null, def.spawn ? 'SE ESPALHA' : null, def.stealth ? 'INVISÍVEL' : null, def.ransom ? 'CRIPTOGRAFA' : null, def.ads ? 'ANÚNCIOS' : null].filter(Boolean);
    mono(ctx, kind.length ? `[ ${kind.join(' · ')} ]` : '[ COMUM ]', fx, pr.y + 44, 13, def.boss ? RED : DIM, 'left', true);

    const reward = def.reward ?? 1;
    this.drawRows(ctx, [
      ['VIDA', hpText(type)],
      ['DANO', `${threat(type)}`],
      ['VELOCIDADE', `${def.speed}`],
      ['DINHEIRO', reward === worth(type) ? `$${reward}` : `$${reward} - $${worth(type)}`],
    ], fx, pr.y + 76);

    // o que ele solta
    const kids = def.children.map(([c, n]) => `${n} ${plural(n, ENEMIES[c].name, namePlural(ENEMIES[c].name))}`).join(', ');
    const drops = def.spawn ? `Solta ${ENEMIES[def.spawn.type].name} a cada ${String(def.spawn.every).replace('.', ',')}s` : kids ? `Ao estourar solta: ${kids}` : 'Não solta nada ao estourar';
    const ly = pr.y + pr.s + 22;
    mono(ctx, '> ARQUIVO', d.x + 16, ly, 14, DIM, 'left', true);
    const kills = this.app.save.killsBy?.[type] ?? 0;
    mono(ctx, `${fmt(kills)} ${plural(kills, 'ABATIDO', 'ABATIDOS')}`, d.x + d.w - 16, ly, 14, GREEN, 'right', true);
    mono(ctx, drops, d.x + 16, ly + 24, 14, GREEN, 'left', true);
    this.drawLore(ctx, def.lore ?? def.desc ?? '', d.x + 16, ly + 52, d.w - 32);
  }

  // Idade mostrada na ficha da defesa: a escolhida, ou vai alternando sozinha
  shownLevel(def) {
    const max = def.upgrades.length;
    if (this.level !== null) return Math.min(this.level, max);
    return max ? Math.floor(this.t / LEVEL_TIME) % (max + 1) : 0;
  }

  drawTower(ctx, L) {
    const { detail: d, pr } = L;
    const type = TOWER_ORDER[this.sel[1]];
    const def = TOWERS[type];
    const lv = this.shownLevel(def);
    const s = statsAt(type, lv);
    this.drawFrame(ctx, d);
    // o personagem na idade do nível, atacando de tempos em tempos
    const attack = this.t % 1.6 < 0.4 ? 1 : 0;
    this.drawPortrait(ctx, L, (size) => drawTowerIcon(ctx, type, size * 0.8, lv, this.t, attack));

    const fx = pr.x + pr.s + 18;
    const cursor = Math.sin(this.t * 8) > 0 ? '_' : ' ';
    mono(ctx, `${def.name.toUpperCase()}${cursor}`, fx, pr.y + 18, 22, GREEN, 'left', true);
    const kind = [ATTACK_KIND[def.attack], def.canHitArmored ? 'FURA BLINDAGEM' : null, def.onPath ? 'NO CAMINHO' : null].filter(Boolean);
    mono(ctx, `[ ${kind.join(' · ')} ]`, fx, pr.y + 44, 13, DIM, 'left', true);
    const rows = towerRows(type, s, lv);
    this.drawRows(ctx, rows, fx, pr.y + 72, rows.length > 4 ? 21 : 24);

    // evolução: um nível por linha (tocar fixa a idade no retrato)
    mono(ctx, '> EVOLUÇÃO', d.x + 16, L.evoY, 14, DIM, 'left', true);
    const used = this.app.save.placedBy?.[type] ?? 0;
    mono(ctx, `USADO ${fmt(used)} ${plural(used, 'VEZ', 'VEZES')}`, d.x + d.w - 16, L.evoY, 14, GREEN, 'right', true);
    const levels = def.upgrades.length + 1;
    for (let i = 0; i < levels; i++) {
      const r = L.evo[i];
      const active = i === lv;
      if (active) {
        ctx.fillStyle = 'rgba(61,255,154,0.16)';
        ctx.fillRect(r.x, r.y, r.w, r.h);
      }
      const up = def.upgrades[i - 1];
      const age = levels > 1 ? AGES[i] : 'ÚNICO';
      const what = up ? `${up.name} (+$${up.cost})` : levels > 1 ? 'versão inicial' : 'sem upgrades';
      mono(ctx, `${active ? '▶' : ' '} NV${i + 1} · ${age.padEnd(11, ' ')} ${what}`, r.x + 4, r.y + r.h / 2, 13, active ? GREEN : DIM, 'left', true);
    }
    const last = L.evo[levels - 1];
    this.drawLore(ctx, def.lore ?? def.desc, d.x + 16, last.y + last.h + 15, d.w - 32, 13);
  }

  pointerDown(x, y) {
    const L = this.layout();
    if (inRect(L.back, x, y)) {
      this.app.sound.play('click');
      this.leave();
      return;
    }
    L.tabs.forEach((r, i) => {
      if (inRect(r, x, y)) this.setTab(i);
    });
    L.rows.forEach((r, i) => {
      if (inRect(r, x, y)) this.select(i);
    });
    if (this.tab === 1) {
      const def = TOWERS[TOWER_ORDER[this.sel[1]]];
      L.evo.forEach((r, i) => {
        if (i > def.upgrades.length || !inRect(r, x, y)) return;
        this.level = i;
        this.app.sound.play('click');
      });
    }
  }

  // Voltar: pra partida pausada (se veio do menu de pausa) ou pra tela dos
  // mapas (de onde o catálogo é aberto)
  leave() {
    const game = this.returnTo;
    if (game) this.app.go(() => game);
    else this.app.goMaps();
  }

  key(k) {
    if (k === 'Escape') this.leave();
    if (k === 'ArrowDown') this.select(this.sel[this.tab] + 1);
    if (k === 'ArrowUp') this.select(this.sel[this.tab] - 1);
    if (k === 'ArrowRight') this.setTab(this.tab + 1);
    if (k === 'ArrowLeft') this.setTab(this.tab - 1);
  }
}

function mono(ctx, str, x, y, size, color, align = 'left', bold = false) {
  ctx.font = `${bold ? 'bold ' : ''}${size}px ${MONO}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 6; // brilho de fósforo
  ctx.fillText(str, x, y);
  ctx.shadowBlur = 0;
}

function wrapMono(ctx, str, x, y, maxW, size, color) {
  ctx.font = `bold ${size}px ${MONO}`;
  const words = str.split(' ');
  let line = '';
  let yy = y;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      mono(ctx, line, x, yy, size, color, 'left', true);
      line = w;
      yy += size + 6;
    } else line = test;
  }
  if (line) mono(ctx, line, x, yy, size, color, 'left', true);
}

// Vírus de camadas (vida LAYER_HP cada): mostra camadas × vida de uma camada.
// Os outros: a vida muda com a fase, então mostra do mapa mais fácil ao mais difícil.
function layers(type) {
  const def = ENEMIES[type];
  const inner = def.children.find(([c]) => ENEMIES[c].hp <= LAYER_HP);
  return 1 + (inner ? layers(inner[0]) : 0);
}

// Plural do nome da ameaça: s na última palavra (Trojans, Vírus Amarelos; Vírus fica igual)
function namePlural(name) {
  return name.endsWith('s') ? name : `${name}s`;
}

function hpText(type) {
  const def = ENEMIES[type];
  if (def.hp <= LAYER_HP) {
    const n = layers(type);
    return n > 1 ? `${n} camadas de ${fmt(LAYER_HP)}` : fmt(LAYER_HP);
  }
  // como no jogo (Enemy.scaleHp): arredonda pra camadas inteiras
  const ps = MAPS.map((m) => m.pressure);
  const at = (p) => Math.max(LAYER_HP, Math.round((def.hp * p) / LAYER_HP) * LAYER_HP);
  const lo = at(Math.min(...ps));
  const hi = at(Math.max(...ps));
  return lo === hi ? fmt(lo) : `${fmt(lo)} - ${fmt(hi)}`;
}

// Personagem da defesa centrado no ponto atual, com `size` de altura
// (o desenho tem ~60 de altura, dos pés em y=14 até a cabeça em y≈-46)
function drawTowerIcon(ctx, type, size, level, t, attack) {
  const k = size / 62;
  ctx.save();
  ctx.translate(0, 16 * k);
  ctx.scale(k, k);
  drawCharacter(ctx, type, { t, face: 1, level, attack });
  ctx.restore();
}

function towerRows(type, s, level) {
  const def = TOWERS[type];
  const spent = def.cost + def.upgrades.slice(0, level).reduce((sum, u) => sum + u.cost, 0);
  return [['CUSTO', level ? `$${spent} (total)` : `$${spent}`], ...statRows(s)].slice(0, 5);
}
