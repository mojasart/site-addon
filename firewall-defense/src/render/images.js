// ─────────────────────────────────────────────────────────────
//  Sprites em PNG (assets/sprites/). Geradas com tools/sprites/gen.py.
//  Enquanto uma imagem não carrega (ou se faltar), render/sprites.js
//  cai no desenho antigo feito com formas.
// ─────────────────────────────────────────────────────────────
const NAMES = [
  'tower_antivirus_base',
  'tower_antivirus_turret',
  'tower_firewall',
  'tower_criptografia',
  'tower_scanner_base',
  'tower_scanner_turret',
  'tower_honeypot',
  'tower_minerador',
  'virus_red',
  'virus_blue',
  'virus_green',
  'virus_yellow',
  'virus_pink',
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
          img.onerror = resolve; // sem a imagem o jogo segue com o desenho antigo
          img.src = `assets/sprites/${name}.png`;
        }),
    ),
  );
}

export function getImage(name) {
  return images.get(name);
}
