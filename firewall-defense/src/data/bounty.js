import { ENEMIES } from './enemies.js';

// ─────────────────────────────────────────────────────────────
//  BUG BOUNTY: modo especial, uma sala por season (BOUNTY_MAPS em
//  data/maps.js). Abre quando a season inteira está platinada.
//
//  5 minutos de vírus sem parar. Não tem vida pra perder: quem chega no
//  servidor só some (e zera o combo). A graça é estourar o máximo:
//    orçamento → a partida começa com BOUNTY.budget (por season) e não entra
//              mais dinheiro nenhum: vírus estourado não dá bitcoin, o
//              Minerador fica bloqueado e Juros, Empréstimo, Acesso Root e o
//              Bitcoin Extra não valem. Vender defesa devolve parte do gasto.
//              O orçamento é o menor em que pelo menos 5% dos bots (com todos
//              os upgrades da Dark Net) fazem 1 estrela: tools/sim/bounty-budget.js
//    pontos  → cada camada estourada vale o `reward` do vírus × combo
//    combo   → sobe a cada COMBO_STEP estouros seguidos sem deixar escapar
//    estrelas→ pela % das camadas estouradas (do que entrou no mapa); cada
//              uma vale +1 café (COFFEE.bounty em darknet.js), pelo recorde
// ─────────────────────────────────────────────────────────────
export const BOUNTY = {
  time: 300, // segundos depois de apertar INICIAR (5 minutos)
  budget: [750, 1250, 1000], // dinheiro da partida inteira, por season (calibrado com bots)
  tiers: [0.4, 0.65, 0.85], // % das camadas estouradas pra 1, 2 e 3 estrelas
  comboStep: 20, // a cada 20 estouros seguidos o multiplicador sobe 0,5
  comboMax: 3,
};

// Quantas camadas (estouros) um vírus tem: ele + todos os filhos
export function layers(type) {
  const def = ENEMIES[type];
  return 1 + def.children.reduce((sum, [child, n]) => sum + n * layers(child), 0);
}

// Multiplicador do combo
export function comboMul(combo) {
  return Math.min(BOUNTY.comboMax, 1 + Math.floor(combo / BOUNTY.comboStep) * 0.5);
}

// Estrelas pela % estourada
export function bountyStars(ratio) {
  return BOUNTY.tiers.filter((t) => ratio >= t).length;
}

// A onda única do Bug Bounty: um fluxo que engrossa ao longo dos 5 minutos.
// d = dificuldade do mapa (0..1): mais vírus nos Bug Bounty de cima
export function bountyRound(d) {
  const n = (x) => Math.max(1, Math.round(x * (1 + d)));
  return [
    { type: 'v1', count: n(40), gap: 0.6, at: 0 },
    { type: 'v2', count: n(40), gap: 0.5, at: 20 },
    { type: 'v3', count: n(40), gap: 0.45, at: 45 },
    { type: 'worm', count: n(6), gap: 5, at: 60 },
    { type: 'v4', count: n(40), gap: 0.4, at: 80 },
    { type: 'trojan', count: n(10), gap: 3, at: 95 },
    { type: 'spyware', count: n(8), gap: 4, at: 110 },
    { type: 'cicada', count: 1, gap: 0, at: 130 },
    { type: 'v5', count: n(50), gap: 0.3, at: 140 },
    { type: 'worm2', count: n(6), gap: 4, at: 165 },
    { type: 'locker', count: 1, gap: 0, at: 180 },
    { type: 'v5', count: n(60), gap: 0.25, at: 200 },
    { type: 'cicada', count: 2, gap: 8, at: 215 },
    { type: 'worm3', count: n(4), gap: 5, at: 230 },
    { type: 'trojan', count: n(20), gap: 1.5, at: 240 },
    { type: 'v5', count: n(80), gap: 0.2, at: 255 },
    { type: 'locker', count: 2, gap: 10, at: 270 },
  ];
}
