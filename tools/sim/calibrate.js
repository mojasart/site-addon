// ─────────────────────────────────────────────────────────────
//  Calibra a dificuldade de cada mapa com os bots.
//
//    node tools/sim/calibrate.js            → do zero (busca binária)
//    node tools/sim/calibrate.js --refine   → ajuste fino a partir de tuning.js
//                                             (mais partidas, passos pequenos)
//    ... --refine --maps 16,21              → só esses mapas (números 1..45)
//
//  Pra cada mapa procura (busca binária) a "pressão" — quantos vírus vêm
//  em cada grupo — que faz a taxa de vitória dos bots bater na curva-alvo:
//  TARGET[0] no 1º mapa caindo em linha reta até TARGET[1] no último.
//  Grava o resultado em firewall-defense/src/data/tuning.js.
// ─────────────────────────────────────────────────────────────
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { availableParallelism } from 'node:os';
import { writeFileSync } from 'node:fs';
import { playMap, PROFILES } from './bot.js';
import { MAPS } from '../../firewall-defense/src/data/maps.js';

export const TARGET = [0.95, 0.25];
const ITERATIONS = 8;
const LO = 0.2;
const PRESSURE_CAP = 2.2; // daqui pra cima, endurece pela velocidade
const SPEED_HI = 1.8;
const HI = 3.5;

if (!isMainThread) {
  parentPort.on('message', (job) => {
    if (job.stop) return process.exit(0);
    MAPS[job.map].pressure = job.pressure;
    MAPS[job.map].speedMul = job.speed;
    parentPort.postMessage({ ...job, ...playMap(job.map, job.profile, job.seed) });
  });
} else {
  const refine = process.argv.includes('--refine');
  const mi = process.argv.indexOf('--maps');
  const only = mi >= 0 ? new Set(process.argv[mi + 1].split(',').map((x) => Number(x) - 1)) : null;
  const n = MAPS.length;
  const BASE_SPEED = MAPS.map((m) => m.speedMul);
  const target = (m) => TARGET[0] + (TARGET[1] - TARGET[0]) * (m / (n - 1));
  const lo = Array(n).fill(LO);
  const hi = Array(n).fill(HI);
  const cur = MAPS.map((m) => m.pressure);
  const spd = MAPS.map((m) => m.speedMul);
  const best = MAPS.map(() => ({ err: Infinity, p: 1, s: 1, rate: 0 }));

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

  const iterations = refine ? 5 : ITERATIONS;
  for (let it = 0; it < iterations; it++) {
    // mais partidas nas últimas voltas e no ajuste fino (menos ruído)
    const seeds = refine ? 10 : it < 4 ? 5 : 8;
    const jobs = [];
    for (let m = 0; m < n; m++) {
      if (only && !only.has(m)) continue;
      for (const profile of Object.keys(PROFILES)) for (let s = 1; s <= seeds; s++) jobs.push({ map: m, profile, seed: s + it * 100, pressure: cur[m], speed: spd[m] });
    }
    const t0 = Date.now();
    const res = await runAll(jobs);
    let line = '';
    for (let m = 0; m < n; m++) {
      if (only && !only.has(m)) {
        best[m] = { err: 0, p: cur[m], s: spd[m], rate: NaN };
        continue;
      }
      const rs = res.filter((r) => r.map === m);
      const rate = rs.filter((r) => r.won).length / rs.length;
      const err = Math.abs(rate - target(m));
      if (err < best[m].err) best[m] = { err, p: cur[m], s: spd[m], rate };
      if (refine) {
        // passo proporcional ao erro (vitórias demais → mais difícil)
        const f = Math.min(1.35, Math.max(0.75, Math.exp(1.6 * (rate - target(m)))));
        // Mais vírus também dá mais dinheiro: a partir de PRESSURE_CAP quem
        // endurece o mapa é a velocidade (não dá dinheiro extra)
        const hard = f > 1;
        if (hard && cur[m] >= PRESSURE_CAP) spd[m] = Math.min(SPEED_HI, spd[m] * Math.sqrt(f));
        else if (!hard && spd[m] > BASE_SPEED[m] + 1e-3) spd[m] = Math.max(BASE_SPEED[m], spd[m] * Math.sqrt(f));
        else cur[m] = Math.min(HI, Math.max(LO, cur[m] * f));
      } else {
        // mais vitórias que o alvo → mais vírus; menos → menos vírus
        if (rate > target(m)) lo[m] = cur[m];
        else hi[m] = cur[m];
        cur[m] = Math.sqrt(lo[m] * hi[m]);
      }
      line += `${m + 1}:${Math.round(rate * 100)} `;
    }
    console.log(`volta ${it + 1}/${iterations} (${((Date.now() - t0) / 1000).toFixed(0)}s)  ${line}`);
  }
  workers.forEach((w) => w.postMessage({ stop: true }));

  const values = best.map((b) => +b.p.toFixed(3));
  const speeds = best.map((b) => +b.s.toFixed(3));
  const file = `// Gerado por tools/sim/calibrate.js — não edite à mão.
// Pressão (multiplicador da quantidade de vírus) de cada mapa, calibrada
// com bots pra taxa de vitória cair de ${TARGET[0] * 100}% (mapa 1) a ${TARGET[1] * 100}% (mapa ${n}).
export const PRESSURE = ${JSON.stringify(values)};
// Velocidade dos vírus (só sobe nos mapas que seguiam fáceis mesmo com muita pressão)
export const SPEED = ${JSON.stringify(speeds)};
`;
  writeFileSync(new URL('../../firewall-defense/src/data/tuning.js', import.meta.url), file);
  console.log('\nmapa  alvo  obtido  pressão');
  best.forEach((b, m) => console.log(`${String(m + 1).padStart(3)}  ${Math.round(target(m) * 100)}%   ${Math.round(b.rate * 100)}%    ${b.p.toFixed(2)}  vel ${b.s.toFixed(2)}`));
}
