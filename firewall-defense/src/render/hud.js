import { HUD_H, BOARD_X, BOARD_RIGHT } from '../config.js';
import { DEFENDERS } from '../data/defenders.js';
import { rrect, panel, text, setFont } from './canvas.js';
import { drawDefender, drawPacket, drawTrash } from './sprites.js';

// Posições dos elementos do HUD (usado pra desenhar E pra detectar toques)
export function hudLayout(game) {
  const cards = game.level.defenders.map((type, i) => ({ type, x: 112 + i * 78, y: 8, w: 72, h: 78 }));
  const afterCards = 112 + cards.length * 78;
  return {
    bits: { x: 8, y: 8, w: 96, h: 78 },
    cards,
    shovel: { x: afterCards + 6, y: 8, w: 64, h: 78 },
    progress: { x: game.viewW - 262, y: 30, w: 180, h: 14 },
    pause: { x: game.viewW - 60, y: 18, w: 48, h: 48 },
  };
}

export const inRect = (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

export function drawHud(ctx, game) {
  const L = hudLayout(game);
  const t = game.anim;

  ctx.fillStyle = 'rgba(8,14,30,0.97)';
  ctx.fillRect(0, 0, game.viewW, HUD_H);
  ctx.fillStyle = '#1f3a66';
  ctx.fillRect(0, HUD_H - 2, game.viewW, 2);

  // contador de bits
  panel(ctx, L.bits, '#13213d', '#2a4a7a');
  ctx.save();
  ctx.translate(L.bits.x + 48, L.bits.y + 28);
  drawPacket(ctx, t, 15);
  ctx.restore();
  text(ctx, String(game.bits), L.bits.x + 48, L.bits.y + 62, { size: 20, color: '#ffd23f' });

  for (const c of L.cards) drawCard(ctx, game, c, t);

  // deletar
  const sh = L.shovel;
  const shSel = game.selected === 'shovel';
  panel(ctx, sh, shSel ? '#3a1424' : '#13213d', shSel ? '#ff5d73' : '#2a4a7a', shSel ? 3 : 2);
  ctx.save();
  ctx.translate(sh.x + sh.w / 2, sh.y + 34);
  drawTrash(ctx);
  ctx.restore();
  text(ctx, 'DEL', sh.x + sh.w / 2, sh.y + sh.h - 11, { size: 13, color: '#ff8fa0' });

  drawProgress(ctx, game, L.progress);

  // pause
  const p = L.pause;
  panel(ctx, p, '#13213d', '#2a4a7a');
  ctx.fillStyle = '#9fe8ff';
  ctx.fillRect(p.x + 16, p.y + 14, 6, 20);
  ctx.fillRect(p.x + 27, p.y + 14, 6, 20);

  drawTooltip(ctx, game);
}

function drawCard(ctx, game, c, t) {
  const def = DEFENDERS[c.type];
  const cd = game.cooldowns[c.type];
  const affordable = game.bits >= def.cost;
  const selected = game.selected === c.type;

  panel(ctx, c, selected ? '#1d3360' : '#13213d', selected ? '#ffd23f' : '#2a4a7a', selected ? 3 : 2);

  ctx.save();
  ctx.translate(c.x + c.w / 2, c.y + 36);
  ctx.scale(0.62, 0.62);
  drawDefender(ctx, c.type, { t, hpRatio: 1, armed: true, armProgress: 1 });
  ctx.restore();

  text(ctx, String(def.cost), c.x + c.w / 2, c.y + c.h - 11, { size: 15, color: affordable ? '#ffd23f' : '#ff5d73' });

  // escurece se não dá pra comprar
  if (!affordable || cd > 0) {
    rrect(ctx, c.x, c.y, c.w, c.h, 8);
    ctx.fillStyle = 'rgba(4,8,18,0.5)';
    ctx.fill();
  }
  // "cortina" da recarga
  if (cd > 0) {
    const frac = cd / (def.cooldown * game.cooldownMul);
    ctx.fillStyle = 'rgba(4,8,18,0.6)';
    ctx.fillRect(c.x + 2, c.y + 2, c.w - 4, (c.h - 4) * Math.min(1, frac));
  }
}

function drawProgress(ctx, game, r) {
  const dir = game.director;
  const n = dir.waves.length;

  text(ctx, 'AMEAÇA', r.x, r.y - 12, { size: 12, color: '#8aa3c7', align: 'left' });
  text(ctx, `ONDA ${Math.min(dir.index, n)}/${n}`, r.x + r.w, r.y - 12, { size: 12, color: '#8aa3c7', align: 'right' });

  rrect(ctx, r.x, r.y, r.w, r.h, 7);
  ctx.fillStyle = '#13213d';
  ctx.fill();
  const w = Math.max(0, r.w * dir.progress);
  if (w > 2) {
    rrect(ctx, r.x, r.y, w, r.h, 7);
    ctx.fillStyle = '#ff3b5c';
    ctx.fill();
  }
  rrect(ctx, r.x, r.y, r.w, r.h, 7);
  ctx.strokeStyle = '#2a4a7a';
  ctx.lineWidth = 2;
  ctx.stroke();

  // bandeirinhas nas ondas grandes
  dir.waves.forEach((wave, i) => {
    if (!wave.big) return;
    const x = r.x + (r.w * (i + 1)) / n - 4;
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(x, r.y - 6, 2, r.h + 10);
    ctx.beginPath();
    ctx.moveTo(x + 2, r.y - 6);
    ctx.lineTo(x + 12, r.y - 2);
    ctx.lineTo(x + 2, r.y + 2);
    ctx.fill();
  });
}

// Descrição da carta selecionada, logo abaixo do HUD
function drawTooltip(ctx, game) {
  const sel = game.selected;
  if (!sel) return;
  let str;
  if (sel === 'shovel') str = 'Deletar: toque num defensor para removê-lo';
  else {
    const def = DEFENDERS[sel];
    str = `${def.name}: ${def.desc}`;
  }
  setFont(ctx, 13);
  const w = ctx.measureText(str).width + 24;
  const cx = (BOARD_X + BOARD_RIGHT) / 2;
  rrect(ctx, cx - w / 2, HUD_H + 4, w, 24, 12);
  ctx.fillStyle = 'rgba(4,8,18,0.85)';
  ctx.fill();
  text(ctx, str, cx, HUD_H + 16, { size: 13, color: '#cfe3ff' });
}
