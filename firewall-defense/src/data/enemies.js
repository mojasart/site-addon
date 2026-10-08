import { LAYER_HP } from '../config.js';

// ─────────────────────────────────────────────────────────────
//  VÍRUS: funcionam como os balões do Bloons.
//  Cada um tem "camadas": quando a vida acaba ele estoura e solta
//  os filhos (children). Ex.: o vírus rosa vira amarelo, que vira verde...
//
//  hp       → dano pra estourar ESSA camada
//  speed    → pixels por segundo
//  radius   → tamanho (colisão e desenho)
//  armored  → blindado: os teclados do Hacker não furam
//  boss     → chefão: não fica lento e mostra barra de vida
//  kind     → qual desenho usar em render/viruses.js
//  sprite   → imagem em assets/sprites (sem ela usa o desenho do kind)
//  reward   → moedas ao estourar essa camada (padrão 1)
//  spawn    → { type, every }: vai soltando esse vírus enquanto está vivo
//  stealth  → invisível: só dá pra acertar no alcance de um Robô NMAP
//  tint     → filtro de cor por cima da sprite (worms evoluídos: mesma sprite, outra cor)
//  lore     → frase do catálogo de ameaças (scenes/CatalogScene.js)
// ─────────────────────────────────────────────────────────────
export const ENEMIES = {
  v1: { name: 'Vírus', lore: 'O malware mais básico da rede. Sozinho é inofensivo; em bando, derruba qualquer servidor.', sprite: 'virus_red', hp: LAYER_HP, speed: 70, radius: 13, color: '#ff4d5e', children: [] },
  v2: { name: 'Vírus Azul', lore: 'Versão atualizada: mais rápida, e esconde um Vírus vermelho dentro.', sprite: 'virus_blue', hp: LAYER_HP, speed: 95, radius: 14, color: '#3d8bff', children: [['v1', 1]] },
  v3: { name: 'Vírus Verde', lore: 'Código polimórfico: muda de cor pra fugir do antivírus. Carrega um Vírus Azul.', sprite: 'virus_green', hp: LAYER_HP, speed: 120, radius: 14, color: '#2fd27a', children: [['v2', 1]] },
  v4: { name: 'Vírus Amarelo', lore: 'Rápido como um exploit zero-day. Dentro dele vem um Vírus Verde.', sprite: 'virus_yellow', hp: LAYER_HP, speed: 200, radius: 15, color: '#ffc62e', children: [['v3', 1]] },
  v5: { name: 'Vírus Rosa', lore: 'O mais veloz da família. Cada camada estourada revela a anterior.', sprite: 'virus_pink', hp: LAYER_HP, speed: 220, radius: 15, color: '#ff6fd0', children: [['v4', 1]] },
  worm: {
    name: 'Worm',
    desc: 'Rápido: vai soltando vírus pelo caminho enquanto está vivo',
    lore: 'Se espalha sozinho pela rede, deixando cópias de si pelo caminho.',
    hp: 3 * LAYER_HP,
    speed: 170,
    radius: 15,
    color: '#7be04a',
    kind: 'worm',
    sprite: 'worm',
    spawn: { type: 'v2', every: 1.4 },
    children: [],
  },
  spyware: {
    name: 'Spyware',
    desc: 'Invisível: só aparece no alcance do Robô NMAP',
    lore: 'Espiona a rede sem ser visto. Só o Robô NMAP, varrendo as portas, consegue revelar ele pras outras defesas.',
    hp: 2 * LAYER_HP,
    speed: 105,
    radius: 14,
    color: '#4b5d73',
    kind: 'spy',
    sprite: 'spyware',
    stealth: true,
    children: [['v2', 1]],
  },
  // Worms evoluídos: a mesma sprite em outra cor; soltam vírus mais fortes
  // pelo caminho e ao estourar. Só nas rodadas finais (data/rounds.js):
  // Mutante a partir da 18, Polimórfico da 21, Rei da 24
  worm2: {
    name: 'Worm Mutante',
    desc: 'Solta Vírus Verdes pelo caminho e mais 2 quando estoura',
    lore: 'Um Worm que aprendeu a se copiar mais rápido. Deixa um rastro de vírus verdes.',
    hp: 4 * LAYER_HP,
    speed: 165,
    radius: 16,
    color: '#3d8bff',
    kind: 'worm',
    sprite: 'worm',
    tint: 'hue-rotate(115deg) saturate(1.3)',
    reward: 2,
    spawn: { type: 'v3', every: 1.4 },
    children: [['v3', 2]],
  },
  worm3: {
    name: 'Worm Polimórfico',
    desc: 'Solta Vírus Amarelos pelo caminho e mais 2 quando estoura',
    lore: 'Reescreve o próprio código a cada salto. Os antivírus nunca o reconhecem duas vezes.',
    hp: 6 * LAYER_HP,
    speed: 160,
    radius: 17,
    color: '#a35cf0',
    kind: 'worm',
    sprite: 'worm',
    tint: 'hue-rotate(170deg) saturate(1.4)',
    reward: 3,
    spawn: { type: 'v4', every: 1.5 },
    children: [['v4', 2]],
  },
  worm4: {
    name: 'Worm Rei',
    desc: 'Solta Vírus Rosas pelo caminho; estourado, vira 2 Worms Mutantes',
    lore: 'O ancestral de todos os Worms. Onde passa, a rede inteira se infecta.',
    hp: 8 * LAYER_HP,
    speed: 150,
    radius: 18,
    color: '#ff4d5e',
    kind: 'worm',
    sprite: 'worm',
    tint: 'hue-rotate(268deg) saturate(2.2) brightness(0.9)',
    reward: 4,
    spawn: { type: 'v5', every: 1.6 },
    children: [['worm2', 2]],
  },
  trojan: {
    name: 'Trojan',
    desc: 'Blindado: os teclados do Hacker não furam',
    lore: 'Disfarçado de programa legítimo e protegido por armadura: teclado não fura.',
    hp: LAYER_HP,
    speed: 60,
    radius: 17,
    color: '#a9b6c8',
    kind: 'trojan',
    sprite: 'trojan',
    armored: true,
    children: [['v4', 2]],
  },
  locker: {
    name: 'Locker',
    desc: 'Mini-chefão acorrentado: solta 2 Trojans',
    lore: 'Tranca tudo com correntes pesadas. Quando cai, liberta 2 Trojans.',
    hp: 135000, // +50% de vida (era 90 mil)
    lives: 90, // vidas que tira se escapar (sem isso: hp / LAYER_HP)
    speed: 35,
    radius: 26,
    color: '#a35cf0',
    kind: 'locker',
    sprite: 'locker',
    boss: true,
    reward: 30,
    children: [['trojan', 2]],
  },
  adware: {
    name: 'Adware',
    desc: 'Chefão: enche a tela de anúncios que atrapalham',
    lore: 'Veio de brinde num "player de vídeo grátis". Agora ninguém consegue fechar as janelas dele.',
    hp: 120000,
    lives: 60,
    speed: 40,
    radius: 28,
    color: '#ffb02e',
    kind: 'adware',
    sprite: 'adware',
    boss: true,
    reward: 30,
    children: [['v4', 3]],
    // enquanto está na tela, abre um anúncio a cada `every` s (no máximo `max`
    // ao mesmo tempo); `moving` deles ficam andando de um lado pro outro e
    // `crypt` vêm criptografados (o X foge). Morreu: os anúncios somem
    // (Game.spawnAd / updateAds / adTap, render/ads.js)
    ads: { every: [4, 7], max: 2, moving: 0.1, crypt: 0.1 },
    topBar: true,
  },
  ransomware: {
    name: 'Ransomware',
    desc: 'Chefão: criptografa as defesas perto dele; solta 4 Trojans',
    lore: 'Sequestra o servidor e pede resgate em bitcoin. O chefão final da rede.',
    hp: 510000, // +50% de vida (era 340 mil)
    lives: 340,
    speed: 30,
    radius: 38,
    color: '#7a3cc4',
    kind: 'boss',
    sprite: 'ransomware',
    boss: true,
    reward: 50,
    children: [['trojan', 4]],
    // a cada quadrado que anda, com alguma defesa a até `range` quadrados,
    // pode tremer e criptografar as defesas nesse alcance: elas param até o
    // jogador pagar `price` de resgate em cada uma. A chance vale pra partida
    // toda (Game.rollRansom): começa em odds[0] (a 1ª é certa); depois de
    // criptografar N vezes cai pra odds[N] (o último vale pras seguintes) e
    // sobe `step` a cada quadrado que ele anda sem criptografar
    ransom: { range: 3, odds: [1, 0.1, 0], step: 0.01, price: 50 },
    topBar: true, // vida numa barra grande no topo da tela (no lugar da barrinha em cima dele)
  },
};

// Quantas vidas um vírus tira se escapar (ele + todos os filhos)
// Quanto dinheiro um vírus dá até o fim (ele + todos os filhos)
export function worth(type) {
  const def = ENEMIES[type];
  return (def.reward ?? 1) + def.children.reduce((sum, [child, n]) => sum + n * worth(child), 0);
}

export function threat(type) {
  const def = ENEMIES[type];
  return lives(def) + def.children.reduce((sum, [child, n]) => sum + n * threat(child), 0);
}

// Vidas que a camada de cima tira (cada LAYER_HP de vida = 1 vida; chefão diz em `lives`)
export const lives = (def) => def.lives ?? def.hp / LAYER_HP;
