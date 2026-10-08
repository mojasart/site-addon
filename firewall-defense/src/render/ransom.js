import { text } from './canvas.js';
import { ICONS } from './sprites.js';

/* ════════════════════════════════════════════════════════════
 *  DEFESA CRIPTOGRAFADA (habilidade do chefão Ransomware)
 *  O personagem fica "verde de terminal" e apagado (filtro do canvas;
 *  onde não existe, fica só o resto), com um cadeado pulsando em cima
 *  da cabeça, o preço do resgate e uns bytes subindo em volta.
 *  Tudo depende só do relógio t (nada guardado).
 * ════════════════════════════════════════════════════════════ */

export const ENCRYPT_FILTER = 'grayscale(1) sepia(1) hue-rotate(75deg) saturate(2.4) brightness(0.62) contrast(1.15)';

const BYTES = ['0x7F', '01', 'A3', '#!', 'FF', '10', 'C0', '$'];
const frac = (v) => v - Math.floor(v);

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
    text(ctx, BYTES[(i + Math.floor(t * 0.5 + i / 5)) % BYTES.length], x, y, { size: 10, color: '#3dff9a', strokeWidth: 3 });
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
  text(ctx, `$${price}`, 0, -47, { size: 12, color: '#ff9aa5', strokeWidth: 4 });
}
