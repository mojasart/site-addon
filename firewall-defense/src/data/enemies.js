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
//  lore     → frase do catálogo de ameaças (scenes/CatalogScene.js)
// ─────────────────────────────────────────────────────────────
export const ENEMIES = {
  v1: { name: 'Vírus', lore: 'O malware mais básico da rede. Sozinho é inofensivo; em bando, derruba qualquer servidor.', sprite: 'virus_red', hp: 1, speed: 70, radius: 13, color: '#ff4d5e', children: [] },
  v2: { name: 'Vírus Azul', lore: 'Versão atualizada: mais rápida, e esconde um Vírus vermelho dentro.', sprite: 'virus_blue', hp: 1, speed: 95, radius: 14, color: '#3d8bff', children: [['v1', 1]] },
  v3: { name: 'Vírus Verde', lore: 'Código polimórfico: muda de cor pra fugir do antivírus. Carrega um Vírus Azul.', sprite: 'virus_green', hp: 1, speed: 120, radius: 14, color: '#2fd27a', children: [['v2', 1]] },
  v4: { name: 'Vírus Amarelo', lore: 'Rápido como um exploit zero-day. Dentro dele vem um Vírus Verde.', sprite: 'virus_yellow', hp: 1, speed: 200, radius: 15, color: '#ffc62e', children: [['v3', 1]] },
  v5: { name: 'Vírus Rosa', lore: 'O mais veloz da família. Cada camada estourada revela a anterior.', sprite: 'virus_pink', hp: 1, speed: 220, radius: 15, color: '#ff6fd0', children: [['v4', 1]] },
  worm: {
    name: 'Worm',
    desc: 'Rápido: vai soltando vírus pelo caminho enquanto está vivo',
    lore: 'Se espalha sozinho pela rede, deixando cópias de si pelo caminho.',
    hp: 3,
    speed: 170,
    radius: 15,
    color: '#7be04a',
    kind: 'worm',
    sprite: 'worm',
    spawn: { type: 'v2', every: 1.4 },
    children: [],
  },
  trojan: {
    name: 'Trojan',
    desc: 'Blindado: os teclados do Hacker não furam',
    lore: 'Disfarçado de programa legítimo e protegido por armadura: teclado não fura.',
    hp: 1,
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
    hp: 90,
    speed: 35,
    radius: 26,
    color: '#a35cf0',
    kind: 'locker',
    sprite: 'locker',
    boss: true,
    reward: 30,
    children: [['trojan', 2]],
  },
  ransomware: {
    name: 'Ransomware',
    desc: 'Chefão: criptografa as defesas perto dele; solta 4 Trojans',
    lore: 'Sequestra o servidor e pede resgate em bitcoin. O chefão final da rede.',
    hp: 340,
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
  return def.hp + def.children.reduce((sum, [child, n]) => sum + n * threat(child), 0);
}
