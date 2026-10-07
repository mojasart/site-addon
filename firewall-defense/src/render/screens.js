import { VIEW_H } from '../config.js';
import { text } from './canvas.js';
import { drawDefender, drawEnemy } from './sprites.js';

// Faixa de aviso no meio da tela ("ATAQUE MASSIVO DETECTADO!" etc)
export function drawBanner(ctx, game) {
  const b = game.banner;
  if (!b) return;
  const a = Math.min(1, (b.total - b.time) * 4, b.time * 2);
  const y = VIEW_H / 2;
  ctx.globalAlpha = Math.max(0, a);
  ctx.fillStyle = 'rgba(4,8,18,0.75)';
  ctx.fillRect(0, y - 38, game.viewW, 76);
  text(ctx, b.text, game.viewW / 2, y, { size: 34, color: b.color, stroke: '#04060c', strokeWidth: 6 });
  ctx.globalAlpha = 1;
}

// Telas de menu / pausa / vitória / derrota
export function drawOverlay(ctx, game) {
  if (game.state === 'playing') return;
  const W = game.viewW;
  const cx = W / 2;
  const t = game.anim;
  const blink = Math.sin(t * 4) > -0.3;

  ctx.fillStyle = 'rgba(3,6,14,0.82)';
  ctx.fillRect(0, 0, W, VIEW_H);

  if (game.state === 'menu') {
    text(ctx, 'FIREWALL', cx, 110, { size: 66, color: '#3dd6ff', stroke: '#0b2a4a', strokeWidth: 10 });
    text(ctx, 'DEFENSE', cx, 175, { size: 66, color: '#ffd23f', stroke: '#4a3200', strokeWidth: 10 });
    text(ctx, 'Proteja o NÚCLEO da rede contra a invasão!', cx, 232, { size: 18, color: '#cfe3ff' });

    // vitrine: defensores x ameaças
    const defs = ['minerador', 'antivirus', 'firewall', 'criptografia', 'honeypot'];
    defs.forEach((type, i) => {
      ctx.save();
      ctx.translate(cx - 400 + i * 70, 310);
      ctx.scale(0.8, 0.8);
      drawDefender(ctx, type, { t: t + i, hpRatio: 1, armed: true });
      ctx.restore();
    });
    text(ctx, 'VS', cx, 312, { size: 28, color: '#ff3b5c' });
    ['worm', 'virus', 'trojan', 'ransomware'].forEach((type, i) => {
      ctx.save();
      ctx.translate(cx + 120 + i * 80, 312);
      ctx.scale(0.8, 0.8);
      drawEnemy(ctx, type, { phase: t + i, armor: true });
      ctx.restore();
    });

    text(ctx, 'Toque numa carta e depois numa célula (ou arraste) para instalar.', cx, 382, { size: 14, color: '#8aa3c7' });
    text(ctx, 'Colete os pacotes de bits para comprar mais defesas.', cx, 404, { size: 14, color: '#8aa3c7' });
    if (blink) text(ctx, 'TOQUE PARA COMEÇAR', cx, 462, { size: 24, color: '#ffffff' });
  } else if (game.state === 'paused') {
    text(ctx, 'PAUSADO', cx, VIEW_H / 2 - 20, { size: 54, color: '#3dd6ff', stroke: '#0b2a4a', strokeWidth: 8 });
    text(ctx, 'Toque para continuar', cx, VIEW_H / 2 + 40, { size: 20, color: '#cfe3ff' });
  } else if (game.state === 'won' || game.state === 'lost') {
    const won = game.state === 'won';
    text(ctx, won ? 'REDE PROTEGIDA!' : 'SISTEMA COMPROMETIDO', cx, VIEW_H / 2 - 50, {
      size: won ? 56 : 48,
      color: won ? '#3dff9a' : '#ff3b5c',
      stroke: '#04060c',
      strokeWidth: 8,
    });
    text(ctx, won ? 'Todos os ataques foram bloqueados.' : 'Um vírus invadiu o núcleo...', cx, VIEW_H / 2 + 10, {
      size: 20,
      color: '#cfe3ff',
    });
    text(ctx, `Ameaças eliminadas: ${game.stats.kills}`, cx, VIEW_H / 2 + 42, { size: 16, color: '#8aa3c7' });
    if (game.endDelay <= 0 && blink) {
      text(ctx, won ? 'Toque para jogar de novo' : 'Toque para tentar de novo', cx, VIEW_H / 2 + 110, {
        size: 22,
        color: '#ffffff',
      });
    }
  }
}
