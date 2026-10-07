import { clamp, distToSegment } from '../util.js';

// Caminho por onde os vírus andam: uma linha com vários pontos.
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
