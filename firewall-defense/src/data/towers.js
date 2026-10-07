// ─────────────────────────────────────────────────────────────
//  DEFESAS (as "torres")
//
//  attack:
//    projectile → atira projéteis no alvo (com perfuração = pierce)
//    pulse      → solta uma onda que atinge todo mundo no alcance
//    beam       → laser instantâneo (range Infinity = mapa todo)
//    trap       → fica EM CIMA do caminho e estoura quem passar (onPath)
//    farm       → gera pacotes de bits durante as rodadas
//
//  upgrades: 2 níveis, cada um com custo e uma função que altera os status.
//  Pra criar uma defesa nova: adicione aqui, desenhe em render/sprites.js
//  (TOWER_SPRITES) e coloque o id em TOWER_ORDER.
// ─────────────────────────────────────────────────────────────
export const TOWERS = {
  antivirus: {
    name: 'Antivírus',
    desc: 'Dispara varreduras nos vírus',
    cost: 200,
    radius: 20,
    range: 115,
    attack: 'projectile',
    fireRate: 0.95,
    damage: 1,
    pierce: 2,
    projectileSpeed: 650,
    canHitArmored: false,
    targeting: true,
    upgrades: [
      { name: 'Varredura Rápida', desc: 'Atira 40% mais rápido', cost: 150, apply: (s) => { s.fireRate *= 0.6; } },
      {
        name: 'Heurística',
        desc: 'Fura blindagem e atravessa +2 vírus',
        cost: 320,
        apply: (s) => { s.canHitArmored = true; s.pierce += 2; },
      },
    ],
  },
  firewall: {
    name: 'Firewall',
    desc: 'Onda de fogo em volta. Queima blindados',
    cost: 300,
    radius: 22,
    range: 80,
    attack: 'pulse',
    effect: 'fire',
    fireRate: 1.3,
    damage: 1,
    maxTargets: 12,
    canHitArmored: true,
    upgrades: [
      { name: 'Chamas Intensas', desc: '+1 de dano por onda', cost: 260, apply: (s) => { s.damage += 1; } },
      {
        name: 'Muralha de Fogo',
        desc: 'Mais alcance e ondas mais rápidas',
        cost: 480,
        apply: (s) => { s.range += 25; s.fireRate *= 0.6; },
      },
    ],
  },
  criptografia: {
    name: 'Criptografia',
    desc: 'Criptografa os vírus em volta e deixa lentos',
    cost: 300,
    radius: 20,
    range: 85,
    attack: 'pulse',
    effect: 'frost',
    fireRate: 2,
    damage: 0,
    slow: 0.5, // multiplica a velocidade
    slowTime: 1.5,
    maxTargets: 30,
    canHitArmored: true,
    upgrades: [
      { name: 'AES-256', desc: 'Lentidão mais forte e mais longa', cost: 220, apply: (s) => { s.slow = 0.3; s.slowTime = 2.5; } },
      { name: 'Quebra de Chave', desc: 'A onda também causa 1 de dano', cost: 380, apply: (s) => { s.damage = 1; } },
    ],
  },
  scanner: {
    name: 'Scanner',
    desc: 'Laser que acerta qualquer lugar do mapa',
    cost: 350,
    radius: 20,
    range: Infinity,
    attack: 'beam',
    fireRate: 1.6,
    damage: 2,
    canHitArmored: true,
    targeting: true,
    upgrades: [
      { name: 'Alta Precisão', desc: '+2 de dano', cost: 320, apply: (s) => { s.damage += 2; } },
      { name: 'Varredura Contínua', desc: 'Atira 2x mais rápido', cost: 520, apply: (s) => { s.fireRate *= 0.5; } },
    ],
  },
  honeypot: {
    name: 'Honeypot',
    desc: 'Armadilha no caminho: estoura 12 vírus e some',
    cost: 45,
    radius: 16,
    attack: 'trap',
    onPath: true,
    capacity: 12,
    damage: 1,
    canHitArmored: true,
    upgrades: [],
  },
  minerador: {
    name: 'Minerador',
    desc: 'Gera pacotes de bits nas rodadas. Toque neles!',
    cost: 450,
    radius: 22,
    attack: 'farm',
    packetsPerRound: 4,
    packetValue: 20,
    packetInterval: 3.5,
    upgrades: [
      { name: 'GPU Extra', desc: '6 pacotes por rodada', cost: 450, apply: (s) => { s.packetsPerRound = 6; } },
      { name: 'Fazenda de Mineração', desc: 'Cada pacote vale $35', cost: 800, apply: (s) => { s.packetValue = 35; } },
    ],
  },
};

export const TOWER_ORDER = ['antivirus', 'firewall', 'criptografia', 'scanner', 'honeypot', 'minerador'];

export const TARGET_MODES = [
  { id: 'first', label: 'PRIMEIRO' },
  { id: 'last', label: 'ÚLTIMO' },
  { id: 'strong', label: 'MAIS FORTE' },
  { id: 'close', label: 'MAIS PERTO' },
];
