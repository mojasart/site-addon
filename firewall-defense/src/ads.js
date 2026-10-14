import { ADMOB } from './config.js';
import { isNative, plugin } from './native.js';

/* ════════════════════════════════════════════════════════════
 *  ANÚNCIOS COM RECOMPENSA
 *  No navegador: Google H5 Games Ads (Ad Placement API), abaixo.
 *  No app Android: AdMob (plugin @capacitor-community/admob, ADMOB no
 *  config.js), mais embaixo. O resto do jogo só chama configAds e
 *  showRewarded, igual nos dois.
 *
 *  H5 Games Ads (Google H5 Games Ads / Ad Placement API)
 *  https://developers.google.com/ad-placement
 *
 *  O script do Google fica no index.html, em MODO DE TESTE
 *  (data-adbreak-test="on"): o Google mostra anúncios de mentira, sem pedir
 *  anúncio de verdade, e alterna de propósito entre "tem anúncio" e "não
 *  tem". Pra valer: trocar o ca-pub-123456789 pelo ID da conta do AdSense
 *  aprovada pra jogos H5 e tirar o data-adbreak-test.
 *
 *  Sem anúncio do Google (bloqueador, sem internet, nada carregado), quem
 *  chama mostra o anúncio simulado do jogo (render/energy.js).
 * ════════════════════════════════════════════════════════════ */

const WAIT = 6000; // ms esperando o Google responder antes de desistir

const api = () => (typeof window.adBreak === 'function' ? window.adBreak : null);

// Pré-carrega os anúncios e diz se o jogo tem som (chamar uma vez no começo)
export function configAds(sound = true) {
  if (isNative) return admobInit();
  window.adConfig?.({ preloadAdBreaks: 'on', sound: sound ? 'on' : 'off' });
}

// Mostra um anúncio com recompensa (o jogador já tocou em "assistir").
// done(result): 'viewed' (assistiu até o fim: ganha), 'dismissed' (fechou
// antes: não ganha) ou 'unavailable' (não teve anúncio)
export function showRewarded(name, { beforeAd, afterAd, done }) {
  if (isNative) return admobRewarded({ beforeAd, afterAd, done });
  const adBreak = api();
  if (!adBreak) return done('unavailable');
  let settled = false;
  let shown = false;
  const finish = (result) => {
    if (settled) return;
    settled = true;
    done(result);
  };
  // o script do Google pode nem ter carregado: aí ninguém chama de volta
  setTimeout(() => {
    if (!shown) finish('unavailable');
  }, WAIT);
  adBreak({
    type: 'reward',
    name,
    beforeAd: () => {
      shown = true;
      beforeAd?.();
    },
    afterAd: () => afterAd?.(),
    beforeReward: (showAdFn) => showAdFn(), // o "assistir" já foi o botão do jogo
    adDismissed: () => {},
    adViewed: () => {},
    // sempre chamado por último, com o motivo (viewed, dismissed, noAdPreloaded...)
    adBreakDone: (info) => {
      const s = info?.breakStatus;
      finish(s === 'viewed' ? 'viewed' : s === 'dismissed' ? 'dismissed' : 'unavailable');
    },
  });
}

// ── AdMob (app Android) ──────────────────────────────────────
// O anúncio é pré-carregado (prepare) e mostrado na hora (show). O show só
// responde quando o jogador ganha a recompensa; se ele fecha antes, só vem o
// evento Dismissed. Por isso: ganhou = o show respondeu; fechou = Dismissed.
// Antes de tudo, o formulário de consentimento do Google (UMP), que só
// aparece onde a lei pede (Europa, Reino Unido...)
const adUnit = () => (ADMOB.test || !ADMOB.rewarded ? ADMOB.testRewarded : ADMOB.rewarded);
let admob = null;
let ready = null; // promessa do anúncio carregado (ou null)

function admobInit() {
  if (admob) return;
  admob = plugin('AdMob');
  admob
    .initialize({ initializeForTesting: ADMOB.test })
    .then(() => admob.requestConsentInfo())
    .then((c) => (c?.status === 'REQUIRED' && c.isConsentFormAvailable ? admob.showConsentForm() : c))
    .catch(() => {})
    .then(preload);
}

function preload() {
  ready = admob.prepareRewardVideoAd({ adId: adUnit(), isTesting: ADMOB.test }).then(
    () => true,
    () => false,
  );
  return ready;
}

async function admobRewarded({ beforeAd, afterAd, done }) {
  if (!admob) admobInit();
  let loaded = await Promise.race([ready ?? preload(), new Promise((ok) => setTimeout(() => ok(false), WAIT))]);
  if (!loaded) loaded = await preload(); // o pré-carregado falhou (sem internet...): tenta de novo
  if (!loaded) return done('unavailable');
  let rewarded = false;
  let settled = false;
  const handles = [];
  const finish = (result) => {
    if (settled) return;
    settled = true;
    handles.forEach((h) => h.then((x) => x.remove()));
    afterAd?.();
    ready = null;
    preload(); // já deixa o próximo carregando
    done(result);
  };
  // fechou: espera um pouco, a recompensa às vezes chega logo depois
  handles.push(admob.addListener('onRewardedVideoAdDismissed', () => setTimeout(() => finish(rewarded ? 'viewed' : 'dismissed'), 400)));
  handles.push(admob.addListener('onRewardedVideoAdFailedToShow', () => finish('unavailable')));
  beforeAd?.();
  admob.showRewardVideoAd().then(
    () => (rewarded = true),
    () => finish('unavailable'),
  );
}
