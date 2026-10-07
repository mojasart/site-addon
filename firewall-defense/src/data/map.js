// ─────────────────────────────────────────────────────────────
//  MAPA
//  Coordenadas pensadas para uma área de 770x540. Em telas mais largas
//  o mapa fica centralizado e o começo do caminho é esticado até a borda.
//  O primeiro trecho precisa entrar pela esquerda (da "internet").
// ─────────────────────────────────────────────────────────────
export const MAP = {
  name: 'Placa-Mãe',
  width: 770,
  pathWidth: 54,
  points: [
    [-420, 150],
    [140, 150],
    [140, 420],
    [320, 420],
    [320, 110],
    [510, 110],
    [510, 300],
    [660, 300],
    [660, 452],
  ],
  seed: 7, // muda a decoração (chips, capacitores...) da placa
};
