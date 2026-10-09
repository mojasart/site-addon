// ─────────────────────────────────────────────────────────────
//  Números de cada defesa pra mostrar ao jogador (catálogo e a aba de
//  informações do jogo): os status com os upgrades até o nível aplicados,
//  do mesmo jeito que o jogo aplica.
// ─────────────────────────────────────────────────────────────
import { TOWERS, BURNOUT, COMMANDER_MAX } from './towers.js';
import { fmt, plural } from '../util.js';

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
    rows.push(['RENDA', `${s.packetsPerRound} ${plural(s.packetsPerRound, 'bitcoin', 'bitcoins')} de $${s.packetValue} por rodada`]);
    if (s.goldenChance) rows.push(['DOURADOS', `${Math.round(s.goldenChance * 100)}% · $${s.goldenValue} cada`]);
    if (s.sponsor) rows.push(['PATROCÍNIO', `+$${s.sponsor} por vírus de 1 defesa`]);
    return [...rows, ...luckRows(s)];
  }
  if (s.attack === 'aura') {
    const pct = (p) => `${Math.round(p * 100)}%`;
    rows.push(
      ['ACELERA', `+${pct(s.haste)} nas defesas em volta`],
      ['ALCANCE', `${s.range}`],
      ['BURNOUT', `todas +${pct(BURNOUT.haste)} por ${BURNOUT.time + (s.burnoutExtra ?? 0)}s`],
      ['RECARGA', `${BURNOUT.cooldown}s`],
      ['LIMITE', `${COMMANDER_MAX} comandantes por fase`],
    );
    return rows;
  }
  if (s.attack === 'decoy') {
    rows.push(['VIDA', `${s.hp}`], ['DURAÇÃO', `${s.duration}s sozinha`], ['DANO', '0 (só distrai)']);
    return [...rows, ...luckRows(s)];
  }
  if (s.effect === 'frost') {
    rows.push(['LENTIDÃO', `-${Math.round((1 - s.slow) * 100)}% por ${num(s.slowTime)}s`]);
    if (s.vulnerable) rows.push(['CONGELADOS', `levam +${Math.round(((s.vulnMul ?? 2) - 1) * 100)}% de dano`]);
  } else {
    rows.push(['DANO', s.multishot > 1 ? `${s.multishot} teclados de ${fmt(s.damage)}` : fmt(s.damage)]);
    if (s.pierce > 1) rows.push(['ATRAVESSA', `até ${s.pierce} vírus`]);
    if (s.markTime) rows.push(['MARCA', `+${Math.round((s.markMul - 1) * 100)}% de dano por ${num(s.markTime)}s`]);
    if (s.burn) rows.push(['QUEIMA', `${fmt(s.burn * (s.burnMul ?? 1))}/s por ${num(s.burnTime + (s.burnExtra ?? 0))}s`]);
  }
  rows.push(['ALCANCE', `${s.range}`], ['RECARGA', `${num(s.fireRate)}s`]);
  if (s.attack === 'pulse') rows.push(['VOADORES', 'não pega']); // a onda corre pelo chão (Bug)
  if (armor) rows.push(['BLINDADOS', s.canHitArmored ? 'fura' : 'não fura']);
  return [...rows, ...luckRows(s)];
}

// Bônus de sorte da Dark Net (data/darknet.js)
function luckRows(s) {
  const pct = (p) => `${Math.round(p * 100)}%`;
  const rows = [];
  if (s.critChance) rows.push(['CRÍTICO', `${pct(s.critChance)} · ${pct(s.critMul ?? 2)} de dano`]);
  if (s.extraShotChance) rows.push(['TECLADO EXTRA', `${pct(s.extraShotChance)} de chance`]);
  if (s.executeChance) rows.push(['ZERO-DAY', `${pct(s.executeChance)} de estourar tudo`]);
  if (s.bigPulseChance) rows.push(['ERUPÇÃO', `${pct(s.bigPulseChance)} · 200% do alcance`]);
  if (s.repeatChance) rows.push(['ONDA EXTRA', `${pct(s.repeatChance)} de chance`]);
  if (s.shatterChance) rows.push(['ESTILHAÇO', `${pct(s.shatterChance)} de chance`]);
  if (s.tripleChance) rows.push(['TIRO FORTE', `${pct(s.tripleChance)} · ${pct(s.tripleMul ?? 3)} de dano`]);
  if (s.rechargeChance) rows.push(['RECARGA', `${pct(s.rechargeChance)} instantânea`]);
  if (s.goldChance) rows.push(['BLOCO RARO', `${pct(s.goldChance)} · vale 500%`]);
  if (s.stickyChance) rows.push(['GRUDAR', `${pct(s.stickyChance)} de sair lento`]);
  if (s.swarmChance) rows.push(['COLMEIA', `${pct(s.swarmChance)} ao quebrar`]);
  if (s.stingChance) rows.push(['FERRÃO', `${pct(s.stingChance)} de -1 camada`]);
  if (s.burnMul > 1) rows.push(['FOGO', `+${pct(s.burnMul - 1)} de dano`]);
  if (s.burnExtra) rows.push(['FOGO DURA', `+${num(s.burnExtra)}s`]);
  if (s.sellRate) rows.push(['REVENDA', `${pct(s.sellRate)} do preço`]);
  if (s.knockChance) rows.push(['EMPURRÃO', `${pct(s.knockChance)} de chance`]);
  if (s.freezeChance) rows.push(['CONGELAR', `${pct(s.freezeChance)} por 1s`]);
  if (s.pierceChance) rows.push(['ATRAVESSAR', `${pct(s.pierceChance)} de +1 vírus`]);
  if (s.doubleChance) rows.push(['BITCOIN 200%', `${pct(s.doubleChance)} de chance`]);
  if (s.reviveChance) rows.push(['VOLTAR', `${pct(s.reviveChance)} com 50% da vida`]);
  return rows;
}
