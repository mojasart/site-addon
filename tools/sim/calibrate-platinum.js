// ─────────────────────────────────────────────────────────────
//  Calibra o MODO PLATINA de cada mapa com os bots.
//
//    node tools/sim/calibrate-platinum.js            → do zero (busca binária)
//    node tools/sim/calibrate-platinum.js --refine   → ajuste fino a partir do atual
//    ... --maps 7,12                                 → só esses mapas (números 1..45)
//
//  Pra cada mapa procura a dificuldade k (multiplica a quantidade de vírus
//  das ondas e a vida do chefão) que faz a taxa de vitória dos bots bater
//  na curva-alvo: TARGET[0] no 1º mapa caindo em linha reta até TARGET[1]
//  no último. Grava em firewall-defense/src/data/platinumTuning.js.
// ─────────────────────────────────────────────────────────────
import { Worker, isMainThread, parentPort } from 'node:worker_threads';
import { availableParallelism } from 'node:os';
import { writeFileSync } from 'node:fs';
import { playMap, PROFILES } from './bot.js';
import { MAPS } from '../../firewall-defense/src/data/maps.js';
import { PLAT_TUNE } from '../../firewall-defense/src/data/platinumTuning.js';

export const TARGET = [0.35, 0.14]; // com 1 vida (PLAT_LIVES): pelo menos ~10% de vitória em todo mapa
const ITERATIONS = 8;
const LO = 0.01;
const HI = 4;

if (!isMainThread) {
  parentPort.on('message', (job) => {
    if (job.stop) return process.exit(0);
    PLAT_TUNE[job.map] = job.k;
    parentPort.postMessage({ ...job, ...playMap(job.map, job.profile, job.seed, 'platinum') });
  });
} else {
  const refine = process.argv.includes('--refine');
  const mi = process.argv.indexOf('--maps');
  const only = mi >= 0 ? new Set(process.argv[mi + 1].split(',').map((x) => Number(x) - 1)) : null;
  const n = MAPS.length;
  const target = (m) => TARGET[0] + (TARGET[1] - TARGET[0]) * (m / (n - 1));
  const lo = Array(n).fill(LO);
  const hi = Array(n).fill(HI);
  const cur = refine ? [...PLAT_TUNE] : Array(n).fill(Math.sqrt(LO * HI));
  const best = PLAT_TUNE.map((k) => ({ err: Infinity, k, rate: NaN }));

  const workers = Array.from({ length: Math.min(availableParallelism(), 16) }, () => new Worker(new URL(import.meta.url)));
  async function runAll(jobs) {
    const results = [];
    let next = 0;
    await Promise.all(
      workers.map(
        (w) =>
          new Promise((resolve) => {
            const feed = () => {
              if (next >= jobs.length) {
                w.removeAllListeners('message');
                return resolve();
              }
              w.postMessage(jobs[next++]);
            };
            w.on('message', (r) => {
              results.push(r);
              feed();
            });
            feed();
          }),
      ),
    );
    return results;
  }

  const iterations = refine ? 4 : ITERATIONS;
  for (let it = 0; it < iterations; it++) {
    const seeds = refine ? 8 : it < 4 ? 4 : 6;
    const jobs = [];
    for (let m = 0; m < n; m++) {
      if (only && !only.has(m)) continue;
      for (const profile of Object.keys(PROFILES)) for (let s = 1; s <= seeds; s++) jobs.push({ map: m, profile, seed: s + it * 100, k: cur[m] });
    }
    const t0 = Date.now();
    const res = await runAll(jobs);
    let line = '';
    for (let m = 0; m < n; m++) {
      if (only && !only.has(m)) {
        best[m] = { err: 0, k: PLAT_TUNE[m], rate: NaN };
        continue;
      }
      const rs = res.filter((r) => r.map === m);
      const rate = rs.filter((r) => r.won).length / rs.length;
      const err = Math.abs(rate - target(m));
      // empate no erro: fica com o mais difícil que ainda tem vitória
      if (err < best[m].err || (err === best[m].err && rate > 0 && cur[m] > best[m].k)) best[m] = { err, k: cur[m], rate };
      if (refine) {
        cur[m] = Math.min(HI, Math.max(LO, cur[m] * Math.min(1.3, Math.max(0.77, Math.exp(1.4 * (rate - target(m)))))));
      } else {
        if (rate > target(m)) lo[m] = cur[m];
        else hi[m] = cur[m];
        cur[m] = Math.sqrt(lo[m] * hi[m]);
      }
      line += `${m + 1}:${Math.round(rate * 100)} `;
    }
    console.log(`volta ${it + 1}/${iterations} (${((Date.now() - t0) / 1000).toFixed(0)}s)  ${line}`);
  }
  workers.forEach((w) => w.postMessage({ stop: true }));

  const values = best.map((b) => +b.k.toFixed(3));
  const file = `// Gerado por tools/sim/calibrate-platinum.js — não edite à mão.
// Dificuldade do modo platina em cada mapa (multiplica a quantidade de
// vírus das ondas e a vida do chefão), calibrada com os bots pra taxa de
// vitória cair de ${TARGET[0] * 100}% (mapa 1) a ${TARGET[1] * 100}% (mapa ${n}).
export const PLAT_TUNE = ${JSON.stringify(values)};
`;
  writeFileSync(new URL('../../firewall-defense/src/data/platinumTuning.js', import.meta.url), file);
  console.log('\nmapa  alvo  obtido  k');
  best.forEach((b, m) => console.log(`${String(m + 1).padStart(3)}  ${Math.round(target(m) * 100)}%   ${Math.round(b.rate * 100)}%    ${b.k.toFixed(3)}`));
}
