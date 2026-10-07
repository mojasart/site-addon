// ─────────────────────────────────────────────────────────────
//  DEFENSORES: a equipe de segurança (sem upgrades no MVP)
//
//  attack:
//    dart      → dardo teleguiado num alvo
//    burst     → leque de pacotes pra todos os lados
//    shockwave → bate o escudo: dano em volta + trava os inimigos (stun)
//    laser     → tiro instantâneo de longo alcance
//    bomb      → bomba com dano em área
//    mine      → não ataca: gera dinheiro durante as ondas
//
//  pierceArmor: consegue ferir inimigos blindados (Trojan)
// ─────────────────────────────────────────────────────────────
export const DEFENDERS = {
  hacker: {
    name: 'Hacker',
    role: 'Ataque básico',
    cost: 100,
    range: 125,
    rate: 0.75,
    damage: 1,
    attack: 'dart',
    pierceArmor: false,
  },
  roteador: {
    name: 'Roteador',
    role: 'Vários alvos',
    cost: 175,
    range: 100,
    rate: 1.15,
    damage: 1,
    count: 6,
    attack: 'burst',
    pierceArmor: false,
  },
  firewall: {
    name: 'Firewall',
    role: 'Bloqueia a passagem',
    cost: 200,
    range: 95,
    rate: 2.4,
    damage: 2,
    stun: 0.7,
    attack: 'shockwave',
    pierceArmor: true,
  },
  scanner: {
    name: 'Scanner',
    role: 'Longo alcance',
    cost: 225,
    range: 340,
    rate: 1.6,
    damage: 4,
    attack: 'laser',
    pierceArmor: true,
  },
  engenheiro: {
    name: 'Engenheiro',
    role: 'Dano em área',
    cost: 250,
    range: 135,
    rate: 1.7,
    damage: 2,
    splash: 55,
    attack: 'bomb',
    pierceArmor: true,
  },
  minerador: {
    name: 'Minerador',
    role: 'Gera dinheiro',
    cost: 150,
    income: 15,
    every: 6,
    attack: 'mine',
  },
};

export const DEFENDER_ORDER = ['hacker', 'roteador', 'firewall', 'scanner', 'engenheiro', 'minerador'];

export const SELL_RATE = 0.7; // vender devolve 70%
