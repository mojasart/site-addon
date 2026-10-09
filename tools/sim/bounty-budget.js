// ─────────────────────────────────────────────────────────────
//  Calibra o ORÇAMENTO do Bug Bounty com os bots.
//
//    node tools/sim/bounty-budget.js            → mostra a tabela
//    node tools/sim/bounty-budget.js --save     → grava BOUNTY.budget em data/bounty.js
//    ... --seeds 12                             → mais partidas por orçamento
//
//  No Bug Bounty a partida tem só o orçamento (vírus não dão dinheiro). Pra
//  cada sala (uma por season) testa orçamentos de STEP em STEP e acha o
//  MENOR em que pelo menos MIN_RATE dos bots fazem STARS estrelas. Os
//  bots jogam com todos os upgrades da Dark Net: o Bug Bounty só abre com a
//  season inteira platinada.
// ─────────────────────────────────────────────────────────────
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { availableParallelism } from 'node:os';
import { readFileSync, writeFileSync } from 'node:fs';
import { playMap, PROFILES, ALL_PERKS } from './bot.js';
import { BOUNTY, bountyStars } from '../../firewall-defense/src/data/bounty.js';
import { BOUNTY_MAPS } from '../../firewall-defense/src/data/maps.js';

const MIN_RATE = 0.05;
const STARS = 3; // estrelas que contam como "passou"
const STEP = 250;
const MAX = 12000;

if (!isMainThread) {
  for (const job of workerData.jobs) {
    BOUNTY.budget[job.season] = job.budget;
    const r = playMap(job.season, job.profile, job.seed, 'bounty', ALL_PERKS);
    parentPort.postMessage({ ...job, won: bountyStars(r.ratio ?? 0) >= STARS, ratio: r.ratio });
  }
  parentPort.postMessage({ done: true });
} else {
  const args = process.argv.slice(2);
  const i = args.indexOf('--seeds');
  const seeds = i >= 0 ? Number(args[i + 1]) : 8;
  const budgets = [];
  for (let b = STEP; b <= MAX; b += STEP) budgets.push(b);
  const jobs = [];
  BOUNTY_MAPS.forEach((m, season) => {
    for (const budget of budgets) for (const profile of Object.keys(PROFILES)) for (let s = 1; s <= seeds; s++) jobs.push({ season, budget, profile, seed: s });
  });

  const nWorkers = Math.min(availableParallelism(), 16);
  const chunks = Array.from({ length: nWorkers }, () => []);
  jobs.forEach((j, k) => chunks[k % nWorkers].push(j));
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

  const picked = BOUNTY_MAPS.map((m, season) => {
    console.log(`\n${m.name} (season ${season + 1})`);
    let pick = null;
    for (const budget of budgets) {
      const rs = results.filter((r) => r.season === season && r.budget === budget);
      const rate = rs.filter((r) => r.won).length / rs.length;
      const ratio = rs.reduce((a, r) => a + (r.ratio ?? 0), 0) / rs.length;
      const mark = pick == null && rate >= MIN_RATE ? `  ← menor com ${Math.round(MIN_RATE * 100)}% fazendo ${STARS} estrelas` : '';
      if (pick == null && rate >= MIN_RATE) pick = budget;
      console.log(`  $${String(budget).padStart(5)}  ${STARS} estrelas ${String(Math.round(rate * 100)).padStart(3)}%  estourados (média) ${Math.round(ratio * 100)}%${mark}`);
    }
    return pick;
  });
  console.log(`\n${results.length} partidas em ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  console.log('orçamento mínimo por season:', picked.map((b) => (b == null ? `nenhum até $${MAX}` : `$${b}`)).join(' · '));

  if (args.includes('--save')) {
    if (picked.some((b) => b == null)) throw new Error(`alguma sala não chegou em ${Math.round(MIN_RATE * 100)}%: aumente MAX`);
    const url = new URL('../../firewall-defense/src/data/bounty.js', import.meta.url);
    const src = readFileSync(url, 'utf8').replace(/budget: \[[^\]]*\]/, `budget: [${picked.join(', ')}]`);
    writeFileSync(url, src);
    console.log('gravado em src/data/bounty.js');
  }
}
