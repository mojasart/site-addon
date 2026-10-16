// ─────────────────────────────────────────────────────────────
//  ROTEIROS DOS PREVIEWS DO CATÁLOGO (vídeos em assets/previews/<id>.mp4)
//
//  Cada preview é o jogo de verdade (Game no modo 'preview') rodando no mapa
//  de testes (PREVIEW_MAP em data/maps.js: estrada reta na linha 5), gravado
//  por tools/previews/record.js. Um roteiro por defesa e por ameaça:
//    towers → [tipo, coluna, linha, nível] (nível 0 = criança, 2 = adulto);
//             o Honeypot vai na estrada (linha 5)
//    rounds → as ondas (como em data/rounds.js; hp multiplica a vida, pros
//             chefões não levarem minutos pra cair)
//    coin   → [coluna, linha] da pilha de bitcoin (Minerador)
//    at     → [segundo, ação] durante a gravação (ação recebe o Game)
//    closeAds → fecha cada anúncio do Adware depois de tantos segundos
//               (como o jogador tocando no X)
//  A gravação tem LENGTH segundos (o vídeo fica em loop no catálogo).
//
//  Mexeu num roteiro ou no jogo? Grave de novo: node tools/previews/record.js
//  (ou só alguns: node tools/previews/record.js hacker v1)
// ─────────────────────────────────────────────────────────────

export const PREVIEW = {
  length: 10, // segundos de cada vídeo
  start: 0.4, // a onda começa depois disso
  fps: 30,
  // recorte do mapa que vira o vídeo (coordenadas do jogo: 756×540): da
  // linha 2,5 à 7,5, com a estrada no meio
  crop: { x: 0, y: 135, w: 756, h: 270 },
};

// As mesmas defesas pra quase todas as ameaças: um Hacker e um Golem
const DUO = [['hacker', 5, 4, 1], ['firewall', 9, 6, 1]];

export const PREVIEWS = {
  // ── Defesas ──
  hacker: {
    towers: [['hacker', 3, 4, 0], ['hacker', 8, 6, 2]],
    rounds: [[{ type: 'v1', count: 8, gap: 0.6 }, { type: 'v2', count: 4, gap: 0.9, at: 2.5 }]],
  },
  firewall: {
    towers: [['firewall', 4, 4, 0], ['firewall', 9, 6, 2]],
    rounds: [[{ type: 'v2', count: 12, gap: 0.3 }, { type: 'v3', count: 5, gap: 0.4, at: 4 }]],
  },
  pinguim: {
    towers: [['pinguim', 4, 6, 2], ['hacker', 7, 4, 1]],
    rounds: [[{ type: 'v3', count: 8, gap: 0.6 }, { type: 'v4', count: 3, gap: 1, at: 4 }]],
  },
  scanner: {
    towers: [['scanner', 2, 6, 2]],
    rounds: [[{ type: 'spyware', count: 3, gap: 1.6 }, { type: 'trojan', count: 3, gap: 1.4, at: 1 }]],
  },
  minerador: {
    towers: [['minerador', 6, 3, 2], ['hacker', 5, 6, 2]],
    coin: [6, 3],
    rounds: [[{ type: 'v1', count: 12, gap: 0.7 }]],
  },
  honeypot: {
    towers: [['honeypot', 8, 5, 0], ['hacker', 7, 4, 1], ['hacker', 10, 6, 0]],
    rounds: [[{ type: 'v1', count: 6, gap: 0.3 }, { type: 'v2', count: 5, gap: 0.4, at: 3 }]],
  },
  executivo: {
    towers: [['executivo', 6, 6, 2], ['hacker', 5, 4, 0], ['hacker', 7, 4, 0]],
    rounds: [[{ type: 'v2', count: 12, gap: 0.5 }]],
    at: [[3, (g) => g.burnout()]],
  },

  // ── Ameaças ──
  v1: { towers: DUO, rounds: [[{ type: 'v1', count: 7, gap: 0.8 }]] },
  v2: { towers: DUO, rounds: [[{ type: 'v2', count: 6, gap: 0.9 }]] },
  v3: { towers: DUO, rounds: [[{ type: 'v3', count: 6, gap: 1 }]] },
  v4: { towers: DUO, rounds: [[{ type: 'v4', count: 5, gap: 1.4 }]] },
  v5: { towers: [['hacker', 5, 4, 2], ['firewall', 9, 6, 2], ['hacker', 11, 4, 1]], rounds: [[{ type: 'v5', count: 4, gap: 1.8 }]] },
  worm: { towers: [['hacker', 9, 4, 1], ['firewall', 11, 6, 1]], rounds: [[{ type: 'worm', count: 2, gap: 3 }]] },
  worm2: { towers: [['hacker', 9, 4, 2], ['firewall', 11, 6, 2]], rounds: [[{ type: 'worm2', count: 2, gap: 3 }]] },
  worm3: { towers: [['hacker', 8, 4, 2], ['firewall', 10, 6, 2], ['hacker', 11, 4, 2]], rounds: [[{ type: 'worm3', count: 2, gap: 3.5 }]] },
  worm4: { towers: [['hacker', 7, 4, 2], ['firewall', 9, 6, 2], ['hacker', 11, 4, 2], ['firewall', 11, 6, 2]], rounds: [[{ type: 'worm4', count: 1, gap: 0 }]] },
  spyware: { towers: [['hacker', 4, 4, 1], ['scanner', 9, 6, 1]], rounds: [[{ type: 'spyware', count: 4, gap: 1.5 }]] },
  cicada: {
    towers: [['hacker', 5, 4, 2], ['scanner', 9, 6, 2]],
    rounds: [[{ type: 'cicada', count: 1, gap: 0, hp: 0.06 }, { type: 'v1', count: 5, gap: 0.6, at: 0.3 }, { type: 'v2', count: 4, gap: 0.8, at: 3 }]],
  },
  trojan: { towers: [['hacker', 4, 4, 1], ['firewall', 8, 6, 1]], rounds: [[{ type: 'trojan', count: 4, gap: 1.5 }]] },
  // chefões lentos: as defesas ficam no meio (o Locker cai lá pelos 8 s e
  // solta os Trojans; o Adware abre 2 anúncios antes de cair)
  locker: {
    towers: [['hacker', 4, 4, 2], ['firewall', 5, 6, 2], ['hacker', 6, 4, 1]],
    rounds: [[{ type: 'locker', count: 1, gap: 0, hp: 0.12 }]],
  },
  adware: {
    towers: [['hacker', 4, 4, 2], ['firewall', 5, 6, 2], ['hacker', 6, 4, 1]],
    rounds: [[{ type: 'adware', count: 1, gap: 0, hp: 0.1 }]],
    closeAds: 1.4,
  },
  ransomware: {
    towers: [['hacker', 3, 4, 2], ['firewall', 5, 6, 2], ['hacker', 7, 4, 1]],
    rounds: [[{ type: 'ransomware', count: 1, gap: 0, hp: 0.02 }]],
  },
};
