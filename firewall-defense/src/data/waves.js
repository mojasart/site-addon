// ─────────────────────────────────────────────────────────────
//  ONDAS
//  Cada onda é uma lista de grupos:
//    type  → id do inimigo (data/enemies.js)
//    count → quantos
//    gap   → segundos entre um e outro
//    at    → segundos depois do início da onda pro grupo começar (opcional)
// ─────────────────────────────────────────────────────────────
export const WAVES = [
  /* 1 */ [{ type: 'virus', count: 8, gap: 1.1 }],
  /* 2 */ [{ type: 'virus', count: 14, gap: 0.8 }],
  /* 3 */ [{ type: 'virus', count: 10, gap: 0.8 }, { type: 'worm', count: 5, gap: 1.2, at: 4 }],
  /* 4 */ [{ type: 'worm', count: 12, gap: 0.8 }, { type: 'virus', count: 8, gap: 0.6, at: 3 }],
  /* 5 */ [{ type: 'virus', count: 14, gap: 0.6 }, { type: 'trojan', count: 2, gap: 4, at: 3 }],
  /* 6 */ [{ type: 'worm', count: 16, gap: 0.6 }, { type: 'trojan', count: 3, gap: 3, at: 2 }],
  /* 7 */ [{ type: 'virus', count: 20, gap: 0.45 }, { type: 'worm', count: 8, gap: 0.8, at: 4 }, { type: 'trojan', count: 4, gap: 2.5, at: 6 }],
  /* 8 */ [{ type: 'trojan', count: 6, gap: 2 }, { type: 'worm', count: 18, gap: 0.5, at: 2 }],
  /* 9 */ [{ type: 'virus', count: 30, gap: 0.35 }, { type: 'worm', count: 14, gap: 0.6, at: 3 }, { type: 'trojan', count: 6, gap: 2, at: 5 }],
  /* 10 */ [{ type: 'ransomware', count: 1, gap: 0 }, { type: 'trojan', count: 8, gap: 1.8, at: 3 }, { type: 'worm', count: 20, gap: 0.5, at: 2 }],
];
