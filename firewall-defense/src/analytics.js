import { ANALYTICS, versionName } from './config.js';

/* ════════════════════════════════════════════════════════════
 *  ANALYTICS (GameAnalytics: gameanalytics.com, grátis)
 *  Retenção (D1/D7/D30), funil das fases, onde o jogador desiste, anúncios
 *  vistos e de onde vem/pra onde vai o café. O SDK fica em
 *  vendor/gameanalytics (MIT) e só é carregado com as chaves em ANALYTICS
 *  (config.js): sem chave, ninguém baixa nada e nenhum evento sai daqui.
 *  No modo debug também não envia (o save de lá é de mentira).
 *  ?analytics na URL: mostra cada evento no console (com ou sem chave).
 *
 *  Eventos (o resto do jogo só chama as funções daqui):
 *    progressão → Start/Complete/Fail de cada partida: modo : fase
 *                 (normal:placa-mae-4, platinum:..., bounty:..., daily:...)
 *    design     → Tutorial:Step:NN, Tutorial:Done, Screen:<tela>,
 *                 Daily:Streak, Mission:Claim:<id>, Revive:Used,
 *                 Item:Use:<id>, Energy:Empty
 *    anúncio    → Show / RewardReceived / FailedShow por lugar (energia,
 *                 brinde_do_dia, dobrar_cafe, reviver)
 *    recurso    → café ganho (Source: Match, Mission, Ad, Purchase) e gasto
 *                 (Sink: DarkNet, Item)
 *    compra     → pacotes de café e VIP, em centavos de real (BRL)
 * ════════════════════════════════════════════════════════════ */

// Tipos de origem/destino do café (o GameAnalytics precisa da lista antes)
const ITEM_TYPES = ['Match', 'Mission', 'Ad', 'Purchase', 'DarkNet', 'Item'];

let GA = null; // GameAnalytics carregado
let E = null; // os enums (EGAProgressionStatus...)
let queue = []; // eventos antes de o SDK carregar
let log = false;
let off = true;

// Liga (main.js, uma vez). debug: modo debug do jogo (não envia)
export function initAnalytics({ debug = false, verbose = false } = {}) {
  log = verbose;
  off = debug || !ANALYTICS.gameKey || !ANALYTICS.secretKey;
  if (off) {
    queue = null;
    return;
  }
  import('../vendor/gameanalytics/GameAnalytics.esm.js')
    .then(({ gameanalytics }) => {
      const ga = gameanalytics.GameAnalytics;
      ga.setEnabledInfoLog(verbose);
      ga.configureBuild(versionName());
      ga.configureAvailableResourceCurrencies(['coffee']);
      ga.configureAvailableResourceItemTypes(ITEM_TYPES);
      ga.initialize(ANALYTICS.gameKey, ANALYTICS.secretKey);
      GA = ga;
      E = gameanalytics;
      for (const send of queue) send();
      queue = null;
    })
    .catch(() => {
      off = true; // sem internet na 1ª vez, bloqueador...: segue sem analytics
      queue = null;
    });
}

// Manda (ou guarda até o SDK carregar). desc: o que aparece no console com ?analytics
function emit(desc, send) {
  if (log) console.info('[analytics]', desc);
  if (off) return;
  if (GA) send();
  else queue?.push(send);
}

// Só letras, números, espaço e - _ . ( ) ! ? (regra do GameAnalytics), até 64
const part = (s) => String(s).replace(/[^A-Za-z0-9 \-_.()!?]/g, '_').slice(0, 64);

// ── Partidas ──
// status: 'start' | 'complete' | 'fail'; score: estrelas ou pontos
export function trackMatch(status, mode, mapId, score) {
  const p1 = part(mode);
  const p2 = part(mapId);
  emit(`progression ${status} ${p1}:${p2}${score != null ? ` (${score})` : ''}`, () => {
    const st = { start: E.EGAProgressionStatus.Start, complete: E.EGAProgressionStatus.Complete, fail: E.EGAProgressionStatus.Fail }[status];
    if (score != null) GA.addProgressionEvent(st, p1, p2, undefined, Math.round(score));
    else GA.addProgressionEvent(st, p1, p2);
  });
}

// ── Eventos soltos (id com até 5 partes separadas por ":") ──
export function trackDesign(id, value) {
  const eventId = String(id).split(':').map(part).join(':');
  emit(`design ${eventId}${value != null ? ` = ${value}` : ''}`, () => {
    if (value != null) GA.addDesignEvent(eventId, value);
    else GA.addDesignEvent(eventId);
  });
}

// ── Anúncios com recompensa ──
// action: 'show' | 'reward' | 'failed'; sdk: 'admob', 'h5' ou 'simulated'
export function trackAd(action, placement, sdk) {
  emit(`ad ${action} ${placement} (${sdk})`, () => {
    const act = { show: E.EGAAdAction.Show, reward: E.EGAAdAction.RewardReceived, failed: E.EGAAdAction.FailedShow }[action];
    if (action === 'failed') GA.addAdEventWithNoAdReason(act, E.EGAAdType.RewardedVideo, part(sdk), part(placement), E.EGAAdError.NoFill);
    else GA.addAdEvent(act, E.EGAAdType.RewardedVideo, part(sdk), part(placement));
  });
}

// ── Café: ganho (flow 'source') ou gasto ('sink') ──
export function trackCoffee(flow, amount, itemType, itemId) {
  const n = Math.round(amount * 100) / 100;
  if (!(n > 0)) return;
  emit(`coffee ${flow} ${n} ${itemType}:${itemId}`, () => {
    const f = flow === 'source' ? E.EGAResourceFlowType.Source : E.EGAResourceFlowType.Sink;
    GA.addResourceEvent(f, 'coffee', n, itemType, part(itemId));
  });
}

// ── Compra com dinheiro de verdade (preço em centavos) ──
export function trackPurchase(cents, itemType, itemId) {
  emit(`purchase ${itemType}:${itemId} BRL ${cents}`, () => GA.addBusinessEvent('BRL', cents, part(itemType), part(itemId), 'shop'));
}

// ── Erros (pra achar travamentos que só acontecem em alguns aparelhos) ──
// Cada mensagem vai 1 vez só por sessão, no máximo ERROR_MAX mensagens
const ERROR_MAX = 8;
const errorsSent = new Set();
export function trackError(message) {
  const msg = String(message).slice(0, 300);
  if (errorsSent.has(msg) || errorsSent.size >= ERROR_MAX) return;
  errorsSent.add(msg);
  emit(`error ${msg}`, () => GA.addErrorEvent(E.EGAErrorSeverity.Error, msg));
}

// Modo debug ligado no meio do jogo (toque no worm): para de mandar
export function stopAnalytics() {
  if (GA) GA.setEnabledEventSubmission(false);
  off = true;
  queue = null;
}

// App foi pro fundo / voltou: fecha e reabre a sessão
export function analyticsPause() {
  if (GA) GA.onStop();
}

export function analyticsResume() {
  if (GA) GA.onResume();
}

// "R$ 4,90" → 490
export const priceCents = (price) => Math.round(Number(String(price).replace(/[^\d,]/g, '').replace(',', '.')) * 100);
