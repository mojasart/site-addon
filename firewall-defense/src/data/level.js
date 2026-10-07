// ─────────────────────────────────────────────────────────────
//  A FASE: "Rede Doméstica"
//
//  Coordenadas numa área de 960x540 (centralizada na tela).
//  O caminho é o cabo de rede por onde as ameaças entram: começa no
//  roteador (fora da tela, à esquerda) e termina no servidor de casa.
//
//  Áreas reservadas pra HUD (não colocar caminho nem pontos aqui):
//    topo esquerdo (vida/dinheiro), topo direito (pausa),
//    faixa de baixo no centro (defesas) e canto inferior direito (onda).
// ─────────────────────────────────────────────────────────────
export const LEVEL = {
  name: 'Rede Doméstica',
  money: 300,
  lives: 20,
  pathWidth: 46,
  path: [
    [-240, 150], [180, 150], [180, 360], [420, 360],
    [420, 130], [660, 130], [660, 330], [850, 330],
  ],
  base: { x: 892, y: 330 }, // servidor a proteger (fim do caminho)
  // Pontos de instalação. `kind` diz quais defensores aceitam (SLOT_KINDS)
  slots: [
    { id: 1, x: 100, y: 92, kind: 'terminal' },
    { id: 2, x: 92, y: 262, kind: 'plataforma' },
    { id: 3, x: 92, y: 382, kind: 'plataforma' },
    { id: 4, x: 300, y: 92, kind: 'plataforma' },
    { id: 5, x: 300, y: 205, kind: 'plataforma' },
    { id: 6, x: 300, y: 300, kind: 'nucleo' },
    { id: 7, x: 540, y: 205, kind: 'nucleo' },
    { id: 8, x: 540, y: 305, kind: 'plataforma' },
    { id: 9, x: 540, y: 400, kind: 'plataforma' },
    { id: 10, x: 770, y: 95, kind: 'terminal' },
    { id: 11, x: 770, y: 205, kind: 'plataforma' },
    { id: 12, x: 760, y: 405, kind: 'plataforma' },
  ],
};

// Tipos de ponto de instalação
export const SLOT_KINDS = {
  plataforma: { name: 'Plataforma', accepts: ['hacker', 'roteador', 'engenheiro', 'minerador'] },
  terminal: { name: 'Terminal', accepts: ['scanner'] },
  nucleo: { name: 'Núcleo', accepts: ['firewall'] },
};
