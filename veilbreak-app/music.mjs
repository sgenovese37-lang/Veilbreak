// Musica generata dal gioco con Web Audio: nessun file audio. Un tema per il menu e uno per
// ogni ambientazione. Le melodie nascono da un motivo di due battute che si ripete e varia,
// sopra un giro di accordi della scala del tema. Si può disattivare a parte dai suoni.
import { audioContext, audioOutput } from "./audio.mjs";

const key = "veilbreak-music";
let enabled = true;
try { enabled = localStorage.getItem(key) !== "off"; } catch { enabled = true; }
export const musicEnabled = () => enabled;

const minor = [0, 2, 3, 5, 7, 8, 10];
const harmonic = [0, 2, 3, 5, 7, 8, 11];
const dorian = [0, 2, 3, 5, 7, 9, 10];
const phrygian = [0, 1, 3, 5, 7, 8, 10];

// root: nota MIDI della tonica · chords: gradi della scala, uno per battuta ·
// arp: indici delle note dell'accordo per ogni sedicesimo (null = pausa) · lead: probabilità di nota
export const themes = {
  menu: { name: "Il Velo", bpm: 68, root: 50, scale: minor, chords: [0, 5, 2, 6], pad: "strings", lead: 0.35, leadVoice: "musicbox",
    arp: [0, null, 1, null, 2, null, 1, null, 3, null, 2, null, 1, null, null, null], bass: [0, null, null, null, null, null, null, null, 0, null, null, null, null, null, null, null], volume: 0.32 },
  hollow: { name: "Sala del Consiglio", bpm: 72, root: 45, scale: harmonic, chords: [0, 3, 4, 0, 5, 1, 4, 4], pad: "organ", lead: 0.3, leadVoice: "harpsichord",
    arp: [0, 1, 2, 3, 2, 1, 0, 1, 0, 1, 2, 3, 2, 1, 0, null], arpVoice: "harpsichord", bass: [0, null, null, null, 0, null, null, null, 0, null, null, null, 0, null, null, null], volume: 0.26 },
  neon: { name: "Centrale delle Frequenze", bpm: 104, root: 40, scale: phrygian, chords: [0, 1, 0, 6], pad: "synth", lead: 0.28, leadVoice: "square",
    arp: [0, 2, 1, 3, 0, 2, 1, 3, 0, 2, 1, 3, 0, 2, 3, 1], arpVoice: "pulse", bass: [0, 0, null, 0, 0, null, 0, null, 0, 0, null, 0, 0, null, 0, 0],
    drums: { kick: [0, 4, 8, 12], hat: [2, 6, 10, 14], snare: [4, 12] }, volume: 0.22 },
  saints: { name: "Cappella dell’Aureola Spezzata", bpm: 54, root: 43, scale: dorian, chords: [0, 3, 6, 0, 4, 3, 1, 0], pad: "choir", lead: 0.18, leadVoice: "bell",
    arp: [0, null, null, null, null, null, null, null, 2, null, null, null, null, null, null, null], arpVoice: "bell", bass: [0, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null], volume: 0.3 },
  undercity: { name: "Deposito Sotto le Rotaie", bpm: 84, root: 37, scale: minor, chords: [0, 0, 5, 6], pad: "low", lead: 0.2, leadVoice: "reed",
    arp: [0, null, null, 0, null, null, 1, null, 0, null, null, 0, null, 2, null, null], arpVoice: "pluck", bass: [0, null, null, 0, null, null, 0, null, 0, null, null, 0, null, null, 0, null],
    drums: { kick: [0, 3, 6, 8, 11], hat: [], snare: [12], metal: [14] }, volume: 0.26 },
};

const midi = n => 440 * Math.pow(2, (n - 69) / 12);
function seeded(seed) { return () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648); }

let current = null;   // { theme, bus, timer, step, nextAt, motif, random, ctx }

function note(ctx, out, voice, freq, at, length, volume) {
  const g = ctx.createGain();
  const f = ctx.createBiquadFilter();
  f.type = "lowpass";
  const stops = [];
  const osc = (type, mult = 1, detune = 0, vol = 1) => {
    const o = ctx.createOscillator(); const og = ctx.createGain();
    o.type = type; o.frequency.value = freq * mult; o.detune.value = detune; og.gain.value = vol;
    o.connect(og).connect(f); o.start(at); stops.push(o);
  };
  let attack = 0.01, release = length;
  switch (voice) {
    case "strings": osc("sawtooth", 1, -7, 0.5); osc("sawtooth", 1, 7, 0.5); f.frequency.value = 900; attack = length * 0.35; break;
    case "organ": osc("sine", 1); osc("sine", 2, 0, 0.5); osc("sine", 4, 0, 0.18); f.frequency.value = 2400; attack = 0.08; break;
    case "synth": osc("sawtooth", 1, -12, 0.5); osc("square", 0.5, 0, 0.3); f.frequency.value = 700; attack = 0.3; break;
    case "choir": osc("triangle", 1, -9, 0.5); osc("triangle", 1, 9, 0.5); osc("sine", 2, 0, 0.2); f.frequency.value = 1500; attack = length * 0.45; break;
    case "low": osc("sawtooth", 1, 0, 0.6); osc("sine", 0.5, 0, 0.8); f.frequency.value = 260; attack = length * 0.3; break;
    case "musicbox": osc("sine", 1); osc("sine", 3, 0, 0.12); f.frequency.value = 5000; release = Math.min(length, 1.4); break;
    case "harpsichord": osc("sawtooth", 1, 0, 0.6); osc("square", 2, 0, 0.15); f.frequency.value = 3200; release = Math.min(length, 0.5); break;
    case "pulse": osc("square", 1, 0, 0.6); f.frequency.value = 1800; release = Math.min(length, 0.18); break;
    case "square": osc("square", 1, -5, 0.4); osc("square", 1, 5, 0.4); f.frequency.value = 2200; release = Math.min(length, 0.4); break;
    case "bell": osc("sine", 1); osc("sine", 2.76, 0, 0.25); osc("sine", 5.4, 0, 0.08); f.frequency.value = 6000; release = Math.min(length * 2, 3); break;
    case "pluck": osc("triangle", 1, 0, 0.8); f.frequency.value = 1200; release = Math.min(length, 0.3); break;
    case "reed": osc("sawtooth", 1, 0, 0.5); f.frequency.value = 900; f.Q.value = 4; attack = 0.06; break;
    case "bass": osc("triangle", 1, 0, 0.9); osc("sine", 0.5, 0, 0.6); f.frequency.value = 500; release = Math.min(length, 0.9); break;
    case "synthbass": osc("square", 1, 0, 0.6); f.frequency.value = 420; f.Q.value = 6; release = Math.min(length, 0.22); break;
  }
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(volume, at + attack);
  if (release > attack + 0.02) g.gain.setTargetAtTime(0.0001, at + attack, Math.max(0.03, (release - attack) / 3.5));
  else g.gain.exponentialRampToValueAtTime(0.0001, at + release);
  f.connect(g).connect(out);
  const end = at + Math.max(release, attack) + 0.6;
  for (const o of stops) o.stop(end);
}

function drum(ctx, out, kind, at) {
  if (kind === "kick") {
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.frequency.setValueAtTime(120, at); o.frequency.exponentialRampToValueAtTime(40, at + 0.15);
    g.gain.setValueAtTime(0.7, at); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.25);
    o.connect(g).connect(out); o.start(at); o.stop(at + 0.3);
    return;
  }
  const length = kind === "hat" ? 0.04 : kind === "metal" ? 0.25 : 0.14;
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * length), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 2;
  const src = ctx.createBufferSource(); src.buffer = buf;
  const f = ctx.createBiquadFilter(); const g = ctx.createGain();
  f.type = kind === "snare" ? "bandpass" : "highpass";
  f.frequency.value = kind === "hat" ? 7000 : kind === "metal" ? 3500 : 1800;
  if (kind === "metal") f.Q.value = 12;
  g.gain.value = kind === "hat" ? 0.18 : kind === "metal" ? 0.25 : 0.35;
  src.connect(f).connect(g).connect(out); src.start(at);
}

// Motivo di due battute (32 sedicesimi): gradi della scala relativi all'accordo, o null.
function makeMotif(random, density) {
  const motif = [];
  let degree = 2 + Math.floor(random() * 3);
  for (let i = 0; i < 32; i++) {
    const strong = i % 4 === 0;
    if (random() < (strong ? density * 1.6 : density * 0.5)) {
      degree += Math.round((random() - 0.5) * 4);
      degree = Math.max(0, Math.min(9, degree));
      motif.push({ degree, length: strong && random() < 0.5 ? 4 : 2 });
    } else motif.push(null);
  }
  return motif;
}

function scaleNote(theme, degree, octave = 0) {
  const s = theme.scale;
  const o = Math.floor(degree / s.length);
  return theme.root + s[((degree % s.length) + s.length) % s.length] + 12 * (o + octave);
}

function schedule() {
  const c = current;
  if (!c) return;
  const { ctx, theme, bus } = c;
  const sixteenth = 60 / theme.bpm / 4;
  if (c.nextAt < ctx.currentTime - 1) c.nextAt = ctx.currentTime + 0.05;   // dopo una pausa del telefono
  while (c.nextAt < ctx.currentTime + 0.35) {
    const at = c.nextAt;
    const step = c.step % 16;
    const bar = Math.floor(c.step / 16);
    const chordDegree = theme.chords[bar % theme.chords.length];
    const chord = [0, 2, 4, 7].map(k => scaleNote(theme, chordDegree + k, 0));
    if (step === 0) {
      const barLen = sixteenth * 16;
      for (const n of chord.slice(0, 3)) note(ctx, bus, theme.pad, midi(n), at, barLen * 1.02, 0.05);
      // ogni 8 battute il motivo cambia un po', ogni 16 ne nasce uno nuovo
      if (bar % 16 === 0 && bar) c.motif = makeMotif(c.random, theme.lead);
      else if (bar % 8 === 0 && bar) c.motif = c.motif.map(m => m && c.random() < 0.3 ? { ...m, degree: Math.max(0, m.degree + (c.random() < 0.5 ? 1 : -1)) } : m);
    }
    const a = theme.arp[step];
    if (a !== null && a !== undefined) note(ctx, bus, theme.arpVoice ?? theme.leadVoice, midi(chord[a % chord.length] + 12), at, sixteenth * 2, 0.045);
    if (theme.bass[step] !== null && theme.bass[step] !== undefined) {
      note(ctx, bus, theme.drums ? "synthbass" : "bass", midi(scaleNote(theme, chordDegree, -1)), at, sixteenth * 4, 0.12);
    }
    const m = c.motif[(bar % 2) * 16 + step];
    if (m) note(ctx, bus, theme.leadVoice, midi(scaleNote(theme, chordDegree + m.degree, 1)), at, sixteenth * m.length, 0.06);
    if (theme.drums) for (const [kind, steps] of Object.entries(theme.drums)) if (steps.includes(step)) drum(ctx, bus, kind, at);
    c.step++;
    c.nextAt += sixteenth;
  }
}

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
    const theme = themes[name];
    const bus = ctx.createGain();
    const echo = ctx.createDelay(1); const fb = ctx.createGain(); const wet = ctx.createGain();
    echo.delayTime.value = 60 / theme.bpm * 0.75; fb.gain.value = 0.28; wet.gain.value = 0.22;
    bus.connect(echo).connect(fb).connect(echo); echo.connect(wet).connect(out);
    bus.gain.setValueAtTime(0.0001, ctx.currentTime);
    bus.gain.exponentialRampToValueAtTime(theme.volume, ctx.currentTime + 2.5);
    bus.connect(out);
    const random = seeded(Date.now() % 100000);
    current = { name, theme, bus, wet, ctx, step: 0, nextAt: ctx.currentTime + 0.1, random, motif: makeMotif(random, theme.lead) };
    current.timer = setInterval(schedule, 90);
    schedule();
  } catch { current = null; }
}

export function stopMusic() {
  if (!current) return;
  const { bus, wet, timer, ctx } = current;
  clearInterval(timer);
  current = null;
  try {
    bus.gain.cancelScheduledValues(ctx.currentTime);
    bus.gain.setValueAtTime(Math.max(bus.gain.value, 0.0001), ctx.currentTime);
    bus.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
    setTimeout(() => { try { bus.disconnect(); wet.disconnect(); } catch { /* già scollegato */ } }, 1500);
  } catch { /* audio non disponibile */ }
}

export function setMusic(on, name) {
  enabled = on;
  try { localStorage.setItem(key, on ? "on" : "off"); } catch { /* solo per questa sessione */ }
  if (!on) stopMusic(); else if (name) playMusic(name);
}
