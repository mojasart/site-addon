import { clamp, distToSegment } from '../util.js';

// Uma rota: linha com vários pontos por onde os vírus andam.
// A posição de cada inimigo é só "quantos pixels já andou" (dist).
export class Path {
  constructor(points, width) {
    this.points = points.map(([x, y]) => ({ x, y }));
    this.width = width;
    this.cum = [0];
    for (let i = 1; i < this.points.length; i++) {
      const a = this.points[i - 1];
      const b = this.points[i];
      this.cum.push(this.cum[i - 1] + Math.hypot(b.x - a.x, b.y - a.y));
    }
    this.length = this.cum[this.cum.length - 1];
  }

  pointAt(d) {
    d = clamp(d, 0, this.length);
    let i = 1;
    while (i < this.cum.length - 1 && this.cum[i] < d) i++;
    const a = this.points[i - 1];
    const b = this.points[i];
    const seg = this.cum[i] - this.cum[i - 1];
    const t = seg ? (d - this.cum[i - 1]) / seg : 0;
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, angle: Math.atan2(b.y - a.y, b.x - a.x) };
  }

  distanceTo(x, y) {
    let best = Infinity;
    for (let i = 1; i < this.points.length; i++) {
      const a = this.points[i - 1];
      const b = this.points[i];
      best = Math.min(best, distToSegment(x, y, a.x, a.y, b.x, b.y));
    }
    return best;
  }
}

// Todas as rotas de um mapa (uma por entrada de vírus). As rotas terminam
// todas na base; num "Y" elas dividem o mesmo trecho final.
export class PathSet {
  constructor(routes, width) {
    this.routes = routes.map((pts) => new Path(pts, width));
    this.width = width;
    // Linhas pra DESENHAR: a 1ª rota inteira e, das outras, só o galho até
    // onde entram numa rota já desenhada (o trecho comum sai uma vez só,
    // senão tracejados e sombras ficam duplicados no tronco do "Y").
    const drawn = [];
    this.lines = routes.map((pts) => {
      let cut = pts.length - 1;
      for (let j = 0; j < pts.length; j++) {
        if (drawn.some((d) => sameTail(pts, j, d))) {
          cut = j;
          break;
        }
      }
      drawn.push(pts);
      return new Path(pts.slice(0, cut + 1), width);
    });
  }

  // compatibilidade: quem só precisa de uma rota usa a primeira
  get points() {
    return this.routes[0].points;
  }

  get end() {
    const p = this.routes[0].points;
    return p[p.length - 1];
  }

  distanceTo(x, y) {
    let best = Infinity;
    for (const r of this.routes) best = Math.min(best, r.distanceTo(x, y));
    return best;
  }
}

// pts[j..] é igual ao final de `other`?
function sameTail(pts, j, other) {
  const n = pts.length - j;
  if (n < 2 || n > other.length) return false;
  const off = other.length - n;
  for (let k = 0; k < n; k++) {
    const a = pts[j + k];
    const b = other[off + k];
    if (a[0] !== b[0] || a[1] !== b[1]) return false;
  }
  return true;
}
