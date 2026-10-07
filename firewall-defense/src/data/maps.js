// ─────────────────────────────────────────────────────────────
//  MAPAS (fases)
//
//  Coordenadas pensadas pra uma área de 770x540. Em telas mais largas o
//  mapa fica centralizado e o começo do caminho é esticado até a borda.
//  O primeiro trecho do caminho tem que entrar pela esquerda.
//
//  theme   → visual (render/maps/*.js)
//  rounds  → até qual rodada de data/rounds.js vai
//  terrain → terreno padrão ('land' ou 'water')
//  zones   → áreas com outro terreno. As defesas só vão na terra
//            (o Honeypot vai em cima do caminho).
//            shape 'rect' (x, y, w, h, r) ou 'ellipse' (x, y, rx, ry)
//  seed    → sorteio da decoração (muda pra decorar diferente)
// ─────────────────────────────────────────────────────────────
export const MAPS = [
  {
    id: 'placa-mae',
    name: 'Placa-Mãe',
    difficulty: 'FÁCIL',
    desc: 'Rede doméstica tranquila',
    theme: 'motherboard',
    rounds: 15,
    money: 650,
    lives: 150,
    seed: 7,
    pathWidth: 54,
    terrain: 'land',
    zones: [],
    points: [
      [-420, 150], [140, 150], [140, 420], [320, 420], [320, 110],
      [510, 110], [510, 300], [660, 300], [660, 452],
    ],
  },
  {
    id: 'data-center',
    name: 'Data Center',
    difficulty: 'MÉDIO',
    desc: 'Zonas eletrificadas travam as defesas!',
    theme: 'datacenter',
    rounds: 20,
    money: 650,
    lives: 120,
    seed: 3,
    pathWidth: 54,
    terrain: 'land',
    zones: [],
    // zonas eletrificadas: a cada `period` s dão um choque que atordoa
    // as defesas em cima delas (offset desencontra as descargas)
    hazards: [
      { x: 118, y: 163, w: 60, h: 85, period: 8, offset: 0 },
      { x: 245, y: 320, w: 120, h: 100, period: 8, offset: 2.7 },
      { x: 460, y: 315, w: 105, h: 95, period: 8, offset: 5.3 },
    ],
    points: [
      [-420, 130], [210, 130], [210, 280], [90, 280], [90, 460],
      [420, 460], [420, 270], [590, 270], [590, 120], [700, 120], [700, 452],
    ],
  },
  {
    id: 'cabo-submarino',
    name: 'Cabo Submarino',
    difficulty: 'DIFÍCIL',
    desc: 'Pouca terra, muito mar',
    theme: 'ocean',
    rounds: 25,
    money: 700,
    lives: 100,
    seed: 11,
    pathWidth: 50,
    terrain: 'water',
    zones: [
      { terrain: 'land', shape: 'ellipse', x: 70, y: 165, rx: 68, ry: 55 },
      { terrain: 'land', shape: 'ellipse', x: 240, y: 300, rx: 56, ry: 108 },
      { terrain: 'land', shape: 'ellipse', x: 425, y: 300, rx: 60, ry: 104 },
      { terrain: 'land', shape: 'ellipse', x: 605, y: 320, rx: 52, ry: 84 },
      { terrain: 'land', shape: 'ellipse', x: 90, y: 455, rx: 80, ry: 62 },
      { terrain: 'land', shape: 'ellipse', x: 430, y: 48, rx: 118, ry: 34 },
      { terrain: 'land', shape: 'ellipse', x: 690, y: 492, rx: 66, ry: 42 },
    ],
    points: [
      [-420, 280], [150, 280], [150, 125], [330, 125], [330, 440],
      [520, 440], [520, 175], [690, 175], [690, 452],
    ],
  },
];
