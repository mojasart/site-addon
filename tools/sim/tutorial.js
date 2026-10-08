// ─────────────────────────────────────────────────────────────
//  Bot do tutorial (1-1, modo normal): joga seguindo a mãozinha, tocando
//  só onde o tutorial aponta, como um jogador novo faria.
//
//    node tools/sim/tutorial.js            → 1 partida, com o passo a passo
//    node tools/sim/tutorial.js --runs 20  → 20 partidas, só o resumo
//    node tools/sim/tutorial.js --passive  → só faz o que a mãozinha manda
//                                            (não constrói nada a mais)
//
//  Falha (exit 1) se tomar dano na 1ª onda ou se o tutorial travar/não
//  terminar. Nos momentos livres (tutorial esperando ou já acabado) ele
//  gasta o dinheiro em Hacker e Golem onde mais cobre o caminho.
// ─────────────────────────────────────────────────────────────
import { Game } from '../../firewall-defense/src/game.js';
import { MIN_VIEW_W } from '../../firewall-defense/src/config.js';
import { TILE, COLS, ROWS, tileCenter } from '../../firewall-defense/src/core/grid.js';
import { TOWERS } from '../../firewall-defense/src/data/towers.js';

const DT = 1 / 60;

export function playTutorial(log = () => {}, { passive = false } = {}) {
  const save = { inventory: {} };
  const app = {
    sound: { play() {} },
    viewW: MIN_VIEW_W,
    debug: false,
    pixelScale: 1,
    recordStars() {},
    save,
    playerName: 'Bot',
    get inventory() {
      return save.inventory;
    },
    consumeItem(id) {
      if (!(save.inventory[id] > 0)) return false;
      save.inventory[id]--;
      return true;
    },
  };
  const g = new Game(app, 0, 'normal');
  const tut = g.tutorial;
  if (!tut) throw new Error('a 1-1 não abriu o tutorial');

  const tap = (x, y) => {
    g.pointerDown(x, y, 'touch');
    g.pointerUp(x, y);
  };
  const r = { livesStart: g.lives, wave1Lives: null, wave2Lives: null, honey: null, steps: 0 };
  let lastStep = -1;
  let stuck = 0;

  for (let f = 0; f < 60 * 60 * 30 && g.state === 'playing'; f++) {
    g.update(DT);
    if (r.wave1Lives == null && g.rounds.done >= 1) r.wave1Lives = g.lives;
    if (r.wave2Lives == null && g.rounds.done >= 2) r.wave2Lives = g.lives;

    if (!tut.done) {
      const s = tut.step;
      if (tut.i !== lastStep) {
        lastStep = tut.i;
        stuck = 0;
        r.steps++;
        const text = typeof s.text === 'function' ? s.text() : s.text;
        log(`  [${String(tut.i).padStart(2)}] ${s.kind.padEnd(4)} onda ${g.rounds.done + 1} vidas ${g.lives}${text ? '  ' + text : ''}`);
      }
      if (++stuck > 60 * 120) throw new Error(`tutorial travou no passo ${tut.i} (${s.kind})`);
      if (s.kind === 'say' && tut.t > 0.6) tap(g.mapW / 2, 300);
      else if (s.kind === 'do' && tut.t > 0.8 && (f % 30 === 0)) {
        const tg = s.target();
        if (s.event[0] === 'place' && s.event[1] === 'honeypot' && g.placing === 'honeypot') r.honey = honeyInfo(g, tg);
        tap(tg.x, tg.y);
      }
    }
    // momento livre: constrói; depois do tutorial, solta as ondas
    if (!passive && (tut.done || tut.step.kind === 'wait')) build(g);
    if (tut.done && !g.rounds.active && g.state === 'playing') g.playPressed();
  }
  r.won = g.state === 'won';
  r.lives = g.lives;
  r.done = tut.done;
  return r;
}

// Hacker e Golem (firewall) alternando, no quadrado livre que mais cobre o caminho
function build(g) {
  const type = g.towers.filter((t) => t.type === 'hacker').length > g.towers.filter((t) => t.type === 'firewall').length ? 'firewall' : 'hacker';
  if (g.isLocked(type) || !g.canAfford(g.costOf(type))) return;
  const route = g.path.routes[0];
  const range = TOWERS[type].range ?? 100;
  let best = null;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = tileCenter(c, r);
      if (!g.canPlace(type, p.x, p.y)) continue;
      let v = 0;
      for (let d = 0; d < route.length; d += 16) {
        const q = route.pointAt(d);
        if (Math.hypot(q.x - p.x, q.y - p.y) <= range) v++;
      }
      if (!best || v > best.v) best = { ...p, v };
    }
  }
  if (best) g.place(type, best.x, best.y);
}

// Onde o pote foi parar: distância (em quadrados) até o Hacker e até o
// vírus da frente, pelo caminho
function honeyInfo(g, tg) {
  const x = tg.x - g.offsetX;
  const y = tg.y;
  const hk = g.towers.find((t) => t.type === 'hacker');
  const lead = g.enemies.filter((e) => !e.dead).sort((a, b) => b.dist - a.dist)[0];
  return {
    hacker: hk ? Math.hypot(hk.x - x, hk.y - y) / TILE : null,
    hackerRange: hk ? hk.stats.range / TILE : null,
    lead: lead ? Math.hypot(lead.x - x, lead.y - y) / TILE : null,
  };
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('tutorial.js')) {
  const args = process.argv.slice(2);
  const i = args.indexOf('--runs');
  const runs = i >= 0 ? Number(args[i + 1]) : 1;
  const passive = args.includes('--passive');
  let fails = 0;
  for (let n = 1; n <= runs; n++) {
    const r = playTutorial(runs === 1 ? console.log : () => {}, { passive });
    const hit = r.wave1Lives < r.livesStart;
    const h = r.honey;
    const honey = h ? `pote a ${h.hacker.toFixed(1)} quadrados do Hacker (alcance ${h.hackerRange.toFixed(1)}), vírus a ${h.lead?.toFixed(1)}` : 'pote: ?';
    console.log(
      `#${n} ${r.won ? 'venceu' : 'PERDEU'}  vidas ${r.livesStart}→1ª onda ${r.wave1Lives}→2ª ${r.wave2Lives}→fim ${r.lives}  ${honey}${hit ? '  ← DANO NA 1ª ONDA' : ''}${r.done ? '' : '  ← TUTORIAL INCOMPLETO'}`,
    );
    if (hit || !r.done) fails++;
  }
  console.log(fails ? `${fails}/${runs} com problema` : `ok: ${runs}/${runs} sem dano na 1ª onda`);
  process.exit(fails ? 1 : 0);
}
