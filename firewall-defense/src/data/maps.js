// ─────────────────────────────────────────────────────────────
//  SEASONS E MAPAS
//
//  3 seasons (temas) × 15 mapas = 45 fases, numa ordem só de dificuldade:
//  a Placa-Mãe é a mais fácil, o Cabo Submarino a mais difícil, e dentro
//  de cada season o mapa seguinte é sempre um pouco mais difícil.
//
//  Os caminhos são gerados (data/mapgen.js) a partir da semente de cada
//  mapa — o mapa sai sempre igual. Coordenadas numa área de 756x540 (grade de 14×10 quadrados de 54px)
//  (em telas mais largas o mapa fica centralizado).
//
//  Cada mapa tem:
//    routes   → uma rota por entrada de vírus (as rotas se juntam: Y)
//    rounds   → até qual rodada de data/rounds.js vai
//    money / lives → dinheiro e vidas no começo
//    pressure → multiplica a quantidade de vírus de cada grupo e a vida
//               dos que têm várias camadas (Worm, Locker, Ransomware)
//    gapMul   → multiplica o intervalo entre eles (menor = mais apertado)
//    speedMul → multiplica a velocidade dos vírus
//    terrain/zones → terreno ('land'/'water'); defesas só vão na terra
//    hazards  → zonas eletrificadas (Data Center)
//    seed     → semente do caminho e da decoração
//    bounty   → fase Bug Bounty (mapas 10, 20, 30 e 40: data/bounty.js)
//
//  A curva DIFF dá o ponto de partida; a pressão final de cada mapa vem
//  de data/tuning.js, calibrada com bots (node tools/sim/calibrate.js)
//  pra taxa de vitória cair mapa a mapa. Mexeu nos mapas, nas defesas ou
//  nas rodadas? Rode a calibração de novo e confira com tools/sim/run.js.
// ─────────────────────────────────────────────────────────────
import { generateMap } from './mapgen.js';
import { PRESSURE, SPEED } from './tuning.js';
import { TILE } from '../config.js';
import { pathTiles, tileOf, tileKey } from '../core/grid.js';

export const SEASONS = [
  { id: 'placa-mae', name: 'Placa-Mãe', theme: 'motherboard', color: '#3fd16b', terrain: 'land', rounds: [12, 18] },
  { id: 'data-center', name: 'Data Center', theme: 'datacenter', color: '#5fb4ff', terrain: 'land', rounds: [15, 22] },
  { id: 'cabo-submarino', name: 'Cabo Submarino', theme: 'ocean', color: '#2fc3d9', terrain: 'water', rounds: [18, 25] },
];
export const MAPS_PER_SEASON = 15;

// Formato de cada mapa da season (mesma progressão nas 3):
//   e = entradas de vírus, loop = caminho que cruza ele mesmo
const LAYOUTS = [
  { e: 1, loop: false },
  { e: 1, loop: false },
  { e: 1, loop: true },
  { e: 1, loop: false },
  { e: 2, loop: false },
  { e: 1, loop: true },
  { e: 2, loop: false },
  { e: 1, loop: false },
  { e: 2, loop: true },
  { e: 2, loop: false },
  { e: 1, loop: true },
  { e: 3, loop: false },
  { e: 2, loop: true },
  { e: 3, loop: false },
  { e: 3, loop: true },
];

// Curva de dificuldade: d vai de 0 (1º mapa) a 1 (45º mapa)
export const DIFF = {
  money: [700, 560], // dinheiro inicial
  lives: [150, 60], // vidas
  pressure: [1, 1.55], // quantidade de vírus
  gapMul: [1, 0.8], // intervalo entre vírus
  speedMul: [1, 1.12], // velocidade dos vírus
  nodes: [[15, 19], [7, 11]], // tamanho da rota principal (pontos da grade)
};

// Mapas que saíram fáceis demais pro lugar deles na curva (nem com mais
// vírus nem mais velocidade os bots perdiam): ganham mais uma entrada
const LAYOUT_FIX = { 'data-center-1': { e: 2 }, 'data-center-6': { e: 2 } };

const lerp = (a, b, t) => a + (b - a) * t;
const round5 = (v) => Math.round(v / 5) * 5;

function label(d) {
  if (d < 0.25) return 'FÁCIL';
  if (d < 0.5) return 'MÉDIO';
  if (d < 0.75) return 'DIFÍCIL';
  return 'EXTREMO';
}

function describe(gen, season) {
  const parts = [];
  if (gen.entries > 1) parts.push(`${gen.entries} entradas de vírus`);
  if (gen.loop) parts.push('caminho com loop');
  if (season.theme === 'datacenter') parts.push('zonas eletrificadas');
  if (season.theme === 'ocean') parts.push('pouca terra');
  return parts.length ? parts.join(' · ') : 'um caminho só';
}

function buildMaps() {
  const maps = [];
  const total = SEASONS.length * MAPS_PER_SEASON;
  SEASONS.forEach((season, s) => {
    for (let k = 0; k < MAPS_PER_SEASON; k++) {
      const g = s * MAPS_PER_SEASON + k;
      const d = g / (total - 1);
      const ks = k / (MAPS_PER_SEASON - 1); // progresso dentro da season
      const L = { ...LAYOUTS[k], ...LAYOUT_FIX[`${season.id}-${k + 1}`] };
      const seed = 1000 * (s + 1) + k * 37 + 11;
      const nodesMax = Math.round(lerp(DIFF.nodes[0][1], DIFF.nodes[1][1], d));
      const nodesMin = Math.round(lerp(DIFF.nodes[0][0], DIFF.nodes[1][0], d));
      const gen = generateMap({
        seed,
        entries: L.e,
        loop: L.loop,
        nodes: [nodesMin, nodesMax],
        islands: season.theme === 'ocean' ? Math.round(lerp(14, 10, ks)) : 0,
        hazards: season.theme === 'datacenter' ? Math.round(lerp(2, 5, ks)) : 0,
      });
      // zonas elétricas: cada quadrado é um retângulo; os do mesmo grupo
      // disparam juntos (mesmo offset) e formam um tapete só.
      // Quais bordas do "tapete" aparecem (render/hazards.js): a de cima
      // sempre (menos entre dois quadrados do mesmo grupo); as outras só se
      // o vizinho não for o caminho elevado (que fica por cima do chão e
      // tapa a borda) nem outro quadrado da mesma zona
      const raised = pathTiles(gen.routes);
      const groups = 1 + Math.max(-1, ...gen.hazards.map((h) => h.group));
      const sameZone = new Map(gen.hazards.map((h) => [tileKey(...tileOf(h.x + 1, h.y + 1)), h.group]));
      const hazards = gen.hazards.map((h) => {
        const [c, r] = tileOf(h.x + 1, h.y + 1);
        const mine = (dc, dr) => sameZone.get(tileKey(c + dc, r + dr)) === h.group;
        const floor = (dc, dr) => !raised.has(tileKey(c + dc, r + dr)) && !mine(dc, dr);
        const edges = { top: !mine(0, -1), left: floor(-1, 0), right: floor(1, 0), bottom: floor(0, 1) };
        return { ...h, period: 8, offset: (h.group * 8) / groups, edges };
      });
      const bounty = (g + 1) % 10 === 0; // 10, 20, 30, 40: Bug Bounty
      maps.push({
        id: `${season.id}-${k + 1}`,
        season: s,
        number: k + 1,
        bounty,
        name: bounty ? 'Bug Bounty' : `${season.name} ${k + 1}`,
        difficulty: label(d),
        d,
        desc: bounty ? 'estoure o máximo de vírus em 90 s' : describe(gen, season),
        theme: season.theme,
        rounds: Math.round(lerp(season.rounds[0], season.rounds[1], ks)),
        money: round5(lerp(DIFF.money[0], DIFF.money[1], d)),
        lives: round5(lerp(DIFF.lives[0], DIFF.lives[1], d)),
        // calibrada com bots (data/tuning.js); sem calibração usa a curva
        pressure: PRESSURE[g] ?? +lerp(DIFF.pressure[0], DIFF.pressure[1], d).toFixed(3),
        gapMul: +lerp(DIFF.gapMul[0], DIFF.gapMul[1], d).toFixed(3),
        speedMul: SPEED?.[g] ?? +lerp(DIFF.speedMul[0], DIFF.speedMul[1], d).toFixed(3),
        seed,
        pathWidth: TILE, // o caminho ocupa 1 quadrado da grade
        terrain: season.terrain,
        zones: gen.zones,
        hazards,
        routes: gen.routes,
        entries: gen.entries,
        loop: gen.loop,
      });
    }
  });
  return maps;
}

export const MAPS = buildMaps();
