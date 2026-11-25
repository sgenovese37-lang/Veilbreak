// Musica generata dal gioco con Web Audio, in stile horror/fantasy cinematografico: nessun file audio.
// Un tema per il menu e uno per ogni ambientazione. Niente onde quadre né arpeggi veloci: archi e cori
// sintetizzati lenti, campane e pianoforte lontani, vento, battiti, riverbero da cattedrale e dissonanze.
// Ogni tema è una funzione che, battuta per battuta, programma gli strumenti; le melodie variano a caso
// dentro la scala del tema. Si può disattivare a parte dai suoni.
import { audioContext, audioOutput } from "./audio.mjs";

const key = "veilbreak-music";
let enabled = true;
try { enabled = localStorage.getItem(key) !== "off"; } catch { enabled = true; }
export const musicEnabled = () => enabled;

const hz = n => 440 * Math.pow(2, (n - 69) / 12);
function seeded(seed) { return () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648); }

// ---------- Strumenti ----------
function envelope(ctx, at, attack, hold, release, peak) {
  const g = ctx.createGain();
  g.gain.value = 0.0001;   // senza questo il volume resta a 1 fino al primo evento e si sente un clic
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + attack);
  g.gain.setValueAtTime(peak, at + attack + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, at + attack + hold + release);
  return g;
}
const end = (at, attack, hold, release) => at + attack + hold + release + 0.1;

// Archi: tre seghe leggermente scordate per nota, filtro passa-basso che respira.
function strings(ctx, dest, notes, at, dur, { vol = 0.05, cut = 900, attack = dur * 0.4 } = {}) {
  const f = ctx.createBiquadFilter();
  f.type = "lowpass"; f.Q.value = 0.7;
  f.frequency.setValueAtTime(cut * 0.6, at);
  f.frequency.linearRampToValueAtTime(cut, at + dur * 0.5);
  f.frequency.linearRampToValueAtTime(cut * 0.6, at + dur);
  const g = envelope(ctx, at, attack, Math.max(0, dur - attack), dur * 0.6, vol);
  f.connect(g).connect(dest);
  for (const n of notes) for (const d of [-11, 0, 9]) {
    const o = ctx.createOscillator();
    o.type = "sawtooth"; o.frequency.value = hz(n); o.detune.value = d;
    o.connect(f); o.start(at); o.stop(end(at, attack, dur - attack, dur * 0.6));
  }
}

// Coro: seghe con vibrato filtrate sulle formanti di una vocale ("a" aperta, "u" cupa).
const vowels = { a: [[800, 1], [1150, 0.5], [2900, 0.18]], u: [[350, 1], [600, 0.45], [2400, 0.08]], o: [[450, 1], [800, 0.5], [2830, 0.1]] };
function choir(ctx, dest, notes, at, dur, { vol = 0.06, vowel = "a" } = {}) {
  const attack = dur * 0.45;
  const g = envelope(ctx, at, attack, dur - attack, dur * 0.7, vol);
  g.connect(dest);
  const sum = ctx.createGain(); sum.gain.value = 1;
  for (const [freq, amp] of vowels[vowel]) {
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = freq; bp.Q.value = 9;
    const a = ctx.createGain(); a.gain.value = amp * 3;
    sum.connect(bp).connect(a).connect(g);
  }
  const stop = end(at, attack, dur - attack, dur * 0.7);
  for (const n of notes) for (const d of [-14, 12]) {
    const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = hz(n); o.detune.value = d;
    const lfo = ctx.createOscillator(); const depth = ctx.createGain();
    lfo.frequency.value = 4.6 + Math.random() * 0.8; depth.gain.value = 9;
    lfo.connect(depth).connect(o.detune);
    o.connect(sum); o.start(at); lfo.start(at); o.stop(stop); lfo.stop(stop);
  }
}

// Organo da chiesa grave, con leggero tremolo.
function organ(ctx, dest, notes, at, dur, { vol = 0.035 } = {}) {
  const g = envelope(ctx, at, 0.6, dur - 0.6, 1.8, vol);
  const trem = ctx.createGain(); trem.gain.value = 1;
  const lfo = ctx.createOscillator(); const depth = ctx.createGain();
  lfo.frequency.value = 5.2; depth.gain.value = 0.12; lfo.connect(depth).connect(trem.gain);
  const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 1600;
  trem.connect(f).connect(g).connect(dest);
  const stop = end(at, 0.6, dur - 0.6, 1.8);
  lfo.start(at); lfo.stop(stop);
  for (const n of notes) for (const [mult, amp] of [[1, 1], [2, 0.45], [4, 0.15], [0.5, 0.5]]) {
    const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = hz(n) * mult;
    const a = ctx.createGain(); a.gain.value = amp;
    o.connect(a).connect(trem); o.start(at); o.stop(stop);
  }
}

// Pianoforte lontano: parziali che si spengono a velocità diverse.
function piano(ctx, dest, n, at, { vol = 0.07, detune = 0, length = 4 } = {}) {
  for (const [mult, amp, decay] of [[1, 1, length], [2, 0.35, length * 0.6], [3, 0.15, length * 0.4], [4.02, 0.08, length * 0.25]]) {
    const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = hz(n) * mult; o.detune.value = detune;
    const g = envelope(ctx, at, 0.006, 0, decay, vol * amp);
    o.connect(g).connect(dest); o.start(at); o.stop(at + decay + 0.2);
  }
}

// Campana: parziali non armoniche, lunghissima coda.
function bell(ctx, dest, n, at, { vol = 0.05, length = 7 } = {}) {
  for (const [mult, amp, decay] of [[0.5, 0.6, length], [1, 1, length * 0.8], [2.76, 0.45, length * 0.5], [5.4, 0.2, length * 0.3], [8.93, 0.08, length * 0.15]]) {
    const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = hz(n) * mult;
    const g = envelope(ctx, at, 0.004, 0, decay, vol * amp);
    o.connect(g).connect(dest); o.start(at); o.stop(at + decay + 0.2);
  }
}

// Violoncello: una sega scura con vibrato lento, per i motivi gravi.
function cello(ctx, dest, n, at, dur, { vol = 0.06 } = {}) {
  const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = hz(n);
  const lfo = ctx.createOscillator(); const depth = ctx.createGain();
  lfo.frequency.value = 5; depth.gain.setValueAtTime(0, at); depth.gain.linearRampToValueAtTime(12, at + dur * 0.6);
  lfo.connect(depth).connect(o.detune);
  const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 700; f.Q.value = 2;
  const g = envelope(ctx, at, Math.min(0.5, dur * 0.3), dur * 0.5, dur * 0.5, vol);
  o.connect(f).connect(g).connect(dest);
  const stop = at + dur * 1.4 + 0.2;
  o.start(at); lfo.start(at); o.stop(stop); lfo.stop(stop);
}

// Bordone grave (sinusoide + triangolo un'ottava sotto).
function drone(ctx, dest, n, at, dur, { vol = 0.08 } = {}) {
  const g = envelope(ctx, at, dur * 0.3, dur * 0.5, dur * 0.5, vol);
  g.connect(dest);
  for (const [type, mult] of [["sine", 1], ["triangle", 0.5]]) {
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = hz(n) * mult;
    o.connect(g); o.start(at); o.stop(at + dur * 1.3 + 0.2);
  }
}

function noiseBuffer(ctx) {
  if (ctx._veilNoise) return ctx._veilNoise;
  const buf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  ctx._veilNoise = buf;
  return buf;
}
function noise(ctx, dest, at, dur, { type = "lowpass", from = 400, to = 400, q = 1, vol = 0.03, attack = dur * 0.4, release = dur * 0.4 } = {}) {
  const src = ctx.createBufferSource(); src.buffer = noiseBuffer(ctx); src.loop = true;
  const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(from, at); f.frequency.exponentialRampToValueAtTime(to, at + dur);
  const g = envelope(ctx, at, attack, Math.max(0, dur - attack - release), release, vol);
  src.connect(f).connect(g).connect(dest);
  src.start(at, Math.random() * 2); src.stop(at + dur + 0.2);
}
const wind = (ctx, dest, at, dur, vol = 0.025) => noise(ctx, dest, at, dur, { from: 250 + Math.random() * 200, to: 500 + Math.random() * 500, q: 3, vol });
// Crescendo spettrale prima di un cambio d'accordo.
const riser = (ctx, dest, at, dur, vol = 0.02) => noise(ctx, dest, at, dur, { type: "bandpass", from: 300, to: 3500, q: 6, vol, attack: dur * 0.95, release: 0.08 });

function thump(ctx, dest, at, { vol = 0.5, from = 70, to = 38, length = 0.5 } = {}) {
  const o = ctx.createOscillator(); o.type = "sine";
  o.frequency.setValueAtTime(from, at); o.frequency.exponentialRampToValueAtTime(to, at + length * 0.6);
  const g = envelope(ctx, at, 0.008, 0, length, vol);
  o.connect(g).connect(dest); o.start(at); o.stop(at + length + 0.1);
}
const heartbeat = (ctx, dest, at, vol = 0.45) => { thump(ctx, dest, at, { vol }); thump(ctx, dest, at + 0.28, { vol: vol * 0.6 }); };
function tom(ctx, dest, at, vol = 0.35) {
  thump(ctx, dest, at, { vol, from: 110, to: 55, length: 0.7 });
  noise(ctx, dest, at, 0.25, { type: "lowpass", from: 900, to: 200, vol: vol * 0.15, attack: 0.005, release: 0.2 });
}

// ---------- Temi ----------
// Ogni tema: durata di una battuta in secondi, volume e la funzione che riempie la battuta.
const pick = (r, list) => list[Math.floor(r() * list.length)];

export const themes = {
  // Menu: «Il Velo». Re minore, archi e coro, un carillon stonato, vento.
  menu: {
    name: "Il Velo", bar: 5.2, volume: 1.25,
    chords: [[38, 50, 53, 57], [34, 50, 53, 58], [43, 50, 55, 58], [45, 49, 52, 57]],
    play(ctx, d, at, bar, s) {
      const L = this.bar;
      const chord = this.chords[bar % 4];
      drone(ctx, d, chord[0], at, L * 1.1, { vol: 0.07 });
      strings(ctx, d, chord.slice(1), at, L * 1.05, { vol: 0.03, cut: 800 });
      if (bar % 2 === 1) choir(ctx, d, chord.slice(1).map(n => n + 12), at, L, { vol: 0.035, vowel: "a" });
      wind(ctx, d, at, L * 1.6, 0.02);
      // carillon stonato: un motivo di 4 note che ritorna, ogni tanto mutato
      if (bar % 8 === 0) s.motif = Array.from({ length: 4 }, () => pick(s.r, [74, 77, 76, 81, 82, 79, 73]));
      if (bar % 4 !== 3) s.motif.forEach((n, i) => { if (s.r() < 0.8) piano(ctx, d, n + (bar % 4 === 1 && i === 3 ? -1 : 0), at + 0.4 + i * L / 5, { vol: 0.035, detune: (s.r() - 0.5) * 30, length: 3 }); });
      if (bar % 4 === 0) bell(ctx, d, 50, at, { vol: 0.03 });
      if (bar % 4 === 3) riser(ctx, d, at + L * 0.45, L * 0.55, 0.015);
    },
  },
  // Corte di Hollow: lamento gotico in La minore. Basso che scende, organo, coro «u», campana a morto.
  hollow: {
    name: "Sala del Consiglio", bar: 5.6, volume: 1.3,
    chords: [[45, 57, 60, 64], [43, 55, 59, 64], [41, 57, 60, 65], [40, 56, 59, 64]],
    play(ctx, d, at, bar, s) {
      const L = this.bar;
      const chord = this.chords[bar % 4];
      organ(ctx, d, [chord[0] - 12, chord[0]], at, L, { vol: 0.03 });
      choir(ctx, d, chord.slice(1), at, L * 1.05, { vol: 0.04, vowel: "u" });
      bell(ctx, d, 45, at, { vol: bar % 4 === 0 ? 0.045 : 0.02, length: 8 });
      // frammenti di pianoforte che scendono, sempre diversi
      if (bar % 2 === 1) {
        let n = pick(s.r, [76, 77, 79, 81]);
        for (let i = 0; i < 4; i++) { piano(ctx, d, n, at + L * (0.15 + i * 0.2), { vol: 0.03, length: 3.5 }); n -= pick(s.r, [1, 2, 2, 3]); }
      }
      if (bar % 8 === 6) strings(ctx, d, [chord[1] + 12, chord[2] + 12], at, L * 2, { vol: 0.022, cut: 1400 });
      wind(ctx, d, at, L * 1.5, 0.012);
    },
  },
  // Patto Neon: noir elettrico in Do# minore. Battito cardiaco, bordone che si apre, eco di vetro.
  neon: {
    name: "Centrale delle Frequenze", bar: 3.6, volume: 1.25,
    chords: [[37, 49, 52, 56], [33, 49, 52, 57], [42, 49, 54, 57], [44, 48, 51, 56]],
    play(ctx, d, at, bar, s) {
      const L = this.bar;
      const chord = this.chords[bar % 4];
      heartbeat(ctx, d, at, 0.4);
      heartbeat(ctx, d, at + L / 2, 0.3);
      strings(ctx, d, chord.slice(1), at, L * 1.05, { vol: 0.028, cut: 500 + 500 * Math.abs(Math.sin(bar / 3)), attack: L * 0.2 });
      drone(ctx, d, chord[0] - 12, at, L * 1.05, { vol: 0.09 });
      // impulsi spettrali: note acute e scordate che si perdono nel riverbero
      const count = 1 + Math.floor(s.r() * 3);
      for (let i = 0; i < count; i++) piano(ctx, d, pick(s.r, [73, 76, 80, 81, 85, 86]), at + s.r() * L, { vol: 0.025, detune: (s.r() - 0.5) * 60, length: 2.5 });
      // ticchettio teso, quasi un orologio dentro i cavi
      for (let i = 0; i < 8; i++) noise(ctx, d, at + i * L / 8, 0.05, { type: "highpass", from: 6000, to: 6000, vol: i % 2 ? 0.006 : 0.011, attack: 0.003, release: 0.04 });
      if (bar % 4 === 0) thump(ctx, d, at, { vol: 0.35, from: 45, to: 30, length: 3 });
      if (bar % 8 === 7) riser(ctx, d, at + L * 0.3, L * 0.7, 0.02);
    },
  },
  // Senza Santi: liturgia profanata in Mi frigio. Coro dominante, cluster dissonanti, pedale d'organo.
  saints: {
    name: "Cappella dell’Aureola Spezzata", bar: 6.4, volume: 1.75,
    chords: [[40, 52, 55, 59], [41, 53, 57, 60], [40, 50, 53, 57], [40, 52, 53, 59]],
    play(ctx, d, at, bar, s) {
      const L = this.bar;
      const chord = this.chords[bar % 4];
      organ(ctx, d, [28, 40], at, L, { vol: 0.03 });
      choir(ctx, d, chord.slice(1), at, L * 1.1, { vol: 0.05, vowel: bar % 2 ? "o" : "a" });
      if (bar % 4 === 3) choir(ctx, d, [chord[2] + 12, chord[2] + 13], at + L * 0.3, L * 0.8, { vol: 0.025, vowel: "a" });
      if (s.r() < 0.6) bell(ctx, d, pick(s.r, [76, 77, 83]), at + s.r() * L * 0.6, { vol: 0.018, length: 6 });
      if (bar % 4 === 2) riser(ctx, d, at + L * 0.5, L * 0.5, 0.012);
      wind(ctx, d, at, L * 1.4, 0.014);
    },
  },
  // Sottocittà: gallerie in Si minore. Rombo sotterraneo, tamburi lenti, lamiere, gocce, violoncello col tritono.
  undercity: {
    name: "Deposito Sotto le Rotaie", bar: 4.4, volume: 1.25,
    chords: [[35, 47, 50, 54], [36, 48, 52, 55], [35, 47, 50, 54], [42, 46, 49, 54]],
    play(ctx, d, at, bar, s) {
      const L = this.bar;
      const chord = this.chords[bar % 4];
      drone(ctx, d, 23, at, L * 1.1, { vol: 0.12 });
      noise(ctx, d, at, L * 1.3, { from: 120, to: 180, q: 1, vol: 0.05 });
      strings(ctx, d, chord.slice(1), at, L * 1.05, { vol: 0.022, cut: 600 });
      tom(ctx, d, at, 0.35);
      tom(ctx, d, at + L * 0.375, 0.2);
      tom(ctx, d, at + L * 0.5, 0.28);
      if (bar % 4 === 0) [[47, 1.2], [48, 0.8], [47, 1], [41, 1.6]].reduce((t, [n, len]) => { cello(ctx, d, n, at + t, len, { vol: 0.05 }); return t + len; }, 0.2);
      if (bar % 2 === 1) noise(ctx, d, at + s.r() * L * 0.5, 1.6, { type: "bandpass", from: 500 + s.r() * 400, to: 1800, q: 18, vol: 0.02 });
      for (let i = 0; i < 2; i++) if (s.r() < 0.7) piano(ctx, d, pick(s.r, [86, 88, 91, 93]), at + s.r() * L, { vol: 0.02, length: 1.2 });
    },
  },
};

// ---------- Mixer: riverbero da cattedrale e compressore ----------
function impulse(ctx, seconds = 5, decay = 2.6) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

function mixer(ctx, out, volume) {
  const bus = ctx.createGain();
  const dry = ctx.createGain(); dry.gain.value = 0.55;
  const verb = ctx.createConvolver(); verb.buffer = impulse(ctx);
  const wet = ctx.createGain(); wet.gain.value = 0.9;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -20; comp.ratio.value = 3; comp.attack.value = 0.05; comp.release.value = 0.4;
  const master = ctx.createGain(); master.gain.value = volume;
  bus.connect(dry).connect(comp);
  bus.connect(verb).connect(wet).connect(comp);
  comp.connect(master).connect(out);
  return { bus, master, nodes: [bus, dry, verb, wet, comp, master] };
}

// Programma le battute fino al tempo «until».
function scheduleUntil(state, until) {
  const theme = themes[state.name];
  while (state.nextAt < until) {
    theme.play(state.ctx, state.mix.bus, state.nextAt, state.bar, state);
    state.bar++;
    state.nextAt += theme.bar;
  }
}

function startState(ctx, out, name, at, seed) {
  const theme = themes[name];
  const mix = mixer(ctx, out, theme.volume);
  const r = seeded(seed);
  return { name, ctx, mix, r, bar: 0, nextAt: at, motif: [74, 77, 76, 73] };
}

let current = null;

// Avvia il tema richiesto (menu, hollow, neon, saints, undercity). Se suona già, non riparte.
export function playMusic(name) {
  if (!themes[name]) name = "menu";
  if (current?.name === name) return;
  stopMusic();
  if (!enabled) return;
  try {
    const ctx = audioContext();
    const out = audioOutput();
    if (!ctx || !out) return;
    const state = startState(ctx, out, name, ctx.currentTime + 0.1, Date.now() % 100000);
    const m = state.mix.master.gain;
    const v = themes[name].volume;
    m.setValueAtTime(0.0001, ctx.currentTime);
    m.exponentialRampToValueAtTime(v, ctx.currentTime + 3);
    state.timer = setInterval(() => {
      if (state.nextAt < ctx.currentTime - 2) state.nextAt = ctx.currentTime + 0.1;   // dopo una pausa del telefono
      scheduleUntil(state, ctx.currentTime + 1.5);
    }, 250);
    scheduleUntil(state, ctx.currentTime + 1.5);
    current = state;
  } catch { current = null; }
}

export function stopMusic() {
  if (!current) return;
  const { mix, timer, ctx } = current;
  clearInterval(timer);
  current = null;
  try {
    const g = mix.master.gain;
    g.cancelScheduledValues(ctx.currentTime);
    g.setValueAtTime(Math.max(g.value, 0.0001), ctx.currentTime);
    g.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.5);
    setTimeout(() => { for (const n of mix.nodes) { try { n.disconnect(); } catch { /* già scollegato */ } } }, 1800);
  } catch { /* audio non disponibile */ }
}

export function setMusic(on, name) {
  enabled = on;
  try { localStorage.setItem(key, on ? "on" : "off"); } catch { /* solo per questa sessione */ }
  if (!on) stopMusic(); else if (name) playMusic(name);
}

// Registra un tema in un AudioBuffer (per ascoltarlo fuori dal gioco: tools/registra_musica.cjs).
export async function renderTheme(name, seconds = 40, sampleRate = 44100) {
  const ctx = new OfflineAudioContext(2, Math.floor(seconds * sampleRate), sampleRate);
  const state = startState(ctx, ctx.destination, name, 0.05, 12345);
  scheduleUntil(state, seconds - 1);
  const g = state.mix.master.gain;
  g.setValueAtTime(themes[name].volume, seconds - 3);
  g.linearRampToValueAtTime(0.0001, seconds - 0.2);
  return ctx.startRendering();
}
