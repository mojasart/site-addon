// ─────────────────────────────────────────────────────────────
//  IDIOMAS (pt-BR e inglês)
//
//  O jogo é escrito em português. Pra inglês:
//    t('texto em português')            → a tradução de i18n/en/*.js
//    t('Sem {item}! Compre na LOJA', { item })  → com valores no meio
//  Sem tradução, o texto fica em português (nada quebra).
//
//  Nomes e descrições dos dados (defesas, vírus, Dark Net, itens,
//  terrenos, mapas) não usam t(): o setLang troca os campos direto nos
//  objetos, pelo id (i18n/en/data.js), e volta o português se trocar de novo.
//  Plural: util.js plural(n, one, many) já segue a regra do idioma.
// ─────────────────────────────────────────────────────────────
import { lang, isEn, locale, setCurrentLang } from './lang.js';
import { UI, DATA } from './i18n/en/index.js';
import { TOWERS, TARGET_MODES } from './data/towers.js';
import { ENEMIES } from './data/enemies.js';
import { NODE } from './data/darknet.js';
import { ITEM } from './data/consumables.js';
import { TERRAINS } from './data/terrains.js';
import { SEASONS, MAPS, BOUNTY_MAPS } from './data/maps.js';

export { lang, isEn, locale };

export function t(pt, params) {
  let s = isEn() ? (UI[pt] ?? pt) : pt;
  if (params) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in params ? params[k] : m));
  return s;
}

// Idioma do aparelho na primeira vez (antes de o jogador escolher)
export function deviceLang() {
  const l = (navigator.languages?.[0] ?? navigator.language ?? 'pt').toLowerCase();
  return l.startsWith('pt') ? 'pt' : 'en';
}

export function setLang(l) {
  setCurrentLang(l);
  applyData();
  document.documentElement.lang = isEn() ? 'en' : 'pt-BR';
}

// ── Dados traduzidos pelo id ─────────────────────────────────
// Cada tabela: { item por id }. O DATA[nome] (i18n/en/data.js) traz, por id,
// os campos em inglês (texto, lista ou objeto aninhado: troca só o que
// vier) ou uma função (item, id) => campos, pra textos montados (mapas)
const TABLES = {
  towers: TOWERS,
  enemies: ENEMIES,
  darknet: NODE,
  consumables: ITEM,
  terrains: Object.fromEntries(TERRAINS.map((x) => [x.id, x])),
  seasons: Object.fromEntries(SEASONS.map((x) => [x.id, x])),
  maps: Object.fromEntries([...MAPS, ...BOUNTY_MAPS].map((x) => [x.id, x])),
  targetModes: Object.fromEntries(TARGET_MODES.map((x) => [x.id, x])), // botão ALVO (label)
};

const originals = []; // [objeto, campo, valor em português]

function patch(target, en) {
  for (const [k, v] of Object.entries(en)) {
    if (v && typeof v === 'object' && target[k] && typeof target[k] === 'object') patch(target[k], v);
    else {
      originals.push([target, k, target[k]]);
      target[k] = v;
    }
  }
}

function applyData() {
  // volta tudo pro português e, se for inglês, aplica de novo
  for (let i = originals.length - 1; i >= 0; i--) {
    const [obj, k, v] = originals[i];
    obj[k] = v;
  }
  originals.length = 0;
  if (!isEn()) return;
  for (const [name, table] of Object.entries(TABLES)) {
    const en = DATA[name];
    if (!en) continue;
    for (const [id, item] of Object.entries(table)) {
      const p = typeof en === 'function' ? en(item, id) : en[id];
      if (p) patch(item, typeof p === 'function' ? p(item, id) : p);
    }
  }
}
