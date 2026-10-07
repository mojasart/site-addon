import { cachedSprite } from './canvas.js';

// ─────────────────────────────────────────────────────────────
//  Sprites em PNG (assets/sprites/). Geradas com tools/sprites/gen.py.
//  Enquanto uma imagem não carrega (ou se faltar), quem chama cai no
//  desenho provisório feito com formas.
// ─────────────────────────────────────────────────────────────
const NAMES = [
  'hacker',
  'roteador',
  'firewall',
  'scanner',
  'engenheiro',
  'minerador',
  'slot_plataforma',
  'slot_terminal',
  'slot_nucleo',
  'virus',
  'worm',
  'trojan',
  'ransomware',
  'server',
  'server_hurt',
  'coin',
  'heart',
];

const images = new Map();

export function loadImages() {
  return Promise.all(
    NAMES.map(
      (name) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            images.set(name, img);
            resolve();
          };
          img.onerror = resolve; // sem a imagem o jogo segue com o desenho provisório
          img.src = `assets/sprites/${name}.png`;
        }),
    ),
  );
}

export function hasImage(name) {
  return images.has(name);
}

// Desenha a sprite `name` num quadrado de lado `size` centrado em (dx,dy).
// A imagem é reduzida uma vez só pro tamanho de tela (fica nítida e leve).
// Devolve false se a imagem ainda não carregou.
export function drawImage(ctx, name, size, dx = 0, dy = 0) {
  const img = images.get(name);
  if (!img) return false;
  const c = cachedSprite(`img:${name}:${size}`, size, size, (g) => {
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, -size / 2, -size / 2, size, size);
  });
  ctx.drawImage(c, dx - size / 2, dy - size / 2, size, size);
  return true;
}
