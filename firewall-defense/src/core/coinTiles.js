// ─────────────────────────────────────────────────────────────
//  PILHAS DE BITCOIN (seasons 1 e 2)
//
//  Cada mapa da Placa-Mãe e do Data Center tem de 1 a 4 quadrados no chão
//  com uma pilha de bitcoin. O Minerador só minera em cima de um deles
//  (como cada quadrado tem uma defesa só, é um Minerador por pilha); fora
//  deles ele fica parado (Game.canMine).
//  Na season 3 o Minerador vai precisar de um upgrade pra minerar (TODO).
//
//  As pilhas são quadrados da grade do mapa (core/grid.js): cada uma é
//  { c, r, x, y } — coluna, linha e o centro em pixels, nas coordenadas do
//  mapa. São sorteadas pela
//  semente do mapa (sempre os mesmos), só onde dá pra colocar o Minerador,
//  fora das zonas elétricas e da linha de cima (HUD), e espalhados.
//  Os quadrados encostados no caminho têm bem mais chance (NEAR_PATH): a
//  pilha ocupa um lugar disputado, bom também pra uma defesa.
// ─────────────────────────────────────────────────────────────
import { seeded } from '../util.js';
import { TILE, COLS, ROWS, tileCenter, tileOf, tileKey } from './grid.js';

export { TILE };
export const COIN_SEASONS = 2; // seasons com pilhas: 1 (Placa-Mãe) e 2 (Data Center)
const MIN_GAP = 3; // distância mínima entre duas pilhas, em quadrados (linha + coluna)
// peso no sorteio: encostado no caminho (lado a lado), só na diagonal, longe
const NEAR_PATH = { side: 6, diagonal: 2, far: 1 };

export function pickCoinTiles(game) {
  const map = game.map;
  if (map.season >= COIN_SEASONS) return [];
  const rnd = seeded(map.seed * 97 + 13);
  const want = 1 + Math.floor(rnd() * 4); // 1 a 4
  const free = [];
  for (let c = 0; c < COLS; c++) {
    for (let r = 1; r < ROWS; r++) { // a linha de cima fica embaixo do HUD
      const { x, y } = tileCenter(c, r);
      if (!game.canPlace('minerador', x, y)) continue;
      // nunca numa zona elétrica (o Minerador levaria choque)
      if (map.hazards?.some((h) => x >= h.x && x < h.x + h.w && y >= h.y && y < h.y + h.h)) continue;
      free.push({ c, r, x, y, w: nearPath(game.view.pathTiles, c, r) });
    }
  }
  // sorteio com peso (sempre igual pra cada mapa): cada quadrado ganha a nota
  // rnd^(1/peso) e os de nota maior vêm primeiro, então os encostados no
  // caminho tendem a ser escolhidos
  for (const t of free) t.k = rnd() ** (1 / t.w);
  free.sort((a, b) => b.k - a.k);
  const out = [];
  for (const t of free) {
    if (out.length >= want) break;
    if (out.some((o) => Math.abs(o.c - t.c) + Math.abs(o.r - t.r) < MIN_GAP)) continue;
    out.push({ c: t.c, r: t.r, x: t.x, y: t.y });
  }
  return out;
}

// Peso do quadrado no sorteio: encostado no caminho vale mais
function nearPath(path, c, r) {
  const at = (dc, dr) => path.has(tileKey(c + dc, r + dr));
  if (at(1, 0) || at(-1, 0) || at(0, 1) || at(0, -1)) return NEAR_PATH.side;
  if (at(1, 1) || at(1, -1) || at(-1, 1) || at(-1, -1)) return NEAR_PATH.diagonal;
  return NEAR_PATH.far;
}

// Pilha no quadrado que contém o ponto (x, y), ou null
export function coinTileAt(tiles, x, y) {
  const [c, r] = tileOf(x, y);
  return tiles.find((t) => t.c === c && t.r === r) ?? null;
}
