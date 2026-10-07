// ─────────────────────────────────────────────────────────────
//  DEFESAS (os "macacos")
//
//  attack:
//    projectile → arremessa projéteis no alvo (teclados do Hacker)
//    pulse      → onda que atinge todo mundo no alcance (fogo, gelo)
//    beam       → laser instantâneo de longo alcance
//    trap       → fica EM CIMA do caminho e estoura quem passar (onPath)
//    farm       → minera bitcoins durante as rodadas
//
//  upgrades: 2 níveis, cada um com custo e uma função que altera os status
//
//  Pra criar uma defesa nova: adicione aqui, desenhe o personagem em
//  render/characters.js e coloque o id em TOWER_ORDER.
// ─────────────────────────────────────────────────────────────
export const TOWERS = {
  hacker: {
    name: 'Hacker',
    desc: 'Arremessa teclados nos vírus',
    cost: 200,
    radius: 18,
    range: 115,
    attack: 'projectile',
    projectile: 'keyboard',
    fireRate: 0.95,
    damage: 1,
    pierce: 2,
    projectileSpeed: 650,
    canHitArmored: false,
    targeting: true,
    sound: 'throw',
    upgrades: [
      { name: 'Dedos Rápidos', desc: 'Arremessa 40% mais rápido', cost: 150, apply: (s) => { s.fireRate *= 0.6; } },
      { name: 'Exploit Triplo', desc: 'Joga 3 teclados de uma vez', cost: 300, apply: (s) => { s.multishot = 3; } },
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
    desc: 'Suporte: não dá dano, congela os vírus em volta e deixa lentos',
    cost: 300,
    radius: 18,
    range: 85,
    attack: 'pulse',
    effect: 'frost',
    fireRate: 2,
    damage: 0,
    slow: 0.5, // multiplica a velocidade
    slowTime: 1.5,
    vulnerable: false, // congelados levam dano dobrado (upgrade Era do Gelo)
    maxTargets: 30,
    canHitArmored: true,
    sound: 'frost',
    upgrades: [
      { name: 'Criptografia AES', desc: 'Lentidão mais forte e mais longa', cost: 220, apply: (s) => { s.slow = 0.3; s.slowTime = 2.5; } },
      { name: 'Era do Gelo', desc: 'Mais alcance e congelados levam dano dobrado', cost: 450, apply: (s) => { s.vulnerable = true; s.range += 25; } },
    ],
  },
  scanner: {
    name: 'Robô Scanner',
    desc: 'Laser de longo alcance: lento, mas forte e fura blindagem',
    cost: 450,
    radius: 18,
    range: 300,
    attack: 'beam',
    fireRate: 2.5,
    damage: 3,
    canHitArmored: true,
    targeting: true,
    defaultTarget: 'strong',
    sound: 'laser',
    upgrades: [
      { name: 'Alta Precisão', desc: '+3 de dano por tiro', cost: 350, apply: (s) => { s.damage += 3; } },
      { name: 'Varredura Contínua', desc: 'Atira 40% mais rápido', cost: 550, apply: (s) => { s.fireRate *= 0.6; } },
    ],
  },
  minerador: {
    name: 'Minerador',
    desc: 'Minera bitcoins nas rodadas. Caem direto no saldo',
    cost: 650,
    radius: 18,
    attack: 'farm',
    packetsPerRound: 4,
    packetValue: 20,
    packetInterval: 3.5,
    upgrades: [
      { name: 'GPU Extra', desc: '6 bitcoins por rodada', cost: 500, apply: (s) => { s.packetsPerRound = 6; } },
      { name: 'Fazenda de Mineração', desc: 'Também rende $120 a cada rodada nova', cost: 900, apply: (s) => { s.roundBonus = 120; } },
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

export const TOWER_ORDER = ['hacker', 'firewall', 'pinguim', 'scanner', 'minerador', 'honeypot'];

export const TARGET_MODES = [
  { id: 'first', label: 'PRIMEIRO' },
  { id: 'last', label: 'ÚLTIMO' },
  { id: 'strong', label: 'MAIS FORTE' },
  { id: 'close', label: 'MAIS PERTO' },
];
