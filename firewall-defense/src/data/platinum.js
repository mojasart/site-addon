// ─────────────────────────────────────────────────────────────
//  MODO PLATINA (libera com 3 estrelas no mapa)
//
//  As ondas vêm uma atrás da outra, sem esperar o mapa limpar: a próxima
//  começa assim que a anterior termina de entrar (+ WAVE_GAP). Depois de
//  PLAT_TIME segundos acabam as ondas e vem o chefão; derrotou, venceu.
//  Só PLAT_LIVES vida: qualquer vírus que chegar no servidor já é derrota.
//  Cada mapa tem um aliado bloqueado (sorteado pelo id do mapa, então é
//  sempre o mesmo naquele mapa).
// ─────────────────────────────────────────────────────────────
import { ROUNDS } from './rounds.js';
import { PLAT_TUNE } from './platinumTuning.js';

export const PLAT_TIME = 180; // segundos de ondas até o chefão
export const PLAT_LIVES = 1; // vidas no modo platina
export const WAVE_GAP = 2.5; // pausa entre uma onda terminar de entrar e a próxima
export const BOSS_HP = 0.6; // vida do chefão: BOSS_HP × √pressão do mapa × dificuldade da platina
const MAX_WAVES = 60; // mais do que cabe em 3 minutos

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

// As rodadas do mapa em sequência; se acabarem antes do tempo, repete as
// últimas 4 (as mais fortes)
export function platinumRounds(map) {
  const base = ROUNDS.slice(0, map.rounds);
  const tail = base.slice(-4);
  const out = [...base];
  while (out.length < MAX_WAVES) out.push(...tail);
  return out.slice(0, MAX_WAVES);
}

// O chefão cresce ao longo da season (e a vida acompanha a pressão do
// mapa, como sempre): mapas 1–5 o Locker, 6–10 o Ransomware, 11–15 o
// Ransomware com escolta de Lockers
export function platinumBoss(map) {
  if (map.number <= 5) return [{ type: 'locker', count: 1, gap: 0 }];
  if (map.number <= 10) return [{ type: 'ransomware', count: 1, gap: 0 }];
  return [{ type: 'ransomware', count: 1, gap: 0 }, { type: 'locker', count: 2, gap: 3, at: 2 }];
}
