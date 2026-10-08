import { ENEMIES } from './enemies.js';

// ─────────────────────────────────────────────────────────────
//  BUG BOUNTY: fase bônus nos mapas 10, 20, 30 e 40.
//
//  90 segundos de vírus sem parar. Não tem vida pra perder: quem chega no
//  servidor só some (e zera o combo). A graça é estourar o máximo:
//    pontos  → cada camada estourada vale o `reward` do vírus × combo
//    combo   → sobe a cada COMBO_STEP estouros seguidos sem deixar escapar
//    estrelas→ pela % das camadas estouradas (do que entrou no mapa) e
//              viram café pela tabela própria (COFFEE.bounty em darknet.js:
//              2/4/6, mais que fase normal, mas só uma vez pelo recorde)
//  Não trava a progressão: o mapa seguinte abre mesmo sem estrela aqui.
// ─────────────────────────────────────────────────────────────
export const BOUNTY = {
  time: 90, // segundos depois de apertar INICIAR
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

// A onda única do Bug Bounty: um fluxo que engrossa até o fim dos 90 s.
// d = dificuldade do mapa (0..1): mais vírus nos Bug Bounty de cima
export function bountyRound(d) {
  const n = (x) => Math.max(1, Math.round(x * (1 + d)));
  return [
    { type: 'v1', count: n(30), gap: 0.6, at: 0 },
    { type: 'v2', count: n(30), gap: 0.5, at: 10 },
    { type: 'v3', count: n(30), gap: 0.45, at: 22 },
    { type: 'worm', count: n(4), gap: 5, at: 30 },
    { type: 'v4', count: n(30), gap: 0.4, at: 40 },
    { type: 'trojan', count: n(6), gap: 3, at: 45 },
    { type: 'spyware', count: n(5), gap: 4, at: 50 },
    { type: 'v5', count: n(40), gap: 0.3, at: 60 },
    { type: 'locker', count: 1, gap: 0, at: 70 },
  ];
}
