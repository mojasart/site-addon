// ─────────────────────────────────────────────────────────────
//  DEFESAS (os "macacos")
//
//  attack:
//    projectile → arremessa projéteis no alvo (teclados do Hacker)
//    pulse      → onda que atinge todo mundo no alcance (fogo, gelo)
//    beam       → laser instantâneo de longo alcance
//    decoy      → isca EM CIMA do caminho (onPath): não dá dano; os vírus
//                 param pra atacar até a vida (hp) dela acabar. A vida também
//                 é um tempo: nas rodadas ela gasta sozinha em `duration` s
//    farm       → minera bitcoins durante as rodadas
//
//  upgrades: 2 níveis, cada um com custo e uma função que altera os status
//  lore:     frase do catálogo de defesas (scenes/CatalogScene.js)
//
//  Pra criar uma defesa nova: adicione aqui, desenhe o personagem em
//  render/characters.js e coloque o id em TOWER_ORDER.
// ─────────────────────────────────────────────────────────────
export const TOWERS = {
  hacker: {
    name: 'Hacker',
    desc: 'Arremessa teclados nos vírus',
    lore: 'Começou como um nerdzinho curioso. Hoje derruba qualquer vírus no arremesso de teclado.',
    cost: 250,
    radius: 18,
    range: 115,
    attack: 'projectile',
    projectile: 'keyboard',
    fireRate: 0.95,
    damage: 1,
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
    lore: 'Tijolo por tijolo, cresce até virar uma muralha de fogo que nenhum malware atravessa.',
    cost: 350,
    radius: 20,
    range: 80,
    attack: 'pulse',
    effect: 'fire',
    fireRate: 1.8, // segundos entre uma onda e outra (golem é lento: bate forte, mas devagar)
    damage: 1,
    maxTargets: 10,
    canHitArmored: true,
    sound: 'fire',
    upgrades: [
      { name: 'Muralha de Fogo', desc: 'Mais alcance e ondas mais rápidas', cost: 280, apply: (s) => { s.range += 20; s.fireRate *= 0.8; } },
      // queima: o vírus fica pegando fogo (burn de dano/s por burnTime s), mesmo fora do alcance;
      // não acumula (ver Enemy.ignite)
      { name: 'Incêndio', desc: 'Vírus pegam fogo: 0,33 de dano/s por até 3s', cost: 500, apply: (s) => { s.burn = 0.33; s.burnTime = 3; } },
    ],
  },
  pinguim: {
    name: 'Penguin Linux',
    desc: 'Suporte: não dá dano, congela os vírus em volta e deixa lentos',
    lore: 'O mascote do código aberto. Congela as ameaças com um abraço gelado.',
    cost: 250,
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
    name: 'Robô NMAP',
    desc: 'Laser de longo alcance: lento, mas forte e fura blindagem',
    lore: 'Varre a rede inteira com a parabólica e mira sempre no vírus mais forte.',
    cost: 500,
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
      // o laser segue reto depois do alvo e acerta mais vírus em linha (até pierce no total)
      { name: 'Feixe Perfurante', desc: 'O laser atravessa e acerta até 2 vírus', cost: 350, apply: (s) => { s.pierce = 2; } },
      { name: 'Varredura Contínua', desc: 'Atira 40% mais rápido', cost: 550, apply: (s) => { s.fireRate *= 0.6; } },
    ],
  },
  minerador: {
    name: 'Minerador',
    desc: 'Minera bitcoins nas rodadas. Caem direto no saldo',
    lore: 'Da picareta ao computador: minera os bitcoins que pagam todas as defesas.',
    cost: 650,
    radius: 18,
    attack: 'farm',
    packetsPerRound: 4,
    packetValue: 20,
    packetInterval: 3.5,
    upgrades: [
      { name: 'GPU Extra', desc: '6 bitcoins por rodada', cost: 500, apply: (s) => { s.packetsPerRound = 6; } },
      // cada vírus que entra numa rodada tem goldenChance de vir dourado: destruído, solta goldenValue
      { name: 'Toque de Midas', desc: '5% dos vírus vêm dourados e soltam $100', cost: 900, apply: (s) => { s.goldenChance = 0.05; s.goldenValue = 100; } },
    ],
  },
  honeypot: {
    name: 'Honeypot',
    desc: 'Isca no caminho: os vírus param pra atacar até ela quebrar',
    lore: 'Um pote de mel irresistível. Os vírus param pra atacar e esquecem do servidor.',
    cost: 90,
    radius: 15,
    attack: 'decoy',
    onPath: true,
    hp: 40, // cada vírus parado tira ~1 por segundo (chefões bem mais)
    duration: 15, // segundos que dura sozinha: nas rodadas vai murchando mesmo sem ninguém morder
    upgrades: [],
  },
};

export const TOWER_ORDER = ['hacker', 'firewall', 'pinguim', 'scanner', 'minerador', 'honeypot'];

// Modos de mira (botão ALVO no painel da defesa). Empate: o mais perto da base.
//   first  → o mais adiantado no caminho      last  → o mais atrasado
//   strong → o que dá mais dano se chegar (vidas que tira: o DANO do catálogo)
//   hp     → o de maior vida MÁXIMA (não a atual: chefão machucado continua alvo)
//   fast   → o mais rápido agora              close → o mais perto da defesa
export const TARGET_MODES = [
  { id: 'first', label: 'PRIMEIRO' },
  { id: 'last', label: 'ÚLTIMO' },
  { id: 'strong', label: 'MAIS FORTE' },
  { id: 'hp', label: 'MAIS VIDA' },
  { id: 'fast', label: 'MAIS RÁPIDO' },
  { id: 'close', label: 'MAIS PERTO' },
];
