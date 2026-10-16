// ─────────────────────────────────────────────────────────────
//  RODADAS (todas as fases usam esta lista; cada mapa diz até qual vai)
//  Cada rodada é uma lista de grupos:
//    type  → id do vírus (data/enemies.js)
//    count → quantos
//    gap   → segundos entre um e outro
//    at    → segundos depois do início da rodada pro grupo começar (opcional)
//
//  Worms evoluídos aparecem aos poucos (a Placa-Mãe vai até a rodada 12→18,
//  o Data Center 15→22 e o Cabo Submarino 18→25):
//    Mutante     → rodada 15: estreia no meio da Placa-Mãe (mapa 7)
//    Polimórfico → rodada 18: no fim da Placa-Mãe (mapas 14 e 15)
//    Rei         → rodada 23: só no Cabo Submarino (mapa 10 em diante)
//
//  Chefões (Locker, Cicada 3301, Ransomware e Adware) NÃO vêm desta lista:
//  cada fase tem a sua agenda (bossPlan / platinumBossPlan, mais abaixo) e
//  eles são espalhados pela partida (addBosses).
// ─────────────────────────────────────────────────────────────
// Nas 3 primeiras fases (Placa-Mãe 1 a 3) ainda não vêm Spyware nem Worm:
// o jogador está aprendendo (a 1-1 é o tutorial, sem o Robô NMAP pra revelar
// o Spyware). Os outros grupos dessas rodadas continuam iguais.
import { ENEMIES } from './enemies.js';

export const EARLY_MAPS = 3;
const EARLY_SKIP = new Set(['spyware', 'worm']);

// Ondas no modo normal: cada mapa joga map.waves ondas (data/maps.js, pelo
// nível de dificuldade) feitas das suas map.rounds rodadas da lista. Com mais
// ondas que rodadas, entre duas rodadas entram ondas de transição (uma
// mistura das duas): a dificuldade sobe aos poucos e dá tempo de juntar
// dinheiro. Com menos, pula rodadas espalhadas. A 1ª e a última onda são
// sempre a 1ª e a última rodada.
const MIN_PART = 0.2; // pedaço mínimo de uma rodada pra entrar numa onda de transição

// ── Chefões ──────────────────────────────────────────────────
// Minichefão = Locker ou Cicada 3301 (a Cicada é CICADA_SHARE deles). Cada
// fase tem uma agenda de quantos vêm na partida inteira; eles são
// espalhados pelas ondas, mais pro fim (addBosses). Os da última onda
// entram depois de todo mundo e com FINALE_HP × a vida.
export const BOSSES = new Set(['locker', 'cicada', 'ransomware', 'adware']);
export const CICADA_SHARE = 0.35;
export const FINALE_HP = 1.5;
// Vida dos chefões da agenda (× a vida normal deles). Com a vida cheia, os
// chefões no meio da partida derrubavam os bots (63% → 15% de vitória nas
// fases 1-13 a 2-7) e nem a calibração compensava
export const AGENDA_HP = 0.35;
// Vida dos chefões no modo normal: uma curva própria pelas 45 fases (do 1º
// ao último mapa), que NÃO segue a pressão do mapa. Antes seguia, e como a
// calibração baixou a pressão pra 0,2 na maioria das fases, o Ransomware
// final ficava com ~60 mil de vida (6 tiros do Robô NMAP). Multiplica a vida
// do chefão (junto com AGENDA_HP / FINALE_HP)
export const BOSS_CURVE = [0.25, 0.55];
export function bossHpMul(mapIndex, total = 45) {
  return BOSS_CURVE[0] + (BOSS_CURVE[1] - BOSS_CURVE[0]) * Math.min(1, Math.max(0, mapIndex / (total - 1)));
}
const SPREAD_FROM = 0.35; // o 1º chefão vem nessa fração da partida; o último, na última onda

const lerpRound = (a, b, t) => Math.round(a + (b - a) * Math.min(1, Math.max(0, t)));
const minis = (n) => {
  const cicada = Math.round(n * CICADA_SHARE);
  return { locker: n - cicada, cicada };
};

// Modo normal: Locker fecha a fase da 1-3 à 1-9; da 1-10 em diante vêm
// minichefões e Ransomwares no meio da partida; Adware a partir da 2-5.
// Sobe aos poucos até as fases 15 (1-15: 3 mini + 2 Ransom; 2-15: 5 mini
// + 1 Adware + 1 Ransom; 3-15: 7 mini + 3 Ransom + 1 Adware)
export function bossPlan(map) {
  const s = map.season;
  const n = map.number;
  const k = (n - 1) / 14; // 0 na fase 1, 1 na 15
  if (s === 0) {
    if (n < 10) return { ...minis(0), ransomware: 0, adware: 0, finale: n >= 3 ? 'locker' : null };
    const t = (n - 10) / 5;
    return { ...minis(lerpRound(1, 3, t)), ransomware: lerpRound(1, 2, t), adware: 0, finale: null };
  }
  if (s === 1) return { ...minis(lerpRound(3, 5, k)), ransomware: lerpRound(2, 1, k), adware: n >= 5 ? 1 : 0, finale: null };
  return { ...minis(lerpRound(5, 7, k)), ransomware: lerpRound(1, 3, k), adware: 1, finale: null };
}

// Platina (além do chefão do fim, platinum.js): sobe aos poucos até
// 1-15: 5 mini + 3 Ransom; 2-15: 8 mini + 1 Adware + 3 Ransom;
// 3-15: 15 mini + 5 Ransom + 2 Adware
const PLAT_PLAN = [
  { mini: [0, 5], ransomware: [0, 3], adware: [0, 0] },
  { mini: [5, 8], ransomware: [3, 3], adware: [0, 1] },
  { mini: [8, 15], ransomware: [3, 5], adware: [1, 2] },
];
export function platinumBossPlan(map) {
  const p = PLAT_PLAN[Math.min(map.season, PLAT_PLAN.length - 1)];
  const k = (map.number - 1) / 14;
  return { ...minis(lerpRound(...p.mini, k)), ransomware: lerpRound(...p.ransomware, k), adware: lerpRound(...p.adware, k), finale: null };
}

// Espalha os chefões da agenda pelas ondas: o i-ésimo de N fica em
// SPREAD_FROM + (1 − SPREAD_FROM)·i/N do caminho (o último na última onda),
// os mais fracos primeiro (Locker e Cicada intercalados, depois Adware e
// Ransomware). No meio da onda entram 4 s depois do começo; na última,
// depois de todo mundo (finale). plan.finale: chefão a mais fechando a fase
export function addBosses(waves, plan) {
  const nl = plan.locker ?? 0;
  const nc = plan.cicada ?? 0;
  const list = [];
  for (let i = 0; i < Math.max(nl, nc); i++) {
    if (i < nl) list.push('locker');
    if (i < nc) list.push('cicada');
  }
  for (let i = 0; i < (plan.adware ?? 0); i++) list.push('adware');
  for (let i = 0; i < (plan.ransomware ?? 0); i++) list.push('ransomware');
  const W = waves.length;
  const out = waves.map((w) => [...w]);
  const boss = (type, last) => (last ? { type, count: 1, gap: 0, finale: true, hpMul: AGENDA_HP * FINALE_HP } : { type, count: 1, gap: 0, at: 4, hpMul: AGENDA_HP });
  list.forEach((type, i) => {
    const w = Math.min(W - 1, Math.round((SPREAD_FROM + ((1 - SPREAD_FROM) * (i + 1)) / list.length) * (W - 1)));
    out[w].push(boss(type, w === W - 1));
  });
  if (plan.finale) out[W - 1].push(boss(plan.finale, true));
  return out;
}

// Tira os chefões de uma rodada da lista (eles vêm pela agenda)
export const withoutBosses = (round) => round.filter((g) => !BOSSES.has(g.type));

// Rodadas de um mapa no modo normal: as primeiras map.rounds da lista (sem
// chefões), esticadas (ou comprimidas) pra map.waves ondas, e os chefões da
// agenda espalhados (bossPlan)
export function roundsFor(map) {
  let list = ROUNDS.slice(0, map.rounds).map(withoutBosses);
  if (map.season === 0 && map.number <= EARLY_MAPS) list = list.map((round) => round.filter((g) => !EARLY_SKIP.has(g.type)));
  const waves = stretch(list, map.waves ?? list.length);
  return addBosses(waves, bossPlan(map));
}

// Estica a lista de rodadas pra n ondas: a onda j fica na posição p da lista
// (entre as rodadas a e a + 1) e leva (1 − t) dos vírus de uma e t da outra.
// Chefões e grupos de 1 vírus não se dividem: vêm só uma vez, na onda que
// cai mais perto da rodada deles
function stretch(list, n) {
  const R = list.length;
  if (n === R || R < 2) return list;
  // menos ondas que rodadas: pega rodadas espalhadas (sempre a 1ª e a última)
  if (n < R) return Array.from({ length: n }, (_, j) => list[Math.round((j * (R - 1)) / (n - 1))]);
  const home = list.map((_, s) => Math.round((s * (n - 1)) / (R - 1)));
  const waves = [];
  for (let j = 0; j < n; j++) {
    const p = (j * (R - 1)) / (n - 1);
    const a = Math.floor(p);
    const t = p - a;
    const wave = [];
    const add = (s, w) => {
      if (s >= R) return;
      for (const g of list[s]) {
        if (ENEMIES[g.type]?.boss || g.count === 1) {
          if (home[s] === j) wave.push(g);
        } else if (w >= MIN_PART) wave.push({ ...g, count: g.count * w });
      }
    };
    add(a, 1 - t);
    if (t > 0) add(a + 1, t);
    waves.push(wave);
  }
  return waves;
}

export const ROUNDS = [
  /* 1 */ [{ type: 'v1', count: 20, gap: 0.8 }],
  /* 2 */ [{ type: 'v1', count: 35, gap: 0.55 }],
  /* 3 */ [{ type: 'v1', count: 25, gap: 0.5 }, { type: 'v2', count: 8, gap: 1, at: 6 }],
  /* 4 */ [{ type: 'v1', count: 30, gap: 0.4 }, { type: 'v2', count: 15, gap: 0.7, at: 3 }],
  /* 5 */ [{ type: 'v2', count: 30, gap: 0.55 }, { type: 'v1', count: 15, gap: 0.4, at: 8 }],
  /* 6 */ [{ type: 'v1', count: 20, gap: 0.35 }, { type: 'v2', count: 20, gap: 0.5 }, { type: 'v3', count: 8, gap: 1, at: 5 }],
  /* 7 */ [{ type: 'v2', count: 35, gap: 0.4 }, { type: 'v3', count: 12, gap: 0.8, at: 5 }],
  /* 8 */ [{ type: 'v3', count: 25, gap: 0.6 }, { type: 'v2', count: 30, gap: 0.35, at: 4 }, { type: 'cicada', count: 1, gap: 0, at: 6 }],
  /* 9 */ [{ type: 'v3', count: 40, gap: 0.45 }],
  /* 10 */ [{ type: 'v2', count: 120, gap: 0.15 }],
  /* 11 */ [{ type: 'v4', count: 10, gap: 1 }, { type: 'v3', count: 30, gap: 0.4, at: 3 }, { type: 'spyware', count: 4, gap: 2, at: 6 }, { type: 'cicada', count: 1, gap: 0, at: 6 }],
  /* 12 */ [{ type: 'worm', count: 8, gap: 1.2 }, { type: 'v3', count: 25, gap: 0.35, at: 3 }],
  /* 13 */ [{ type: 'v2', count: 80, gap: 0.15 }, { type: 'v4', count: 20, gap: 0.6, at: 5 }],
  /* 14 */ [{ type: 'v5', count: 12, gap: 1 }, { type: 'v3', count: 40, gap: 0.3 }, { type: 'spyware', count: 6, gap: 1.6, at: 4 }, { type: 'cicada', count: 1, gap: 0, at: 8 }],
  /* 15 */ [{ type: 'locker', count: 1, gap: 0 }, { type: 'adware', count: 1, gap: 0, at: 4 }, { type: 'v4', count: 25, gap: 0.45, at: 2 }, { type: 'trojan', count: 4, gap: 2, at: 6 }, { type: 'worm2', count: 2, gap: 3, at: 9 }],
  /* 16 */ [{ type: 'v4', count: 45, gap: 0.3 }, { type: 'worm', count: 10, gap: 1, at: 5 }, { type: 'worm2', count: 3, gap: 2, at: 10 }],
  /* 17 */ [{ type: 'v5', count: 35, gap: 0.4 }, { type: 'trojan', count: 10, gap: 1.4, at: 4 }, { type: 'spyware', count: 8, gap: 1.4, at: 2 }, { type: 'cicada', count: 1, gap: 0, at: 8 }],
  /* 18 */ [{ type: 'worm', count: 16, gap: 0.8 }, { type: 'v5', count: 30, gap: 0.4, at: 3 }, { type: 'worm2', count: 4, gap: 2, at: 8 }, { type: 'worm3', count: 2, gap: 4, at: 14 }],
  /* 19 */ [{ type: 'trojan', count: 20, gap: 0.9 }, { type: 'v5', count: 40, gap: 0.3, at: 4 }, { type: 'cicada', count: 1, gap: 0, at: 6 }],
  /* 20 */ [
    { type: 'ransomware', count: 1, gap: 0 },
    { type: 'v5', count: 40, gap: 0.3, at: 3 },
    { type: 'trojan', count: 15, gap: 1, at: 6 },
  ],
  /* 21 */ [{ type: 'v5', count: 60, gap: 0.22 }, { type: 'locker', count: 2, gap: 4, at: 5 }, { type: 'worm3', count: 3, gap: 3, at: 8 }],
  /* 22 */ [{ type: 'worm2', count: 15, gap: 0.8 }, { type: 'worm', count: 15, gap: 0.6, at: 2 }, { type: 'trojan', count: 20, gap: 0.7, at: 3 }, { type: 'spyware', count: 12, gap: 1, at: 5 }, { type: 'cicada', count: 1, gap: 0, at: 8 }],
  /* 23 */ [{ type: 'trojan', count: 35, gap: 0.5 }, { type: 'v5', count: 50, gap: 0.25, at: 2 }, { type: 'worm4', count: 1, gap: 0, at: 12 }],
  /* 24 */ [{ type: 'locker', count: 4, gap: 3 }, { type: 'worm3', count: 10, gap: 1.2, at: 2 }, { type: 'worm2', count: 12, gap: 0.8, at: 4 }, { type: 'spyware', count: 14, gap: 0.9, at: 4 }, { type: 'worm4', count: 2, gap: 5, at: 10 }, { type: 'cicada', count: 1, gap: 0, at: 12 }],
  /* 25 */ [
    { type: 'ransomware', count: 2, gap: 6 },
    { type: 'locker', count: 3, gap: 4, at: 3 },
    { type: 'v5', count: 60, gap: 0.25, at: 2 },
    { type: 'worm4', count: 4, gap: 4, at: 8 },
  ],
];
