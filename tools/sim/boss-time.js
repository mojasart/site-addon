// ─────────────────────────────────────────────────────────────
//  Quanto tempo o chefão da platina aguenta contra os bots.
//
//    node tools/sim/boss-time.js                → alguns mapas, 3 partidas por perfil
//    node tools/sim/boss-time.js --maps 1,5,10  → só esses mapas (números 1..45)
//    node tools/sim/boss-time.js --seeds 5      → mais partidas
//
//  Pra cada mapa: em quantas partidas os bots chegaram no chefão, quantas
//  venceram e quanto tempo (de jogo) o chefão durou do momento em que entra
//  até morrer (mediana e mínimo). Os bots jogam com todos os upgrades da
//  Dark Net, como na calibração da platina.
// ─────────────────────────────────────────────────────────────
import { playMap, PROFILES, ALL_PERKS } from './bot.js';
import { Game } from '../../firewall-defense/src/game.js';
import { MAPS } from '../../firewall-defense/src/data/maps.js';

const args = process.argv.slice(2);
const opt = (name, def) => (args.includes(name) ? args[args.indexOf(name) + 1] : def);
const maps = opt('--maps', '1,3,5,8,12,15,20,25,30,35,40,45').split(',').map((x) => Number(x) - 1);
const seeds = Number(opt('--seeds', 3));

// relógio de jogo e o momento em que o chefão entra / morre
const update = Game.prototype.step;
Game.prototype.step = function (dt) {
  update.call(this, dt);
  this.simT = (this.simT ?? 0) + dt;
  if (!this.bossCalled) return;
  const bosses = this.enemies.filter((e) => e.def.boss && e.round === this.rounds.started - 1);
  if (bosses.length && this.bossIn == null) this.bossIn = this.simT;
  if (this.bossIn != null && this.bossOut == null && !bosses.some((e) => !e.dead) && this.rounds.pending[this.rounds.started - 1] <= 0) this.bossOut = this.simT;
};
const games = [];
const callBoss = Game.prototype.callBoss;
Game.prototype.callBoss = function () {
  games.push(this);
  callBoss.call(this);
};

const median = (a) => (a.length ? [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] : null);
console.log('mapa             chegou  venceu  chefão dura (mediana / mínimo)');
for (const m of maps) {
  const times = [];
  let reached = 0;
  let won = 0;
  let n = 0;
  for (const profile of Object.keys(PROFILES)) {
    for (let s = 1; s <= seeds; s++) {
      games.length = 0;
      const r = playMap(m, profile, s, 'platinum', ALL_PERKS);
      n++;
      if (r.won) won++;
      const g = games[0];
      if (!g) continue;
      reached++;
      if (g.bossOut != null) times.push(g.bossOut - g.bossIn);
    }
  }
  const md = median(times);
  console.log(
    `${String(m + 1).padStart(2)} ${MAPS[m].id.padEnd(18)} ${String(reached).padStart(2)}/${n}   ${String(won).padStart(2)}/${n}   ` +
      (times.length ? `${md.toFixed(1)}s / ${Math.min(...times).toFixed(1)}s` : '—'),
  );
}
