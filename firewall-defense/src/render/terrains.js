import { OUTLINE } from '../config.js';
import { rrect } from './canvas.js';
import { drawImage } from './images.js';
import { drawHazards } from './hazards.js';
import { HAZARD_PERIOD } from '../data/terrains.js';

/* ════════════════════════════════════════════════════════════
 *  AMOSTRAS DE TERRENO (catálogo, aba TERRENOS)
 *  drawTerrain(ctx, id, s, t) → um quadrado de lado s com o chão,
 *  centrado na origem, no estilo do mapa
 * ════════════════════════════════════════════════════════════ */

export function drawTerrain(ctx, id, s, t) {
  ctx.save();
  if (id === 'road') road(ctx, s, t);
  else if (id === 'coins') coins(ctx, s, t);
  else if (id === 'hazard') hazard(ctx, s, t);
  else if (id === 'water') water(ctx, s, t);
  ctx.restore();
}

// estrada: o asfalto claro com a seta andando
function road(ctx, s, t) {
  rrect(ctx, -s / 2, -s / 2, s, s, s * 0.14);
  ctx.fillStyle = '#c9cfdb';
  ctx.fill();
  ctx.lineWidth = Math.max(2, s * 0.05);
  ctx.strokeStyle = '#6f7790';
  ctx.stroke();
  const dx = ((t * 0.6) % 1) * s * 0.25 - s * 0.12;
  ctx.beginPath();
  ctx.moveTo(dx - s * 0.1, -s * 0.16);
  ctx.lineTo(dx + s * 0.08, 0);
  ctx.lineTo(dx - s * 0.1, s * 0.16);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, s * 0.08);
  ctx.strokeStyle = '#8a92a6';
  ctx.stroke();
}

// pilha de bitcoin: o quadrado marcado em dourado com a pilha
function coins(ctx, s, t) {
  rrect(ctx, -s / 2, -s / 2, s, s, s * 0.16);
  ctx.fillStyle = '#2f5a2a';
  ctx.fill();
  rrect(ctx, -s / 2 + 2, -s / 2 + 2, s - 4, s - 4, s * 0.15);
  ctx.fillStyle = 'rgba(120,70,0,0.35)';
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, s * 0.045);
  ctx.strokeStyle = `rgba(255,198,46,${0.65 + Math.sin(t * 3) * 0.25})`;
  ctx.setLineDash([s * 0.12, s * 0.08]);
  ctx.stroke();
  ctx.setLineDash([]);
  if (!drawImage(ctx, 'coin_pile', s * 0.9, 0, 1)) {
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = '#ffc62e';
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
  }
}

// zona eletrificada: o tapete do Data Center, descarregando de tempos em
// tempos (mais rápido que no jogo, pra dar pra ver o aviso e o choque)
const DEMO_PERIOD = HAZARD_PERIOD / 2;
function hazard(ctx, s, t) {
  rrect(ctx, -s / 2, -s / 2, s, s, s * 0.1);
  ctx.fillStyle = '#1b2236';
  ctx.fill();
  const k = (t % DEMO_PERIOD);
  const zone = { x: -s / 2, y: -s / 2, w: s, h: s, period: DEMO_PERIOD, t: k, flash: Math.max(0, 1 - k * 2.5) };
  drawHazards(ctx, { zones: [zone] }, t);
}

// água: o mar com marolinhas passando
function water(ctx, s, t) {
  rrect(ctx, -s / 2, -s / 2, s, s, s * 0.14);
  ctx.fillStyle = '#2f8fd8';
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.lineWidth = Math.max(1.5, s * 0.04);
  ctx.strokeStyle = 'rgba(214,240,255,0.75)';
  ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const y = -s * 0.32 + i * s * 0.22;
    const off = ((t * 0.25 + i * 0.37) % 1) * s * 1.4 - s * 0.7;
    ctx.beginPath();
    for (let j = 0; j <= 12; j++) {
      const x = off - s * 0.2 + (j / 12) * s * 0.4;
      const yy = y + Math.sin(j / 12 * Math.PI * 2 + t * 2) * s * 0.03;
      if (j) ctx.lineTo(x, yy);
      else ctx.moveTo(x, yy);
    }
    ctx.stroke();
  }
  ctx.restore();
  rrect(ctx, -s / 2, -s / 2, s, s, s * 0.14);
  ctx.lineWidth = Math.max(2, s * 0.05);
  ctx.strokeStyle = '#1d5f99';
  ctx.stroke();
}
