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
  bin(s) {
    s.tone({ type: 'square', freq: 880, to: 1320, dur: 0.08, vol: 0.06 });
    s.noise({ dur: 0.35, vol: 0.18, filter: 'bandpass', freq: 600, to: 2200, q: 1.2 });
  },
  zip(s) {
    s.noise({ dur: 0.2, vol: 0.22, filter: 'lowpass', freq: 1500, to: 180 });
    s.tone({ type: 'sine', freq: 190, to: 55, dur: 0.16, vol: 0.2 });
  },
  burnout(s) {
    s.tone({ type: 'sawtooth', freq: 160, to: 760, dur: 0.38, vol: 0.12 });
    s.noise({ dur: 0.45, vol: 0.2, filter: 'lowpass', freq: 700, to: 2600 });
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

const MUSIC_GAIN = 0.5; // volume da música no máximo (musicVol = 1)
const SFX_GAIN = 0.7; // dos efeitos

export class Sound {
  constructor(settings) {
    this.settings = settings; // { musicVol, sfxVol } de 0 a 1 (salvo no save)
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
    this.sfxBus.gain.value = SFX_GAIN * (this.settings.sfxVol ?? 1);
    this.sfxBus.connect(this.master);
    this.musicBus = this.ctx.createGain();
    this.musicBus.gain.value = MUSIC_GAIN * (this.settings.musicVol ?? 1);
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

  // Volumes de 0 (mudo) a 1
  setMusicVol(v) {
    this.settings.musicVol = v;
    if (this.musicBus) this.musicBus.gain.setTargetAtTime(MUSIC_GAIN * v, this.ctx.currentTime, 0.05);
  }

  setSfxVol(v) {
    this.settings.sfxVol = v;
    if (this.sfxBus) this.sfxBus.gain.setTargetAtTime(SFX_GAIN * v, this.ctx.currentTime, 0.05);
  }

  // Tema da música: 'menu' (alegre) ou 'battle' (luta e suspense, na partida)
  setTheme(name) {
    this.theme = name;
    this.music?.setTheme(name);
  }

  // Clicou no anúncio: a música gagueja, desaba e fica muda até a próxima
  // troca de tela (setTheme volta ela)
  crashMusic() {
    if (!this.ctx || !this.music) return;
    this.music.crashed = true;
    const bus = this.musicBus;
    for (let k = 0; k < 7; k++) {
      const f = 330 * 0.88 ** k;
      this.tone({ type: 'sawtooth', freq: f, dur: 0.07, vol: 0.09, at: k * 0.075, bus });
      this.tone({ type: 'square', freq: f * 1.5, dur: 0.06, vol: 0.04, at: k * 0.075, bus });
    }
    this.tone({ type: 'sawtooth', freq: 220, to: 28, dur: 1.2, vol: 0.12, at: 0.55, bus });
    this.noise({ dur: 0.9, vol: 0.12, filter: 'bandpass', freq: 2500, to: 200, q: 2, at: 0.5, bus });
  }

  play(name) {
    if (!this.ctx || !(this.settings.sfxVol > 0) || this.ctx.state !== 'running') return;
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

// Catálogo ("Matrix"): mi menor harmônico, escuro, com o Si maior (Ré#) dando suspense
const MX_CHORDS = [
  { root: 40, notes: [52, 55, 59] }, // Em
  { root: 40, notes: [52, 55, 59] }, // Em
  { root: 36, notes: [48, 52, 55] }, // C
  { root: 35, notes: [47, 51, 54] }, // B
];
const MX_BASS = [0, 0, 12, 0, 0, 12, 0, 7, 0, 0, 12, 0, 0, 12, 10, 7]; // pulso de semicolcheias
const MX_RAIN = [76, 79, 81, 83, 86, 88, 91, 93, 95]; // "gotas" de código (mi menor pentatônica, agudo)
const MX_MELODY = [64, 0, 0, 0, 67, 0, 71, 0, 70, 0, 0, 0, 67, 0, 63, 0]; // 1 nota por colcheia (com o Ré#)
// número "aleatório" fixo por passo (a chuva sai sempre igual no loop)
const hash01 = (n) => {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};
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

// LOJA: bossa nova de "música de loja" (tipo canal de compras de videogame),
// Dó maior, 112 bpm em colcheias. Acordes com sétima (I–vi–ii–V e depois
// IV–iii–ii–V), baixo de bossa, chocalho, Rhodes sincopado, melodia de
// marimba e um "tlim-tlim" de moedinha no fim de cada frase. Clima leve e
// feliz pra deixar a pessoa à vontade olhando os itens. Na 2ª metade entram
// o aro da clave e o sininho dobrando a melodia uma oitava acima.
const SHOP_CHORDS = [
  { root: 48, notes: [60, 64, 67, 71] }, // Cmaj7
  { root: 45, notes: [57, 60, 64, 67] }, // Am7
  { root: 50, notes: [62, 65, 69, 72] }, // Dm7
  { root: 43, notes: [55, 59, 62, 65] }, // G7
  { root: 41, notes: [53, 57, 60, 64] }, // Fmaj7
  { root: 40, notes: [55, 59, 62, 64] }, // Em7
  { root: 50, notes: [62, 65, 69, 72] }, // Dm7
  { root: 43, notes: [55, 59, 62, 65] }, // G7
];
const SHOP_BASS = [0, null, null, 7, 0, null, null, 7]; // tônica e quinta, no balanço da bossa
const SHOP_COMP = [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0]; // Rhodes (2 compassos)
const SHOP_CLAVE = [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0]; // aro (2 compassos)
const SHOP_MELODY = [ // 1 nota por colcheia, 8 compassos (repete na 2ª metade)
  76, null, 79, 76, 71, null, 72, 74,
  76, null, 72, null, 69, 72, 76, null,
  77, null, 76, 74, 72, null, 69, null,
  71, 72, 74, null, 77, null, 79, null,
  81, null, 79, 77, 76, null, 72, null,
  79, null, 76, null, 74, 71, 67, null,
  74, null, 77, 81, 79, null, 77, 74,
  71, null, 67, null, 74, null, 72, null,
];

const THEMES = {
  menu: { step: 60 / 128 / 2, steps: 64, play: 'menuStep' },
  'battle-0': { step: 60 / 100 / 2, steps: 128, play: 'battleStep' },
  'battle-1': { step: 60 / 124 / 4, steps: 256, play: 'datacenterStep' },
  'battle-2': { step: 60 / 84 / 2, steps: 128, play: 'oceanStep' },
  catalog: { step: 60 / 96 / 4, steps: 256, play: 'matrixStep' }, // catálogo: "Matrix"
  shop: { step: 60 / 112 / 2, steps: 128, play: 'shopStep' }, // loja: bossa de compras
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
    this.crashed = false; // trocou de tela: a música volta
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
    if (ctx.state !== 'running' || !(this.s.settings.musicVol > 0) || this.crashed) {
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

  // Catálogo: "Matrix" (semicolcheias, 16 por compasso). Baixo pulsando, batida
  // quebrada, pad sombrio e a chuva de código: blips agudos curtinhos caindo
  // de altura. Na 2ª metade entra a melodia lenta e a caixa
  matrixStep(i, at) {
    const s = this.s;
    const bus = s.musicBus;
    const STEP = THEMES.catalog.step;
    const bar = Math.floor(i / 16);
    const chord = MX_CHORDS[bar % 4];
    const k = i % 16;
    const full = bar >= 8;

    // bumbo quebrado (1, "e" do 2, 3)
    if (k === 0 || k === 6 || k === 10) s.tone({ type: 'sine', freq: 130, to: 40, dur: 0.25, vol: k === 0 ? 0.26 : 0.19, at, bus });
    // caixa seca no 2 e no 4 (2ª metade)
    if (full && (k === 4 || k === 12)) s.noise({ dur: 0.1, vol: 0.07, filter: 'bandpass', freq: 2200, q: 1.4, at, bus });
    // chimbal fino nas semicolcheias ímpares
    if (k % 2 === 1) s.noise({ dur: 0.025, vol: 0.022, filter: 'highpass', freq: 9500, at, bus });

    // baixo pulsando
    s.tone({ type: 'sawtooth', freq: midi(chord.root + MX_BASS[k]), dur: STEP * 0.7, vol: 0.05, at, bus });
    s.tone({ type: 'triangle', freq: midi(chord.root + MX_BASS[k]), dur: STEP * 0.8, vol: 0.15, at, bus });

    // pad sombrio segurando o acorde o compasso inteiro
    if (k === 0) {
      for (const n of chord.notes) s.tone({ type: 'sawtooth', freq: midi(n - 12), dur: STEP * 15, vol: 0.013, at, bus });
      s.tone({ type: 'triangle', freq: midi(chord.notes[0]), dur: STEP * 15, vol: 0.07, at, bus });
    }

    // chuva de código: blips agudos em passos sorteados, caindo de altura
    const r = hash01(i + 1);
    if (r < 0.32) {
      const n = MX_RAIN[Math.floor(hash01(i + 77) * MX_RAIN.length)];
      s.tone({ type: 'square', freq: midi(n), to: midi(n - 5), dur: 0.07, vol: 0.022, at, bus });
    }

    // melodia lenta (2ª metade), 1 nota por colcheia
    if (full && k % 2 === 0) {
      const m = MX_MELODY[(k / 2 + (bar % 2) * 8) % MX_MELODY.length];
      if (m) s.tone({ type: 'square', freq: midi(m), dur: STEP * 3.5, vol: 0.022, at, bus });
    }

    // varredura de "dados" no fim de cada frase
    if (bar % 4 === 3 && k === 8) s.noise({ dur: STEP * 8, vol: 0.04, filter: 'highpass', freq: 1500, to: 9000, at, bus });
  }

  // Loja: bossa nova de compras (colcheias, 8 por compasso)
  shopStep(i, at) {
    const s = this.s;
    const bus = s.musicBus;
    const STEP = THEMES.shop.step;
    const bar = Math.floor(i / 8);
    const chord = SHOP_CHORDS[bar % 8];
    const k = i % 8;
    const k16 = i % 16;
    const full = bar >= 8;

    // baixo de bossa (redondo) e bumbo macio junto da tônica
    const b = SHOP_BASS[k];
    if (b !== null) s.tone({ type: 'triangle', freq: midi(chord.root + b), dur: STEP * 1.6, vol: 0.17, at, bus });
    if (k === 0 || k === 4) s.tone({ type: 'sine', freq: 110, to: 50, dur: 0.18, vol: 0.12, at, bus });

    // chocalho em toda colcheia, mais forte no contratempo
    s.noise({ dur: 0.045, vol: k % 2 ? 0.035 : 0.018, filter: 'highpass', freq: 6500, at, bus });
    // aro da clave (2ª metade)
    if (full && SHOP_CLAVE[k16]) s.noise({ dur: 0.03, vol: 0.06, filter: 'bandpass', freq: 2600, q: 5, at, bus });

    // Rhodes: acorde com sétima, curtinho e sincopado
    if (SHOP_COMP[k16]) {
      for (const n of chord.notes) {
        s.tone({ type: 'sine', freq: midi(n), dur: STEP * 1.3, vol: 0.03, at, bus });
        s.tone({ type: 'triangle', freq: midi(n + 12), dur: STEP * 0.5, vol: 0.006, at, bus });
      }
    }

    // melodia de marimba (+ sininho uma oitava acima na 2ª metade)
    const m = SHOP_MELODY[i % SHOP_MELODY.length];
    if (m) {
      s.tone({ type: 'sine', freq: midi(m), dur: 0.32, vol: 0.09, at, bus });
      s.tone({ type: 'triangle', freq: midi(m + 12), dur: 0.06, vol: 0.02, at, bus });
      if (full) s.tone({ type: 'sine', freq: midi(m + 24), dur: 0.5, vol: 0.018, at, bus });
    }

    // "tlim-tlim" de moedinha no fim de cada frase de 4 compassos
    if (bar % 4 === 3 && k === 7) {
      s.tone({ type: 'sine', freq: midi(96), dur: 0.12, vol: 0.035, at, bus });
      s.tone({ type: 'sine', freq: midi(100), dur: 0.35, vol: 0.035, at: at + 0.07, bus });
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
