// ─────────────────────────────────────────────────────────────
//  Bots no DESAFIO DO DIA (data/daily.js): joga os desafios dos próximos
//  dias, pra jogadores em pontos diferentes do jogo, e mostra a taxa de
//  vitória (comparando com a da mesma fase no modo normal, data/botStats.js).
//
//    node tools/sim/daily.js                  → 30 dias a partir de hoje
//    node tools/sim/daily.js --days 60        → mais dias
//    node tools/sim/daily.js --seeds 3        → mais partidas por perfil
//    node tools/sim/daily.js --progress 5,20  → jogadores que venceram até a fase 5 e até a 20
//
//  Os bots não usam itens, então o "Sem itens" pra eles é um dia normal.
//  Também mostra quantos vírus uma partida estoura (meta da missão "pops").
// ─────────────────────────────────────────────────────────────
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { availableParallelism } from 'node:os';
import { playMap, PROFILES } from './bot.js';
import { MAPS } from '../../firewall-defense/src/data/maps.js';
import { BOT_WIN } from '../../firewall-defense/src/data/botStats.js';
import { makeChallenge, MODS } from '../../firewall-defense/src/data/daily.js';

if (!isMainThread) {
  for (const job of workerData.jobs) {
    const r = playMap(job.challenge.map, job.profile, job.seed, 'daily', null, job.challenge);
    parentPort.postMessage({ ...job, won: r.won, pops: r.pops, round: r.round, total: r.total });
  }
  parentPort.postMessage({ done: true });
} else {
  const args = process.argv.slice(2);
  const opt = (name, def) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 ? args[i + 1] : def;
  };
  const days = Number(opt('days', 30));
  const seeds = Number(opt('seeds', 1));
  const progress = opt('progress', '5,15,30,45').split(',').map(Number);
  const now = new Date();
  const today = Math.floor((now.getTime() - now.getTimezoneOffset() * 60000) / 86400000);

  const jobs = [];
  for (const p of progress) {
    const won = MAPS.slice(0, p).map((_, i) => i);
    for (let d = 0; d < days; d++) {
      const challenge = makeChallenge(today + d, won);
      for (const profile of Object.keys(PROFILES)) for (let s = 1; s <= seeds; s++) jobs.push({ p, d, challenge, profile, seed: s });
    }
  }

  const nWorkers = Math.min(availableParallelism(), 16, jobs.length);
  const chunks = Array.from({ length: nWorkers }, () => []);
  jobs.forEach((j, i) => chunks[i % nWorkers].push(j));
  const results = [];
  const t0 = Date.now();
  await Promise.all(
    chunks.map(
      (chunk) =>
        new Promise((resolve, reject) => {
          const w = new Worker(new URL(import.meta.url), { workerData: { jobs: chunk } });
          w.on('message', (msg) => (msg.done ? resolve() : results.push(msg)));
          w.on('error', reject);
        }),
    ),
  );

  const pct = (a, b) => `${((a / Math.max(1, b)) * 100).toFixed(0).padStart(3)}%`;
  for (const p of progress) {
    const rs = results.filter((r) => r.p === p);
    const base = rs.reduce((sum, r) => sum + (BOT_WIN.normal[r.challenge.map] ?? 0) / 100, 0);
    console.log(`\nJogador que venceu até a fase ${p}: desafio ${pct(rs.filter((r) => r.won).length, rs.length)}  (as mesmas fases no normal: ${pct(base, rs.length)})`);
    for (let d = 0; d < days; d++) {
      const day = rs.filter((r) => r.d === d);
      const c = day[0].challenge;
      const wins = day.filter((r) => r.won).length;
      const bar = '█'.repeat(Math.round((wins / day.length) * 10)).padEnd(10, '·');
      const mods = c.mods.map((id) => (id === 'blocked' ? `bloqueio(${c.blocked.join('+')})` : id)).join(' + ');
      console.log(`  dia +${String(d).padStart(2)}  ${MAPS[c.map].id.padEnd(18)} ${bar} ${pct(wins, day.length)}  normal ${String(BOT_WIN.normal[c.map] ?? '?').padStart(3)}%  ${mods}`);
    }
  }

  // por modificador (todas as partidas em que ele apareceu)
  console.log('\nPor modificador:');
  for (const id of Object.keys(MODS)) {
    const rs = results.filter((r) => r.challenge.mods.includes(id));
    console.log(`  ${id.padEnd(8)} ${pct(rs.filter((r) => r.won).length, rs.length)}  (${rs.length} partidas)`);
  }
  const pops = results.map((r) => r.pops).sort((a, b) => a - b);
  console.log(`\nVírus estourados por partida: mediana ${pops[pops.length >> 1]}, 25% ${pops[pops.length >> 2]}`);
  console.log(`${results.length} partidas em ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
