// ─────────────────────────────────────────────────────────────
//  MODO PLATINA (libera com 3 estrelas no mapa)
//
//  As ondas vêm uma atrás da outra, sem esperar o mapa limpar: a próxima
//  começa quando a anterior termina de entrar e sobram no máximo
//  PLAT_GATE vírus vivos no mapa (+ WAVE_GAP). São
//  PLAT_WAVES ondas em todo mapa; depois da última vem o chefão; derrotou,
//  venceu. Partida longa de propósito (dá pra montar mais defesas e o
//  Minerador rende mais): depois das rodadas do mapa as ondas repetem as
//  últimas, cada vez mais cheias (RAMP).
//  Só PLAT_LIVES vida: qualquer vírus que chegar no servidor já é derrota.
//  Cada mapa tem um aliado bloqueado (sorteado pelo id do mapa, então é
//  sempre o mesmo naquele mapa).
// ─────────────────────────────────────────────────────────────
import { ROUNDS } from './rounds.js';
import { PLAT_TUNE } from './platinumTuning.js';

export const PLAT_WAVES = 50; // ondas até o chefão (em todo mapa)
export const PLAT_LIVES = 1; // vidas no modo platina
export const WAVE_GAP = 2.5; // pausa entre uma onda terminar de entrar e a próxima
export const PLAT_GATE = 5; // a próxima onda só vem com no máximo isso de vírus vivos no mapa
export const BOSS_HP = 3.6; // vida do chefão: BOSS_HP × √pressão do mapa × dificuldade da platina (6× a de antes)
const RAMP = 0.06; // cada onda repetida vem 6% mais cheia que a anterior
export const PLAT_WARMUP = 5; // as primeiras ondas sobem da força do modo normal até a da platina (RoundManager)
export const PLAT_REWARD = 1.5; // cada vírus estourado na platina dá 50% a mais de dinheiro

// Dificuldade da platina no mapa (data/platinumTuning.js, calibrada com os bots)
export function platinumScale(mapIndex) {
  return PLAT_TUNE[mapIndex] ?? 1;
}

// aliados que podem ser bloqueados (o Honeypot nunca)
const ALLIES = ['hacker', 'firewall', 'pinguim', 'scanner', 'minerador'];

export function blockedAlly(map) {
  let h = 7;
  for (const ch of map.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return ALLIES[h % ALLIES.length];
}

// As PLAT_WAVES ondas: as rodadas do mapa em sequência e depois as últimas
// 4 (as mais fortes) repetidas, cada repetida RAMP mais cheia que a anterior
// (a quantidade dos grupos; o chefão não). Com o Robô NMAP bloqueado não
// vem Spyware: só ele revela o Spyware, e com 1 vida seria derrota certa
export function platinumRounds(map) {
  const noSpy = blockedAlly(map) === 'scanner';
  const base = ROUNDS.slice(0, map.rounds).map((round) => (noSpy ? round.filter((g) => g.type !== 'spyware') : round));
  const tail = base.slice(-4);
  const out = [...base];
  for (let k = 1; out.length < PLAT_WAVES; k++) {
    const grow = 1 + RAMP * k;
    const round = tail[(k - 1) % tail.length];
    // mais cheia e mais apertada: a onda dura o mesmo tanto
    out.push(round.map((g) => (g.type === 'cicada' ? g : { ...g, count: g.count * grow, gap: g.gap / grow })));
  }
  return out.slice(0, PLAT_WAVES);
}

// O chefão cresce ao longo da season (e a vida acompanha a pressão do
// mapa, como sempre): mapas 1–5 o Locker, 6–10 o Ransomware, 11–15 o
// Ransomware com escolta de Lockers
export function platinumBoss(map) {
  if (map.number <= 5) return [{ type: 'locker', count: 1, gap: 0 }];
  if (map.number <= 10) return [{ type: 'ransomware', count: 1, gap: 0 }];
  return [{ type: 'ransomware', count: 1, gap: 0 }, { type: 'locker', count: 2, gap: 3, at: 2 }];
}
