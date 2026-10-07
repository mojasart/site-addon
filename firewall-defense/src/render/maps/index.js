import { VIEW_H, MAP_W } from '../../config.js';
import { seeded } from '../../util.js';
import { PathSet } from '../../core/Path.js';
import { terrainAt } from '../../core/terrain.js';
import { TILE, COLS, ROWS, tileCenter, tileOf, tileKey, pathTiles } from '../../core/grid.js';
import { drawServer } from '../sprites.js';
import { strokePath } from './shared.js';
import * as motherboard from './motherboard.js';
import * as datacenter from './datacenter.js';
import * as ocean from './ocean.js';

const THEMES = { motherboard, datacenter, ocean };

// Quando a fonte termina de carregar, os mapas em cache são redesenhados
let fontEpoch = 0;
export const bumpFontEpoch = () => fontEpoch++;

// O servidor ocupa o quadrado do fim do caminho (o desenho centraliza a
// caixa no ponto: ver drawServer)
export function serverPos(path) {
  return { x: path.end.x, y: path.end.y };
}

// Onde os vírus nascem numa rota: o primeiro ponto já dentro da tela
// (com uma folguinha), venham da esquerda, de cima ou de baixo
function spawnDistOf(route, offsetX) {
  let d = 0;
  while (d < route.length) {
    const p = route.pointAt(d);
    if (p.x >= -offsetX - 30 && p.y >= -30 && p.y <= VIEW_H + 30) break;
    d += 2;
  }
  return d;
}

// Tudo que o jogo precisa saber de um mapa numa certa largura de tela:
// caminho, onde nascem os vírus, decoração/obstáculos e a imagem em cache.
export class MapView {
  constructor(map, mapW) {
    this.map = map;
    this.mapW = mapW;
    this.offsetX = Math.max(0, (mapW - MAP_W) / 2); // centraliza o mapa
    this.path = new PathSet(map.routes, map.pathWidth);
    this.server = serverPos(this.path);
    // vírus nascem logo antes da borda visível (uma distância por rota)
    this.spawnDists = this.path.routes.map((r) => spawnDistOf(r, this.offsetX));
    this.spawnDist = this.spawnDists[0];
    // quadrados da grade: caminho e os que não aceitam defesa (servidor e obstáculos)
    this.pathTiles = pathTiles(map.routes);
    this.serverTiles = serverTiles(this.path);
    this.decor = layoutDecor(map, this.path, -this.offsetX + 8, mapW - this.offsetX - 8, this);
    this.blockedTiles = new Set([...this.serverTiles, ...this.decor.parts.filter((p) => p.tile).map((p) => tileKey(...p.tile))]);
    this.canvas = null;
    this.key = '';
  }

  // Desenha o mapa (em coordenadas de tela, cobrindo a área do mapa)
  draw(ctx, ps) {
    const key = `${ps.toFixed(3)}:${fontEpoch}`;
    if (key !== this.key) {
      this.canvas = paint(this, this.mapW, this.offsetX, ps);
      this.pathCanvas = null;
      this.key = key;
    }
    ctx.drawImage(this.canvas, 0, 0, this.mapW, VIEW_H);
  }

  // Só o caminho (topo + parede), recortado da imagem do mapa. O jogo desenha
  // as coisas do chão (zonas elétricas, pilhas de bitcoin) por cima do mapa e
  // depois isto por cima delas: o caminho é elevado e cobre o chão à frente,
  // então elas ficam na perspectiva certa. (Coords de tela, como draw.)
  drawPath(ctx) {
    if (!this.canvas) return;
    if (!this.pathCanvas) this.pathCanvas = cutPath(this);
    ctx.drawImage(this.pathCanvas, 0, 0, this.mapW, VIEW_H);
  }

  // Animações leves por cima do mapa (brilho na água etc.), em coords do mapa
  animate(ctx, t) {
    THEMES[this.map.theme].animate?.(ctx, this.decor, t);
  }
}

// Miniatura pra tela de seleção de fases
export function renderThumb(map, w, h, ps) {
  const view = new MapView(map, MAP_W);
  const c = document.createElement('canvas');
  c.width = Math.ceil(w * ps);
  c.height = Math.ceil(h * ps);
  const g = c.getContext('2d');
  const k = Math.max(w / MAP_W, h / VIEW_H);
  g.scale(ps * k, ps * k);
  g.translate((w / k - MAP_W) / 2, (h / k - VIEW_H) / 2);
  THEMES[map.theme].paint(g, { map, path: view.path, decor: view.decor, W: MAP_W, ox: 0 });
  g.save();
  g.translate(view.server.x, view.server.y);
  drawServer(g, 0, 0);
  g.restore();
  return c;
}

// Recorta da imagem do mapa a área do caminho: a pegada dele, exatamente
// os quadrados por onde passa (traço de TILE de largura)
function cutPath(view) {
  const src = view.canvas;
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  const g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'destination-in';
  g.scale(src.width / view.mapW, src.height / VIEW_H);
  g.translate(view.offsetX, 0);
  strokePath(g, view.path, TILE, '#000');
  return c;
}

function paint(view, W, ox, ps) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(W * ps);
  c.height = Math.ceil(VIEW_H * ps);
  const g = c.getContext('2d');
  g.scale(ps, ps);
  THEMES[view.map.theme].paint(g, { map: view.map, path: view.path, decor: view.decor, W, ox });
  // vinheta nas bordas
  const grad = g.createRadialGradient(W / 2, VIEW_H / 2, 230, W / 2, VIEW_H / 2, W * 0.75);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,15,30,0.28)');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, VIEW_H);
  return c;
}

// Quadrado do servidor: o do fim do caminho
function serverTiles(path) {
  const [c, r] = tileOf(path.end.x, path.end.y);
  return new Set([tileKey(c, r)]);
}

// Sorteia a decoração (sempre igual, pela semente do mapa). Peças que
// impedem construir ocupam um quadrado inteiro (part.tile = [c, r]) e
// ficam no centro dele; as outras são só enfeite, em qualquer lugar.
export function layoutDecor(map, path, minX, maxX, view) {
  const rnd = seeded(map.seed);
  const sp = serverPos(path);
  const parts = [];
  const free = (x, y, pad) => path.distanceTo(x, y) > path.width / 2 + pad && Math.hypot(x - sp.x, y - sp.y) > 50 + pad;
  const terrainOk = (x, y, rad, terrain) =>
    !terrain || [[0, 0], [rad, 0], [-rad, 0], [0, rad], [0, -rad]].every(([dx, dy]) => terrainAt(map, x + dx, y + dy) === terrain);
  const helper = {
    map,
    path,
    rnd,
    minX,
    maxX,
    parts,
    rr: (a, b) => a + rnd() * (b - a),
    free,
    terrain: (x, y) => terrainAt(map, x, y),
    fits: (x, y, rad, terrain) =>
      x - rad > minX && x + rad < maxX && y - rad > 4 && y + rad < VIEW_H - 4 &&
      free(x, y, rad + 6) && terrainOk(x, y, rad, terrain) &&
      parts.every((p) => Math.hypot(p.x - x, p.y - y) > p.rad + rad + 6),
    add: (part) => parts.push(part),
    // quadrados livres (fora do caminho e do servidor, no terreno pedido),
    // embaralhados; ocupar um deles com uma peça: tile(c, r) → centro
    freeTiles: (terrain) => {
      const out = [];
      for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
          const k = tileKey(c, r);
          if (view.pathTiles.has(k) || view.serverTiles.has(k)) continue;
          if (parts.some((p) => p.tile && tileKey(...p.tile) === k)) continue;
          const { x, y } = tileCenter(c, r);
          if (terrain && terrainAt(map, x, y) !== terrain) continue;
          out.push([c, r]);
        }
      }
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
    tileCenter,
  };
  const extra = THEMES[map.theme].layout(helper) ?? {};
  return { parts, ...extra };
}
