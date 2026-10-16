// ─────────────────────────────────────────────────────────────
//  Números de cada defesa pra mostrar ao jogador (catálogo e a aba de
//  informações do jogo): os status com os upgrades até o nível aplicados,
//  do mesmo jeito que o jogo aplica.
// ─────────────────────────────────────────────────────────────
import { TOWERS, BURNOUT, COMMANDER_MAX } from './towers.js';
import { fmt, plural } from '../util.js';
import { t } from '../i18n.js';
import { isEn } from '../lang.js';
import { VAULT } from './darknet.js';

// Idade de cada nível (os personagens crescem a cada upgrade).
// AGES[i] já sai no idioma do jogo (getter com t(): o idioma é escolhido
// depois do carregamento do módulo)
export const AGES = [];
['CRIANÇA', 'ADOLESCENTE', 'ADULTO'].forEach((pt, i) => Object.defineProperty(AGES, i, { get: () => t(pt), enumerable: true }));

// Status da defesa com os upgrades até esse nível aplicados (como no jogo)
export function statsAt(type, level) {
  const def = TOWERS[type];
  const s = { ...def };
  for (let i = 0; i < level && i < def.upgrades.length; i++) def.upgrades[i].apply(s);
  return s;
}

// Número com vírgula (ponto em inglês) e no máximo 2 casas (0,95 / 1,44)
export const num = (v) => {
  const s = String(Math.round(v * 100) / 100);
  return isEn() ? s : s.replace('.', ',');
};

// Linhas [rótulo, valor] do que a defesa faz com esses status.
// armor: inclui a linha de blindagem (o catálogo mostra isso numa etiqueta)
export function statRows(s, { armor = false } = {}) {
  const rows = [];
  if (s.attack === 'farm') {
    rows.push([t('RENDA'), t('{n} {coins} de ${v} por rodada', { n: s.packetsPerRound, coins: plural(s.packetsPerRound, 'bitcoin', 'bitcoins'), v: s.packetValue })]);
    if (s.goldenChance) rows.push([t('DOURADOS'), t('{p}% · ${v} cada', { p: Math.round(s.goldenChance * 100), v: s.goldenValue })]);
    if (s.sponsor) rows.push([t('PATROCÍNIO'), t('+${v} por vírus de 1 defesa', { v: s.sponsor })]);
    return [...rows, ...luckRows(s)];
  }
  if (s.attack === 'aura') {
    const pct = (p) => `${Math.round(p * 100)}%`;
    rows.push(
      [t('ACELERA'), t('+{p} nas defesas em volta', { p: pct(s.haste) })],
      [t('ALCANCE'), `${Math.round(s.range)}`],
      ['BURNOUT', t('+{p} no raio por {s}s', { p: pct(BURNOUT.haste), s: BURNOUT.time + (s.burnoutExtra ?? 0) })],
      [t('RECARGA'), `${BURNOUT.cooldown - (s.burnoutFaster ?? 0)}s`],
      [t('LIMITE'), t('{n} comandantes por fase', { n: COMMANDER_MAX })],
    );
    return rows;
  }
  if (s.attack === 'decoy') {
    rows.push([t('VIDA'), `${s.hp}`], [t('DURAÇÃO'), t('{s}s sozinha', { s: s.duration })], [t('DANO'), t('0 (só distrai)')]);
    return [...rows, ...luckRows(s)];
  }
  if (s.effect === 'frost') {
    rows.push([t('LENTIDÃO'), t('-{p}% por {s}s', { p: Math.round((1 - s.slow) * 100), s: num(s.slowTime) })]);
    if (s.vulnerable) rows.push([t('CONGELADOS'), t('levam +{p}% de dano', { p: Math.round(((s.vulnMul ?? 2) - 1) * 100) })]);
  } else {
    rows.push([t('DANO'), s.multishot > 1 ? t('{n} teclados de {d}', { n: s.multishot, d: fmt(s.damage) }) : fmt(s.damage)]);
    if (s.pierce > 1) rows.push([t('ATRAVESSA'), t('até {n} vírus', { n: s.pierce })]);
    if (s.markTime) rows.push([t('MARCA'), t('+{p}% de dano por {s}s', { p: Math.round((s.markMul - 1) * 100), s: num(s.markTime) })]);
    if (s.burn) rows.push([t('QUEIMA'), t('{d}/s por {s}s', { d: fmt(s.burn * (s.burnMul ?? 1)), s: num(s.burnTime + (s.burnExtra ?? 0)) })]);
  }
  rows.push([t('ALCANCE'), `${Math.round(s.range)}`], [t('RECARGA'), `${num(s.fireRate)}s`]);
  if (s.attack === 'pulse') rows.push([t('VOADORES'), t('não pega')]); // a onda corre pelo chão (Bug)
  if (armor) rows.push([t('BLINDADOS'), s.canHitArmored ? t('fura') : t('não fura')]);
  return [...rows, ...luckRows(s)];
}

// Bônus de sorte da Dark Net (data/darknet.js)
function luckRows(s) {
  const pct = (p) => `${Math.round(p * 100)}%`;
  const chance = (p) => t('{p} de chance', { p: pct(p) });
  const rows = [];
  if (s.critChance) rows.push([t('CRÍTICO'), t('{p} · {m} de dano', { p: pct(s.critChance), m: pct(s.critMul ?? 2) })]);
  if (s.extraShotChance) rows.push([t('TECLADO EXTRA'), chance(s.extraShotChance)]);
  if (s.executeChance) rows.push(['ZERO-DAY', t('{p} de estourar tudo', { p: pct(s.executeChance) })]);
  if (s.bigPulseChance) rows.push([t('ERUPÇÃO'), t('{p} · 200% do alcance', { p: pct(s.bigPulseChance) })]);
  if (s.repeatChance) rows.push([t('ONDA EXTRA'), chance(s.repeatChance)]);
  if (s.shatterChance) rows.push([t('ESTILHAÇO'), chance(s.shatterChance)]);
  if (s.tripleChance) rows.push([t('TIRO FORTE'), t('{p} · {m} de dano', { p: pct(s.tripleChance), m: pct(s.tripleMul ?? 3) })]);
  if (s.rechargeChance) rows.push([t('RECARGA'), t('{p} instantânea', { p: pct(s.rechargeChance) })]);
  if (s.vault) rows.push([t('CARTEIRA'), t('+{p} por rodada · vende {v}', { p: pct(VAULT.rate), v: pct(VAULT.sell) })]);
  if (s.gamble) rows.push([t('APOSTA'), t('{p} · vale {m}', { p: pct(1 - s.gamble.lose), m: pct(s.gamble.win) })]);
  if (s.stickyChance) rows.push([t('GRUDAR'), t('{p} de sair lento', { p: pct(s.stickyChance) })]);
  if (s.swarmChance) rows.push([t('COLMEIA'), t('{p} ao quebrar', { p: pct(s.swarmChance) })]);
  if (s.stingChance) rows.push([t('FERRÃO'), t('{p} de -1 camada', { p: pct(s.stingChance) })]);
  if (s.burnMul > 1) rows.push([t('FOGO'), t('+{p} de dano', { p: pct(s.burnMul - 1) })]);
  if (s.burnExtra) rows.push([t('FOGO DURA'), `+${num(s.burnExtra)}s`]);
  if (s.sellRate) rows.push([t('REVENDA'), t('{p} do preço', { p: pct(s.sellRate) })]);
  if (s.knockChance) rows.push([t('EMPURRÃO'), chance(s.knockChance)]);
  if (s.freezeChance) rows.push([t('CONGELAR'), t('{p} por 1s', { p: pct(s.freezeChance) })]);
  if (s.pierceChance) rows.push([t('ATRAVESSAR'), t('{p} de +1 vírus', { p: pct(s.pierceChance) })]);
  if (s.doubleChance) rows.push(['BITCOIN 200%', chance(s.doubleChance)]);
  if (s.reviveChance) rows.push([t('VOLTAR'), t('{p} com 50% da vida', { p: pct(s.reviveChance) })]);
  return rows;
}
