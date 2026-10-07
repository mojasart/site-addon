// ─────────────────────────────────────────────────────────────
//  DARK NET (árvore de upgrades paga com cafés)
//
//  Libera com DARKNET_STARS estrelas somadas em todos os mapas.
//  Cafés de cada mapa (pelo melhor resultado, então nunca se ganha o mesmo
//  café duas vezes):
//    pelo menos 1 estrela → 1 café
//    3 estrelas           → 2 cafés (quem já tinha 1 ganha só mais 1)
//    platina              → +2 cafés
//  Os cafés gastos ficam no save (coffeeSpent); o saldo é ganho - gasto.
// ─────────────────────────────────────────────────────────────
export const DARKNET_STARS = 35;

export const COFFEE = { star: 1, three: 2, platinum: 2 };

// Cafés que um mapa já deu, pelo recorde de estrelas e a platina
export function mapCoffee(stars = 0, platinum = false) {
  const base = stars >= 3 ? COFFEE.three : stars >= 1 ? COFFEE.star : 0;
  return base + (platinum ? COFFEE.platinum : 0);
}
