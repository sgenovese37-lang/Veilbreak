// Musica generata dal gioco con Web Audio, in stile horror/fantasy cinematografico: nessun file audio.
// Un tema per il menu e uno per ogni ambientazione. Niente onde quadre né arpeggi veloci: archi e cori
// sintetizzati lenti, campane e pianoforte lontani, vento, battiti, riverbero da cattedrale e dissonanze.
// Ogni tema è una funzione che, battuta per battuta, programma gli strumenti; le melodie variano a caso
// dentro la scala del tema. Si può disattivare a parte dai suoni.
import { audioContext, audioOutput } from "./audio.mjs";
import { hz, seeded, envelope, end, strings, vowels, choir, organ, piano, bell, cello, drone, noiseBuffer, noise, wind, riser, thump, heartbeat, tom, impulse } from "./synth.mjs";

const key = "veilbreak-music";
let enabled = true;
try { enabled = localStorage.getItem(key) !== "off"; } catch { enabled = true; }
export const musicEnabled = () => enabled;

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
