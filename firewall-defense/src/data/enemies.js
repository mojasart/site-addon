// ─────────────────────────────────────────────────────────────
//  INIMIGOS (os "zumbis"): andam da direita pra esquerda rumo ao núcleo
//
//  hp     → vida do corpo
//  armor  → vida extra de um acessório (capacete, cadeado...). Quando acaba,
//           o acessório cai e o inimigo vira um vírus comum.
//  speed  → pixels por segundo
//  dps    → dano por segundo que causa ao "corromper" um defensor
//
//  Pra criar um inimigo novo: adicione aqui, desenhe em render/sprites.js
//  (drawEnemy) e use o id nas ondas de data/levels.js
// ─────────────────────────────────────────────────────────────
export const ENEMIES = {
  virus: {
    name: 'Vírus',
    hp: 190,
    speed: 24,
    dps: 100,
    color: '#ff3b5c',
  },
  worm: {
    name: 'Worm',
    hp: 110,
    speed: 50,
    dps: 60,
    color: '#7be04a',
  },
  trojan: {
    name: 'Trojan',
    hp: 190,
    armor: 280,
    armorColor: '#d4a13a',
    speed: 24,
    dps: 100,
    color: '#ff3b5c',
  },
  ransomware: {
    name: 'Ransomware',
    hp: 190,
    armor: 1100,
    armorColor: '#ffd23f',
    speed: 20,
    dps: 100,
    color: '#ff3b5c',
  },
};
