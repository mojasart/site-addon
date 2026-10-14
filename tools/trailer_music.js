// ─────────────────────────────────────────────────────────────
//  Música original do trailer: "Firewall Overload"
//  Drum & bass / hardcore eletrônico a 174 BPM, ~30 s, em mi menor.
//  Tudo sintetizado (Web Audio, OfflineAudioContext): nenhuma amostra de
//  terceiros, então não tem direito autoral de ninguém além do jogo.
//
//  Estrutura (compassos de 4 tempos):
//    0-3   intro: arpejo filtrado abrindo + sirene + virada de caixa
//    4-11  DROP 1: batida quebrada (two-step), baixo "reese", acordes
//    12-13 respiro: meio-tempo, subida de ruído
//    14-21 DROP 2: bumbo hardcore distorcido em todo tempo + tudo junto
//    22    final: impacto e cauda
//
//  Uso (no navegador, com o jogo aberto ou qualquer página):
//    const { renderTrailerMusic } = await import('/tools/trailer_music.js')
//    const buffer = await renderTrailerMusic()
// ─────────────────────────────────────────────────────────────
export const BPM = 174;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;
const S16 = BEAT / 4;
const BARS = 23;

const midi = (m) => 440 * 2 ** ((m - 69) / 12);
// progressão: Em - C - D - Bm (um acorde por compasso)
const ROOTS = [40, 36, 38, 35]; // E2 C2 D2 B1
const CHORDS = [[64, 67, 71], [60, 64, 67], [62, 66, 69], [59, 62, 66]];
const ARP = [0, 1, 2, 1, 2, 0, 2, 1, 0, 1, 2, 1, 2, 0, 2, 3]; // 3 = oitava

export async function renderTrailerMusic({ sampleRate = 48000 } = {}) {
  const dur = BARS * BAR + 2.5;
  const ctx = new OfflineAudioContext(2, Math.ceil(dur * sampleRate), sampleRate);

  // ── mixagem: compressor de "cola" + limitador no master ──
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -2;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.001;
  limiter.release.value = 0.08;
  limiter.connect(ctx.destination);
  const glue = ctx.createDynamicsCompressor();
  glue.threshold.value = -14;
  glue.ratio.value = 4;
  glue.attack.value = 0.005;
  glue.release.value = 0.12;
  const master = ctx.createGain();
  master.gain.value = 0.9;
  glue.connect(master).connect(limiter);

  // reverb curto (resposta ao impulso feita de ruído que decai)
  const rev = ctx.createConvolver();
  const irLen = Math.floor(sampleRate * 1.6);
  const ir = ctx.createBuffer(2, irLen, sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    for (let i = 0; i < irLen; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / irLen) ** 3;
  }
  rev.buffer = ir;
  const revGain = ctx.createGain();
  revGain.gain.value = 0.22;
  rev.connect(revGain).connect(glue);

  const noiseBuf = ctx.createBuffer(1, sampleRate * 2, sampleRate);
  {
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const dist = (amount) => {
    const ws = ctx.createWaveShaper();
    const n = 1024;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      curve[i] = Math.tanh(x * amount) / Math.tanh(amount);
    }
    ws.curve = curve;
    ws.oversample = '2x';
    return ws;
  };
  const bus = (vol, { reverb = 0, pan = 0 } = {}) => {
    const g = ctx.createGain();
    g.gain.value = vol;
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    g.connect(p).connect(glue);
    if (reverb) {
      const s = ctx.createGain();
      s.gain.value = reverb;
      p.connect(s).connect(rev);
    }
    return g;
  };

  const drums = bus(0.9);
  const kickBus = ctx.createGain();
  kickBus.gain.value = 1;
  const kickDist = dist(3.5);
  kickBus.connect(kickDist).connect(drums);
  const bassBus = bus(0.3);
  const stabBus = bus(0.26, { reverb: 0.5 });
  const padBus = bus(0.12, { reverb: 0.8 });
  const arpBus = bus(0.2, { reverb: 0.35, pan: 0.15 });
  const fxBus = bus(0.45, { reverb: 0.4 });

  // ── instrumentos ──
  function kick(t, hard = false) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(hard ? 210 : 160, t);
    o.frequency.exponentialRampToValueAtTime(hard ? 42 : 48, t + (hard ? 0.18 : 0.12));
    g.gain.setValueAtTime(hard ? 1.3 : 1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + (hard ? 0.38 : 0.28));
    o.connect(g).connect(hard ? kickBus : drums);
    o.start(t);
    o.stop(t + 0.45);
    click(t, 0.25, 4000);
  }
  function click(t, vol, freq) {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.012);
    s.connect(f).connect(g).connect(drums);
    s.start(t, Math.random());
    s.stop(t + 0.02);
  }
  function snare(t, vol = 0.7) {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 2200;
    f.Q.value = 0.7;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    s.connect(f).connect(g).connect(drums);
    s.start(t, Math.random());
    s.stop(t + 0.2);
    const o = ctx.createOscillator();
    const og = ctx.createGain();
    o.frequency.setValueAtTime(240, t);
    o.frequency.exponentialRampToValueAtTime(160, t + 0.08);
    og.gain.setValueAtTime(vol * 0.6, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    o.connect(og).connect(drums);
    o.start(t);
    o.stop(t + 0.12);
  }
  function hat(t, vol = 0.12, open = false) {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 8000;
    const g = ctx.createGain();
    const d = open ? 0.12 : 0.03;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + d);
    s.connect(f).connect(g).connect(drums);
    s.start(t, Math.random());
    s.stop(t + d + 0.01);
  }
  function crash(t, vol = 0.35) {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 4500;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.6);
    s.connect(f).connect(g).connect(fxBus);
    s.start(t);
    s.stop(t + 1.7);
  }
  // baixo "reese": duas serras desafinadas num passa-baixa que respira
  function reese(t, dur, note, open = 600, wob = 0) {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.Q.value = 6;
    if (wob) {
      // wobble: o filtro abre e fecha no ritmo (wob = vezes por tempo)
      f.frequency.value = open * 1.3;
      const lfo = ctx.createOscillator();
      const lg = ctx.createGain();
      lfo.type = 'sine';
      lfo.frequency.value = wob / BEAT;
      lg.gain.value = open * 1.1;
      lfo.connect(lg).connect(f.frequency);
      lfo.start(t);
      lfo.stop(t + dur);
    } else {
      f.frequency.setValueAtTime(open * 0.5, t);
      f.frequency.linearRampToValueAtTime(open * 2.2, t + dur * 0.5);
      f.frequency.linearRampToValueAtTime(open * 0.6, t + dur);
    }
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.001, t);
    g.gain.exponentialRampToValueAtTime(0.9, t + 0.01);
    g.gain.setValueAtTime(0.9, t + dur - 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    const d = dist(2.2);
    f.connect(d).connect(g).connect(bassBus);
    for (const det of [-14, 14]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = midi(note);
      o.detune.value = det;
      o.connect(f);
      o.start(t);
      o.stop(t + dur + 0.02);
    }
    const sub = ctx.createOscillator();
    const sg = ctx.createGain();
    sub.frequency.value = midi(note - 12);
    sg.gain.setValueAtTime(0.7, t);
    sg.gain.setValueAtTime(0.7, t + dur - 0.03);
    sg.gain.exponentialRampToValueAtTime(0.001, t + dur);
    sub.connect(sg).connect(bassBus);
    sub.start(t);
    sub.stop(t + dur + 0.02);
  }
  // acorde "supersaw" curto (stab)
  function stab(t, notes, dur = 0.16) {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(5000, t);
    f.frequency.exponentialRampToValueAtTime(900, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    f.connect(g).connect(stabBus);
    for (const n of notes)
      for (const det of [-18, -6, 6, 18]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = midi(n);
        o.detune.value = det;
        o.connect(f);
        o.start(t);
        o.stop(t + dur + 0.02);
      }
  }
  // pad: acorde sustentado que vai abrindo (respiro)
  function pad(t, notes, dur) {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(400, t);
    f.frequency.exponentialRampToValueAtTime(6000, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(0.9, t + 0.3);
    g.gain.setValueAtTime(0.9, t + dur - 0.1);
    g.gain.linearRampToValueAtTime(0.001, t + dur);
    f.connect(g).connect(padBus);
    for (const n of notes)
      for (const det of [-20, -7, 7, 20]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = midi(n);
        o.detune.value = det;
        o.connect(f);
        o.start(t);
        o.stop(t + dur + 0.02);
      }
  }

  // arpejo de chip (onda quadrada)
  function blip(t, note, vol = 1, cutoff = 6000) {
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = midi(note);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = cutoff;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + S16 * 0.9);
    o.connect(f).connect(g).connect(arpBus);
    o.start(t);
    o.stop(t + S16);
  }
  function siren(t, dur) {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    const lfo = ctx.createOscillator();
    const lg = ctx.createGain();
    lfo.frequency.value = 3;
    lg.gain.value = 260;
    lfo.connect(lg).connect(o.frequency);
    o.frequency.value = 880;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(0.4, t + 0.2);
    g.gain.linearRampToValueAtTime(0.001, t + dur);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1200;
    o.connect(f).connect(g).connect(fxBus);
    o.start(t);
    lfo.start(t);
    o.stop(t + dur);
    lfo.stop(t + dur);
  }
  function riser(t, dur, vol = 0.5) {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    s.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 2;
    f.frequency.setValueAtTime(300, t);
    f.frequency.exponentialRampToValueAtTime(9000, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + dur);
    s.connect(f).connect(g).connect(fxBus);
    s.start(t);
    s.stop(t + dur);
  }
  function impact(t) {
    kick(t, true);
    crash(t, 0.5);
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(90, t);
    o.frequency.exponentialRampToValueAtTime(30, t + 1.2);
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
    o.connect(g).connect(fxBus);
    o.start(t);
    o.stop(t + 1.6);
  }

  // ── arranjo ──
  for (let bar = 0; bar < BARS; bar++) {
    const t0 = bar * BAR;
    const ch = bar % 4;
    const root = ROOTS[ch];
    const chord = CHORDS[ch];
    const intro = bar < 4;
    const drop1 = bar >= 4 && bar < 12;
    const brk = bar >= 12 && bar < 14;
    const drop2 = bar >= 14 && bar < 22;
    const end = bar === 22;

    if (end) {
      impact(t0);
      stab(t0, CHORDS[0].map((n) => n - 12), 0.8);
      reese(t0, BAR * 0.9, ROOTS[0], 400);
      break;
    }

    // arpejo: na intro o filtro vai abrindo; nos drops fica cheio
    for (let s = 0; s < 16; s++) {
      const k = ARP[s];
      const note = k === 3 ? chord[0] + 12 : chord[k];
      const t = t0 + s * S16;
      if (intro) blip(t, note + 12, 0.9, 500 + (bar * 16 + s) * 55);
      else if (brk) blip(t, note + 12, 0.8, 2500 + s * 200);
      else blip(t, note + 12, drop2 ? 0.9 : 0.7, drop2 ? 7000 : 4500);
    }

    if (intro) {
      if (bar === 0) siren(t0, BAR * 2);
      if (bar >= 2) for (let b = 0; b < 4; b++) kick(t0 + b * BEAT);
      if (bar === 3) {
        // virada de caixa acelerando + subida de ruído
        for (let s = 0; s < 16; s++) snare(t0 + s * S16, 0.2 + s * 0.035);
        riser(t0, BAR, 0.6);
      }
      continue;
    }

    if (bar === 4 || bar === 14 || bar === 18 || bar === 8) crash(t0);

    if (drop1) {
      // two-step: bumbo no 1 e no "e" do 2; caixa no 2 e no 4
      kick(t0);
      kick(t0 + BEAT * 2.5);
      snare(t0 + BEAT);
      snare(t0 + BEAT * 3);
      if (bar % 2 === 1) snare(t0 + BEAT * 3.75, 0.35); // ghost
      for (let s = 0; s < 16; s++) hat(t0 + s * S16, s % 2 ? 0.1 : 0.18, s === 14);
      // baixo contínuo com wobble em colcheias (o último compasso de cada 4 em semicolcheias)
      reese(t0, BAR, root, 700, ch === 3 ? 4 : 2);
      stab(t0 + BEAT * 1.5, chord);
      stab(t0 + BEAT * 3.5, chord);
    }

    if (brk) {
      // meio-tempo: respira antes do drop 2
      kick(t0);
      snare(t0 + BEAT * 2, 0.5);
      pad(t0, chord, BAR);
      reese(t0, BAR, root, 300);
      if (bar === 13) {
        riser(t0, BAR, 0.8);
        for (let s = 8; s < 16; s++) snare(t0 + s * S16, 0.25 + (s - 8) * 0.06);
      }
    }

    if (drop2) {
      // hardcore: bumbo distorcido em todo tempo + caixa no 2 e 4 + chimbal aberto no contratempo
      for (let b = 0; b < 4; b++) {
        kick(t0 + b * BEAT, true);
        hat(t0 + b * BEAT + BEAT / 2, 0.16, true);
      }
      snare(t0 + BEAT, 0.8);
      snare(t0 + BEAT * 3, 0.8);
      for (let s = 0; s < 16; s++) if (s % 4) hat(t0 + s * S16, 0.06);
      for (let b = 0; b < 4; b++) reese(t0 + b * BEAT + BEAT * 0.5, BEAT * 0.45, root + (b === 3 ? 12 : 0), 900);
      for (let b = 0; b < 4; b++) stab(t0 + b * BEAT + BEAT * 0.5, chord, 0.12);
      if (bar === 21) riser(t0, BAR, 0.5);
    }
  }

  return ctx.startRendering();
}
