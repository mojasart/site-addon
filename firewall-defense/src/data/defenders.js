// ─────────────────────────────────────────────────────────────
//  DEFENSORES (as "plantas" do jogo)
//
//  behavior:
//    producer → gera pacotes de bits de tempos em tempos (o "girassol")
//    shooter  → atira nos inimigos da mesma linha (a "ervilha")
//    wall     → só segura a pancada, tem muita vida (a "noz")
//    trap     → arma depois de um tempo e explode quem encostar (a "batata-mina")
//
//  Pra criar um defensor novo:
//    1. adicione uma entrada aqui
//    2. desenhe ele em render/sprites.js (DEFENDER_SPRITES)
//    3. coloque o id na lista `defenders` da fase em data/levels.js
// ─────────────────────────────────────────────────────────────
export const DEFENDERS = {
  minerador: {
    name: 'Minerador',
    desc: 'Minera pacotes de bits pra você comprar defesas',
    cost: 50,
    cooldown: 7.5,
    hp: 300,
    behavior: 'producer',
    produceEvery: 22,
    firstProduce: [5, 10],
    produceValue: 25,
  },
  antivirus: {
    name: 'Antivírus',
    desc: 'Dispara varreduras nos vírus da linha',
    cost: 100,
    cooldown: 7.5,
    hp: 300,
    behavior: 'shooter',
    fireRate: 1.4,
    damage: 20,
    projectile: 'scan',
  },
  firewall: {
    name: 'Firewall',
    desc: 'Bloqueia a passagem e aguenta muito dano',
    cost: 50,
    cooldown: 30,
    hp: 4000,
    behavior: 'wall',
  },
  criptografia: {
    name: 'Criptografia',
    desc: 'Dispara pacotes criptografados que deixam os vírus lentos',
    cost: 175,
    cooldown: 7.5,
    hp: 300,
    behavior: 'shooter',
    fireRate: 1.4,
    damage: 20,
    projectile: 'crypto',
    slowDuration: 4,
  },
  honeypot: {
    name: 'Honeypot',
    desc: 'Armadilha: arma em 12s e explode o vírus que cair nela',
    cost: 25,
    cooldown: 30,
    hp: 300,
    behavior: 'trap',
    armTime: 12,
    damage: 1800,
    triggerRange: 55,
    blastRange: 85,
  },
};
