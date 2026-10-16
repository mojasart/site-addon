// ─────────────────────────────────────────────────────────────
//  Confere os roteiros dos previews (data/previews.js) sem gravar: roda
//  cada um no jogo (sem tela, como os bots) e mostra quantas defesas
//  entraram, quantos vírus apareceram, estouraram e chegaram no servidor.
//    node tools/previews/check.js            → todos
//    node tools/previews/check.js hacker v1  → só esses
// ─────────────────────────────────────────────────────────────
import { MIN_VIEW_W } from '../../firewall-defense/src/config.js';
import { PREVIEW, PREVIEWS } from '../../firewall-defense/src/data/previews.js';
import { PreviewScene } from '../../firewall-defense/src/scenes/PreviewScene.js';

const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(PREVIEWS);
for (const id of ids) {
  const app = { sound: { play() {}, crashMusic() {} }, viewW: MIN_VIEW_W, debug: true, pixelScale: 1, perks: {}, recordStars() {} };
  const s = new PreviewScene(app, id);
  const g = s.game;
  let leaks = 0;
  const leak = g.leak.bind(g);
  g.leak = (e) => {
    leaks++;
    leak(e);
  };
  const seen = new Set();
  let maxAlive = 0;
  while (!s.done) {
    s.update(1 / PREVIEW.fps);
    for (const e of g.enemies) seen.add(e);
    maxAlive = Math.max(maxAlive, g.enemies.filter((e) => !e.dead).length);
  }
  const want = PREVIEWS[id].towers.length;
  const extra = [g.ads.length || g.adsSeen ? `anúncios ${g.ads.length}` : null, g.towers.some((t) => t.ransom) ? 'criptografou' : null].filter(Boolean).join(' · ');
  console.log(
    `${id.padEnd(11)} defesas ${g.towers.length}/${want}${g.towers.length < want ? ' ⚠' : '  '}  vírus ${String(seen.size).padStart(3)}  estourados ${String(g.stats.pops).padStart(3)}  no servidor ${String(leaks).padStart(2)}  vivos no fim ${g.enemies.filter((e) => !e.dead).length}  ${extra}`,
  );
}
