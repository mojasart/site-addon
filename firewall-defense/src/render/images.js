import { cachedSprite } from './canvas.js';

// ─────────────────────────────────────────────────────────────
//  Sprites em PNG (assets/sprites/, geradas com tools/sprites/gen.py) e
//  ícones em SVG (assets/icons/, carregados como "icon_<nome>").
//  Enquanto uma imagem não carrega (ou se faltar), quem chama cai no
//  desenho feito com formas.
// ─────────────────────────────────────────────────────────────
const NAMES = [
  'hacker',
  'pinguim',
  'pinguim_open',
  'firewall',
  'firewall_attack',
  'scanner',
  'minerador',
  'minerador_attack',
  'hacker_kid',
  'hacker_teen',
  'pinguim_kid',
  'pinguim_kid_open',
  'pinguim_teen',
  'pinguim_teen_open',
  'firewall_kid',
  'firewall_kid_attack',
  'firewall_teen',
  'firewall_teen_attack',
  'minerador_kid',
  'minerador_kid_attack',
  'minerador_teen',
  'minerador_teen_attack',
  'scanner_kid',
  'scanner_teen',
  'virus_red',
  'virus_blue',
  'virus_green',
  'virus_yellow',
  'virus_pink',
  'worm',
  'trojan',
  'locker',
  'ransomware',
  'spyware',
  'cicada', // Cicada 3301 (e a pose da aura pulsando)
  'cicada_aura',
  'adware',
  'duck',
  'shop_cart',
  'hand', // mãozinha do tutorial
  // pacotes de café (loja): punhado de grãos, xícara e saco
  'coffee_beans',
  'coffee_cup',
  'coffee_sack',
  'energy_bolt', // raio da energia (render/energy.js)
  'server',
  'server_hurt',
  'coin',
  'heart',
];

// Ícones dos botões e da interface (SVG: ficam nítidos em qualquer tamanho)
const ICON_NAMES = [
  'play',
  'ff',
  'pause',
  'close',
  'back',
  'restart',
  'map',
  'music',
  'music_off',
  'sfx',
  'sfx_off',
  'lock',
  'star',
  'star_empty',
  'star_bronze',
  'star_silver',
  'star_platinum',
  'coin',
  'coin_flat',
  'auto',
  'auto_off',
  'catalog',
  'coffee',
  'darknet',
  'danger',
  'settings',
  'shop',
];

const images = new Map();

export function loadImages() {
  const files = [
    ...NAMES.map((n) => [n, `assets/sprites/${n}.png`]),
    ...ICON_NAMES.map((n) => [`icon_${n}`, `assets/icons/${n}.svg`]),
  ];
  return Promise.all(
    files.map(
      ([name, src]) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            images.set(name, img);
            resolve();
          };
          img.onerror = resolve; // sem a imagem o jogo segue com o desenho antigo
          img.src = src;
        }),
    ),
  );
}

export function hasImage(name) {
  return images.has(name);
}

// Desenha a sprite `name` num quadrado de lado `size` centrado em (dx,dy).
// A imagem é reduzida uma vez só pro tamanho de tela (fica nítida e leve).
// tint: filtro de cor do canvas (ex.: worms de outras cores), aplicado só
// na hora de guardar no cache. Devolve false se a imagem ainda não carregou.
export function drawImage(ctx, name, size, dx = 0, dy = 0, tint = null) {
  const img = images.get(name);
  if (!img) return false;
  const c = cachedSprite(`img:${name}:${size}:${tint ?? ''}`, size, (g) => {
    g.imageSmoothingQuality = 'high';
    if (tint) g.filter = tint;
    g.drawImage(img, -size / 2, -size / 2, size, size);
  });
  ctx.drawImage(c, dx - size / 2, dy - size / 2, size, size);
  return true;
}
