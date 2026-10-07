// ─────────────────────────────────────────────────────────────
//  DEFESAS (os "macacos")
//
//  attack:
//    projectile → arremessa projéteis no alvo (dart ou bomb)
//    spray      → solta vários projéteis pra todos os lados
//    pulse      → onda que atinge todo mundo no alcance (fogo, gelo)
//    beam       → laser instantâneo (range Infinity = mapa todo)
//    hook       → fisga o vírus e puxa ele pra trás no caminho
//    buff       → não ataca: acelera as defesas por perto
//    trap       → fica EM CIMA do caminho e estoura quem passar (onPath)
//    farm       → minera moedas durante as rodadas
//
//  terrain: 'water' = só pode ser colocado na água (padrão: terra)
//  upgrades: 2 níveis, cada um com custo e uma função que altera os status
//
//  Pra criar uma defesa nova: adicione aqui, desenhe o personagem em
//  render/characters.js e coloque o id em TOWER_ORDER.
// ─────────────────────────────────────────────────────────────
export const TOWERS = {
  hacker: {
    name: 'Hacker',
    desc: 'Arremessa dardos de código nos vírus',
    cost: 200,
    radius: 18,
    range: 115,
    attack: 'projectile',
    projectile: 'dart',
    fireRate: 0.95,
    damage: 1,
    pierce: 2,
    projectileSpeed: 650,
    canHitArmored: false,
    targeting: true,
    sound: 'throw',
    upgrades: [
      { name: 'Dedos Rápidos', desc: 'Arremessa 40% mais rápido', cost: 150, apply: (s) => { s.fireRate *= 0.6; } },
      { name: 'Exploit Triplo', desc: 'Joga 3 dardos de uma vez', cost: 300, apply: (s) => { s.multishot = 3; } },
    ],
  },
  roteador: {
    name: 'Roteador',
    desc: 'Espalha pacotes pra todos os lados',
    cost: 320,
    radius: 18,
    range: 78,
    attack: 'spray',
    projectile: 'packet',
    fireRate: 1.25,
    damage: 1,
    pierce: 1,
    count: 8,
    projectileSpeed: 420,
    canHitArmored: false,
    sound: 'spray',
    upgrades: [
      { name: 'Wi-Fi 6', desc: '12 pacotes e 25% mais rápido', cost: 260, apply: (s) => { s.count = 12; s.fireRate *= 0.75; } },
      { name: 'Rede Mesh', desc: 'Cada pacote atravessa 3 vírus', cost: 420, apply: (s) => { s.pierce = 3; s.range += 15; } },
    ],
  },
  firewall: {
    name: 'Golem Firewall',
    desc: 'Bate no chão: onda de fogo que queima blindados',
    cost: 350,
    radius: 20,
    range: 80,
    attack: 'pulse',
    effect: 'fire',
    fireRate: 1.3,
    damage: 1,
    maxTargets: 10,
    canHitArmored: true,
    sound: 'fire',
    upgrades: [
      { name: 'Chamas Intensas', desc: '+1 de dano por onda', cost: 280, apply: (s) => { s.damage += 1; } },
      { name: 'Muralha de Fogo', desc: 'Mais alcance e ondas mais rápidas', cost: 500, apply: (s) => { s.range += 25; s.fireRate *= 0.6; } },
    ],
  },
  pinguim: {
    name: 'Pinguim',
    desc: 'Congela os vírus em volta e deixa lentos',
    cost: 300,
    radius: 18,
    range: 85,
    attack: 'pulse',
    effect: 'frost',
    fireRate: 2,
    damage: 0,
    slow: 0.5, // multiplica a velocidade
    slowTime: 1.5,
    maxTargets: 30,
    canHitArmored: true,
    sound: 'frost',
    upgrades: [
      { name: 'Criptografia AES', desc: 'Lentidão mais forte e mais longa', cost: 220, apply: (s) => { s.slow = 0.3; s.slowTime = 2.5; } },
      { name: 'Era do Gelo', desc: 'O congelamento também dá 1 de dano', cost: 380, apply: (s) => { s.damage = 1; } },
    ],
  },
  engenheiro: {
    name: 'Engenheiro',
    desc: 'Arremessa bombas lógicas que explodem em área',
    cost: 500,
    radius: 18,
    range: 125,
    attack: 'projectile',
    projectile: 'bomb',
    fireRate: 1.4,
    damage: 1,
    pierce: 1,
    splash: 42,
    splashTargets: 14,
    projectileSpeed: 420,
    canHitArmored: true,
    targeting: true,
    sound: 'throw',
    upgrades: [
      { name: 'Bomba Maior', desc: 'Explosão 50% maior', cost: 350, apply: (s) => { s.splash = 62; s.splashTargets = 22; } },
      { name: 'Fragmentação', desc: 'A explosão dá +1 de dano', cost: 600, apply: (s) => { s.damage = 2; } },
    ],
  },
  scanner: {
    name: 'Robô Scanner',
    desc: 'Laser que alcança o mapa inteiro',
    cost: 380,
    radius: 18,
    range: Infinity,
    attack: 'beam',
    fireRate: 1.6,
    damage: 2,
    canHitArmored: true,
    targeting: true,
    sound: 'laser',
    upgrades: [
      { name: 'Alta Precisão', desc: '+2 de dano por tiro', cost: 320, apply: (s) => { s.damage += 2; } },
      { name: 'Varredura Contínua', desc: 'Atira 2x mais rápido', cost: 520, apply: (s) => { s.fireRate *= 0.5; } },
    ],
  },
  pescador: {
    name: 'Pescador',
    desc: 'Só na água! Fisga vírus e puxa eles pra trás',
    cost: 400,
    radius: 20,
    terrain: 'water',
    range: 135,
    attack: 'hook',
    fireRate: 2.2,
    damage: 2,
    pull: 70,
    hooks: 1,
    canHitArmored: true,
    targeting: true,
    defaultTarget: 'strong',
    sound: 'hook',
    upgrades: [
      { name: 'Anzol Duplo', desc: 'Fisga 2 vírus de uma vez', cost: 350, apply: (s) => { s.hooks = 2; } },
      { name: 'Rede de Pesca', desc: 'Puxa mais longe e +1 de dano', cost: 550, apply: (s) => { s.pull = 120; s.damage = 3; } },
    ],
  },
  sysadmin: {
    name: 'Sysadmin',
    desc: 'Toma café e acelera as defesas por perto',
    cost: 650,
    radius: 18,
    range: 110,
    attack: 'buff',
    buffRate: 0.85, // defesas por perto atacam 15% mais rápido
    buffArmored: false,
    upgrades: [
      { name: 'Café Duplo', desc: 'Defesas por perto 25% mais rápidas', cost: 500, apply: (s) => { s.buffRate = 0.75; } },
      { name: 'Acesso Root', desc: 'Defesas por perto furam blindagem', cost: 900, apply: (s) => { s.buffArmored = true; } },
    ],
  },
  minerador: {
    name: 'Minerador',
    desc: 'Minera moedas nas rodadas. Caem direto no saldo',
    cost: 650,
    radius: 18,
    attack: 'farm',
    packetsPerRound: 4,
    packetValue: 20,
    packetInterval: 3.5,
    upgrades: [
      { name: 'GPU Extra', desc: '6 moedas por rodada', cost: 500, apply: (s) => { s.packetsPerRound = 6; } },
      { name: 'Fazenda de Mineração', desc: 'Cada moeda vale $35', cost: 900, apply: (s) => { s.packetValue = 35; } },
    ],
  },
  honeypot: {
    name: 'Honeypot',
    desc: 'Armadilha no caminho: estoura 6 vírus e some',
    cost: 80,
    radius: 15,
    attack: 'trap',
    onPath: true,
    capacity: 6,
    damage: 1,
    canHitArmored: true,
    upgrades: [],
  },
};

export const TOWER_ORDER = [
  'hacker', 'roteador', 'firewall', 'pinguim', 'engenheiro',
  'scanner', 'pescador', 'sysadmin', 'minerador', 'honeypot',
];

export const TARGET_MODES = [
  { id: 'first', label: 'PRIMEIRO' },
  { id: 'last', label: 'ÚLTIMO' },
  { id: 'strong', label: 'MAIS FORTE' },
  { id: 'close', label: 'MAIS PERTO' },
];
