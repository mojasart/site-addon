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
// ─────────────────────────────────────────────────────────────
export const ENEMIES = {
  v1: { name: 'Vírus', sprite: 'virus_red', hp: 1, speed: 70, radius: 13, color: '#ff4d5e', children: [] },
  v2: { name: 'Vírus Azul', sprite: 'virus_blue', hp: 1, speed: 95, radius: 14, color: '#3d8bff', children: [['v1', 1]] },
  v3: { name: 'Vírus Verde', sprite: 'virus_green', hp: 1, speed: 120, radius: 14, color: '#2fd27a', children: [['v2', 1]] },
  v4: { name: 'Vírus Amarelo', sprite: 'virus_yellow', hp: 1, speed: 200, radius: 15, color: '#ffc62e', children: [['v3', 1]] },
  v5: { name: 'Vírus Rosa', sprite: 'virus_pink', hp: 1, speed: 220, radius: 15, color: '#ff6fd0', children: [['v4', 1]] },
  worm: {
    name: 'Worm',
    desc: 'Se replica quando destruído',
    hp: 1,
    speed: 130,
    radius: 15,
    color: '#7be04a',
    kind: 'worm',
    sprite: 'worm',
    children: [['v3', 2]],
  },
  trojan: {
    name: 'Trojan',
    desc: 'Blindado: os teclados do Hacker não furam',
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
    hp: 65,
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
    desc: 'Chefão: solta 4 Trojans quando destruído',
    hp: 260,
    speed: 30,
    radius: 38,
    color: '#7a3cc4',
    kind: 'boss',
    sprite: 'ransomware',
    boss: true,
    reward: 50,
    children: [['trojan', 4]],
  },
};

// Quantas vidas um vírus tira se escapar (ele + todos os filhos)
export function threat(type) {
  const def = ENEMIES[type];
  return def.hp + def.children.reduce((sum, [child, n]) => sum + n * threat(child), 0);
}
