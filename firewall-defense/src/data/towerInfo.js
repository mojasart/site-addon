// ─────────────────────────────────────────────────────────────
//  Números de cada defesa pra mostrar ao jogador (catálogo e a aba de
//  informações do jogo): os status com os upgrades até o nível aplicados,
//  do mesmo jeito que o jogo aplica.
// ─────────────────────────────────────────────────────────────
import { TOWERS } from './towers.js';

// Idade de cada nível (os personagens crescem a cada upgrade)
export const AGES = ['CRIANÇA', 'ADOLESCENTE', 'ADULTO'];

// Status da defesa com os upgrades até esse nível aplicados (como no jogo)
export function statsAt(type, level) {
  const def = TOWERS[type];
  const s = { ...def };
  for (let i = 0; i < level && i < def.upgrades.length; i++) def.upgrades[i].apply(s);
  return s;
}

// Número com vírgula e no máximo 2 casas (0,95 / 1,44)
export const num = (v) => String(Math.round(v * 100) / 100).replace('.', ',');

// Linhas [rótulo, valor] do que a defesa faz com esses status.
// armor: inclui a linha de blindagem (o catálogo mostra isso numa etiqueta)
export function statRows(s, { armor = false } = {}) {
  const rows = [];
  if (s.attack === 'farm') {
    rows.push(['RENDA', `${s.packetsPerRound} × $${s.packetValue} por rodada`]);
    if (s.goldenChance) rows.push(['DOURADOS', `${Math.round(s.goldenChance * 100)}% · $${s.goldenValue} cada`]);
    return [...rows, ...luckRows(s)];
  }
  if (s.attack === 'decoy') {
    rows.push(['VIDA', `${s.hp}`], ['DURAÇÃO', `${s.duration}s sozinha`], ['DANO', '0 (só distrai)']);
    return [...rows, ...luckRows(s)];
  }
  if (s.effect === 'frost') {
    rows.push(['LENTIDÃO', `-${Math.round((1 - s.slow) * 100)}% por ${num(s.slowTime)}s`]);
    if (s.vulnerable) rows.push(['CONGELADOS', 'levam dano 2×']);
  } else {
    rows.push(['DANO', s.multishot > 1 ? `${s.damage} × ${s.multishot} teclados` : `${s.damage}`]);
    if (s.pierce > 1) rows.push(['ATRAVESSA', `até ${s.pierce} vírus`]);
    if (s.burn) rows.push(['QUEIMA', `${num(s.burn)}/s por ${num(s.burnTime)}s`]);
  }
  rows.push(['ALCANCE', `${s.range}`], ['RECARGA', `${num(s.fireRate)}s`]);
  if (armor) rows.push(['BLINDADOS', s.canHitArmored ? 'fura' : 'não fura']);
  return [...rows, ...luckRows(s)];
}

// Bônus de sorte da Dark Net (data/darknet.js)
function luckRows(s) {
  const pct = (p) => `${Math.round(p * 100)}%`;
  const rows = [];
  if (s.critChance) rows.push(['CRÍTICO', `${pct(s.critChance)} de dano 2×`]);
  if (s.extraShotChance) rows.push(['TECLADO EXTRA', `${pct(s.extraShotChance)} de chance`]);
  if (s.executeChance) rows.push(['ZERO-DAY', `${pct(s.executeChance)} de estourar tudo`]);
  if (s.igniteChance) rows.push(['PEGAR FOGO', `${pct(s.igniteChance)} de chance`]);
  if (s.bigPulseChance) rows.push(['ERUPÇÃO', `${pct(s.bigPulseChance)} de alcance 2×`]);
  if (s.repeatChance) rows.push(['ONDA EXTRA', `${pct(s.repeatChance)} de chance`]);
  if (s.shatterChance) rows.push(['ESTILHAÇO', `${pct(s.shatterChance)} de chance`]);
  if (s.tripleChance) rows.push(['DANO 3×', `${pct(s.tripleChance)} de chance`]);
  if (s.rechargeChance) rows.push(['RECARGA', `${pct(s.rechargeChance)} instantânea`]);
  if (s.goldChance) rows.push(['BLOCO RARO', `${pct(s.goldChance)} de 5×`]);
  if (s.stickyChance) rows.push(['GRUDAR', `${pct(s.stickyChance)} de sair lento`]);
  if (s.swarmChance) rows.push(['COLMEIA', `${pct(s.swarmChance)} ao quebrar`]);
  if (s.knockChance) rows.push(['EMPURRÃO', `${pct(s.knockChance)} de chance`]);
  if (s.freezeChance) rows.push(['CONGELAR', `${pct(s.freezeChance)} por 1s`]);
  if (s.pierceChance) rows.push(['ATRAVESSAR', `${pct(s.pierceChance)} de +1 vírus`]);
  if (s.doubleChance) rows.push(['BITCOIN 2×', `${pct(s.doubleChance)} de chance`]);
  if (s.reviveChance) rows.push(['VOLTAR', `${pct(s.reviveChance)} com meia vida`]);
  return rows;
}
