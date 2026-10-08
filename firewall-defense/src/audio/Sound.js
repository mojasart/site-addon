// ─────────────────────────────────────────────────────────────
//  SOM: tudo sintetizado com Web Audio (nenhum arquivo de áudio).
//  O navegador só deixa tocar som depois do primeiro toque, por isso
//  o main.js chama unlock() no primeiro pointerdown.
// ─────────────────────────────────────────────────────────────

const midi = (m) => 440 * 2 ** ((m - 69) / 12);

// Intervalo mínimo entre repetições do mesmo som (evita barulheira em massa)
const MIN_GAP = { pop: 0.035, throw: 0.06, laser: 0.07, fire: 0.12, frost: 0.18, coin: 0.05, block: 0.12, zap: 0.3 };

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
  laser(s) {
    s.tone({ type: 'sawtooth', freq: 1700, to: 180, dur: 0.15, vol: 0.06 });
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
    this.music.setTheme(this.theme ?? 'menu');
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

  // Tema da música: 'menu' (alegre) ou 'battle' (luta e suspense, na partida)
  setTheme(name) {
    this.theme = name;
    this.music?.setTheme(name);
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

// ── Música ─────────────────────────────────────────────────────
// Temas em loop: 'menu' (chiptune alegre) e um de batalha por season
// ('battle-0' Placa-Mãe: tambores de guerra e metais, clima de arena;
// 'battle-1' Data Center: techno industrial; 'battle-2' Cabo Submarino:
// grave, sonar e ondas).

// MENU: chiptune em C → Am → F → G, 128 bpm
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

// BATALHA: Ré menor, Dm → B♭ → Gm → A (a dominante com Dó# segura a tensão),
// 100 bpm. 16 compassos: os 8 primeiros só suspense (tambor + cordas + pedal
// grave), os 8 seguintes com a melodia heroica por cima.
const WAR_CHORDS = [
  { root: 50, notes: [62, 65, 69] }, // Dm
  { root: 46, notes: [58, 62, 65] }, // B♭
  { root: 43, notes: [55, 58, 62] }, // Gm
  { root: 45, notes: [57, 61, 64] }, // A
];
const OSTINATO = [0, 0, 12, 0, 7, 0, 12, 7]; // cordas curtas, em colcheias
const DRUMS = [1, 0, 1, 1, 0, 1, 1, 0]; // galope dos tambores de guerra
const WAR_MELODY = [ // 1 nota por tempo, 8 compassos (só na 2ª metade)
  74, null, 69, 74, 77, null, 74, 70,
  79, 77, 74, 70, 73, null, 76, null,
  74, 77, 81, null, 79, 77, 74, null,
  70, 74, 79, 77, 76, null, 73, null,
];

// DATA CENTER: Lá menor, Am → F → C → E, 124 bpm em semicolcheias.
// Bumbo em todo tempo, palmas no 2 e no 4, baixo serrilhado correndo e
// bipes de dados como luz de servidor piscando; a 2ª metade traz o synth.
const DC_CHORDS = [
  { root: 45, notes: [69, 72, 76] }, // Am
  { root: 41, notes: [65, 69, 72] }, // F
  { root: 48, notes: [67, 72, 76] }, // C
  { root: 40, notes: [68, 71, 76] }, // E
];
const DC_BASS = [0, 0, 12, 0, 0, 12, 0, 7, 0, 0, 12, 0, 3, 0, 7, 12]; // semicolcheias
const DC_BLIPS = [0, 5, 11, 14]; // semicolcheias com bipe de dados
const DC_MELODY = [ // 1 nota por colcheia, 4 compassos (repete)
  76, null, 76, 79, 81, null, 79, 76,
  77, null, 76, 72, 74, null, 72, null,
  72, null, 76, 79, 84, null, 81, 79,
  80, null, 76, null, 71, 74, 76, null,
];

// CABO SUBMARINO: Mi menor, Em → C → D → Bm, 84 bpm em colcheias. Baixo bem
// grave, batida de coração, ping de sonar com eco, ondas subindo e
// descendo e bolhas em arpejo; a 2ª metade traz a melodia com eco.
const SEA_CHORDS = [
  { root: 40, notes: [64, 67, 71] }, // Em
  { root: 36, notes: [64, 67, 72] }, // C
  { root: 38, notes: [62, 66, 69] }, // D
  { root: 35, notes: [62, 66, 71] }, // Bm
];
const SEA_BUBBLES = [0, 1, 2, 1]; // arpejo das bolhas (nas colcheias de contratempo)
const SEA_MELODY = [ // 1 nota por tempo, 8 compassos
  71, null, 74, 76, 79, null, 76, null,
  76, null, 79, 76, 74, null, 72, null,
  74, 76, 78, null, 81, null, 78, 76,
  74, null, 71, null, 74, 73, 71, null,
];

const THEMES = {
  menu: { step: 60 / 128 / 2, steps: 64, play: 'menuStep' },
  'battle-0': { step: 60 / 100 / 2, steps: 128, play: 'battleStep' },
  'battle-1': { step: 60 / 124 / 4, steps: 256, play: 'datacenterStep' },
  'battle-2': { step: 60 / 84 / 2, steps: 128, play: 'oceanStep' },
};
THEMES.battle = THEMES['battle-0'];

class Music {
  constructor(sound) {
    this.s = sound;
    this.step = 0;
    this.next = 0;
    this.theme = 'menu';
  }

  // troca de tema: recomeça do início do loop novo
  setTheme(name) {
    if (!THEMES[name] || name === this.theme) return;
    this.theme = name;
    this.step = 0;
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
      const th = THEMES[this.theme];
      this[th.play](this.step, this.next - ctx.currentTime);
      this.step = (this.step + 1) % th.steps;
      this.next += th.step;
    }
  }

  menuStep(i, at) {
    const s = this.s;
    const bus = s.musicBus;
    const STEP = THEMES.menu.step;
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

  battleStep(i, at) {
    const s = this.s;
    const bus = s.musicBus;
    const STEP = THEMES['battle-0'].step;
    const bar = Math.floor(i / 8);
    const chord = WAR_CHORDS[bar % 4];
    const inBar = i % 8;
    const full = bar >= 8; // 2ª metade: entra a melodia e a caixa

    // tambor de guerra (grave, com o "tum" caindo de altura)
    if (DRUMS[inBar]) {
      const accent = inBar === 0;
      s.tone({ type: 'sine', freq: accent ? 120 : 100, to: 42, dur: 0.38, vol: accent ? 0.34 : 0.24, at, bus });
      s.noise({ dur: 0.09, vol: accent ? 0.12 : 0.07, filter: 'lowpass', freq: 500, at, bus });
    }
    // caixa no tempo 3 (só com a melodia)
    if (full && inBar === 4) s.noise({ dur: 0.16, vol: 0.09, filter: 'bandpass', freq: 1800, q: 1.2, at, bus });

    // cordas em ostinato (curtinhas, no grave)
    const o = chord.root + OSTINATO[inBar];
    s.tone({ type: 'sawtooth', freq: midi(o), dur: STEP * 0.55, vol: 0.022, at, bus });

    // pedal grave segurando o acorde (suspense), 1 por compasso
    if (inBar === 0) s.tone({ type: 'triangle', freq: midi(chord.root - 12), dur: STEP * 7.5, vol: 0.12, at, bus });

    // metais: acorde cortado no começo do compasso
    if (inBar === 0) {
      for (const n of chord.notes) s.tone({ type: 'sawtooth', freq: midi(n), dur: STEP * 1.1, vol: full ? 0.022 : 0.014, at, bus });
    }

    // melodia heroica (tipo trompa), 1 nota por tempo
    if (full && i % 2 === 0) {
      const m = WAR_MELODY[((i - 64) / 2) % WAR_MELODY.length];
      if (m) {
        s.tone({ type: 'triangle', freq: midi(m), dur: STEP * 1.8, vol: 0.07, at, bus });
        s.tone({ type: 'sawtooth', freq: midi(m), dur: STEP * 1.6, vol: 0.012, at, bus });
      }
    }

    // prato crescendo pra virada entre as metades (e no fim do loop)
    if ((bar === 7 || bar === 15) && inBar === 4) {
      s.noise({ dur: STEP * 4, vol: 0.06, filter: 'highpass', freq: 3000, to: 9000, at, bus });
    }
  }

  // Data Center: techno industrial (semicolcheias, 16 por compasso)
  datacenterStep(i, at) {
    const s = this.s;
    const bus = s.musicBus;
    const STEP = THEMES['battle-1'].step;
    const bar = Math.floor(i / 16);
    const chord = DC_CHORDS[bar % 4];
    const k = i % 16;
    const full = bar >= 8;

    // bumbo em todo tempo
    if (k % 4 === 0) s.tone({ type: 'sine', freq: 150, to: 45, dur: 0.22, vol: 0.3, at, bus });
    // palmas no 2 e no 4
    if (k === 4 || k === 12) s.noise({ dur: 0.12, vol: 0.08, filter: 'bandpass', freq: 1500, q: 1.1, at, bus });
    // chimbal aberto no contratempo; fechado nas semicolcheias na 2ª metade
    if (k % 4 === 2) s.noise({ dur: 0.07, vol: 0.05, filter: 'highpass', freq: 8000, at, bus });
    else if (full) s.noise({ dur: 0.02, vol: 0.015, filter: 'highpass', freq: 9000, at, bus });

    // baixo serrilhado correndo
    s.tone({ type: 'sawtooth', freq: midi(chord.root + DC_BASS[k]), dur: STEP * 0.8, vol: 0.03, at, bus });

    // zumbido dos servidores: acorde longo, 1 por compasso
    if (k === 0) for (const n of chord.notes) s.tone({ type: 'triangle', freq: midi(n - 12), dur: STEP * 15, vol: 0.025, at, bus });

    // bipes de dados
    if (DC_BLIPS.includes(k)) {
      const n = chord.notes[(bar + k) % 3] + 12;
      s.tone({ type: 'square', freq: midi(n), dur: 0.05, vol: 0.016, at, bus });
    }

    // synth na 2ª metade (1 nota por colcheia)
    if (full && k % 2 === 0) {
      const m = DC_MELODY[((i - 128) / 2) % DC_MELODY.length];
      if (m) s.tone({ type: 'square', freq: midi(m), dur: STEP * 1.8, vol: 0.03, at, bus });
    }

    // subida de ruído pra virada (meio e fim do loop)
    if ((bar === 7 || bar === 15) && k === 8) s.noise({ dur: STEP * 8, vol: 0.05, filter: 'highpass', freq: 1500, to: 9000, at, bus });
  }

  // Cabo Submarino: grave, sonar e ondas (colcheias, 8 por compasso)
  oceanStep(i, at) {
    const s = this.s;
    const bus = s.musicBus;
    const STEP = THEMES['battle-2'].step;
    const bar = Math.floor(i / 8);
    const chord = SEA_CHORDS[bar % 4];
    const k = i % 8;
    const full = bar >= 8;

    // baixo bem grave segurando o compasso
    if (k === 0) s.tone({ type: 'sine', freq: midi(chord.root), dur: STEP * 7.8, vol: 0.18, at, bus });
    // batida de coração (tum-tum)
    if (k === 0 || k === 1) s.tone({ type: 'sine', freq: 90, to: 40, dur: 0.3, vol: k === 0 ? 0.22 : 0.14, at, bus });
    if (full && k === 4) s.noise({ dur: 0.1, vol: 0.05, filter: 'lowpass', freq: 700, at, bus });

    // ping de sonar com eco, a cada 2 compassos
    if (bar % 2 === 0 && k === 6) {
      s.tone({ type: 'sine', freq: midi(88), dur: 1.4, vol: 0.04, at, bus });
      s.tone({ type: 'sine', freq: midi(88), dur: 1.2, vol: 0.015, at: at + STEP * 2, bus });
    }

    // ondas: ruído grave abrindo devagar
    if (bar % 2 === 0 && k === 0) s.noise({ dur: STEP * 8, vol: 0.05, filter: 'lowpass', freq: 250, to: 1100, at, bus });

    // bolhas em arpejo, nos contratempos
    if (k % 2 === 1) {
      const n = chord.notes[SEA_BUBBLES[(k - 1) / 2 % 4]] + 12;
      s.tone({ type: 'triangle', freq: midi(n), dur: STEP * 0.6, vol: 0.02, at, bus });
    }

    // melodia com eco na 2ª metade (1 nota por tempo)
    if (full && k % 2 === 0) {
      const m = SEA_MELODY[((i - 64) / 2) % SEA_MELODY.length];
      if (m) {
        s.tone({ type: 'triangle', freq: midi(m), dur: STEP * 1.8, vol: 0.06, at, bus });
        s.tone({ type: 'triangle', freq: midi(m), dur: STEP * 1.5, vol: 0.02, at: at + STEP * 3, bus });
      }
    }

    // brilho descendo pra virada
    if ((bar === 7 || bar === 15) && k === 4) s.noise({ dur: STEP * 4, vol: 0.03, filter: 'highpass', freq: 5000, to: 2000, at, bus });
  }
}
