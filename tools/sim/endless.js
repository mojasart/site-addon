// ─────────────────────────────────────────────────────────────
//  Platina infinita: até que onda os bots aguentam depois de vencer a platina.
//  Joga a platina com a árvore inteira da Dark Net; quem vence continua
//  (CONTINUAR) até perder ou até MAX ondas infinitas.
//  Uso: node tools/sim/endless.js [seeds por mapa] [mapas separados por vírgula]
// ─────────────────────────────────────────────────────────────
import { playMap, ALL_PERKS } from './bot.js';
import { MAPS } from '../../firewall-defense/src/data/maps.js';

const SEEDS = Number(process.argv[2] ?? 12);
const LIST = (process.argv[3] ?? '4,14,22,29,37,44').split(',').map(Number);
const MAX = 80;
const PROFILES = ['equilibrado', 'dano', 'laser'];

for (const i of LIST) {
  const reached = [];
  let wins = 0;
  for (let s = 1; s <= SEEDS; s++) {
    const r = playMap(i, PROFILES[s % PROFILES.length], s, 'platinum', ALL_PERKS, null, MAX);
    if (!r.wonPlatinum) continue;
    wins++;
    reached.push(r.endlessWaves);
  }
  reached.sort((a, b) => a - b);
  const med = reached.length ? reached[Math.floor(reached.length / 2)] : '-';
  console.log(`${MAPS[i].name.padEnd(18)} venceu ${wins}/${SEEDS}  ondas infinitas: ${reached.join(' ') || '-'}  (mediana ${med}${reached.includes(MAX) ? `, ${MAX}+ = não perdeu` : ''})`);
}
