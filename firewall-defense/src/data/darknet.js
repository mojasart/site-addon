// ─────────────────────────────────────────────────────────────
//  DARK NET (árvore de upgrades paga com cafés)
//
//  Libera com DARKNET_STARS estrelas somadas em todos os mapas.
//  Cafés de cada mapa (pelo melhor resultado, então nunca se ganha o mesmo
//  café duas vezes):
//    pelo menos 1 estrela → 1 café
//    3 estrelas           → 2 cafés (quem já tinha 1 ganha só mais 1)
//    platina              → +2 cafés
//  E cada monstro abatido (camada estourada), em qualquer partida, vale
//  COFFEE.perKill: 0,25 café a cada 1000, então 0,25 / 1000 = 0,00025 por
//  monstro. O total de abatidos fica no save (kills).
//  Os cafés gastos ficam no save (coffeeSpent); o saldo é ganho - gasto.
// ─────────────────────────────────────────────────────────────
export const DARKNET_STARS = 35;

export const COFFEE = { star: 1, three: 2, platinum: 2, perKill: 0.25 / 1000 };

// Cafés que um mapa já deu, pelo recorde de estrelas e a platina
export function mapCoffee(stars = 0, platinum = false) {
  const base = stars >= 3 ? COFFEE.three : stars >= 1 ? COFFEE.star : 0;
  return base + (platinum ? COFFEE.platinum : 0);
}

// Cafés pra mostrar: no máximo 2 casas, com vírgula (12 · 12,5 · 0,1)
export function formatCoffee(v) {
  return String(Math.round(v * 100) / 100).replace('.', ',');
}

// ── Árvore de upgrades ────────────────────────────────────────
// Começa num nó central que abre um ramo por defesa. Cada nó é um bônus
// permanente, comprado uma vez com cafés (save.darknet[id] = true).
//   parent → nó que precisa ter antes      tower → defesa que o bônus afeta
//   apply(stats) → mexe nos status da defesa (por cima dos upgrades da fase)
// Os bônus são de sorte (RNG): "X tem Y% de chance de Z". Os campos de
// chance (critChance, knockChance...) são lidos em entities/Tower.js,
// Projectile.js e Enemy.js.
// As próximas fases da árvore saem de cada ramo (parent: 'hacker' etc.).
export const ROOT_MONEY = 75; // Acesso Root: dinheiro a mais no começo de cada fase

export const TREE = [
  { id: 'root', name: 'Acesso Root', desc: `Toda fase começa com +$${ROOT_MONEY}`, cost: 3, parent: null },
  { id: 'hacker', tower: 'hacker', name: 'Tecla Crítica', desc: 'Cada teclado tem 5% de chance de dar dano dobrado', cost: 5, parent: 'root',
    apply: (s) => { s.critChance = 0.05; } },
  { id: 'firewall', tower: 'firewall', name: 'Tremor de Terra', desc: 'Cada vírus atingido pela onda tem 4% de chance de ser empurrado pra trás', cost: 5, parent: 'root',
    apply: (s) => { s.knockChance = 0.04; } },
  { id: 'pinguim', tower: 'pinguim', name: 'Kernel Gelado', desc: 'Cada vírus atingido pela onda tem 3% de chance de congelar por 1s', cost: 5, parent: 'root',
    apply: (s) => { s.freezeChance = 0.03; } },
  { id: 'scanner', tower: 'scanner', name: 'Lente Calibrada', desc: 'O laser tem 8% de chance de atravessar e acertar mais 1 vírus', cost: 5, parent: 'root',
    apply: (s) => { s.pierceChance = 0.08; } },
  { id: 'minerador', tower: 'minerador', name: 'Overclock', desc: 'Cada bitcoin minerado tem 5% de chance de vir dobrado', cost: 5, parent: 'root',
    apply: (s) => { s.doubleChance = 0.05; } },
  { id: 'honeypot', tower: 'honeypot', name: 'Mel Turbinado', desc: 'Quando quebra, o Honeypot tem 10% de chance de voltar com metade da vida', cost: 5, parent: 'root',
    apply: (s) => { s.reviveChance = 0.1; } },
];

export const NODE = Object.fromEntries(TREE.map((n) => [n.id, n]));

// Aplica nos status de uma defesa os bônus comprados pra ela
export function applyPerks(stats, type, owned = {}) {
  for (const n of TREE) if (n.tower === type && owned[n.id]) n.apply(stats);
  return stats;
}
