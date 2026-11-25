// Suoni sintetizzati con Web Audio: nessun file da scaricare. Si possono disattivare.
// Sul telefono l'audio parte "sospeso": va sbloccato al primo tocco dello schermo.
const key = "veilbreak-sound";
let context = null;
let master = null;
let enabled = true;
try { enabled = localStorage.getItem(key) !== "off"; } catch { enabled = true; }

function audio() {
  if (!context) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    context = new Ctx();
    master = context.createGain();
    master.gain.value = 0.9;
    master.connect(context.destination);
  }
  if (context.state === "suspended") context.resume().catch(() => {});
  return context;
}

// Per la musica (music.mjs): stesso contesto audio e stessa uscita dei suoni.
export const audioContext = () => audio();
export const audioOutput = () => master;

// Con l'app in secondo piano (telefono bloccato, altra app) l'audio si mette in pausa.
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (!context) return;
    if (document.hidden) context.suspend().catch(() => {});
    else context.resume().catch(() => {});
  });
}

// Sblocco al primo tocco, in qualunque punto dell'app.
for (const ev of ["pointerdown", "touchstart", "keydown"]) {
  window.addEventListener(ev, () => { try { audio(); } catch { /* audio non disponibile */ } }, { passive: true });
}

// [frequenza iniziale, frequenza finale, durata, forma d'onda, volume]
const sounds = {
  select: [[660, 760, 0.05, "triangle", 0.25]],
  play: [[300, 520, 0.12, "triangle", 0.4], [520, 700, 0.12, "sine", 0.3]],
  summon: [[140, 90, 0.18, "sawtooth", 0.35], [420, 620, 0.16, "triangle", 0.35]],
  cast: [[880, 1320, 0.1, "sine", 0.3], [1320, 660, 0.25, "triangle", 0.3]],
  attack: [[220, 110, 0.09, "sawtooth", 0.45]],
  hit: [[160, 60, 0.16, "square", 0.45], ["noise", 0.12, 0.35]],
  death: [[300, 60, 0.35, "sawtooth", 0.4], ["noise", 0.3, 0.3]],
  heal: [[523, 784, 0.18, "sine", 0.35], [784, 1046, 0.2, "sine", 0.25]],
  power: [[392, 784, 0.12, "sine", 0.4], [784, 1175, 0.16, "triangle", 0.3]],
  mana: [[1046, 880, 0.07, "sine", 0.25]],
  turn: [[392, 392, 0.12, "triangle", 0.45], [523, 523, 0.12, "triangle", 0.45], [784, 784, 0.28, "triangle", 0.45]],
  enemy: [[220, 220, 0.18, "sine", 0.35], [185, 185, 0.3, "sine", 0.35]],
  reward: [[523, 523, 0.08, "triangle", 0.4], [659, 659, 0.08, "triangle", 0.4], [784, 784, 0.16, "triangle", 0.4]],
  win: [[392, 392, 0.14, "triangle", 0.45], [523, 523, 0.14, "triangle", 0.45], [659, 659, 0.14, "triangle", 0.45], [784, 784, 0.4, "triangle", 0.45]],
  lose: [[330, 320, 0.22, "sine", 0.4], [262, 250, 0.22, "sine", 0.4], [196, 180, 0.45, "sine", 0.4]],
  pack: [[300, 300, 0.06, "sine", 0.3], [450, 450, 0.06, "sine", 0.3], [600, 600, 0.06, "sine", 0.3], [900, 1200, 0.2, "triangle", 0.4]],
};

export const soundEnabled = () => enabled;

export function setSound(on) {
  enabled = on;
  try { localStorage.setItem(key, on ? "on" : "off"); } catch { /* preferenza solo per questa sessione */ }
}

function noise(ctx, at, length, volume) {
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * length), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = ctx.createBufferSource();
  const gain = ctx.createGain();
  gain.gain.value = volume;
  src.buffer = buffer;
  src.connect(gain).connect(master);
  src.start(at);
}

export function sound(name) {
  if (!enabled || !sounds[name]) return;
  try {
    const ctx = audio();
    if (!ctx) return;
    let at = ctx.currentTime + 0.01;
    for (const step of sounds[name]) {
      if (step[0] === "noise") { noise(ctx, at, step[1], step[2]); continue; }
      const [from, to, length, type, volume] = step;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(from, at);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), at + length);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(volume, at + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
      osc.connect(gain).connect(master);
      osc.start(at);
      osc.stop(at + length + 0.03);
      at += length * 0.8;
    }
  } catch { /* audio non disponibile */ }
}

// Breve vibrazione sui telefoni che la supportano.
export function buzz(ms = 30) {
  try { if (enabled) navigator.vibrate?.(ms); } catch { /* nessuna vibrazione */ }
}

// ---------- Suoni delle carte ----------
// Ogni carta ha la sua voce: il timbro dipende dalla fazione, l'altezza e il ritmo dall'ID della carta.
const timbres = {
  "Corte di Hollow": { wave: "sine", overtone: 2.76, noise: 0, vibrato: 0 },      // campane e ottoni lontani
  "Patto Neon": { wave: "square", overtone: 1.5, noise: 0.08, vibrato: 0, glitch: true }, // elettronica che sfrigola
  "Senza Santi": { wave: "triangle", overtone: 1.5, noise: 0, vibrato: 6 },      // voci da coro
  "Sottocittà": { wave: "sawtooth", overtone: 0.5, noise: 0.25, vibrato: 0 },    // ringhi e gocce
};
const semitone = n => Math.pow(2, n / 12);
function seedOf(id) { let h = 2166136261; for (const ch of String(id)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; }

function voice(ctx, at, freq, length, t, volume, glide = 1) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = t.wave;
  osc.frequency.setValueAtTime(freq, at);
  osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq * glide), at + length);
  if (t.vibrato) {
    const lfo = ctx.createOscillator(); const depth = ctx.createGain();
    lfo.frequency.value = t.vibrato; depth.gain.value = freq * 0.02;
    lfo.connect(depth).connect(osc.frequency); lfo.start(at); lfo.stop(at + length + 0.05);
  }
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(volume, at + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
  osc.connect(gain).connect(master);
  osc.start(at); osc.stop(at + length + 0.05);
  if (t.overtone) {
    const o2 = ctx.createOscillator(); const g2 = ctx.createGain();
    o2.type = "sine"; o2.frequency.setValueAtTime(freq * t.overtone, at);
    o2.frequency.exponentialRampToValueAtTime(Math.max(30, freq * t.overtone * glide), at + length);
    g2.gain.setValueAtTime(0.0001, at); g2.gain.exponentialRampToValueAtTime(volume * 0.35, at + 0.01);
    g2.gain.exponentialRampToValueAtTime(0.0001, at + length * 0.7);
    o2.connect(g2).connect(master); o2.start(at); o2.stop(at + length);
  }
}

let lastCardSound = 0;
// event: "enter" (entra in gioco), "attack" (attacca), "hurt" (subisce danni), "death" (muore)
export function cardSound(card, event) {
  if (!enabled || !card) return;
  try {
    const ctx = audio();
    if (!ctx) return;
    const now = ctx.currentTime;
    if (event === "hurt" && now - lastCardSound < 0.08) return; // niente valanghe di suoni
    lastCardSound = now;
    const t = timbres[card.faction] ?? { wave: "triangle", overtone: 2, noise: 0, vibrato: 0 };
    const seed = seedOf(card.id);
    const base = 110 * semitone(seed % 14) * (card.type === "Creatura" ? 1 : 2);
    const step = [3, 4, 5, 7][seed % 4];
    const big = card.rarity === "Legendary" || card.rarity === "Epic";
    let at = now + 0.01;
    if (event === "enter") {
      const notes = big ? [0, step, 12, 12 + step] : [0, step, 12];
      for (const n of notes) { voice(ctx, at, base * semitone(n), 0.16, t, 0.28); at += t.glitch ? 0.05 : 0.09; }
      if (big) voice(ctx, at, base * 2, 0.6, t, 0.22);
    } else if (event === "attack") {
      voice(ctx, at, base * 2.2, 0.16, t, 0.3, 0.45);
      if (t.glitch) voice(ctx, at + 0.05, base * 3, 0.06, t, 0.18);
    } else if (event === "hurt") {
      voice(ctx, at, base * 0.9, 0.14, t, 0.3, 0.6);
    } else if (event === "death") {
      voice(ctx, at, base * 1.5, 0.55, t, 0.3, 0.25);
      voice(ctx, at + 0.12, base * semitone(-step), 0.6, t, 0.2, 0.3);
    }
    if (t.noise && (event === "attack" || event === "death" || event === "hurt")) noise(ctx, at, event === "death" ? 0.35 : 0.12, t.noise);
  } catch { /* audio non disponibile */ }
}

// ---------- Sottofondo delle ambientazioni ----------
let ambience = null;
export function startAmbience(theme) {
  stopAmbience();
  if (!enabled) return;
  try {
    const ctx = audio();
    if (!ctx) return;
    const bus = ctx.createGain();
    bus.gain.setValueAtTime(0.0001, ctx.currentTime);
    bus.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 2);
    bus.connect(master);
    const nodes = [];
    const drone = (freq, type, vol) => {
      const o = ctx.createOscillator(); const g = ctx.createGain(); const f = ctx.createBiquadFilter();
      o.type = type; o.frequency.value = freq; f.type = "lowpass"; f.frequency.value = 400; g.gain.value = vol;
      o.connect(f).connect(g).connect(bus); o.start(); nodes.push(o);
    };
    const loopNoise = (vol, filterType, freq) => {
      const len = ctx.sampleRate * 2; const buf = ctx.createBuffer(1, len, ctx.sampleRate); const d = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) { last = (last + (Math.random() * 2 - 1) * 0.08) * 0.98; d[i] = filterType === "lowpass" ? last * 3 : Math.random() * 2 - 1; }
      const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      const f = ctx.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; const g = ctx.createGain(); g.gain.value = vol;
      src.connect(f).connect(g).connect(bus); src.start(); nodes.push(src);
    };
    const ping = (freq, length, vol, type = "sine") => {
      const at = ctx.currentTime; const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, at + length);
      o.connect(g).connect(bus); o.start(at); o.stop(at + length + 0.05);
    };
    let tick = null;
    if (theme === "hollow") {            // sala d'archivio: bordone grave e una campana lontana
      drone(55, "sine", 0.12); drone(82.4, "sine", 0.05);
      tick = () => { ping(220, 4, 0.05); ping(220 * 2.76, 2.5, 0.015); };
    } else if (theme === "neon") {       // stazione elettrica: ronzio e pioggia
      drone(60, "sawtooth", 0.03); loopNoise(0.05, "highpass", 3000);
      tick = () => { if (Math.random() < 0.6) ping(1200 + Math.random() * 800, 0.08, 0.02, "square"); };
    } else if (theme === "saints") {     // cappella: accordo da coro che respira
      drone(196, "triangle", 0.025); drone(246.9, "triangle", 0.02); drone(293.7, "triangle", 0.015);
      tick = () => ping(587.3, 3, 0.02, "triangle");
    } else if (theme === "undercity") {  // galleria: rombo e gocce
      loopNoise(0.12, "lowpass", 180); drone(41, "sine", 0.08);
      tick = () => { ping(900 + Math.random() * 600, 0.12, 0.05); };
    }
    const timer = tick ? setInterval(() => { if (enabled) tick(); }, theme === "undercity" ? 2300 : theme === "neon" ? 1700 : 7000) : null;
    ambience = { bus, nodes, timer, ctx };
  } catch { ambience = null; }
}
export function stopAmbience() {
  if (!ambience) return;
  const { bus, nodes, timer, ctx } = ambience;
  clearInterval(timer);
  try {
    bus.gain.cancelScheduledValues(ctx.currentTime);
    bus.gain.setValueAtTime(Math.max(bus.gain.value, 0.0001), ctx.currentTime);
    bus.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);
    setTimeout(() => { for (const n of nodes) { try { n.stop(); } catch { /* già fermo */ } } bus.disconnect(); }, 900);
  } catch { /* audio non disponibile */ }
  ambience = null;
}
