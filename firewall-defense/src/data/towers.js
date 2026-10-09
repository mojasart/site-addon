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
//    aura       → não ataca: as defesas no alcance atacam mais rápido (haste)
//
//  commander: comandante (Executivo). No máximo COMMANDER_MAX por fase; com
//  um no mapa aparecem os botões de poder num canto de baixo do mapa
//  (BURNOUT e, no nível 2, a Lixeira Turbo)
//  splash:    raio da explosão do projétil (Zip Bomb do Script Kiddie)
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
    damage: 1000,
    projectileSpeed: 650,
    canHitArmored: false,
    targeting: true,
    sound: 'throw',
    upgrades: [
      { name: 'Dedos Rápidos', desc: 'Arremessa 30% mais rápido', cost: 200, apply: (s) => { s.fireRate *= 0.7; } },
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
    damage: 1000,
    maxTargets: 10,
    canHitArmored: true,
    sound: 'fire',
    upgrades: [
      { name: 'Muralha de Fogo', desc: 'Mais alcance e ondas mais rápidas', cost: 280, apply: (s) => { s.range += 20; s.fireRate *= 0.8; } },
      // queima: o vírus fica pegando fogo (burn de dano/s por burnTime s), mesmo fora do alcance;
      // não acumula (ver Enemy.ignite)
      { name: 'Incêndio', desc: 'Os vírus pegam fogo', cost: 500, apply: (s) => { s.burn = 500; s.burnTime = 3; } },
    ],
  },
  pinguim: {
    name: 'Pinguim Linux',
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
    slowTime: 1.5, // lento só enquanto a onda de gelo está ativa (os upgrades não esticam)
    vulnerable: false, // congelados levam vulnMul de dano (Gelo Quebradiço, Dark Net)
    maxTargets: 30,
    canHitArmored: true,
    sound: 'frost',
    upgrades: [
      // lentidão 40% mais forte: os 50% da base viram 70% (slow 0,5 → 0,3)
      { name: 'Criptografia AES', desc: 'Lentidão mais forte', cost: 220, apply: (s) => { s.slow = 1 - (1 - s.slow) * 1.4; } },
      { name: 'Cold Reboot', desc: 'Mais alcance e ondas um pouco mais rápidas', cost: 450, apply: (s) => { s.range += 25; s.fireRate *= 0.85; } },
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
    reveals: true, // deixa o Spyware visível no alcance dele
    fireRate: 2.8,
    damage: 12000, // sniper: tiro lento e pesado (o que mais tira vida de chefão)
    canHitArmored: true,
    targeting: true,
    defaultTarget: 'strong',
    sound: 'laser',
    upgrades: [
      // o laser segue reto depois do alvo e acerta mais vírus em linha (até pierce no total)
      { name: 'Feixe Perfurante', desc: 'O laser atravessa e acerta até 2 vírus', cost: 350, apply: (s) => { s.pierce = 2; } },
      // o vírus atingido fica marcado: por markTime s leva markMul de dano de todas as defesas
      { name: 'Marcar Alvo', desc: 'O alvo leva +25% de dano por 2s', cost: 550, apply: (s) => { s.markTime = 2; s.markMul = 1.25; } },
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
      // escolhe uma defesa aleatória (que ataca) pra patrocinar: cada vírus que
      // ela estourar solta +$`sponsor` (Tower.updateSponsor, Enemy.pop)
      { name: 'Patrocínio', desc: 'Uma defesa aleatória dá mais bitcoin por abate', cost: 900,
        apply: (s) => { s.sponsor = 1; } },
    ],
  },
  honeypot: {
    name: 'Honeypot',
    desc: 'Isca no caminho: os vírus param pra atacar até ela quebrar',
    lore: 'Um pote de mel irresistível. Os vírus param pra atacar e esquecem do servidor.',
    cost: 90,
    radius: 15,
    attack: 'decoy',
    noSell: true, // não dá pra vender (Game.sell, botão some no painel)
    onPath: true,
    hp: 40, // cada vírus parado tira ~1 por segundo (chefões bem mais)
    duration: 15, // segundos que dura sozinha: nas rodadas vai murchando mesmo sem ninguém morder
    upgrades: [],
  },
  executivo: {
    name: 'Executivo',
    desc: 'Comandante: as defesas no raio dele atacam mais rápido. Poder: BURNOUT',
    lore: 'Nunca escreveu uma linha de código, mas cobra entrega de todo mundo. E todo mundo entrega.',
    cost: 400,
    radius: 18,
    range: 95,
    attack: 'aura',
    commander: true,
    haste: 0.15, // defesas no alcance atacam 15% mais rápido (dois Executivos não somam: vale o maior)
    upgrades: [
      // nível 2: botão da Lixeira Turbo (BIN), paga a cada chamada
      { name: 'Limpeza de Disco', desc: 'Libera a Lixeira Turbo: pague e ela vem deletando vírus', cost: 300,
        apply: (s) => { s.bin = true; } },
      { name: 'Meta Agressiva', desc: 'Mais alcance, +25% de velocidade e BURNOUT 3s mais longo', cost: 450,
        apply: (s) => { s.range += 20; s.haste = 0.25; s.burnoutExtra = 3; } },
    ],
  },
  kiddie: {
    name: 'Script Kiddie',
    desc: 'Joga Zip Bombs: explodem e acertam os vírus em volta',
    lore: 'Baixou um "kit hacker" num fórum duvidoso. Não sabe direito o que faz, mas explode tudo.',
    cost: 375,
    radius: 18,
    range: 110,
    attack: 'projectile',
    projectile: 'zip',
    fireRate: 1.6,
    damage: 1000,
    splash: 42, // raio da explosão: acerta até maxTargets vírus
    maxTargets: 8,
    projectileSpeed: 420,
    canHitArmored: false,
    targeting: true,
    sound: 'throw',
    upgrades: [
      { name: 'Compressão Máxima', desc: 'Explosão maior e arremessa mais rápido', cost: 300,
        apply: (s) => { s.splash = 56; s.fireRate *= 0.8; } },
      // a explosão espalha `cluster` zips menores em volta (Projectile.explode)
      { name: 'Zip de Zips', desc: 'Cada explosão solta 3 zips menores em volta', cost: 550, apply: (s) => { s.cluster = 3; } },
    ],
  },
};

export const TOWER_ORDER = ['hacker', 'firewall', 'pinguim', 'scanner', 'kiddie', 'minerador', 'honeypot', 'executivo'];

// Comandantes por fase (Executivo)
export const COMMANDER_MAX = 3;
// Poder do Executivo: as defesas que atacam no raio de um Executivo ficam
// `haste` mais rápidas por `time` s (+ burnoutExtra do melhor Executivo);
// dá pra usar de novo `cooldown` s depois de ativar
export const BURNOUT = { haste: 0.6, time: 5, cooldown: 20 };
// Lixeira Turbo (Executivo nível 2, entities/Bin.js): a lixeira do sistema
// vem rolando e deleta vírus. Custa `cost` por chamada e dá pra chamar de
// novo `cooldown` s depois. Sai da base e rola pelo caminho ao contrário
// (`speed` px/s); quem encosta para e morde (como no Honeypot: perde vida)
// e ela tira `hit` de até `maxTargets` vírus encostados a cada `every` s
// (fura blindagem). Some quando a vida (`hp`) acaba ou quando chega na entrada
export const BIN = { cost: 300, cooldown: 35, hp: 30, speed: 60, hit: 1000, every: 0.6, maxTargets: 3, r: 17 };

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
