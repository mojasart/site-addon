/* ════════════════════════════════════════════════════════════
 *  PREVIEW EM VÍDEO (catálogo)
 *  O vídeo de assets/previews/<id>.mp4: o jogo de verdade gravado no mapa
 *  de testes (roteiros em data/previews.js, gravados por
 *  tools/previews/record.js), em loop e sem som, desenhado no canvas.
 *  new VideoPreview(id) → ready → draw(ctx, box) → stop()
 *  Alguns celulares só deixam o vídeo tocar depois de um toque: play() de
 *  novo no próximo toque (CatalogScene.pointerDown) resolve.
 * ════════════════════════════════════════════════════════════ */

export class VideoPreview {
  constructor(id) {
    const v = document.createElement('video');
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.setAttribute('playsinline', '');
    v.preload = 'auto';
    v.src = `assets/previews/${id}.mp4`;
    this.video = v;
    this.play();
  }

  // Tem quadro pra mostrar?
  get ready() {
    return this.video.readyState >= 2 && !this.video.error;
  }

  play() {
    this.video.play()?.catch?.(() => {});
  }

  // Volta pro começo (o vídeo já vinha tocando escondido)
  restart() {
    this.video.currentTime = 0;
    this.play();
  }

  stop() {
    this.video.pause();
    this.video.removeAttribute('src');
    this.video.load(); // solta o arquivo da memória
  }

  // Desenha cobrindo a caixa (corta o que sobra em cima e embaixo, ou dos lados)
  draw(ctx, box) {
    const v = this.video;
    if (!this.ready || !v.videoWidth) return;
    const k = Math.max(box.w / v.videoWidth, box.h / v.videoHeight);
    const sw = box.w / k;
    const sh = box.h / k;
    ctx.drawImage(v, (v.videoWidth - sw) / 2, (v.videoHeight - sh) / 2, sw, sh, box.x, box.y, box.w, box.h);
  }
}
