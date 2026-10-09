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

export const COFFEE = { star: 1, three: 2, platinum: 2, perKill: 0.25 / 1000, bounty: [0, 1, 2, 3] };

// Cafés que um mapa já deu, pelo recorde de estrelas e a platina
// (sala do Bug Bounty: +1 café por estrela, pelo recorde de estrelas)
export function mapCoffee(stars = 0, platinum = false, bounty = false) {
  if (bounty) return COFFEE.bounty[stars] ?? 0;
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
// A maioria dos bônus é de sorte (RNG): "X tem Y% de chance de Z", com
// chances pequenas porque vários nós da mesma defesa SOMAM (+=); alguns
// braços dão bônus fixos pequenos (alcance, velocidade, vida...). Os campos
// (critChance, knockChance...) são lidos em entities/Tower.js, Projectile.js
// e Enemy.js. Os bônus valem POR CIMA dos upgrades da fase (Tower.refresh),
// então upgrade que troca um valor (s.slow = 0.3) não apaga o bônus.
export const ROOT_MONEY = 75; // Acesso Root: dinheiro a mais no começo de cada fase
export const INTEREST = { rate: 0.05, max: 150 }; // Juros: % do dinheiro guardado no começo de cada rodada
export const LOAN = 250; // Empréstimo: até quanto o dinheiro pode ficar negativo (1 vez por partida)
export const BULK_DISCOUNT = 0.05; // Atacadão: todas as defesas custam isso a menos

export const TREE = [
  { id: 'root', name: 'Acesso Root', desc: `Toda fase começa com +$${ROOT_MONEY}`, cost: 3, parent: null },
  { id: 'hacker', tower: 'hacker', name: 'Tecla Crítica', desc: 'Cada teclado tem 5% de chance de dar 200% de dano', cost: 5, parent: 'root',
    apply: (s) => { s.critChance = (s.critChance ?? 0) + 0.05; } },
  { id: 'firewall', tower: 'firewall', name: 'Tremor de Terra', desc: 'Cada vírus atingido pela onda tem 4% de chance de ser empurrado pra trás', cost: 5, parent: 'root',
    apply: (s) => { s.knockChance = (s.knockChance ?? 0) + 0.04; } },
  { id: 'pinguim', tower: 'pinguim', name: 'Kernel Gelado', desc: 'Cada vírus atingido pela onda tem 3% de chance de congelar por 1s', cost: 5, parent: 'root',
    apply: (s) => { s.freezeChance = (s.freezeChance ?? 0) + 0.03; } },
  { id: 'scanner', tower: 'scanner', name: 'Lente Calibrada', desc: 'O laser tem 8% de chance de atravessar e acertar mais 1 vírus', cost: 5, parent: 'root',
    apply: (s) => { s.pierceChance = (s.pierceChance ?? 0) + 0.08; } },
  { id: 'minerador', tower: 'minerador', name: 'Overclock', desc: 'Cada bitcoin minerado tem 5% de chance de valer 200%', cost: 5, parent: 'root',
    apply: (s) => { s.doubleChance = (s.doubleChance ?? 0) + 0.05; } },
  { id: 'honeypot', tower: 'honeypot', name: 'Mel Turbinado', desc: 'Quando quebra, o Honeypot tem 10% de chance de voltar com 50% da vida', cost: 5, parent: 'root',
    apply: (s) => { s.reviveChance = (s.reviveChance ?? 0) + 0.1; } },
  { id: 'executivo', tower: 'executivo', name: 'Hora Extra', desc: 'Cada defesa no raio tem 4% de chance de atacar de novo na hora', cost: 5, parent: 'root',
    apply: (s) => { s.teamRecharge = (s.teamRecharge ?? 0) + 0.04; } },
  // Toque do jogador nos vírus (não é defesa: tower 'tap', status em Game.tapStats)
  { id: 'tap', tower: 'tap', name: 'Dedo Nervoso', desc: 'Cada toque tem 10% de chance de dar 200% de dano', cost: 5, parent: 'root',
    apply: (s) => { s.critChance += 0.1; } },
  // Depois do 1º nó, cada ramo abre em Y: dois braços, cada um um caminho
  // com tema próprio (3 nós em fila). O braço A sai do X2, o B do X3.

  // Hacker — A: crítico e dano crítico · B: velocidade e alcance
  { id: 'hacker2', tower: 'hacker', name: 'Ponto Fraco', desc: '+5% de chance de crítico', cost: 8, parent: 'hacker',
    apply: (s) => { s.critChance = (s.critChance ?? 0) + 0.05; } },
  { id: 'hacker2b', tower: 'hacker', name: 'Exploit Afiado', desc: '+50% de dano crítico', cost: 10, parent: 'hacker2',
    apply: (s) => { s.critMul = (s.critMul ?? 2) + 0.5; } },
  { id: 'hacker2c', tower: 'hacker', name: 'Zero-Day', desc: 'Cada teclado tem 2% de chance de estourar todas as camadas do vírus de uma vez, menos em chefão', cost: 12, parent: 'hacker2b',
    apply: (s) => { s.executeChance = (s.executeChance ?? 0) + 0.02; } },
  { id: 'hacker3', tower: 'hacker', name: 'Dedos Nervosos', desc: 'Arremessa 8% mais rápido', cost: 8, parent: 'hacker',
    apply: (s) => { s.fireRate *= 0.92; } },
  { id: 'hacker3b', tower: 'hacker', name: 'Braço Longo', desc: '+10% de alcance', cost: 10, parent: 'hacker3',
    apply: (s) => { s.range = Math.round(s.range * 1.1); } },
  { id: 'hacker3c', tower: 'hacker', name: 'Ctrl+C Ctrl+V', desc: 'Cada arremesso tem 5% de chance de sair um teclado extra num outro vírus', cost: 12, parent: 'hacker3b',
    apply: (s) => { s.extraShotChance = (s.extraShotChance ?? 0) + 0.05; } },

  // Golem — A: fogo · B: onda (alcance e velocidade)
  { id: 'firewall2', tower: 'firewall', name: 'Brasa Viva', desc: 'Cada vírus atingido tem 5% de chance de ser empurrado pra trás', cost: 8, parent: 'firewall',
    apply: (s) => { s.knockChance = (s.knockChance ?? 0) + 0.05; } },
  { id: 'firewall2b', tower: 'firewall', name: 'Chama Alta', desc: '+30% de dano do fogo', cost: 10, parent: 'firewall2',
    apply: (s) => { s.burnMul = (s.burnMul ?? 1) + 0.3; } },
  { id: 'firewall2c', tower: 'firewall', name: 'Inferno', desc: 'O fogo dura 1s a mais', cost: 12, parent: 'firewall2b',
    apply: (s) => { s.burnExtra = (s.burnExtra ?? 0) + 1; } },
  { id: 'firewall3', tower: 'firewall', name: 'Onda Longa', desc: '+10% de alcance', cost: 8, parent: 'firewall',
    apply: (s) => { s.range = Math.round(s.range * 1.1); } },
  { id: 'firewall3b', tower: 'firewall', name: 'Pulso Rápido', desc: 'Ondas 8% mais rápidas', cost: 10, parent: 'firewall3',
    apply: (s) => { s.fireRate *= 0.92; } },
  { id: 'firewall3c', tower: 'firewall', name: 'Erupção', desc: 'Cada onda tem 4% de chance de sair com 200% do alcance', cost: 12, parent: 'firewall3b',
    apply: (s) => { s.bigPulseChance = (s.bigPulseChance ?? 0) + 0.04; } },

  // Pinguim Linux — A: gelo profundo · B: tempestade (alcance e velocidade)
  { id: 'pinguim2', tower: 'pinguim', name: 'Frio Intenso', desc: 'A lentidão fica 6% mais forte', cost: 8, parent: 'pinguim',
    apply: (s) => { if (s.slow) s.slow *= 0.94; } },
  { id: 'pinguim2b', tower: 'pinguim', name: 'Inverno Longo', desc: 'A lentidão dura 0,3s a mais', cost: 10, parent: 'pinguim2',
    apply: (s) => { if (s.slowTime) s.slowTime += 0.3; } },
  { id: 'pinguim2c', tower: 'pinguim', name: 'Estilhaço', desc: 'Vírus que estoura no gelo tem 10% de chance de estilhaçar e acertar os vizinhos', cost: 12, parent: 'pinguim2b',
    apply: (s) => { s.shatterChance = (s.shatterChance ?? 0) + 0.1; } },
  { id: 'pinguim3', tower: 'pinguim', name: 'Nevasca', desc: '+6% de alcance', cost: 8, parent: 'pinguim',
    apply: (s) => { s.range = Math.round(s.range * 1.06); } },
  { id: 'pinguim3b', tower: 'pinguim', name: 'Vento Gelado', desc: 'Ondas 5% mais rápidas', cost: 10, parent: 'pinguim3',
    apply: (s) => { s.fireRate *= 0.95; } },
  { id: 'pinguim3c', tower: 'pinguim', name: 'Avalanche', desc: 'Cada onda tem 4% de chance de vir outra logo em seguida', cost: 12, parent: 'pinguim3b',
    apply: (s) => { s.repeatChance = (s.repeatChance ?? 0) + 0.04; } },
  // vírus no gelo do Pinguim ficam vulneráveis: levam vulnMul de dano de todas as defesas
  { id: 'pinguim4', tower: 'pinguim', name: 'Gelo Quebradiço', desc: 'Vírus congelados ficam vulneráveis e levam 5% a mais de dano de todas as defesas', cost: 10, parent: 'pinguim',
    apply: (s) => { s.vulnerable = true; s.vulnMul = (s.vulnMul ?? 1) + 0.05; } },

  // Robô NMAP — A: crítico (dano triplo) · B: varredura (velocidade e alcance)
  { id: 'scanner2', tower: 'scanner', name: 'Ping da Morte', desc: 'Cada tiro tem 5% de chance de dar 300% de dano', cost: 8, parent: 'scanner',
    apply: (s) => { s.tripleChance = (s.tripleChance ?? 0) + 0.05; } },
  { id: 'scanner2b', tower: 'scanner', name: 'Pacote Malformado', desc: '+4% de chance de dar 300% de dano', cost: 10, parent: 'scanner2',
    apply: (s) => { s.tripleChance = (s.tripleChance ?? 0) + 0.04; } },
  { id: 'scanner2c', tower: 'scanner', name: 'Sobrecarga', desc: '+100% de dano nesses tiros', cost: 12, parent: 'scanner2b',
    apply: (s) => { s.tripleMul = (s.tripleMul ?? 3) + 1; } },
  { id: 'scanner3', tower: 'scanner', name: 'Clock Turbo', desc: 'Atira 8% mais rápido', cost: 8, parent: 'scanner',
    apply: (s) => { s.fireRate *= 0.92; } },
  { id: 'scanner3b', tower: 'scanner', name: 'Grande Angular', desc: '+8% de alcance', cost: 10, parent: 'scanner3',
    apply: (s) => { s.range = Math.round(s.range * 1.08); } },
  { id: 'scanner3c', tower: 'scanner', name: 'Varredura Dupla', desc: 'Cada tiro tem 6% de chance de recarregar na hora', cost: 12, parent: 'scanner3b',
    apply: (s) => { s.rechargeChance = (s.rechargeChance ?? 0) + 0.06; } },

  // Minerador — A: economia garantida · B: sorte grande
  { id: 'minerador2', tower: 'minerador', name: 'GPU de Segunda Mão', desc: 'O Minerador custa 10% menos', cost: 8, parent: 'minerador',
    apply: (s) => { s.cost = Math.round(s.cost * 0.9); } },
  { id: 'minerador2b', tower: 'minerador', name: 'Mineração Paralela', desc: 'Minera 1 bitcoin a mais por rodada', cost: 10, parent: 'minerador2',
    apply: (s) => { s.packetsPerRound += 1; } },
  { id: 'minerador2c', tower: 'minerador', name: 'Revenda', desc: 'O Minerador vende pelo preço cheio', cost: 12, parent: 'minerador2b',
    apply: (s) => { s.sellRate = 1; } },
  { id: 'minerador3', tower: 'minerador', name: 'Bloco Raro', desc: 'Cada bitcoin tem 2% de chance de virar um bloco que vale 500%', cost: 8, parent: 'minerador',
    apply: (s) => { s.goldChance = (s.goldChance ?? 0) + 0.02; } },
  { id: 'minerador3b', tower: 'minerador', name: 'Veio de Ouro', desc: '+4% de chance de bitcoin valer 200%', cost: 10, parent: 'minerador3',
    apply: (s) => { s.doubleChance = (s.doubleChance ?? 0) + 0.04; } },
  { id: 'minerador3c', tower: 'minerador', name: 'Hash da Sorte', desc: '+2% de chance de bloco raro', cost: 12, parent: 'minerador3b',
    apply: (s) => { s.goldChance = (s.goldChance ?? 0) + 0.02; } },
  // C: dinheiro (Juros e Empréstimo valem pra partida toda, não só pro Minerador; ver game.js)
  { id: 'minerador4', tower: 'minerador', name: 'Juros', desc: `No começo de cada rodada rende ${INTEREST.rate * 100}% do dinheiro guardado (máximo $${INTEREST.max}; não vale na platina)`, cost: 10, parent: 'minerador',
    apply: () => {} },
  { id: 'minerador4b', tower: 'minerador', name: 'Empréstimo', desc: `Uma vez por partida dá pra comprar ficando até $${LOAN} no negativo`, cost: 12, parent: 'minerador4',
    apply: () => {} },
  // cada vírus que entra numa rodada tem goldenChance de vir dourado: destruído, solta goldenValue (game.rollGolden)
  { id: 'minerador4c', tower: 'minerador', name: 'Toque de Midas', desc: '5% dos vírus vêm dourados e, destruídos, soltam $100', cost: 15, parent: 'minerador4b',
    apply: (s) => { s.goldenChance = (s.goldenChance ?? 0) + 0.05; s.goldenValue = 100; } },

  // Honeypot — A: resistência · B: armadilha
  { id: 'honeypot2', tower: 'honeypot', name: 'Pote Reforçado', desc: '+20% de vida', cost: 8, parent: 'honeypot',
    apply: (s) => { s.hp = Math.round(s.hp * 1.2); } },
  { id: 'honeypot2b', tower: 'honeypot', name: 'Mel Cristalizado', desc: '+3s de duração', cost: 10, parent: 'honeypot2',
    apply: (s) => { s.duration += 3; } },
  { id: 'honeypot2c', tower: 'honeypot', name: 'Mel Eterno', desc: '+10% de chance de voltar com 50% da vida', cost: 12, parent: 'honeypot2b',
    apply: (s) => { s.reviveChance = (s.reviveChance ?? 0) + 0.1; } },
  { id: 'honeypot3', tower: 'honeypot', name: 'Mel Pegajoso', desc: 'Cada vírus que para no pote tem 8% de chance de sair grudado, 50% mais lento por 2s', cost: 8, parent: 'honeypot',
    apply: (s) => { s.stickyChance = (s.stickyChance ?? 0) + 0.08; } },
  { id: 'honeypot3b', tower: 'honeypot', name: 'Ferrão', desc: 'Cada vírus que para no pote tem 6% de chance de perder 1 camada', cost: 10, parent: 'honeypot3',
    apply: (s) => { s.stingChance = (s.stingChance ?? 0) + 0.06; } },
  { id: 'honeypot3c', tower: 'honeypot', name: 'Colmeia', desc: 'Quando quebra, o pote tem 5% de chance de soltar abelhas que tiram 1 camada dos vírus em volta', cost: 12, parent: 'honeypot3b',
    apply: (s) => { s.swarmChance = (s.swarmChance ?? 0) + 0.05; } },

  // Executivo — A: a equipe (quem está no raio) · B: o BURNOUT
  { id: 'executivo2', tower: 'executivo', name: 'Plano de Carreira', desc: '+3% de chance de atacar de novo na hora', cost: 8, parent: 'executivo',
    apply: (s) => { s.teamRecharge = (s.teamRecharge ?? 0) + 0.03; } },
  { id: 'executivo2b', tower: 'executivo', name: 'Open Space', desc: '+8% de alcance', cost: 10, parent: 'executivo2',
    apply: (s) => { s.range = Math.round(s.range * 1.08); } },
  { id: 'executivo2c', tower: 'executivo', name: 'Feedback 360°', desc: 'As defesas no raio atacam 5% mais rápido', cost: 12, parent: 'executivo2b',
    apply: (s) => { s.haste += 0.05; } },
  { id: 'executivo3', tower: 'executivo', name: 'Café Expresso', desc: 'O BURNOUT recarrega 2s mais rápido', cost: 8, parent: 'executivo',
    apply: (s) => { s.burnoutFaster = (s.burnoutFaster ?? 0) + 2; } },
  { id: 'executivo3b', tower: 'executivo', name: 'Prazo Apertado', desc: 'O BURNOUT dura 1s a mais', cost: 10, parent: 'executivo3',
    apply: (s) => { s.burnoutExtra = (s.burnoutExtra ?? 0) + 1; } },
  { id: 'executivo3c', tower: 'executivo', name: 'Virada de Noite', desc: 'Cada BURNOUT tem 10% de chance de recarregar na hora', cost: 12, parent: 'executivo3b',
    apply: (s) => { s.burnoutFree = (s.burnoutFree ?? 0) + 0.1; } },

  // Toque — A: força do dedo · B: efeitos em volta
  { id: 'tap2', tower: 'tap', name: 'Calo no Dedo', desc: '+20% de dano por toque', cost: 8, parent: 'tap',
    apply: (s) => { s.damage = Math.round(s.damage * 1.2); } },
  { id: 'tap2b', tower: 'tap', name: 'Clique Duplo', desc: '+8% de chance de dar 200% de dano', cost: 10, parent: 'tap2',
    apply: (s) => { s.critChance += 0.08; } },
  { id: 'tap2c', tower: 'tap', name: 'Ctrl+Alt+Del', desc: 'Cada toque tem 3% de chance de estourar todas as camadas do vírus de uma vez, menos em chefão', cost: 12, parent: 'tap2b',
    apply: (s) => { s.executeChance += 0.03; } },
  { id: 'tap3', tower: 'tap', name: 'Respingo', desc: 'Cada toque tem 10% de chance de acertar também o vírus mais perto', cost: 8, parent: 'tap',
    apply: (s) => { s.splashChance += 0.1; } },
  { id: 'tap3b', tower: 'tap', name: 'Dedo Gordo', desc: '+8% de chance de acertar também o vírus mais perto', cost: 10, parent: 'tap3',
    apply: (s) => { s.splashChance += 0.08; } },
  { id: 'tap3c', tower: 'tap', name: 'Choque Estático', desc: 'Cada toque tem 5% de chance de deixar o vírus 50% mais lento por 2s', cost: 12, parent: 'tap3b',
    apply: (s) => { s.slowChance += 0.05; } },

  // Minerador — fim da linha da economia (GPU de Segunda Mão → Mineração
  // Paralela → Revenda). Fica no fim da lista pra não mexer na posição dos
  // outros nós no grafo (DarkNetScene sorteia na ordem da lista). O desconto
  // vale no preço de colocar qualquer defesa (Game.costOf)
  { id: 'minerador2d', tower: 'minerador', name: 'Atacadão', desc: `Todas as defesas custam ${BULK_DISCOUNT * 100}% menos`, cost: 15, parent: 'minerador2c',
    apply: () => {} },
];

// Upgrade secreto: fora da árvore, apagadinho no canto de cima da Dark Net.
// O Pato de Borracha acompanha as partidas e, a cada vírus estourado, tem
// DUCK.chance de render DUCK.coffee café (fica no save: duckCoffee)
export const DUCK = { chance: 0.0025, coffee: 0.1 };
export const SECRET = {
  id: 'duck',
  name: 'Pato de Borracha',
  desc: 'Um patinho acompanha suas partidas. Cada vírus estourado tem 0,25% de chance de render 0,1 café',
  cost: 20,
  parent: null,
  secret: true,
};

export const NODE = Object.fromEntries([...TREE, SECRET].map((n) => [n.id, n]));

// Aplica nos status de uma defesa os bônus comprados pra ela
export function applyPerks(stats, type, owned = {}) {
  for (const n of TREE) if (n.tower === type && owned[n.id]) n.apply(stats);
  return stats;
}
