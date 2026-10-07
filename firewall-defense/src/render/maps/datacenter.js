import { VIEW_H, OUTLINE, TILE } from '../../config.js';
import { strokePath, drawRaisedPath } from './shared.js';

// Tema DATA CENTER: piso técnico limpo e a calha de cabos elevada.
// Sem itens sorteados nem piscinas: o chão todo é terra (dá pra construir).

export function layout() {
  return {};
}

const DOT_GAP = 10; // espaço entre os furinhos da placa perfurada
const DOT = 3; // tamanho de cada furinho
const DRAIN_CHANCE = 0.05; // placas perfuradas que viram bueiro

export function paint(g, { map, path, W, ox }) {
  // piso técnico: cada placa do piso é um quadrado da grade do mapa;
  // uma em cada 5 é perfurada (4×4 furinhos no meio) e algumas dessas
  // são um bueiro (grade com o buraco escuro embaixo)
  g.fillStyle = '#d3dae6';
  g.fillRect(0, 0, W, VIEW_H);
  const T = TILE;
  const dots = DOT_GAP * 3 + DOT; // largura do bloco de furinhos
  for (let x = (ox % T) - T; x < W; x += T) {
    for (let y = 0; y < VIEW_H; y += T) {
      const c = Math.floor((x - ox) / T);
      const r = Math.floor(y / T);
      if ((c + r) % 5 !== 0) continue;
      if (hash(c, r, map?.seed ?? 0) < DRAIN_CHANCE) {
        drain(g, x, y, T);
        continue;
      }
      g.fillStyle = '#c4ccda';
      g.fillRect(x + 2, y + 2, T - 4, T - 4);
      g.fillStyle = '#aeb8c9';
      const o = (T - dots) / 2; // furinhos centralizados na placa
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) g.fillRect(x + o + i * DOT_GAP, y + o + j * DOT_GAP, DOT, DOT);
    }
  }
  g.strokeStyle = '#b5bfce';
  g.lineWidth = 2;
  g.beginPath();
  for (let x = ox % T; x <= W; x += T) {
    g.moveTo(x, 0);
    g.lineTo(x, VIEW_H);
  }
  for (let y = 0; y <= VIEW_H; y += T) {
    g.moveTo(0, y);
    g.lineTo(W, y);
  }
  g.stroke();

  g.save();
  g.translate(ox, 0);

  // calha de cabos elevada (3/4), com bordas amarelas no topo
  drawRaisedPath(g, path, {
    side: '#5d6886',
    rim: '#ffc72c',
    inner: '#3a4256',
    outline: OUTLINE,
    top: (l) => strokePath(l, path, 3, '#5d6886', [14, 10]),
  });
  g.restore();
}

// Bueiro: moldura de metal, buraco escuro e grade de barras por cima, com a
// sombra da borda de cima caindo pra dentro (parece fundo)
function drain(g, x, y, T) {
  const m = 6; // moldura
  const hx = x + m;
  const hy = y + m;
  const hs = T - m * 2;
  // moldura
  g.fillStyle = '#9aa4b6';
  g.fillRect(x + 3, y + 3, T - 6, T - 6);
  g.strokeStyle = '#7d889c';
  g.lineWidth = 2;
  g.strokeRect(x + 3, y + 3, T - 6, T - 6);
  // buraco: escuro, mais ainda lá no fundo (em cima, onde a borda faz sombra)
  const hole = g.createLinearGradient(0, hy, 0, hy + hs);
  hole.addColorStop(0, '#0e121c');
  hole.addColorStop(1, '#2c3346');
  g.fillStyle = hole;
  g.fillRect(hx, hy, hs, hs);
  // barras da grade (com um brilho em cima de cada uma)
  const bars = 5;
  const step = hs / bars;
  for (let i = 0; i < bars; i++) {
    const bx = hx + step * i + step / 2 - 2;
    g.fillStyle = '#6f7a8f';
    g.fillRect(bx, hy, 4, hs);
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.fillRect(bx, hy, 1.5, hs);
  }
  // travessa no meio
  g.fillStyle = '#6f7a8f';
  g.fillRect(hx, hy + hs / 2 - 2, hs, 4);
  // sombra da borda de cima e da esquerda caindo pra dentro do buraco
  const sh = g.createLinearGradient(0, hy, 0, hy + 12);
  sh.addColorStop(0, 'rgba(0,0,0,0.55)');
  sh.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = sh;
  g.fillRect(hx, hy, hs, 12);
  const sl = g.createLinearGradient(hx, 0, hx + 7, 0);
  sl.addColorStop(0, 'rgba(0,0,0,0.4)');
  sl.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = sl;
  g.fillRect(hx, hy, 7, hs);
  // contorno da abertura
  g.strokeStyle = '#4a5368';
  g.lineWidth = 1.5;
  g.strokeRect(hx, hy, hs, hs);
}

// Número 0..1 fixo pra cada placa (o bueiro cai sempre no mesmo lugar)
function hash(c, r, seed) {
  let h = (c * 374761393 + r * 668265263 + seed * 2246822519) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
