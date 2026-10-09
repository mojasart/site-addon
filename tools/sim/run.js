// ─────────────────────────────────────────────────────────────
//  Roda vários bots em todos os mapas e mostra a taxa de vitória.
//
//    node tools/sim/run.js                 → todos os mapas, 6 partidas por perfil
//    node tools/sim/run.js --seeds 10      → mais partidas (resultado mais estável)
//    node tools/sim/run.js --maps 1-15     → só alguns mapas (números 1..45)
//    node tools/sim/run.js --json out.json → salva o resultado
//    node tools/sim/run.js --platinum      → joga o modo platina (data/platinum.js)
//    node tools/sim/run.js --perks         → bots com todos os upgrades da Dark Net
//    node tools/sim/run.js --save          → grava a % de vitória de cada mapa em
//                                            data/botStats.js (aparece no card da fase)
//
//  Cada mapa precisa ter pelo menos uma vitória (dá pra passar) e a taxa
//  de vitória tem que cair conforme os mapas ficam mais difíceis.
// ─────────────────────────────────────────────────────────────
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { availableParallelism } from 'node:os';
import { writeFileSync } from 'node:fs';
import { BOT_WIN } from '../../firewall-defense/src/data/botStats.js';
import { playMap, PROFILES, ALL_PERKS } from './bot.js';
import { MAPS } from '../../firewall-defense/src/data/maps.js';

if (!isMainThread) {
  for (const job of workerData.jobs) {
    const r = playMap(job.map, job.profile, job.seed, job.mode, job.perks ? ALL_PERKS : null);
    parentPort.postMessage({ ...job, ...r });
  }
  parentPort.postMessage({ done: true });
} else {
  const args = process.argv.slice(2);
  const opt = (name, def) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 ? args[i + 1] : def;
  };
  const seeds = Number(opt('seeds', 6));
  const mode = args.includes('--platinum') ? 'platinum' : 'normal';
  const perks = args.includes('--perks');
  const [m0, m1] = opt('maps', `1-${MAPS.length}`).split('-').map(Number);
  const jobs = [];
  for (let m = m0 - 1; m <= (m1 || m0) - 1; m++) {
    if (MAPS[m].bounty) continue; // Bug Bounty não tem vitória/derrota de bot
    for (const profile of Object.keys(PROFILES)) for (let s = 1; s <= seeds; s++) jobs.push({ map: m, profile, seed: s, mode, perks });
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

  const rows = [];
  for (let m = m0 - 1; m <= (m1 || m0) - 1; m++) {
    if (MAPS[m].bounty) {
      rows.push({ map: m + 1, id: MAPS[m].id, rate: null, bounty: true });
      continue;
    }
    const rs = results.filter((r) => r.map === m);
    const wins = rs.filter((r) => r.won).length;
    const byProfile = Object.keys(PROFILES).map((p) => {
      const pr = rs.filter((r) => r.profile === p);
      return `${p.slice(0, 4)} ${pr.filter((r) => r.won).length}/${pr.length}`;
    });
    const avgRound = mode === 'platinum' ? rs.reduce((a, r) => a + r.time, 0) / rs.length : rs.reduce((a, r) => a + r.round, 0) / rs.length;
    rows.push({ map: m + 1, id: MAPS[m].id, rate: wins / rs.length, wins, n: rs.length, avgRound, total: MAPS[m].rounds, byProfile });
  }
  for (const r of rows) {
    if (r.bounty) {
      console.log(`${String(r.map).padStart(2)} ${r.id.padEnd(18)} (Bug Bounty: pulado)`);
      continue;
    }
    const bar = '█'.repeat(Math.round(r.rate * 20)).padEnd(20, '·');
    console.log(
      `${String(r.map).padStart(2)} ${r.id.padEnd(18)} ${bar} ${(r.rate * 100).toFixed(0).padStart(3)}%  ` +
        (mode === 'platinum' ? `tempo médio ${r.avgRound.toFixed(0).padStart(3)}s/180  ` : `rodada média ${r.avgRound.toFixed(1).padStart(4)}/${r.total}  `) + r.byProfile.join('  '),
    );
  }
  console.log(`\n${results.length} partidas em ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  const out = opt('json', null);
  if (out) writeFileSync(out, JSON.stringify(rows, null, 2));
  if (args.includes('--save')) {
    // só faz sentido com todos os mapas: atualiza o modo jogado e mantém o outro
    if (rows.length !== MAPS.length) throw new Error('--save precisa rodar todos os mapas');
    const stats = { ...BOT_WIN, [mode]: rows.map((r) => (r.rate == null ? null : Math.round(r.rate * 100))) };
    const file = `// Gerado por tools/sim/run.js --save — não edite à mão.
// % de partidas de bots que venceram cada mapa (vira a bolinha de dificuldade do card).
// ${seeds * Object.keys(PROFILES).length} partidas por mapa em cada modo.
export const BOT_WIN = ${JSON.stringify(stats)};
`;
    writeFileSync(new URL('../../firewall-defense/src/data/botStats.js', import.meta.url), file);
    console.log(`gravado em src/data/botStats.js (${mode})`);
  }
}
