// ─────────────────────────────────────────────────────────────
//  NOTIFICAÇÕES (só no app Android: @capacitor/local-notifications)
//
//  Tudo agendado no próprio celular, sem servidor. Quando o app vai pro
//  fundo, agenda os avisos a partir do estado do save; quando volta, cancela
//  os que ainda não saíram (ninguém recebe aviso com o jogo aberto):
//    - energia de volta: estava sem energia e voltou a 1ª
//    - energia cheia
//    - brinde grátis do dia liberado na LOJA (meia-noite); com o desafio do
//      dia já vencido, o aviso é do desafio novo (os dois viram juntos)
//    - sequência do desafio do dia em risco: às 19h, se tem sequência e o
//      desafio de hoje ainda não foi vencido
//    - sumiu: 1, 3, 7 e 14 dias sem abrir o jogo
//  Nada sai de madrugada: o que cairia entre 22h e 9h passa pras 9h.
//  O pedido de permissão (Android 13+) é askNotifications(), na 1ª vez nos mapas.
// ─────────────────────────────────────────────────────────────
import { isNative, plugin } from './native.js';
import { ENERGY } from './config.js';
import { t } from './i18n.js';
import { writeSave } from './save.js';

const ID = { energy: 1, full: 2, gift: 3, streak: 4, away: [11, 12, 13, 14] };
const STREAK_HOUR = 19; // aviso da sequência em risco
const DAY = 86400000;
const QUIET = { from: 22, to: 9 }; // sem aviso das 22h às 9h

// Avisos de quem sumiu: [dias, título, texto]
const AWAY = [
  [1, '🦠 Os vírus estão voltando...', 'O servidor sentiu sua falta. Volte pra defender a rede!'],
  [3, '🔥 O Golem Firewall está sozinho', 'Faz 3 dias que ninguém aparece. Os vírus já estão rondando o servidor.'],
  [7, '🐧 Até o Pinguim está preocupado', 'Uma semana sem defesa! Volte e mostre quem manda na rede.'],
  [14, '💀 ALERTA: rede desprotegida', 'Faz tempo que você não aparece. Seus defensores ainda esperam por você.'],
];

let LN = null;

// Liga os avisos (main.js, uma vez): agenda ao sair, cancela ao voltar
export function initNotifications(app) {
  if (!isNative) return;
  LN = plugin('LocalNotifications');
  const App = plugin('App');
  App.addListener('pause', () => schedule(app));
  App.addListener('resume', cancelAll);
  cancelAll();
}

// Pede a permissão de notificar (uma vez só; o Android lembra a resposta)
export async function askNotifications(app) {
  if (!LN || app.save.notifAsked) return;
  app.save.notifAsked = true;
  writeSave(app.save);
  try {
    const p = await LN.checkPermissions();
    if (p.display === 'prompt' || p.display === 'prompt-with-rationale') await LN.requestPermissions();
  } catch {
    // sem permissão: o jogo segue normal, só não avisa
  }
}

function cancelAll() {
  const ids = [ID.energy, ID.full, ID.gift, ID.streak, ...ID.away].map((id) => ({ id }));
  LN?.cancel({ notifications: ids }).catch(() => {});
}

// Hora "de dia" pro aviso: de madrugada passa pras 9h
function daytime(ms) {
  const d = new Date(ms);
  if (d.getHours() >= QUIET.from) d.setDate(d.getDate() + 1);
  if (d.getHours() >= QUIET.from || d.getHours() < QUIET.to) d.setHours(QUIET.to, 0, 0, 0);
  return d;
}

function note(id, at, title, body) {
  return {
    id,
    title,
    body,
    schedule: { at: daytime(at), allowWhileIdle: true },
    isExactNotification: false, // sem alarme exato (nem pede a permissão dele)
    smallIcon: 'ic_stat_firewall',
    iconColor: '#3fd16b',
  };
}

async function schedule(app) {
  if (!LN) return;
  try {
    if ((await LN.checkPermissions()).display !== 'granted') return;
  } catch {
    return;
  }
  const now = Date.now();
  const list = [];
  // energia (VIP e debug têm energia infinita)
  if (!app.vip && !app.debug && app.energy < ENERGY.max) {
    const next = now + app.energyNextMs();
    if (app.energy === 0) list.push(note(ID.energy, next, t('⚡ Energia de volta!'), t('Seus defensores estão prontos. Bora segurar os vírus?')));
    const full = next + (ENERGY.max - app.energy - 1) * app.energyRegenMs;
    list.push(note(ID.full, full, t('⚡ Energia cheia!'), t('{max} de {max}. Não deixa ela parada: os vírus não descansam.', { max: ENERGY.max })));
  }
  // brinde grátis do dia (se o de hoje já foi pego, avisa o de amanhã) e o
  // desafio do dia novo (se o de hoje já foi vencido)
  const daily = app.dailyOpen() ? app.challenge : null;
  const midnight = now + app.freeOfferNextMs() + 60000;
  if (daily?.won) list.push(note(ID.gift, midnight, t('🗓️ Desafio do dia novo!'), t('Desafio novo e missões novas no DIÁRIO. Bora manter a sequência?')));
  else if (app.freeOffer.claimed) list.push(note(ID.gift, midnight, t('🎁 Brinde grátis liberado!'), t('Seu brinde do dia já está na LOJA. Passa lá pra pegar.')));
  // sequência em risco: tem sequência (venceu ontem) e ainda não venceu hoje
  const streak = app.dailyStreak;
  const evening = new Date();
  evening.setHours(STREAK_HOUR, 0, 0, 0);
  if (daily && !daily.won && streak > 0 && evening.getTime() > now) {
    list.push(note(ID.streak, evening.getTime(), t('🔥 Sua sequência acaba hoje!'), t(streak === 1 ? '{n} dia vencendo o desafio. Vence o de hoje pra não quebrar!' : '{n} dias seguidos vencendo o desafio. Vence o de hoje pra não quebrar!', { n: streak })));
  }
  // sumiu
  AWAY.forEach(([days, title, body], i) => list.push(note(ID.away[i], now + days * DAY, t(title), t(body))));
  LN.schedule({ notifications: list }).catch(() => {});
}
