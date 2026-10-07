import { VIEW_H } from '../config.js';
import { rrect, circle, fillOutline, shadow, text } from './canvas.js';
import { drawImage } from './images.js';

/* ════════════════════════════════════════════════════════════
 *  CENÁRIO DA FASE (Etapa 1)
 *
 *  paintLevel(g, view)        → cenário estático (vai pra um cache)
 *     view = { W, offsetX, level, path }
 *     g já está em coordenadas virtuais; desenhe a fase somando offsetX
 *     (ou use g.translate(offsetX, 0)). Pinte o chão na largura W toda.
 *  drawLevelOverlay(ctx, t)   → animações leves (coords da fase)
 *  drawSlot(ctx, slot, s)     → ponto de instalação, origem no centro
 *     s = { t, state: 'idle' | 'valid' | 'dim' | 'occupied' }
 *  drawBase(ctx, t, hurt)     → servidor a proteger, origem no centro
 *
 *  Pontos de instalação e servidor usam sprites (assets/sprites);
 *  o chão e o caminho ainda são PROVISÓRIOS (Etapa 1).
 * ════════════════════════════════════════════════════════════ */

export function paintLevel(g, { W, offsetX, path }) {
  g.fillStyle = '#e8c08c';
  g.fillRect(0, 0, W, VIEW_H);
  g.save();
  g.translate(offsetX, 0);
  g.beginPath();
  path.points.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.lineWidth = path.width + 6;
  g.strokeStyle = '#2b2340';
  g.stroke();
  g.lineWidth = path.width;
  g.strokeStyle = '#3b82e0';
  g.stroke();
  g.restore();
}

export function drawLevelOverlay() {}

const SLOT_COLORS = { plataforma: '#cfd6e0', terminal: '#9fd4ff', nucleo: '#ffb38a' };

export function drawSlot(ctx, slot, s) {
  ctx.save();
  if (s.state === 'dim') ctx.globalAlpha = 0.35;
  shadow(ctx, 0, 8, 30, 12);
  const sprite = drawImage(ctx, `slot_${slot.kind}`, 66);
  if (!sprite) {
    circle(ctx, 0, 0, 26);
    fillOutline(ctx, SLOT_COLORS[slot.kind], 3);
  }
  if (s.state === 'valid') {
    circle(ctx, 0, 0, 30 + Math.sin(s.t * 6) * 2);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
  }
  if (!sprite && s.state !== 'occupied') text(ctx, slot.kind[0].toUpperCase(), 0, 1, { size: 16, color: '#2b2340', stroke: null });
  ctx.restore();
}

export function drawBase(ctx, t, hurt) {
  const shake = hurt > 0 ? Math.sin(t * 80) * 2 : 0;
  shadow(ctx, 4, 42, 44, 12);
  if (drawImage(ctx, hurt > 0 ? 'server_hurt' : 'server', 96, shake, -4)) return;
  rrect(ctx, -38, -50, 76, 92, 10);
  fillOutline(ctx, hurt > 0 ? '#ff7a7a' : '#dfe6ee', 3);
  text(ctx, 'SERVIDOR', 0, -2, { size: 12, color: '#2b2340', stroke: null });
}
