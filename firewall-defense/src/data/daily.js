// ─────────────────────────────────────────────────────────────
//  DESAFIO DO DIA e MISSÕES DO DIA (tela DIÁRIO, scenes/DailyScene.js)
//
//  Tudo sai da data (o dia local contado desde 1970, App.day), sem servidor:
//  o mesmo dia dá os mesmos modificadores e as mesmas missões pra todo mundo.
//
//  Desafio do dia → uma fase que o jogador já venceu (entre as DAILY.pool
//    mais avançadas) com 2 modificadores (MODS): uma restrição e um bônus
//    (que não mexe na mesma coisa), e no máximo DAILY.waves ondas. Libera com DAILY.unlock fases vencidas. Vencer dá DAILY.coffee
//    cafés, +1 por dia seguido vencendo (sequência), até +DAILY.streakMax.
//    1 tentativa por dia: começou, gastou (sem reiniciar nem jogar de novo).
//    A fase é sorteada por último: os modificadores do dia não dependem do
//    progresso. Ela fica guardada no save no 1º acesso do dia (vencer mais
//    fases no meio do dia não troca o desafio).
//  Missões do dia → 3 tarefas (MISSIONS) que contam em qualquer modo; cada
//    uma completa vale MISSION_COFFEE café, pego no botão COLETAR.
//
//  Mexeu nos modificadores? Confira se o desafio continua passável com os
//  bots: node tools/sim/daily.js
// ─────────────────────────────────────────────────────────────
import { seeded } from '../util.js';

export const DAILY = {
  unlock: 3, // fases vencidas pra liberar o desafio
  pool: 10, // o desafio sai entre as N fases vencidas mais avançadas
  waves: 25, // ondas no máximo (a fase encolhe pra caber: rounds.js stretch)
  coffee: 2, // cafés por vencer o desafio do dia
  streakMax: 2, // +1 café por dia seguido vencendo, até isso a mais
};

// Modificadores do desafio. name/desc em português (a tela traduz com t()).
// bonus: true = ajuda (os outros atrapalham). Os números multiplicam a fase
// original: speed (vírus), pressure (quantidade e vida), money (dinheiro do
// começo), reward (dinheiro por vírus), cost (preço das defesas), lives
export const MODS = {
  // restrições
  blocked: { name: 'Bloqueio duplo', desc: '{a} e {b} bloqueados' },
  fast: { name: 'Vírus apressados', desc: 'Vírus 15% mais rápidos', speed: 1.15 },
  horde: { name: 'Horda', desc: '20% mais vírus, e mais fortes', pressure: 1.2 },
  broke: { name: 'Orçamento curto', desc: 'Começa com 30% menos dinheiro', money: 0.7 },
  pricey: { name: 'Inflação', desc: 'Defesas 20% mais caras', cost: 1.2 },
  fragile: { name: 'Servidor frágil', desc: '35% menos vidas', lives: 0.65 },
  noitems: { name: 'Sem itens', desc: 'Os itens ficam guardados hoje' },
  // bônus
  rich: { name: 'Caixa cheio', desc: 'Começa com 50% mais dinheiro', money: 1.5, bonus: true },
  loot: { name: 'Recompensa turbinada', desc: 'Vírus dão 50% mais dinheiro', reward: 1.5, bonus: true },
  armor: { name: 'Servidor reforçado', desc: 'Vidas em dobro', lives: 2, bonus: true },
  sale: { name: 'Promoção', desc: 'Defesas 20% mais baratas', cost: 0.8, bonus: true },
  slow: { name: 'Rede congestionada', desc: 'Vírus 10% mais lentos', speed: 0.9, bonus: true },
};
const NERFS = Object.keys(MODS).filter((id) => !MODS[id].bonus);
const BONUSES = Object.keys(MODS).filter((id) => MODS[id].bonus);
const KEYS = ['speed', 'pressure', 'money', 'reward', 'cost', 'lives'];
// o bônus não pode mexer no mesmo que a restrição (Inflação + Promoção se anulam)
const clash = (a, b) => KEYS.some((k) => MODS[a][k] != null && MODS[b][k] != null);

// Defesas que o Bloqueio duplo pode tirar (o Honeypot nunca). O par não pode
// deixar o desafio impossível: alguém acerta blindado (Golem ou NMAP), alguém
// revela o Spyware (NMAP ou Executivo) e alguém acerta quem voa (Hacker ou NMAP)
const BLOCKABLE = ['hacker', 'firewall', 'pinguim', 'scanner', 'minerador', 'executivo'];
const NEEDS = [['firewall', 'scanner'], ['scanner', 'executivo'], ['hacker', 'scanner']];
const okPair = (a, b) => NEEDS.every((need) => need.some((k) => k !== a && k !== b));

// Sorteia n diferentes de uma lista (rnd: aleatório com semente)
function pick(list, n, rnd) {
  const bag = [...list];
  const out = [];
  while (out.length < n && bag.length) out.push(bag.splice(Math.floor(rnd() * bag.length), 1)[0]);
  return out;
}

// Desafio do dia `day`. won: índices (em MAPS) das fases vencidas, em ordem.
// Sem fases suficientes, map = null (desafio trancado)
export function makeChallenge(day, won) {
  const rnd = seeded(day * 7919 + 13);
  const [nerf] = pick(NERFS, 1, rnd);
  const [bonus] = pick(BONUSES.filter((id) => !clash(nerf, id)), 1, rnd);
  const mods = [nerf, bonus];
  let blocked = [];
  if (mods.includes('blocked')) {
    do blocked = pick(BLOCKABLE, 2, rnd);
    while (!okPair(...blocked));
  }
  const pool = won.filter((i) => i > 0).slice(-DAILY.pool); // a 1-1 é o tutorial
  const map = won.length >= DAILY.unlock && pool.length ? pool[Math.floor(rnd() * pool.length)] : null;
  return { day, map, mods, blocked };
}

// Juntando os modificadores: o multiplicador de cada coisa (1 = normal)
export function modMul(mods, key) {
  return mods.reduce((k, id) => k * (MODS[id][key] ?? 1), 1);
}

// Cafés por vencer o desafio com `streak` dias seguidos (contando hoje)
export function dailyCoffee(streak) {
  return DAILY.coffee + Math.min(Math.max(0, streak - 1), DAILY.streakMax);
}

// ── Missões ──────────────────────────────────────────────────
export const MISSION_COFFEE = 1; // café por missão completa
export const MISSIONS_PER_DAY = 3;

// text em português, com {n} = meta e {tower} = nome da defesa (place).
// Como cada uma conta (App.missionProgress):
//   pops     → vírus estourados (camadas, igual ao "Ameaças contidas")
//   wins     → partidas vencidas (qualquer modo)
//   three    → fase vencida com 3 estrelas no modo normal
//   bosses   → chefões e minichefões derrotados
//   upgrades → upgrades comprados nas defesas
//   coins    → moedas do chão recolhidas com o dedo
//   taps     → toques que acertaram um vírus
//   place    → defesas de um tipo colocadas
//   daily    → desafio do dia vencido
export const MISSIONS = [
  { id: 'pops', text: 'Estoure {n} vírus', goal: 1500 },
  { id: 'wins', text: 'Vença {n} partidas', goal: 2 },
  { id: 'three', text: 'Vença uma fase com 3 estrelas', goal: 1 },
  { id: 'bosses', text: 'Derrote {n} chefões', goal: 3 },
  { id: 'upgrades', text: 'Faça {n} upgrades nas defesas', goal: 10 },
  { id: 'coins', text: 'Recolha {n} moedas do chão com o dedo', goal: 40 },
  { id: 'taps', text: 'Acerte {n} toques nos vírus', goal: 100 },
  { id: 'place', text: 'Coloque {n} {tower} nas fases', goal: 8 },
  { id: 'daily', text: 'Vença o desafio do dia', goal: 1, needsDaily: true },
];
const PLACEABLE = ['hacker', 'firewall', 'pinguim', 'scanner', 'honeypot'];

// As missões do dia: { id, goal, tower?, n: progresso, claimed }.
// dailyOpen: o desafio do dia está liberado (senão a missão dele não vem)
export function makeMissions(day, dailyOpen) {
  const rnd = seeded(day * 104729 + 71);
  const pool = MISSIONS.filter((m) => dailyOpen || !m.needsDaily);
  return pick(pool, MISSIONS_PER_DAY, rnd).map((m) => ({
    id: m.id,
    goal: m.goal,
    ...(m.id === 'place' ? { tower: PLACEABLE[Math.floor(rnd() * PLACEABLE.length)] } : {}),
    n: 0,
    claimed: false,
  }));
}

export const MISSION = Object.fromEntries(MISSIONS.map((m) => [m.id, m]));
