// ─────────────────────────────────────────────────────────────
//  SOM: tudo sintetizado com Web Audio (nenhum arquivo de áudio).
//  O navegador só deixa tocar som depois do primeiro toque, por isso
//  o main.js chama unlock() no primeiro pointerdown.
// ─────────────────────────────────────────────────────────────

const midi = (m) => 440 * 2 ** ((m - 69) / 12);

// Intervalo mínimo entre repetições do mesmo som (evita barulheira em massa)
const MIN_GAP = { pop: 0.035, throw: 0.06, fire: 0.12, frost: 0.18, coin: 0.05, block: 0.12, zap: 0.3 };

const SFX = {
  pop(s) {
    const f = 520 + Math.random() * 380;
    s.tone({ type: 'sine', freq: f * 1.9, to: f * 0.55, dur: 0.07, vol: 0.22 });
    s.noise({ dur: 0.045, vol: 0.14, filter: 'bandpass', freq: 2600, q: 1.4 });
  },
  bigpop(s) {
    s.noise({ dur: 0.6, vol: 0.5, filter: 'lowpass', freq: 1800, to: 90 });
    s.tone({ type: 'sine', freq: 260, to: 50, dur: 0.5, vol: 0.45 });
  },
  throw(s) {
    s.tone({ type: 'triangle', freq: 650, to: 1150, dur: 0.06, vol: 0.07 });
    s.noise({ dur: 0.05, vol: 0.05, filter: 'highpass', freq: 3500 });
  },
  fire(s) {
    s.noise({ dur: 0.32, vol: 0.22, filter: 'lowpass', freq: 1100, to: 260 });
    s.tone({ type: 'sine', freq: 140, to: 70, dur: 0.2, vol: 0.18 });
  },
  frost(s) {
    s.tone({ type: 'sine', freq: 1800, to: 2500, dur: 0.18, vol: 0.06 });
    s.tone({ type: 'sine', freq: 2700, to: 3200, dur: 0.14, vol: 0.04, at: 0.05 });
  },
  zap(s) {
    // estalo elétrico: chiado agudo + zumbido descendo
    s.noise({ dur: 0.22, vol: 0.12, filter: 'highpass', freq: 2500 });
    s.tone({ type: 'sawtooth', freq: 220, to: 70, dur: 0.25, vol: 0.06 });
    s.tone({ type: 'square', freq: 1400, to: 600, dur: 0.08, vol: 0.03, at: 0.03 });
  },
  block(s) {
    s.tone({ type: 'square', freq: 1900, to: 1500, dur: 0.035, vol: 0.04 });
  },
  place(s) {
    s.tone({ type: 'sine', freq: 200, to: 420, dur: 0.1, vol: 0.22 });
    s.tone({ type: 'triangle', freq: 660, dur: 0.09, vol: 0.12, at: 0.07 });
  },
  upgrade(s) {
    [523, 659, 784, 1047].forEach((f, i) => s.tone({ type: 'square', freq: f, dur: 0.08, vol: 0.06, at: i * 0.06 }));
  },
  sell(s) {
    s.tone({ type: 'sine', freq: 988, dur: 0.07, vol: 0.12 });
    s.tone({ type: 'sine', freq: 1319, dur: 0.14, vol: 0.12, at: 0.07 });
  },
  coin(s) {
    s.tone({ type: 'sine', freq: 1319, dur: 0.06, vol: 0.1 });
    s.tone({ type: 'sine', freq: 1976, dur: 0.12, vol: 0.09, at: 0.055 });
  },
  leak(s) {
    s.tone({ type: 'sawtooth', freq: 170, to: 70, dur: 0.35, vol: 0.13 });
  },
  click(s) {
    s.tone({ type: 'sine', freq: 880, to: 1100, dur: 0.045, vol: 0.12 });
  },
  error(s) {
    s.tone({ type: 'square', freq: 200, to: 150, dur: 0.12, vol: 0.06 });
  },
  round(s) {
    s.tone({ type: 'triangle', freq: 523, dur: 0.12, vol: 0.16 });
    s.tone({ type: 'triangle', freq: 784, dur: 0.22, vol: 0.16, at: 0.12 });
  },
  roundEnd(s) {
    [784, 988, 1175].forEach((f, i) => s.tone({ type: 'triangle', freq: f, dur: 0.1, vol: 0.12, at: i * 0.08 }));
  },
  win(s) {
    [523, 659, 784, 1047, 784, 1047].forEach((f, i) => s.tone({ type: 'square', freq: f, dur: i === 5 ? 0.5 : 0.13, vol: 0.08, at: i * 0.13 }));
  },
  lose(s) {
    [392, 330, 262, 196].forEach((f, i) => s.tone({ type: 'triangle', freq: f, dur: i === 3 ? 0.6 : 0.22, vol: 0.14, at: i * 0.22 }));
  },
  star(s) {
    s.tone({ type: 'sine', freq: 1047, to: 1568, dur: 0.18, vol: 0.12 });
  },
};

export class Sound {
  constructor(settings) {
    this.settings = settings; // { music, sfx } (salvo no save)
    this.ctx = null;
    this.last = {};
  }

  // Precisa ser chamado dentro de um toque/clique do jogador
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(this.ctx.destination);
    this.sfxBus = this.ctx.createGain();
    this.sfxBus.gain.value = 0.7;
    this.sfxBus.connect(this.master);
    this.musicBus = this.ctx.createGain();
    this.musicBus.gain.value = this.settings.music ? 0.5 : 0;
    this.musicBus.connect(this.master);
    const len = this.ctx.sampleRate;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.music = new Music(this);
    this.music.start();
  }

  suspend() {
    this.ctx?.suspend();
  }

  resume() {
    this.ctx?.resume();
  }

  setMusic(on) {
    this.settings.music = on;
    if (this.musicBus) this.musicBus.gain.setTargetAtTime(on ? 0.5 : 0, this.ctx.currentTime, 0.1);
  }

  setSfx(on) {
    this.settings.sfx = on;
  }

  play(name) {
    if (!this.ctx || !this.settings.sfx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    if (now - (this.last[name] ?? -1) < (MIN_GAP[name] ?? 0.02)) return;
    this.last[name] = now;
    SFX[name]?.(this);
  }

  tone({ type = 'sine', freq, to, dur, vol = 0.1, at = 0, bus = this.sfxBus }) {
    const t = this.ctx.currentTime + at;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(bus);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  noise({ dur, vol = 0.1, filter = 'lowpass', freq = 1000, to, q = 0.8, at = 0, bus = this.sfxBus }) {
    const t = this.ctx.currentTime + at;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = filter;
    f.frequency.setValueAtTime(freq, t);
    if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(bus);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }
}

// ── Música: loop chiptune em C → Am → F → G ───────────────────
const CHORDS = [
  { root: 48, notes: [60, 64, 67] },
  { root: 45, notes: [57, 60, 64] },
  { root: 41, notes: [57, 60, 65] },
  { root: 43, notes: [55, 59, 62] },
];
const ARP = [0, 1, 2, 1, 0, 1, 2, 3]; // 3 = oitava da tônica
const MELODY = [ // uma nota por tempo (null = pausa), 4 tempos por acorde
  72, null, 76, 74, 72, null, 69, null,
  69, 72, 77, 76, 74, null, 71, null,
];
const STEP = 60 / 128 / 2; // colcheia a 128 bpm

class Music {
  constructor(sound) {
    this.s = sound;
    this.step = 0;
    this.next = 0;
  }

  start() {
    this.next = this.s.ctx.currentTime + 0.1;
    setInterval(() => this.schedule(), 60);
  }

  schedule() {
    const ctx = this.s.ctx;
    if (ctx.state !== 'running' || !this.s.settings.music) {
      this.next = ctx.currentTime + 0.1;
      return;
    }
    while (this.next < ctx.currentTime + 0.25) {
      this.playStep(this.step, this.next - ctx.currentTime);
      this.step = (this.step + 1) % 64;
      this.next += STEP;
    }
  }

  playStep(i, at) {
    const s = this.s;
    const bus = s.musicBus;
    const chord = CHORDS[Math.floor(i / 8) % 4];
    const inBar = i % 8;
    // baixo
    if (inBar % 2 === 0) {
      const n = inBar === 4 ? chord.root + 7 : chord.root;
      s.tone({ type: 'triangle', freq: midi(n), dur: STEP * 1.6, vol: 0.16, at, bus });
    }
    // arpejo
    const k = ARP[inBar];
    const note = k === 3 ? chord.notes[0] + 12 : chord.notes[k];
    s.tone({ type: 'square', freq: midi(note), dur: STEP * 0.8, vol: 0.025, at, bus });
    // melodia (a cada tempo)
    if (i % 2 === 0) {
      const m = MELODY[(i / 2) % MELODY.length];
      if (m) s.tone({ type: 'square', freq: midi(m), dur: STEP * 1.7, vol: 0.035, at, bus });
    }
    // chimbal
    if (inBar % 2 === 1) s.noise({ dur: 0.03, vol: 0.05, filter: 'highpass', freq: 7000, at, bus });
  }
}
