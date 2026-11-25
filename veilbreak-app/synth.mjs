// Strumenti sintetizzati condivisi da musica (music.mjs) ed effetti sonori (sfx.mjs):
// archi, coro, organo, pianoforte, campane, violoncello, bordoni, rumori, colpi e riverbero.
// Ogni funzione riceve il contesto audio, la destinazione e il momento in cui suonare.
export const hz = n => 440 * Math.pow(2, (n - 69) / 12);
export function seeded(seed) { return () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648); }

export function envelope(ctx, at, attack, hold, release, peak) {
  const g = ctx.createGain();
  g.gain.value = 0.0001;   // senza questo il volume resta a 1 fino al primo evento e si sente un clic
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + attack);
  g.gain.setValueAtTime(peak, at + attack + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, at + attack + hold + release);
  return g;
}
export const end = (at, attack, hold, release) => at + attack + hold + release + 0.1;

// Archi: tre seghe leggermente scordate per nota, filtro passa-basso che respira.
export function strings(ctx, dest, notes, at, dur, { vol = 0.05, cut = 900, attack = dur * 0.4 } = {}) {
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
export const vowels = { a: [[800, 1], [1150, 0.5], [2900, 0.18]], u: [[350, 1], [600, 0.45], [2400, 0.08]], o: [[450, 1], [800, 0.5], [2830, 0.1]] };
export function choir(ctx, dest, notes, at, dur, { vol = 0.06, vowel = "a" } = {}) {
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
export function organ(ctx, dest, notes, at, dur, { vol = 0.035 } = {}) {
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
export function piano(ctx, dest, n, at, { vol = 0.07, detune = 0, length = 4 } = {}) {
  for (const [mult, amp, decay] of [[1, 1, length], [2, 0.35, length * 0.6], [3, 0.15, length * 0.4], [4.02, 0.08, length * 0.25]]) {
    const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = hz(n) * mult; o.detune.value = detune;
    const g = envelope(ctx, at, 0.006, 0, decay, vol * amp);
    o.connect(g).connect(dest); o.start(at); o.stop(at + decay + 0.2);
  }
}

// Campana: parziali non armoniche, lunghissima coda.
export function bell(ctx, dest, n, at, { vol = 0.05, length = 7 } = {}) {
  for (const [mult, amp, decay] of [[0.5, 0.6, length], [1, 1, length * 0.8], [2.76, 0.45, length * 0.5], [5.4, 0.2, length * 0.3], [8.93, 0.08, length * 0.15]]) {
    const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = hz(n) * mult;
    const g = envelope(ctx, at, 0.004, 0, decay, vol * amp);
    o.connect(g).connect(dest); o.start(at); o.stop(at + decay + 0.2);
  }
}

// Violoncello: una sega scura con vibrato lento, per i motivi gravi.
export function cello(ctx, dest, n, at, dur, { vol = 0.06 } = {}) {
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
export function drone(ctx, dest, n, at, dur, { vol = 0.08 } = {}) {
  const g = envelope(ctx, at, dur * 0.3, dur * 0.5, dur * 0.5, vol);
  g.connect(dest);
  for (const [type, mult] of [["sine", 1], ["triangle", 0.5]]) {
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = hz(n) * mult;
    o.connect(g); o.start(at); o.stop(at + dur * 1.3 + 0.2);
  }
}

export function noiseBuffer(ctx) {
  if (ctx._veilNoise) return ctx._veilNoise;
  const buf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  ctx._veilNoise = buf;
  return buf;
}
export function noise(ctx, dest, at, dur, { type = "lowpass", from = 400, to = 400, q = 1, vol = 0.03, attack = dur * 0.4, release = dur * 0.4 } = {}) {
  const src = ctx.createBufferSource(); src.buffer = noiseBuffer(ctx); src.loop = true;
  const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(from, at); f.frequency.exponentialRampToValueAtTime(to, at + dur);
  const g = envelope(ctx, at, attack, Math.max(0, dur - attack - release), release, vol);
  src.connect(f).connect(g).connect(dest);
  src.start(at, Math.random() * 2); src.stop(at + dur + 0.2);
}
export const wind = (ctx, dest, at, dur, vol = 0.025) => noise(ctx, dest, at, dur, { from: 250 + Math.random() * 200, to: 500 + Math.random() * 500, q: 3, vol });
// Crescendo spettrale prima di un cambio d'accordo.
export const riser = (ctx, dest, at, dur, vol = 0.02) => noise(ctx, dest, at, dur, { type: "bandpass", from: 300, to: 3500, q: 6, vol, attack: dur * 0.95, release: 0.08 });

export function thump(ctx, dest, at, { vol = 0.5, from = 70, to = 38, length = 0.5 } = {}) {
  const o = ctx.createOscillator(); o.type = "sine";
  o.frequency.setValueAtTime(from, at); o.frequency.exponentialRampToValueAtTime(to, at + length * 0.6);
  const g = envelope(ctx, at, 0.008, 0, length, vol);
  o.connect(g).connect(dest); o.start(at); o.stop(at + length + 0.1);
}
export const heartbeat = (ctx, dest, at, vol = 0.45) => { thump(ctx, dest, at, { vol }); thump(ctx, dest, at + 0.28, { vol: vol * 0.6 }); };
export function tom(ctx, dest, at, vol = 0.35) {
  thump(ctx, dest, at, { vol, from: 110, to: 55, length: 0.7 });
  noise(ctx, dest, at, 0.25, { type: "lowpass", from: 900, to: 200, vol: vol * 0.15, attack: 0.005, release: 0.2 });
}


// Risposta all'impulso per il riverbero (rumore che si spegne)
export function impulse(ctx, seconds = 5, decay = 2.6) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

