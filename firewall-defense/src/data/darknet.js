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

// ── Árvore de upgrades ────────────────────────────────────────
// Começa num nó central que abre um ramo por defesa. Cada nó é um bônus
// permanente, comprado uma vez com cafés (save.darknet[id] = true).
//   parent → nó que precisa ter antes      tower → defesa que o bônus afeta
//   apply(stats) → mexe nos status da defesa (por cima dos upgrades da fase)
// As próximas fases da árvore saem de cada ramo (parent: 'hacker' etc.).
export const ROOT_MONEY = 75; // Acesso Root: dinheiro a mais no começo de cada fase

export const TREE = [
  { id: 'root', name: 'Acesso Root', desc: `Toda fase começa com +$${ROOT_MONEY} e libera os 6 ramos`, cost: 3, parent: null },
  { id: 'hacker', tower: 'hacker', name: 'Teclado Mecânico', desc: 'Hacker ataca 10% mais rápido', cost: 5, parent: 'root',
    apply: (s) => { s.fireRate *= 0.9; } },
  { id: 'firewall', tower: 'firewall', name: 'Tijolo Refratário', desc: 'Golem Firewall com +15% de alcance', cost: 5, parent: 'root',
    apply: (s) => { s.range = Math.round(s.range * 1.15); } },
  { id: 'pinguim', tower: 'pinguim', name: 'Kernel Gelado', desc: 'Lentidão do Penguin Linux dura +0,5s', cost: 5, parent: 'root',
    apply: (s) => { s.slowTime += 0.5; } },
  { id: 'scanner', tower: 'scanner', name: 'Lente Calibrada', desc: 'Robô NMAP com +1 de dano', cost: 5, parent: 'root',
    apply: (s) => { s.damage += 1; } },
  { id: 'minerador', tower: 'minerador', name: 'Overclock', desc: 'Cada bitcoin minerado vale +$5', cost: 5, parent: 'root',
    apply: (s) => { s.packetValue += 5; } },
  { id: 'honeypot', tower: 'honeypot', name: 'Mel Turbinado', desc: 'Honeypot com +50% de vida', cost: 5, parent: 'root',
    apply: (s) => { s.hp = Math.round(s.hp * 1.5); } },
];

export const NODE = Object.fromEntries(TREE.map((n) => [n.id, n]));

// Aplica nos status de uma defesa os bônus comprados pra ela
export function applyPerks(stats, type, owned = {}) {
  for (const n of TREE) if (n.tower === type && owned[n.id]) n.apply(stats);
  return stats;
}
