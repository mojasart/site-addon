/* ════════════════════════════════════════════════════════════
 *  ANÚNCIOS COM RECOMPENSA (Google H5 Games Ads / Ad Placement API)
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
  window.adConfig?.({ preloadAdBreaks: 'on', sound: sound ? 'on' : 'off' });
}

// Mostra um anúncio com recompensa (o jogador já tocou em "assistir").
// done(result): 'viewed' (assistiu até o fim: ganha), 'dismissed' (fechou
// antes: não ganha) ou 'unavailable' (não teve anúncio)
export function showRewarded(name, { beforeAd, afterAd, done }) {
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
