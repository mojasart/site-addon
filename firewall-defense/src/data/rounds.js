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
//  Cicada 3301 (minichefão que voa e protege os vírus em volta): 1 por vez
//  nas rodadas 8, 11, 14, 17, 19, 22 e 24 (de 3 a 7 vezes por partida)
// ─────────────────────────────────────────────────────────────
// Nas 3 primeiras fases (Placa-Mãe 1 a 3) ainda não vêm Spyware, Worm nem
// a Cicada 3301:
// o jogador está aprendendo (a 1-1 é o tutorial, sem o Robô NMAP pra revelar
// o Spyware). Os outros grupos dessas rodadas continuam iguais.
export const EARLY_MAPS = 3;
const EARLY_SKIP = new Set(['spyware', 'worm', 'cicada']);

// Rodadas de um mapa no modo normal: as primeiras map.rounds da lista
export function roundsFor(map) {
  const list = ROUNDS.slice(0, map.rounds);
  if (map.season > 0 || map.number > EARLY_MAPS) return list;
  return list.map((round) => round.filter((g) => !EARLY_SKIP.has(g.type)));
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
