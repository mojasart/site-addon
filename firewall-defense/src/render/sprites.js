import { rrect, circle, shadow, text } from './canvas.js';

const TAU = Math.PI * 2;

/* ════════════════════════════════════════════════════════════
 *  SPRITES
 *  Tudo aqui é desenhado com formas (sem imagens), centrado em (0,0)
 *  e cabendo numa célula de ~90x86. Quando tiver arte de verdade,
 *  troque o conteúdo destas funções por ctx.drawImage(...) e o resto
 *  do jogo continua igual.
 * ════════════════════════════════════════════════════════════ */

// ── Defensores ──────────────────────────────────────────────

export function drawDefender(ctx, type, s = {}) {
  const fn = DEFENDER_SPRITES[type];
  if (fn) fn(ctx, s.t ?? 0, s);
}

const DEFENDER_SPRITES = {
  // Servidor com LEDs piscando; brilha quando está pra gerar um pacote
  minerador(ctx, t, s) {
    shadow(ctx, 0, 30, 24);
    rrect(ctx, -22, -32, 44, 60, 6);
    ctx.fillStyle = '#1b2a4a';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#4fa3ff';
    ctx.stroke();
    for (let i = 0; i < 3; i++) {
      const y = -25 + i * 17;
      ctx.fillStyle = '#0c1527';
      rrect(ctx, -16, y, 32, 12, 3);
      ctx.fill();
      ctx.fillStyle = '#29426e';
      ctx.fillRect(-12, y + 5, 14, 2);
      ctx.fillStyle = Math.sin(t * 5 + i * 1.7) > -0.3 ? '#3dff9a' : '#1d5a3c';
      circle(ctx, 10, y + 6, 2.6);
      ctx.fill();
    }
    if (s.glow > 0) {
      ctx.globalAlpha = s.glow;
      ctx.fillStyle = 'rgba(255,210,63,0.35)';
      circle(ctx, 0, -42, 12);
      ctx.fill();
      ctx.fillStyle = '#ffd23f';
      circle(ctx, 0, -42, 6);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  },

  // Torreta verde com escudo de "check"
  antivirus(ctx, t, s) {
    turret(ctx, s, { base: '#123a2a', barrel: '#2ee584', dark: '#0e5f37', body: '#1fbf6a', rim: '#7dffb8' });
    ctx.fillStyle = '#0e5f37';
    ctx.beginPath();
    ctx.moveTo(-15, -14);
    ctx.lineTo(7, -14);
    ctx.lineTo(7, -3);
    ctx.quadraticCurveTo(7, 9, -4, 13);
    ctx.quadraticCurveTo(-15, 9, -15, -3);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-9, -2);
    ctx.lineTo(-5, 3);
    ctx.lineTo(2, -7);
    ctx.stroke();
  },

  // Muro de tijolos em chamas; racha conforme perde vida
  firewall(ctx, t, s) {
    const hp = s.hpRatio ?? 1;
    shadow(ctx, 0, 31, 30);
    for (let i = 0; i < 4; i++) {
      const x = -19 + i * 12.6;
      const h = 14 + Math.sin(t * 9 + i * 2.1) * 4;
      flame(ctx, x, -22, h, 7, '#ff7a1a');
      flame(ctx, x, -22, h * 0.6, 4, '#ffd36a');
    }
    const x0 = -28;
    const y0 = -24;
    const w = 56;
    const h = 55;
    const bh = 11;
    rrect(ctx, x0, y0, w, h, 4);
    ctx.fillStyle = '#3d140c';
    ctx.fill();
    ctx.fillStyle = hp > 0.33 ? '#d9532b' : '#a63d20';
    for (let r = 0; r < 5; r++) {
      const off = r % 2 ? -9 : 0;
      for (let bx = x0 + off; bx < x0 + w; bx += 18) {
        const a = Math.max(bx, x0) + 1.5;
        const b = Math.min(bx + 18, x0 + w) - 1.5;
        if (b - a > 2) ctx.fillRect(a, y0 + r * bh + 1.5, b - a, bh - 3);
      }
    }
    ctx.strokeStyle = '#2a0b05';
    ctx.lineWidth = 2.5;
    if (hp < 0.66) {
      ctx.beginPath();
      ctx.moveTo(-6, -24);
      ctx.lineTo(-1, -10);
      ctx.lineTo(-9, 2);
      ctx.lineTo(-3, 14);
      ctx.stroke();
    }
    if (hp < 0.33) {
      ctx.beginPath();
      ctx.moveTo(20, -24);
      ctx.lineTo(12, -6);
      ctx.lineTo(19, 8);
      ctx.lineTo(10, 30);
      ctx.stroke();
    }
    rrect(ctx, x0, y0, w, h, 4);
    ctx.strokeStyle = '#ff9a6a';
    ctx.lineWidth = 2;
    ctx.stroke();
  },

  // Torreta azul com cadeado
  criptografia(ctx, t, s) {
    turret(ctx, s, { base: '#14284a', barrel: '#6fd3ff', dark: '#1b4f8a', body: '#2c7be5', rim: '#a8e4ff' });
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(-4, -7, 6, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    rrect(ctx, -12, -7, 16, 13, 2);
    ctx.fill();
    ctx.fillStyle = '#2c7be5';
    circle(ctx, -4, -2, 2);
    ctx.fill();
    ctx.fillRect(-5, -2, 2, 5);
  },

  // Pote de mel; transparente com anel de progresso enquanto arma
  honeypot(ctx, t, s) {
    const armed = s.armed ?? true;
    shadow(ctx, 0, 30, 22);
    ctx.save();
    if (!armed) ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#e3a21a';
    ctx.beginPath();
    ctx.ellipse(0, 10, 22, 19, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.ellipse(-10, 4, 4, 8, -0.4, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#fff3c4';
    rrect(ctx, -9, 8, 20, 11, 2);
    ctx.fill();
    ctx.fillStyle = '#c98510';
    ctx.fillRect(-5, 11, 12, 2);
    ctx.fillRect(-5, 15, 8, 2);
    rrect(ctx, -12, -14, 24, 10, 3);
    ctx.fill();
    ctx.fillStyle = '#7a4d08';
    rrect(ctx, -16, -21, 32, 8, 3);
    ctx.fill();
    ctx.fillStyle = '#ffd23f';
    rrect(ctx, -12, -15, 6, 11, 3);
    ctx.fill();
    circle(ctx, -9, -3, 3.5);
    ctx.fill();
    ctx.restore();

    if (!armed) {
      ctx.strokeStyle = '#ffd23f';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 4, 31, -Math.PI / 2, -Math.PI / 2 + (s.armProgress ?? 0) * TAU);
      ctx.stroke();
    } else {
      ctx.fillStyle = Math.sin(t * 8) > 0 ? '#ff3b5c' : '#5a1220';
      circle(ctx, 0, -25, 4);
      ctx.fill();
    }
  },
};

function turret(ctx, s, c) {
  shadow(ctx, 0, 30, 22);
  ctx.fillStyle = c.base;
  rrect(ctx, -18, 14, 36, 14, 4);
  ctx.fill();
  const rc = (s.recoil ?? 0) * 5;
  ctx.fillStyle = c.barrel;
  rrect(ctx, 6 - rc, -9, 28, 14, 4);
  ctx.fill();
  ctx.fillStyle = c.dark;
  ctx.fillRect(30 - rc, -7, 5, 10);
  circle(ctx, -4, -2, 21);
  ctx.fillStyle = c.body;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = c.rim;
  ctx.stroke();
}

function flame(ctx, x, y, h, w, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x - w, y);
  ctx.quadraticCurveTo(x - w, y - h * 0.6, x, y - h);
  ctx.quadraticCurveTo(x + w, y - h * 0.6, x + w, y);
  ctx.closePath();
  ctx.fill();
}

// ── Inimigos ────────────────────────────────────────────────
// s: { phase, eating, flash, slowed, armor (bool), color }

export function drawEnemy(ctx, type, s = {}) {
  const phase = s.phase ?? 0;

  if (type === 'worm') {
    drawWorm(ctx, phase, s);
  } else {
    shadow(ctx, 0, 30, 20);
    ctx.save();
    ctx.translate(0, Math.sin(phase * 8) * 2);
    virusBody(ctx, phase, s.color ?? '#ff3b5c', s.eating);
    if (s.armor && type === 'trojan') helmet(ctx);
    if (s.armor && type === 'ransomware') padlock(ctx, phase);
    ctx.restore();
  }

  // Efeito de lentidão (criptografia) e "piscada" ao levar dano
  const overlay = (color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    if (type === 'worm') ctx.ellipse(4, 8, 32, 16, 0, 0, TAU);
    else ctx.arc(0, -4, 24, 0, TAU);
    ctx.fill();
  };
  if (s.slowed) overlay('rgba(110,210,255,0.35)');
  if (s.flash > 0) overlay('rgba(255,255,255,0.5)');
}

function virusBody(ctx, phase, color, eating) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + phase * 0.6;
    const c = Math.cos(a);
    const sn = Math.sin(a);
    ctx.beginPath();
    ctx.moveTo(c * 17, sn * 17 - 4);
    ctx.lineTo(c * 26, sn * 26 - 4);
    ctx.stroke();
    circle(ctx, c * 27, sn * 27 - 4, 3.5);
    ctx.fill();
  }
  circle(ctx, 0, -4, 20);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  circle(ctx, -7, -12, 6);
  ctx.fill();

  // olhos olhando pra esquerda (pro núcleo)
  ctx.fillStyle = '#ffffff';
  circle(ctx, -9, -7, 5.5);
  ctx.fill();
  circle(ctx, 3, -7, 5.5);
  ctx.fill();
  ctx.fillStyle = '#14060a';
  circle(ctx, -11, -6, 2.6);
  ctx.fill();
  circle(ctx, 1, -6, 2.6);
  ctx.fill();
  ctx.strokeStyle = '#14060a';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-15, -15);
  ctx.lineTo(-5, -12);
  ctx.moveTo(-1, -12);
  ctx.lineTo(8, -15);
  ctx.stroke();

  // boca abre e fecha enquanto corrompe um defensor
  const open = eating ? 2 + (Math.sin(phase * 18) + 1) * 3 : 2;
  ctx.fillStyle = '#3a0010';
  rrect(ctx, -10, 4, 12, open, 1.5);
  ctx.fill();
}

// Capacete espartano do Trojan
function helmet(ctx) {
  ctx.fillStyle = '#a63bff';
  ctx.beginPath();
  ctx.ellipse(2, -33, 17, 6, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#d4a13a';
  ctx.beginPath();
  ctx.arc(0, -10, 23, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  rrect(ctx, -24, -12, 8, 17, 3);
  ctx.fill();
  ctx.strokeStyle = '#8a6420';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-23, -10);
  ctx.lineTo(23, -10);
  ctx.stroke();
}

// Cadeadão do Ransomware, usado como escudo
function padlock(ctx, phase) {
  ctx.save();
  ctx.translate(-30, 2 + Math.sin(phase * 8) * 1.5);
  ctx.strokeStyle = '#c9cede';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, -12, 9, Math.PI, 0);
  ctx.stroke();
  rrect(ctx, -14, -13, 28, 26, 4);
  ctx.fillStyle = '#ffd23f';
  ctx.fill();
  ctx.strokeStyle = '#a8820c';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#3a2a00';
  circle(ctx, 0, -3, 3.5);
  ctx.fill();
  ctx.fillRect(-1.5, -3, 3, 9);
  ctx.restore();
}

function drawWorm(ctx, phase, s) {
  shadow(ctx, 6, 30, 30);
  for (let i = 4; i >= 0; i--) {
    const x = -14 + i * 11;
    const y = 10 + Math.sin(phase * 10 - i * 0.9) * 4;
    circle(ctx, x, y, 13 - i * 1.4);
    ctx.fillStyle = i === 0 ? '#8df25a' : i % 2 ? '#5cbf35' : '#6fd444';
    ctx.fill();
    ctx.strokeStyle = '#2e6b18';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  const hy = 10 + Math.sin(phase * 10) * 4;
  ctx.beginPath();
  ctx.moveTo(-18, hy - 10);
  ctx.lineTo(-24, hy - 22);
  ctx.moveTo(-11, hy - 11);
  ctx.lineTo(-9, hy - 23);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  circle(ctx, -19, hy - 5, 4.5);
  ctx.fill();
  circle(ctx, -10, hy - 6, 4.5);
  ctx.fill();
  ctx.fillStyle = '#111111';
  circle(ctx, -21, hy - 4, 2.2);
  ctx.fill();
  circle(ctx, -12, hy - 5, 2.2);
  ctx.fill();
  const open = s.eating ? 1 + (Math.sin(phase * 18) + 1) * 2.5 : 1.5;
  ctx.fillStyle = '#1d4010';
  rrect(ctx, -22, hy + 3, 9, open, 1);
  ctx.fill();
}

// ── Outros ──────────────────────────────────────────────────

export function drawProjectile(ctx, kind) {
  if (kind === 'crypto') {
    ctx.fillStyle = 'rgba(111,211,255,0.3)';
    circle(ctx, 0, 0, 11);
    ctx.fill();
    ctx.fillStyle = '#6fd3ff';
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(8, 0);
    ctx.lineTo(0, 8);
    ctx.lineTo(-8, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else {
    ctx.fillStyle = 'rgba(46,229,132,0.3)';
    circle(ctx, 0, 0, 10);
    ctx.fill();
    ctx.fillStyle = '#2ee584';
    circle(ctx, 0, 0, 6);
    ctx.fill();
    ctx.fillStyle = '#d6ffe9';
    circle(ctx, -1.5, -1.5, 2.5);
    ctx.fill();
  }
}

// Pacote de bits (recurso)
export function drawPacket(ctx, t, r = 16) {
  ctx.fillStyle = 'rgba(255,210,63,0.22)';
  circle(ctx, 0, 0, r * 1.6);
  ctx.fill();
  ctx.save();
  ctx.rotate(t * 0.8);
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i * TAU) / 6;
    if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fillStyle = '#ffd23f';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#fff3b0';
  ctx.stroke();
  ctx.restore();
  text(ctx, '01', 0, 1, { size: Math.round(r * 0.7), color: '#5a3d00' });
}

export function drawBackup(ctx, active, t) {
  if (active) {
    ctx.fillStyle = 'rgba(125,249,255,0.12)';
    ctx.fillRect(-90, -38, 90, 76);
    ctx.fillStyle = 'rgba(125,249,255,0.25)';
    ctx.fillRect(-32, -38, 32, 76);
    ctx.fillStyle = '#7df9ff';
    rrect(ctx, -6, -40, 12, 80, 5);
    ctx.fill();
    return;
  }
  rrect(ctx, -18, -14, 36, 28, 5);
  ctx.fillStyle = '#16324a';
  ctx.fill();
  ctx.strokeStyle = '#3dd6ff';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = Math.sin(t * 3) > 0 ? '#3dff9a' : '#1d5a3c';
  circle(ctx, 11, -6, 2.5);
  ctx.fill();
  text(ctx, 'BKP', -2, 4, { size: 10, color: '#9fe8ff' });
}

export function drawTrash(ctx) {
  ctx.fillStyle = '#ff5d73';
  rrect(ctx, -4, -21, 8, 5, 1.5);
  ctx.fill();
  rrect(ctx, -14, -17, 28, 5, 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-11, -10);
  ctx.lineTo(11, -10);
  ctx.lineTo(9, 14);
  ctx.lineTo(-9, 14);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#7a1a2a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (const x of [-5, 0, 5]) {
    ctx.moveTo(x, -6);
    ctx.lineTo(x * 0.9, 10);
  }
  ctx.stroke();
}
