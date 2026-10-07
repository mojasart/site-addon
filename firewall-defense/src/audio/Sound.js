// ─────────────────────────────────────────────────────────────
//  SOM: efeitos simples sintetizados com Web Audio (sem arquivos).
//  O navegador só deixa tocar som depois do primeiro toque, por isso
//  o App chama unlock() no primeiro pointerdown.
// ─────────────────────────────────────────────────────────────

// Intervalo mínimo entre repetições do mesmo som (evita barulheira)
const MIN_GAP = { dart: 0.06, burst: 0.1, shock: 0.15, laser: 0.08, throw: 0.1, boom: 0.08, hit: 0.04, pop: 0.04, coin: 0.06, block: 0.12 };

const SFX = {
  // ataques
  dart: (s) => s.tone({ type: 'triangle', freq: 900, to: 1500, dur: 0.06, vol: 0.06 }),
  burst: (s) => s.tone({ type: 'square', freq: 1000, to: 600, dur: 0.06, vol: 0.035 }),
  shock: (s) => {
    s.noise({ dur: 0.28, vol: 0.18, filter: 'lowpass', freq: 900, to: 200 });
    s.tone({ type: 'sine', freq: 150, to: 60, dur: 0.22, vol: 0.2 });
  },
  laser: (s) => s.tone({ type: 'sawtooth', freq: 1500, to: 300, dur: 0.12, vol: 0.05 }),
  throw: (s) => s.noise({ dur: 0.08, vol: 0.05, filter: 'bandpass', freq: 1800, to: 900 }),
  boom: (s) => {
    s.noise({ dur: 0.35, vol: 0.25, filter: 'lowpass', freq: 800, to: 90 });
    s.tone({ type: 'sine', freq: 140, to: 50, dur: 0.25, vol: 0.22 });
  },
  // impacto e morte
  hit: (s) => s.tone({ type: 'square', freq: 260 + Math.random() * 60, to: 160, dur: 0.04, vol: 0.035 }),
  block: (s) => s.tone({ type: 'square', freq: 1900, to: 1500, dur: 0.035, vol: 0.03 }),
  pop: (s) => {
    const f = 500 + Math.random() * 250;
    s.tone({ type: 'sine', freq: f * 1.6, to: f * 0.5, dur: 0.08, vol: 0.14 });
  },
  popBig: (s) => {
    s.noise({ dur: 0.5, vol: 0.3, filter: 'lowpass', freq: 1400, to: 100 });
    s.tone({ type: 'sine', freq: 220, to: 50, dur: 0.45, vol: 0.3 });
  },
  // economia
  coin: (s) => {
    s.tone({ type: 'sine', freq: 1319, dur: 0.05, vol: 0.06 });
    s.tone({ type: 'sine', freq: 1976, dur: 0.09, vol: 0.05, at: 0.045 });
  },
  place: (s) => {
    s.tone({ type: 'sine', freq: 220, to: 440, dur: 0.1, vol: 0.18 });
    s.tone({ type: 'triangle', freq: 660, dur: 0.08, vol: 0.1, at: 0.07 });
  },
  sell: (s) => s.tone({ type: 'triangle', freq: 660, to: 330, dur: 0.12, vol: 0.1 }),
  error: (s) => s.tone({ type: 'square', freq: 200, to: 160, dur: 0.12, vol: 0.05 }),
  click: (s) => s.tone({ type: 'sine', freq: 880, to: 1100, dur: 0.04, vol: 0.1 }),
  // ondas e fim de jogo
  waveStart: (s) => {
    s.tone({ type: 'triangle', freq: 523, dur: 0.1, vol: 0.13 });
    s.tone({ type: 'triangle', freq: 784, dur: 0.18, vol: 0.13, at: 0.1 });
  },
  waveClear: (s) => [784, 988, 1175].forEach((f, i) => s.tone({ type: 'triangle', freq: f, dur: 0.1, vol: 0.1, at: i * 0.08 })),
  leak: (s) => s.tone({ type: 'sawtooth', freq: 170, to: 70, dur: 0.3, vol: 0.1 }),
  win: (s) => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => s.tone({ type: 'square', freq: f, dur: i === 5 ? 0.45 : 0.12, vol: 0.06, at: i * 0.12 })),
  lose: (s) => [392, 330, 262, 196].forEach((f, i) => s.tone({ type: 'triangle', freq: f, dur: i === 3 ? 0.5 : 0.2, vol: 0.12, at: i * 0.2 })),
};

export class Sound {
  constructor(settings) {
    this.settings = settings; // { sound }
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
    this.out = this.ctx.createGain();
    this.out.gain.value = 0.8;
    this.out.connect(this.ctx.destination);
    const len = this.ctx.sampleRate;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  }

  suspend() {
    this.ctx?.suspend();
  }

  resume() {
    this.ctx?.resume();
  }

  play(name) {
    if (!this.ctx || !this.settings.sound || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    if (now - (this.last[name] ?? -1) < (MIN_GAP[name] ?? 0.02)) return;
    this.last[name] = now;
    SFX[name]?.(this);
  }

  tone({ type = 'sine', freq, to, dur, vol = 0.1, at = 0 }) {
    const t = this.ctx.currentTime + at;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(this.out);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  noise({ dur, vol = 0.1, filter = 'lowpass', freq = 1000, to, q = 0.8, at = 0 }) {
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
    src.connect(f).connect(g).connect(this.out);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }
}
