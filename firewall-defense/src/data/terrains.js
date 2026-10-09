// ─────────────────────────────────────────────────────────────
//  TERRENOS (aba TERRENOS do catálogo: scenes/CatalogScene.js)
//  O que cada tipo de chão do mapa faz. Cada um:
//    id    → chave (o desenho fica em render/terrains.js)
//    name  → nome na lista
//    where → em que seasons aparece
//    rows  → status curtos ([rótulo, valor])
//    desc  → como funciona (digitado aos poucos na ficha)
// ─────────────────────────────────────────────────────────────
import { STUN_TIME, WARN_TIME } from '../systems/Hazards.js';

export const HAZARD_PERIOD = 8; // segundos entre descargas (data/maps.js)
const sec = (n) => `${String(n).replace('.', ',')}s`;

export const TERRAINS = [
  {
    id: 'road',
    name: 'Estrada',
    where: 'TODAS AS SEASONS',
    rows: [
      ['QUEM PASSA', 'os vírus'],
      ['DEFESAS', 'só o Honeypot'],
    ],
    desc: 'O caminho que os vírus seguem do portal até o servidor. As defesas ficam na beira dele; em cima, só o Honeypot, que serve de isca.',
  },
  {
    id: 'coins',
    name: 'Pilha de Bitcoin',
    where: 'PLACA-MÃE · DATA CENTER',
    rows: [
      ['QUEM USA', 'Minerador'],
      ['POR PILHA', '1 defesa'],
    ],
    desc: 'O Minerador só minera em cima de uma pilha; fora dela ele fica parado. Qualquer defesa pode ocupar o quadrado, mas aí a pilha fica sem minerador. No Cabo Submarino não tem pilha: o Minerador minera em qualquer lugar.',
  },
  {
    id: 'hazard',
    name: 'Zona Eletrificada',
    where: 'DATA CENTER',
    rows: [
      ['DESCARGA', `a cada ${sec(HAZARD_PERIOD)}`],
      ['AVISO', `pisca ${sec(WARN_TIME)} antes`],
      ['ATORDOA', sec(STUN_TIME)],
    ],
    desc: 'Um tapete elétrico no chão. Na descarga, toda defesa em cima dele fica atordoada: não ataca nem minera até passar. Dá pra usar o quadrado, mas é melhor sair dali.',
  },
  {
    id: 'water',
    name: 'Água',
    where: 'CABO SUBMARINO',
    rows: [
      ['DEFESAS', 'não ficam'],
      ['ONDE PÔR', 'nas ilhas'],
    ],
    desc: 'O mar entre as ilhas. Nenhuma defesa fica na água: procure as ilhas perto do caminho. O Honeypot continua indo em cima da estrada.',
  },
];
