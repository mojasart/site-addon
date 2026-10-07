// ─────────────────────────────────────────────────────────────
//  GRADE DO MAPA
//
//  O mapa é uma grade de COLS × ROWS quadrados de TILE px (config.js).
//  Tudo que tem lugar no mapa usa essa grade: o caminho passa no centro
//  dos quadrados e tem 1 quadrado de largura, cada defesa ocupa um
//  quadrado, e servidor, ilhas, zonas e obstáculos são quadrados.
//  Pra mudar a escala (ou desenhar em 3D) basta converter (c, r) → pixel
//  aqui; o resto do jogo não precisa saber quantos px tem um quadrado.
//
//  Coordenadas de pixel são as "do mapa" (antes do offsetX da tela).
// ─────────────────────────────────────────────────────────────
import { TILE, COLS, ROWS } from '../config.js';

export { TILE, COLS, ROWS };

// Centro do quadrado (c, r) em pixels
export const tileCenter = (c, r) => ({ x: c * TILE + TILE / 2, y: r * TILE + TILE / 2 });

// Retângulo do quadrado (ou de um bloco w × h de quadrados) em pixels
export const tileRect = (c, r, w = 1, h = 1) => ({ x: c * TILE, y: r * TILE, w: w * TILE, h: h * TILE });

// Quadrado que contém o ponto (pode cair fora da grade: ver inGrid)
export const tileOf = (x, y) => [Math.floor(x / TILE), Math.floor(y / TILE)];

export const inGrid = (c, r) => c >= 0 && c < COLS && r >= 0 && r < ROWS;

// Chave de um quadrado pra usar em Set/Map
export const tileKey = (c, r) => `${c},${r}`;

// Centro do quadrado que contém o ponto
export function snapToTile(x, y) {
  const [c, r] = tileOf(x, y);
  return tileCenter(c, r);
}

// Quadrados por onde as rotas passam (as rotas andam pelos centros, em
// linha reta entre os pontos, então basta amostrar)
export function pathTiles(routes) {
  const set = new Set();
  for (const pts of routes) {
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1];
      const [bx, by] = pts[i];
      const n = Math.ceil(Math.hypot(bx - ax, by - ay) / (TILE / 4));
      for (let k = 0; k <= n; k++) {
        const [c, r] = tileOf(ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n);
        if (inGrid(c, r)) set.add(tileKey(c, r));
      }
    }
  }
  return set;
}
