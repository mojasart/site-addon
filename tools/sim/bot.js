// ─────────────────────────────────────────────────────────────
//  BOT: joga uma partida inteira sem tela (usa a mesma lógica do jogo).
//
//  A cada meio segundo de jogo o bot gasta o dinheiro: coloca defesas onde
//  elas cobrem mais caminho ou compra upgrades, conforme o perfil. Cada
//  perfil tem um estilo e o `seed` dá a variação entre partidas.
// ─────────────────────────────────────────────────────────────
import { Game } from '../../firewall-defense/src/game.js';
import { TOWERS } from '../../firewall-defense/src/data/towers.js';
import { MIN_VIEW_W } from '../../firewall-defense/src/config.js';
import { COLS, ROWS, tileCenter } from '../../firewall-defense/src/core/grid.js';
import { seeded } from '../../firewall-defense/src/util.js';

// peso de cada defesa na hora de escolher o que colocar, chance de preferir
// upgrade a uma defesa nova, e quantos lugares bons ele considera (variação)
export const PROFILES = {
  equilibrado: { w: { hacker: 4, firewall: 3, pinguim: 2, scanner: 2 }, up: 0.45, top: 2 },
  dano: { w: { hacker: 5, firewall: 4, pinguim: 0.5, scanner: 1 }, up: 0.55, top: 2 },
  economia: { w: { hacker: 4, firewall: 3, pinguim: 1.5, scanner: 2, minerador: 2 }, up: 0.4, top: 2, eco: true },
  laser: { w: { hacker: 2, firewall: 2, pinguim: 1.5, scanner: 5 }, up: 0.5, top: 2 },
  aleatorio: { w: { hacker: 3, firewall: 3, pinguim: 3, scanner: 2, minerador: 1, honeypot: 1 }, up: 0.35, top: 8 },
};

const SPEED_LIMIT = 2400; // segundos de jogo (só pra não travar)

export function playMap(mapIndex, profileName, seed, mode = 'normal') {
  const profile = PROFILES[profileName];
  const rnd = seeded(seed * 9973 + mapIndex * 31 + 7);
  const app = {
    sound: { play() {} },
    viewW: MIN_VIEW_W, // tela mais estreita: o mapa ocupa tudo
    debug: false,
    pixelScale: 1,
    recordStars() {},
  };
  const game = new Game(app, mapIndex, mode);
  const samples = pathSamples(game);
  const spots = candidateSpots(game);
  const cover = new Map(); // `${x},${y},${range}` → amostras cobertas

  const coverage = (x, y, range) => {
    const k = `${x},${y},${range}`;
    let v = cover.get(k);
    if (v == null) {
      v = 0;
      for (const s of samples) if (Math.hypot(s.x - x, s.y - y) <= range) v += s.w;
      cover.set(k, v);
    }
    return v;
  };

  const pickWeighted = (weights) => {
    // no modo platina, o aliado bloqueado fica de fora
    const entries = Object.entries(weights).filter(([k, w]) => w > 0 && !game.isLocked(k));
    let total = entries.reduce((a, [, w]) => a + w, 0);
    let r = rnd() * total;
    for (const [k, w] of entries) if ((r -= w) <= 0) return k;
    return entries[entries.length - 1][0];
  };

  function bestSpot(type) {
    const def = TOWERS[type];
    const list = [];
    if (def.onPath) {
      // honeypot: em cima do caminho, perto da base
      for (const s of samples) if (s.late && game.canPlace(type, s.x, s.y)) list.push({ x: s.x, y: s.y, v: s.w + rnd() });
    } else if (def.attack === 'farm') {
      // minerador: nas seasons com pilha de bitcoin, só em cima de uma pilha livre;
      // senão, onde cobre menos caminho (guarda os lugares bons)
      const pool = game.coinTiles.length ? game.coinTiles : spots;
      for (const p of pool) if (game.canPlace(type, p.x, p.y)) list.push({ x: p.x, y: p.y, v: -coverage(p.x, p.y, 110) + rnd() });
    } else {
      const range = Number.isFinite(def.range) ? Math.min(def.range, 260) : 260;
      for (const p of spots) {
        if (!game.canPlace(type, p.x, p.y)) continue;
        list.push({ x: p.x, y: p.y, v: coverage(p.x, p.y, range) });
      }
    }
    if (!list.length) return null;
    list.sort((a, b) => b.v - a.v);
    if (!def.onPath && def.attack !== 'farm' && list[0].v < 1.5) return null; // lugar ruim demais
    return list[Math.floor(rnd() * Math.min(profile.top, list.length))];
  }

  // vêm blindados (Trojan, Locker, Ransomware) nas próximas 3 rodadas?
  const ARMORED = new Set(['trojan', 'locker', 'ransomware']);
  function armorSoon() {
    const r = game.rounds;
    // platina: o chefão (blindado) vem no fim do tempo; se prepara no último minuto
    if (game.platinum && game.platLeft < 60) return true;
    for (let k = r.started; k < Math.min(r.total, r.started + 3); k++) if (r.rounds[k].some((g) => ARMORED.has(g.type))) return true;
    return false;
  }
  const isPiercer = (t) => t.hitsArmored && (t.def.attack === 'pulse' ? t.stats.damage > 0 : t.def.attack !== 'decoy');

  function think() {
    // Ransomware criptografou defesas: paga o resgate primeiro (parada não ajuda)
    for (const t of game.towers) if (t.ransom && game.money >= t.ransom) game.payRansom(t);
    for (let guard = 0; guard < 6; guard++) {
      const fighters = game.towers.filter((t) => t.def.attack !== 'farm' && t.def.attack !== 'decoy');
      const piercers = fighters.filter(isPiercer);
      const needPierce = armorSoon() && piercers.length < Math.max(1, Math.ceil(fighters.length * 0.35));
      const ups = game.towers.filter((t) => t.nextUpgrade && t.nextUpgrade.cost <= game.money);
      const wantUp = ups.length && !needPierce && (rnd() < profile.up || game.towers.length >= 14);
      if (wantUp) {
        // melhora quem mais trabalha; com blindados vindo, quem fura blindagem primeiro
        ups.sort((a, b) => (armorSoon() ? isPiercer(b) - isPiercer(a) : 0) || b.pops - a.pops);
        game.buyUpgrade(ups[0]);
        continue;
      }
      // economia: 1 minerador cedo, outro depois
      const miners = game.towers.filter((t) => t.type === 'minerador').length;
      let type;
      if (profile.eco && miners < 1 && game.towers.length >= 2) type = 'minerador';
      else if (profile.eco && miners < 2 && game.towers.length >= 8) type = 'minerador';
      else type = pickWeighted(profile.w);
      // blindados chegando: garante quem fura blindagem (Golem ou Robô NMAP)
      if (needPierce) type = game.blocked === 'firewall' ? 'scanner' : game.blocked === 'scanner' ? 'firewall' : rnd() < 0.5 ? 'firewall' : 'scanner';
      if (game.isLocked(type)) type = pickWeighted(profile.w); // aliado bloqueado (platina) ou fora do tutorial (1-1)
      const def = TOWERS[type];
      if (def.cost > game.money) return;
      const spot = bestSpot(type);
      if (!spot) {
        if (ups.length) game.buyUpgrade(ups[0]);
        return;
      }
      game.place(type, spot.x, spot.y);
    }
  }

  game.playPressed();
  const dt = 1 / 60;
  let time = 0;
  let tick = 0;
  while (game.state === 'playing' && time < SPEED_LIMIT) {
    if (tick++ % 30 === 0) think();
    game.step(dt);
    time += dt;
  }
  return {
    won: game.state === 'won',
    round: game.rounds.done,
    total: game.rounds.total,
    time: game.platTime,
    boss: game.bossCalled,
    waves: game.rounds.started,
    lives: game.lives,
    towers: game.towers.length,
  };
}

// Pontos ao longo de todas as rotas (só a parte visível), com peso maior
// perto da base e no trecho comum das rotas (ali passa todo mundo)
function pathSamples(game) {
  const out = [];
  const routes = game.path.routes;
  routes.forEach((r, k) => {
    const start = game.view.spawnDists[k];
    for (let d = start; d < r.length; d += 12) {
      const p = r.pointAt(d);
      const late = r.length - d < 260;
      out.push({ x: p.x, y: p.y, w: 1 / routes.length + (late ? 0.15 : 0), late });
    }
  });
  return out;
}

// Lugares possíveis pra uma defesa: o centro de cada quadrado da grade
function candidateSpots() {
  const out = [];
  for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) out.push(tileCenter(c, r));
  return out;
}
