import { text, cachedSprite } from './canvas.js';
import { ICONS } from './sprites.js';
import { drawCharacter } from './characters.js';

/* ════════════════════════════════════════════════════════════
 *  DEFESA CRIPTOGRAFADA (habilidade do chefão Ransomware)
 *  O personagem fica "verde de terminal", apagado e parado (filtro do
 *  canvas; onde não existe, fica só o resto), com um cadeado pulsando em
 *  cima da cabeça, o preço do resgate e uns bytes subindo em volta.
 *  O boneco filtrado é desenhado uma vez só e guardado (drawEncryptedBody):
 *  filtro de canvas a cada quadro derrubava o FPS no celular.
 * ════════════════════════════════════════════════════════════ */

export const ENCRYPT_FILTER = 'grayscale(1) sepia(1) hue-rotate(75deg) saturate(2.4) brightness(0.62) contrast(1.15)';

// Boneco criptografado: parado numa pose, com o filtro, guardado por
// tipo/nível/lado (origem no centro da base, como drawCharacter)
const BODY = 170; // lado do quadro guardado (cabe o maior boneco)
const FEET = 60; // pés abaixo do centro do quadro
export function drawEncryptedBody(ctx, type, level, face) {
  const c = cachedSprite(`encrypted:${type}:${level}:${face}`, BODY, (g) => {
    g.filter = ENCRYPT_FILTER;
    g.translate(0, FEET);
    drawCharacter(g, type, { t: 0.5, face, level });
  });
  ctx.drawImage(c, -BODY / 2, -BODY / 2 - FEET, BODY, BODY);
}

const BYTES = ['0x7F', '01', 'A3', '#!', 'FF', '10', 'C0', '$'];
const frac = (v) => v - Math.floor(v);

// Texto com contorno guardado como imagem (escrever texto a cada quadro, em
// várias defesas criptografadas, também pesava)
function label(ctx, str, x, y, size, color, stroke) {
  const w = Math.ceil(str.length * size * 0.75 + stroke * 2 + 4);
  const h = Math.ceil(size * 1.6 + stroke * 2);
  const side = Math.max(w, h);
  const c = cachedSprite(`enc-label:${str}:${size}:${color}`, side, (g) => text(g, str, 0, 0, { size, color, strokeWidth: stroke }));
  ctx.drawImage(c, x - side / 2, y - side / 2, side, side);
}

// Desenhado por cima do personagem (origem no centro da base)
export function drawEncrypted(ctx, t, price) {
  // bytes subindo e sumindo em volta do corpo
  ctx.save();
  for (let i = 0; i < 5; i++) {
    const p = frac(t * 0.5 + i / 5);
    const side = i % 2 ? 1 : -1;
    const x = side * (16 + (i % 3) * 5) + Math.sin(p * 5 + i) * 3;
    const y = 4 - p * 52;
    ctx.globalAlpha = Math.sin(p * Math.PI) * 0.85;
    label(ctx, BYTES[(i + Math.floor(t * 0.5 + i / 5)) % BYTES.length], x, y, 10, '#3dff9a', 3);
  }
  ctx.restore();

  // cadeado pulsando em cima da cabeça
  const k = 1 + Math.sin(t * 5) * 0.08;
  ctx.save();
  ctx.translate(0, -66);
  ctx.scale(k, k);
  ICONS.lock(ctx, 13);
  ctx.restore();
  // preço do resgate embaixo do cadeado
  label(ctx, `$${price}`, 0, -47, 12, '#ff9aa5', 4);
}
