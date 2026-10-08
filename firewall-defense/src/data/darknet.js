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
// Os bônus são de sorte (RNG): "X tem Y% de chance de Z", com chances
// pequenas porque vários nós da mesma defesa SOMAM (+=). Os campos de
// chance (critChance, knockChance...) são lidos em entities/Tower.js,
// Projectile.js e Enemy.js.
// As próximas fases da árvore saem de cada ramo (parent: 'hacker' etc.).
export const ROOT_MONEY = 75; // Acesso Root: dinheiro a mais no começo de cada fase

export const TREE = [
  { id: 'root', name: 'Acesso Root', desc: `Toda fase começa com +$${ROOT_MONEY}`, cost: 3, parent: null },
  { id: 'hacker', tower: 'hacker', name: 'Tecla Crítica', desc: 'Cada teclado tem 5% de chance de dar dano dobrado', cost: 5, parent: 'root',
    apply: (s) => { s.critChance = (s.critChance ?? 0) + 0.05; } },
  { id: 'firewall', tower: 'firewall', name: 'Tremor de Terra', desc: 'Cada vírus atingido pela onda tem 4% de chance de ser empurrado pra trás', cost: 5, parent: 'root',
    apply: (s) => { s.knockChance = (s.knockChance ?? 0) + 0.04; } },
  { id: 'pinguim', tower: 'pinguim', name: 'Kernel Gelado', desc: 'Cada vírus atingido pela onda tem 3% de chance de congelar por 1s', cost: 5, parent: 'root',
    apply: (s) => { s.freezeChance = (s.freezeChance ?? 0) + 0.03; } },
  { id: 'scanner', tower: 'scanner', name: 'Lente Calibrada', desc: 'O laser tem 8% de chance de atravessar e acertar mais 1 vírus', cost: 5, parent: 'root',
    apply: (s) => { s.pierceChance = (s.pierceChance ?? 0) + 0.08; } },
  { id: 'minerador', tower: 'minerador', name: 'Overclock', desc: 'Cada bitcoin minerado tem 5% de chance de vir dobrado', cost: 5, parent: 'root',
    apply: (s) => { s.doubleChance = (s.doubleChance ?? 0) + 0.05; } },
  { id: 'honeypot', tower: 'honeypot', name: 'Mel Turbinado', desc: 'Quando quebra, o Honeypot tem 10% de chance de voltar com metade da vida', cost: 5, parent: 'root',
    apply: (s) => { s.reviveChance = (s.reviveChance ?? 0) + 0.1; } },
  // Depois do 1º nó, cada ramo abre em Y: o 2º e o 3º saem os dois do 1º
  // (dois galhos; dá pra comprar qualquer um dos dois primeiro)
  { id: 'hacker2', tower: 'hacker', name: 'Ctrl+C Ctrl+V', desc: 'Cada arremesso tem 4% de chance de sair um teclado extra num outro vírus', cost: 8, parent: 'hacker',
    apply: (s) => { s.extraShotChance = (s.extraShotChance ?? 0) + 0.04; } },
  { id: 'hacker3', tower: 'hacker', name: 'Zero-Day', desc: 'Cada teclado tem 2% de chance de estourar o vírus inteiro, todas as camadas (menos chefão)', cost: 12, parent: 'hacker',
    apply: (s) => { s.executeChance = (s.executeChance ?? 0) + 0.02; } },
  { id: 'firewall2', tower: 'firewall', name: 'Brasa Viva', desc: 'Cada vírus atingido tem 5% de chance de pegar fogo, mesmo sem o Incêndio', cost: 8, parent: 'firewall',
    apply: (s) => { s.igniteChance = (s.igniteChance ?? 0) + 0.05; } },
  { id: 'firewall3', tower: 'firewall', name: 'Erupção', desc: 'Cada onda tem 3% de chance de sair com o dobro do alcance', cost: 12, parent: 'firewall',
    apply: (s) => { s.bigPulseChance = (s.bigPulseChance ?? 0) + 0.03; } },
  { id: 'pinguim2', tower: 'pinguim', name: 'Avalanche', desc: 'Cada onda tem 5% de chance de vir outra logo em seguida', cost: 8, parent: 'pinguim',
    apply: (s) => { s.repeatChance = (s.repeatChance ?? 0) + 0.05; } },
  { id: 'pinguim3', tower: 'pinguim', name: 'Estilhaço', desc: 'Vírus que estoura no gelo tem 10% de chance de estilhaçar e acertar os vizinhos', cost: 12, parent: 'pinguim',
    apply: (s) => { s.shatterChance = (s.shatterChance ?? 0) + 0.1; } },
  { id: 'scanner2', tower: 'scanner', name: 'Ping da Morte', desc: 'Cada tiro tem 5% de chance de dar dano triplo', cost: 8, parent: 'scanner',
    apply: (s) => { s.tripleChance = (s.tripleChance ?? 0) + 0.05; } },
  { id: 'scanner3', tower: 'scanner', name: 'Varredura Dupla', desc: 'Cada tiro tem 6% de chance de recarregar na hora', cost: 12, parent: 'scanner',
    apply: (s) => { s.rechargeChance = (s.rechargeChance ?? 0) + 0.06; } },
  { id: 'minerador2', tower: 'minerador', name: 'GPU de Segunda Mão', desc: 'O Minerador custa 10% menos', cost: 8, parent: 'minerador',
    apply: (s) => { s.cost = Math.round(s.cost * 0.9); } },
  { id: 'minerador3', tower: 'minerador', name: 'Bloco Raro', desc: 'Cada bitcoin tem 2% de chance de virar um bloco que vale 5×', cost: 12, parent: 'minerador',
    apply: (s) => { s.goldChance = (s.goldChance ?? 0) + 0.02; } },
  { id: 'honeypot2', tower: 'honeypot', name: 'Mel Pegajoso', desc: 'Cada vírus que para no pote tem 8% de chance de sair grudado, 50% mais lento por 2s', cost: 8, parent: 'honeypot',
    apply: (s) => { s.stickyChance = (s.stickyChance ?? 0) + 0.08; } },
  { id: 'honeypot3', tower: 'honeypot', name: 'Colmeia', desc: 'Quando quebra, o pote tem 5% de chance de soltar abelhas que tiram 1 camada dos vírus em volta', cost: 12, parent: 'honeypot',
    apply: (s) => { s.swarmChance = (s.swarmChance ?? 0) + 0.05; } },
];

export const NODE = Object.fromEntries(TREE.map((n) => [n.id, n]));

// Aplica nos status de uma defesa os bônus comprados pra ela
export function applyPerks(stats, type, owned = {}) {
  for (const n of TREE) if (n.tower === type && owned[n.id]) n.apply(stats);
  return stats;
}
