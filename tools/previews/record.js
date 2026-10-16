// ─────────────────────────────────────────────────────────────
//  Grava os vídeos dos previews do catálogo direto do jogo de verdade.
//  Pra cada roteiro de firewall-defense/src/data/previews.js abre o jogo com
//  ?preview=<id>&record (o mapa de testes, scenes/PreviewScene.js), anda
//  quadro a quadro (window.previewFrame), fotografa só o recorte da
//  estrada (PREVIEW.crop) e o ffmpeg junta em
//  firewall-defense/assets/previews/<id>.mp4 (H.264, sem som, em loop no catálogo).
//
//    cd tools/previews && npm install      (uma vez: instala o Playwright)
//    node record.js                        → grava todos
//    node record.js hacker v1              → só esses
//
//  Usa o Chrome instalado no computador (channel 'chrome') e o ffmpeg do PATH.
//  O aleatório do jogo tem semente: gravar de novo dá o mesmo vídeo.
// ─────────────────────────────────────────────────────────────
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PREVIEW, PREVIEWS } from '../../firewall-defense/src/data/previews.js';

const here = dirname(fileURLToPath(import.meta.url));
const GAME = join(here, '..', '..', 'firewall-defense');
const OUT = join(GAME, 'assets', 'previews');
const PORT = 8741;
const SCALE = 4 / 3; // 756×270 do jogo → vídeo 1008×360
const { crop, fps } = PREVIEW;

const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(PREVIEWS);
for (const id of ids) if (!PREVIEWS[id]) throw new Error(`sem roteiro: ${id}`);
mkdirSync(OUT, { recursive: true });

const server = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: GAME, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));
const browser = await chromium.launch({ channel: 'chrome' });

try {
  for (const id of ids) {
    const t0 = Date.now();
    const page = await browser.newPage({ viewport: { width: 946, height: 540 }, deviceScaleFactor: SCALE });
    page.on('pageerror', (e) => console.error(`  ERRO NA PÁGINA (${id}):`, e.message));
    // nada de fora: anúncios do Google e analytics
    await page.route(/googlesyndication|gameanalytics/, (r) => r.abort());
    // aleatório com semente (o mesmo vídeo toda vez)
    await page.addInitScript(() => {
      let a = 20261016;
      Math.random = () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    });
    await page.goto(`http://127.0.0.1:${PORT}/index.html?debug&mute&preview=${id}&record`);
    await page.waitForFunction(() => window.previewReady === true, null, { timeout: 15000 });
    await page.evaluate(() => document.fonts.load('20px "Lilita One"'));

    const file = join(OUT, `${id}.mp4`);
    const w = Math.round(crop.w * SCALE);
    const h = Math.round(crop.h * SCALE);
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
      '-vf', `scale=${w}:${h}`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '30', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', file], { stdio: ['pipe', 'inherit', 'inherit'] });
    const finished = new Promise((ok, fail) => ff.on('close', (code) => (code === 0 ? ok() : fail(new Error(`ffmpeg saiu com ${code}`)))));

    let frames = 0;
    for (let done = false; !done; frames++) {
      done = await page.evaluate((dt) => window.previewFrame(dt), 1 / fps);
      const shot = await page.screenshot({ clip: { x: crop.x, y: crop.y, width: crop.w, height: crop.h }, type: 'jpeg', quality: 92 });
      if (!ff.stdin.write(shot)) await new Promise((r) => ff.stdin.once('drain', r));
    }
    ff.stdin.end();
    await finished;
    await page.close();
    console.log(`${id.padEnd(11)} ${frames} quadros  ${(statSync(file).size / 1024).toFixed(0).padStart(4)} KB  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }
} finally {
  await browser.close();
  server.kill();
}
