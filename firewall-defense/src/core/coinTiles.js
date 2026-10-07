// ─────────────────────────────────────────────────────────────
//  PILHAS DE BITCOIN (seasons 1 e 2)
//
//  Cada mapa da Placa-Mãe e do Data Center tem de 1 a 4 quadrados no chão
//  com uma pilha de bitcoin. O Minerador só minera em cima de um deles
//  (um Minerador por pilha); fora deles ele fica parado (Game.canMine).
//  Na season 3 o Minerador vai precisar de um upgrade pra minerar (TODO).
//
//  Os quadrados seguem a grade de 54px (14×10) que o mapa vai usar
//  (core/grid.js, em outra branch): cada um é { c, r, x, y } — coluna,
//  linha e o centro em pixels, nas coordenadas do mapa. São sorteados pela
//  semente do mapa (sempre os mesmos), só onde dá pra colocar o Minerador,
//  fora da linha de cima (HUD) e espalhados (longe um do outro).
// ─────────────────────────────────────────────────────────────
import { seeded } from '../util.js';

export const TILE = 54;
const COLS = 14;
const ROWS = 10;
export const COIN_SEASONS = 2; // seasons com pilhas: 1 (Placa-Mãe) e 2 (Data Center)
const MIN_GAP = 3; // distância mínima entre duas pilhas, em quadrados (linha + coluna)

export function pickCoinTiles(game) {
  const map = game.map;
  if (map.season >= COIN_SEASONS) return [];
  const rnd = seeded(map.seed * 97 + 13);
  const want = 1 + Math.floor(rnd() * 4); // 1 a 4
  const free = [];
  for (let c = 0; c < COLS; c++) {
    for (let r = 1; r < ROWS; r++) { // a linha de cima fica embaixo do HUD
      const x = c * TILE + TILE / 2;
      const y = r * TILE + TILE / 2;
      if (game.canPlace('minerador', x, y)) free.push({ c, r, x, y });
    }
  }
  // embaralha (sempre igual pra cada mapa) e pega os primeiros espalhados
  for (let i = free.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [free[i], free[j]] = [free[j], free[i]];
  }
  const out = [];
  for (const t of free) {
    if (out.length >= want) break;
    if (out.some((o) => Math.abs(o.c - t.c) + Math.abs(o.r - t.r) < MIN_GAP)) continue;
    out.push(t);
  }
  return out;
}

// Quadrado com pilha que contém o ponto (x, y), ou null
export function coinTileAt(tiles, x, y) {
  return tiles.find((t) => Math.abs(x - t.x) <= TILE / 2 && Math.abs(y - t.y) <= TILE / 2) ?? null;
}
