// ─────────────────────────────────────────────────────────────
//  GERADOR DE MAPAS
//
//  Os caminhos andam numa grade de 6×4 pontos (GX × GY). Entre duas
//  linhas da grade sobra ~120px: dá pra construir dos dois lados.
//  Tudo sai de uma semente (spec.seed), então o mapa é sempre igual.
//
//  spec = {
//    seed,
//    entries: 1..3       → quantas entradas de vírus (as rotas se juntam: Y)
//    loop: bool          → a rota principal cruza ela mesma uma vez
//    nodes: [min, max]   → tamanho da rota principal, em pontos da grade
//    islands: n          → (mar) quantas ilhas de terra
//    hazards: n          → (data center) quantas zonas eletrificadas
//  }
//  Devolve { routes, zones, hazards } (routes = listas de pontos [x, y]).
// ─────────────────────────────────────────────────────────────
import { seeded } from '../util.js';

export const GX = [70, 196, 322, 448, 574, 700];
export const GY = [120, 235, 350, 465];
const NX = GX.length;
const NY = GY.length;
const OFF_LEFT = -420; // as entradas da esquerda começam fora da tela
const OFF_V = 130; // entradas de cima/baixo também

const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

const key = (n) => n[0] * 10 + n[1];
const inGrid = (x, y) => x >= 0 && x < NX && y >= 0 && y < NY;

export function generateMap(spec) {
  // tenta sementes derivadas até achar um mapa que passe em todas as regras
  for (let attempt = 0; attempt < 400; attempt++) {
    const rnd = seeded(spec.seed * 7919 + attempt * 104729);
    const map = tryGenerate(spec, rnd);
    if (map) return map;
  }
  throw new Error(`não consegui gerar o mapa (seed ${spec.seed})`);
}

function tryGenerate(spec, rnd) {
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // ── base e entrada principal ──
  // base: fora da borda esquerda e fora da última linha (o servidor fica
  // 30px abaixo do fim do caminho e precisa caber na tela)
  const base = [2 + Math.floor(rnd() * (NX - 2)), Math.floor(rnd() * (NY - 1))];
  const mainEntry = [0, Math.floor(rnd() * NY)];
  const [minN, maxN] = spec.nodes;

  const main = walk(mainEntry, base, new Set(), minN, maxN, spec.loop, rnd, shuffle);
  if (!main) return null;

  // ── entradas extras (galhos que entram na rede: forma de Y) ──
  const used = new Set(main.nodes.map(key));
  const routesNodes = [main.nodes];
  const sides = shuffle(['left', 'top', 'bottom']);
  for (let e = 1; e < spec.entries; e++) {
    let ok = false;
    for (const side of sides) {
      const cands = entryCandidates(side).filter((n) => !used.has(key(n)));
      shuffle(cands);
      for (const start of cands.slice(0, 4)) {
        const branch = branchWalk(start, routesNodes, used, rnd, shuffle);
        if (!branch) continue;
        for (const n of branch.nodes) used.add(key(n));
        routesNodes.push(branch.route);
        ok = true;
        break;
      }
      if (ok) {
        sides.splice(sides.indexOf(side), 1);
        break;
      }
    }
    if (!ok) return null;
  }

  // ── nós → pontos (com o trecho fora da tela na entrada) ──
  const routes = routesNodes.map((nodes) => toPoints(nodes));
  const zones = [];
  const hazards = [];
  const cells = cellsNextToPath(routesNodes);
  shuffle(cells);
  for (const c of cells.slice(0, spec.islands ?? 0)) zones.push(island(c, rnd));
  for (const c of cells.slice(0, spec.hazards ?? 0)) hazards.push(hazardRect(c));
  return { routes, zones, hazards, entries: routesNodes.length, loop: main.crossed };
}

// Pontos da borda por onde dá pra entrar (cima: só no meio, por causa da HUD)
function entryCandidates(side) {
  if (side === 'left') return [0, 1, 2, 3].map((y) => [0, y]);
  if (side === 'top') return [2, 3, 4].map((x) => [x, 0]);
  return [1, 2, 3, 4].map((x) => [x, NY - 1]);
}

function sideOf(n) {
  if (n[0] === 0) return 'left';
  if (n[1] === 0) return 'top';
  return 'bottom';
}

// Caminho aleatório pela grade, sem repetir ponto (exceto 1 cruzamento
// reto quando `loop`), com tamanho entre minN e maxN pontos.
function walk(start, goal, blocked, minN, maxN, loop, rnd, shuffle) {
  const path = [start];
  const visited = new Set([key(start)]);
  let crossed = false;
  let budget = 6000;

  const straightAt = (i) => {
    // o ponto i da rota foi atravessado em linha reta? (pode ser cruzado)
    if (i <= 0 || i >= path.length - 1) return null;
    const a = path[i - 1];
    const b = path[i + 1];
    if (a[0] === b[0]) return 'v';
    if (a[1] === b[1]) return 'h';
    return null;
  };

  function dfs() {
    if (--budget < 0) return false;
    const cur = path[path.length - 1];
    if (cur[0] === goal[0] && cur[1] === goal[1]) return path.length >= minN && (!loop || crossed);
    if (path.length >= maxN) return false;
    for (const [dx, dy] of shuffle(DIRS.slice())) {
      const nx = cur[0] + dx;
      const ny = cur[1] + dy;
      if (!inGrid(nx, ny) || blocked.has(key([nx, ny]))) continue;
      const nk = key([nx, ny]);
      if (visited.has(nk)) {
        // cruzamento: só um, em ângulo reto e seguindo reto depois
        if (!loop || crossed) continue;
        const i = path.findIndex((p) => p[0] === nx && p[1] === ny);
        const dir = straightAt(i);
        if (!dir || (dir === 'h') === (dy === 0)) continue;
        const ax = nx + dx;
        const ay = ny + dy;
        if (!inGrid(ax, ay) || visited.has(key([ax, ay])) || blocked.has(key([ax, ay]))) continue;
        crossed = true;
        path.push([nx, ny], [ax, ay]);
        visited.add(key([ax, ay]));
        if (dfs()) return true;
        path.pop();
        path.pop();
        visited.delete(key([ax, ay]));
        crossed = false;
        continue;
      }
      // não termina na base cedo demais (encostar nela é só no fim)
      if (nx === goal[0] && ny === goal[1] && path.length + 1 < minN) continue;
      path.push([nx, ny]);
      visited.add(nk);
      if (dfs()) return true;
      path.pop();
      visited.delete(nk);
    }
    return false;
  }

  return dfs() ? { nodes: path.slice(), crossed } : null;
}

// Galho de uma entrada nova até algum ponto da rede (vira um "Y").
// Entra por um lado livre do ponto de encontro e segue a rota de lá.
function branchWalk(start, routesNodes, used, rnd, shuffle) {
  const targets = [];
  routesNodes.forEach((nodes, r) => {
    // não junta no começo (entrada) nem nos 2 últimos pontos (perto da base)
    for (let i = 1; i < nodes.length - 2; i++) targets.push({ r, i, n: nodes[i] });
  });
  const isTarget = (x, y) => targets.find((t) => t.n[0] === x && t.n[1] === y);
  // lados já ocupados do ponto de encontro
  const occupied = (t) => {
    const nodes = routesNodes[t.r];
    const sidesUsed = new Set();
    for (const nodesK of routesNodes) {
      nodesK.forEach((p, i) => {
        if (p[0] !== t.n[0] || p[1] !== t.n[1]) return;
        for (const q of [nodesK[i - 1], nodesK[i + 1]]) if (q) sidesUsed.add(`${q[0] - p[0]},${q[1] - p[1]}`);
      });
    }
    return sidesUsed;
  };

  const path = [start];
  const visited = new Set([key(start)]);
  let budget = 3000;
  let hit = null;

  function dfs() {
    if (--budget < 0) return false;
    const cur = path[path.length - 1];
    if (path.length > 9) return false;
    for (const [dx, dy] of shuffle(DIRS.slice())) {
      const nx = cur[0] + dx;
      const ny = cur[1] + dy;
      if (!inGrid(nx, ny)) continue;
      const t = isTarget(nx, ny);
      if (t && path.length >= 3) {
        // chega pelo lado livre (o lado de onde ele vem não pode estar em uso)
        if (occupied(t).has(`${-dx},${-dy}`)) continue;
        hit = t;
        path.push([nx, ny]);
        return true;
      }
      const k = key([nx, ny]);
      if (used.has(k) || visited.has(k)) continue;
      path.push([nx, ny]);
      visited.add(k);
      if (dfs()) return true;
      path.pop();
      visited.delete(k);
    }
    return false;
  }

  if (!dfs()) return null;
  const rest = routesNodes[hit.r].slice(hit.i + 1);
  return { nodes: path.slice(0, -1), route: [...path, ...rest] };
}

function toPoints(nodes) {
  const pts = nodes.map(([x, y]) => [GX[x], GY[y]]);
  const first = nodes[0];
  const side = sideOf(first);
  const [fx, fy] = pts[0];
  const lead = side === 'left' ? [OFF_LEFT, fy] : side === 'top' ? [fx, -OFF_V] : [fx, 540 + OFF_V];
  // mantém todos os pontos da grade (mesmo os retos): assim o trecho comum
  // de rotas diferentes sai idêntico e o desenho do "Y" não duplica
  return [lead, ...pts];
}

// Células da grade (entre 4 pontos) que encostam no caminho
function cellsNextToPath(routesNodes) {
  const segs = new Set();
  for (const nodes of routesNodes) {
    for (let i = 1; i < nodes.length; i++) {
      const a = nodes[i - 1];
      const b = nodes[i];
      segs.add([Math.min(a[0], b[0]), Math.min(a[1], b[1]), a[0] === b[0] ? 'v' : 'h'].join());
    }
  }
  const cells = [];
  for (let x = 0; x < NX - 1; x++) {
    for (let y = 0; y < NY - 1; y++) {
      const touches =
        segs.has([x, y, 'h'].join()) || segs.has([x, y + 1, 'h'].join()) ||
        segs.has([x, y, 'v'].join()) || segs.has([x + 1, y, 'v'].join());
      if (touches) cells.push([x, y]);
    }
  }
  return cells;
}

// Ilha de terra ocupando a célula toda (o píer passa por cima das bordas)
function island([cx, cy], rnd) {
  const pad = 21 + Math.round(rnd() * 3); // encosta na borda do píer (meia largura = 25)
  const x = GX[cx] + pad;
  const y = GY[cy] + pad;
  return { terrain: 'land', shape: 'rect', x, y, w: GX[cx + 1] - pad - x, h: GY[cy + 1] - pad - y, r: 18 };
}

function hazardRect([cx, cy]) {
  const pad = 27 + 6;
  const x0 = GX[cx] + pad;
  const y0 = GY[cy] + pad;
  return { x: x0, y: y0, w: GX[cx + 1] - pad - x0, h: GY[cy + 1] - pad - y0 };
}
