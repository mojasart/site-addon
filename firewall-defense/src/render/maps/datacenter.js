import { VIEW_H, OUTLINE, TILE } from '../../config.js';
import { strokePath, drawRaisedPath } from './shared.js';

// Tema DATA CENTER: piso técnico limpo e a calha de cabos elevada.
// Sem itens sorteados nem piscinas: o chão todo é terra (dá pra construir).

export function layout() {
  return {};
}

export function paint(g, { path, W, ox }) {
  // piso técnico: cada placa do piso é um quadrado da grade do mapa
  g.fillStyle = '#d3dae6';
  g.fillRect(0, 0, W, VIEW_H);
  const T = TILE;
  for (let x = (ox % T) - T; x < W; x += T) {
    for (let y = 0; y < VIEW_H; y += T) {
      const k = Math.floor((x - ox) / T) + Math.floor(y / T);
      if (k % 5 === 0) {
        g.fillStyle = '#c4ccda';
        g.fillRect(x + 2, y + 2, T - 4, T - 4);
        g.fillStyle = '#aeb8c9';
        for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) g.fillRect(x + 8 + i * 9, y + 8 + j * 9, 3, 3);
      }
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
