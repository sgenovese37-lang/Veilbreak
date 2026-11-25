// Suoni sintetizzati con Web Audio: nessun file da scaricare. Si possono disattivare.
import { vibrate } from "./options.mjs";
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

import { effects, cardVoice, showcase } from "./sfx.mjs";
import { impulse } from "./synth.mjs";

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

export const soundEnabled = () => enabled;

export function setSound(on) {
  enabled = on;
  try { localStorage.setItem(key, on ? "on" : "off"); } catch { /* preferenza solo per questa sessione */ }
}

// Bus degli effetti: riverbero corto e limitatore, così gli effetti non distorcono mai.
let sfxBus = null;
function effectsBus(ctx) {
  if (sfxBus?.ctx === ctx) return sfxBus.input;
  const input = ctx.createGain(); input.gain.value = 1;
  const dry = ctx.createGain(); dry.gain.value = 0.85;
  const verb = ctx.createConvolver(); verb.buffer = impulse(ctx, 2.6, 3);
  const wet = ctx.createGain(); wet.gain.value = 0.38;
  const limit = ctx.createDynamicsCompressor();
  limit.threshold.value = -10; limit.ratio.value = 8; limit.attack.value = 0.003; limit.release.value = 0.25;
  const out = ctx.createGain(); out.gain.value = 1.05;
  input.connect(dry).connect(limit);
  input.connect(verb).connect(wet).connect(limit);
  limit.connect(out).connect(master);
  sfxBus = { ctx, input };
  return input;
}

export function sound(name) {
  if (!enabled || !effects[name]) return;
  try {
    const ctx = audio();
    if (!ctx) return;
    effects[name](ctx, effectsBus(ctx), ctx.currentTime + 0.01);
  } catch { /* audio non disponibile */ }
}

// Breve vibrazione sui telefoni che la supportano (si accende e spegne dalle impostazioni, a parte i suoni).
export const buzz = (ms = 30, strength) => vibrate(ms, strength);

// ---------- Suoni delle carte ----------
// Ogni carta ha la sua voce (sfx.mjs): il timbro dipende dalla fazione, l'altezza dall'ID della carta.
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
    cardVoice(ctx, effectsBus(ctx), card, event, now + 0.01);
  } catch { /* audio non disponibile */ }
}

// Registra tutti gli effetti uno dopo l'altro (per ascoltarli fuori dal gioco: tools/registra_musica.cjs).
export async function renderEffects(cards = [], sampleRate = 44100, onlyAttacks = false) {
  const items = onlyAttacks ? [] : [...showcase];
  // solo attacchi: fendente della carta e colpo sul bersaglio, come in partita
  if (onlyAttacks) for (const card of cards) items.push({ length: 1.4, play: (c, d, at) => { cardVoice(c, d, card, "attack", at); cardVoice(c, d, card, "hurt", at + 0.22); } }, { length: 1.6, play: (c, d, at) => { cardVoice(c, d, card, "attack", at); effects.hit(c, d, at + 0.22); } });
  else for (const card of cards) for (const event of ["enter", "attack", "hurt", "death"]) items.push({ length: event === "death" || event === "enter" ? 1.9 : 1.1, play: (c, d, at) => cardVoice(c, d, card, event, at) });
  const seconds = items.reduce((sum, item) => sum + item.length, 1);
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * sampleRate), sampleRate);
  const previous = master;
  master = ctx.destination;
  sfxBus = null;
  let at = 0.2;
  for (const item of items) { item.play(ctx, effectsBus(ctx), at); at += item.length; }
  master = previous;
  sfxBus = null;
  return ctx.startRendering();
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
    bus.gain.value = 0.0001; bus.gain.setValueAtTime(0.0001, ctx.currentTime);
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
      g.gain.value = 0.0001; g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, at + length);
      o.connect(g).connect(bus); o.start(at); o.stop(at + length + 0.05);
    };
    let tick = null;
    if (theme === "hollow") {            // sala d'archivio: bordone grave e una campana lontana
      drone(55, "sine", 0.12); drone(82.4, "sine", 0.05);
      tick = () => { ping(220, 4, 0.05); ping(220 * 2.76, 2.5, 0.015); };
    } else if (theme === "neon") {       // stazione elettrica: ronzio e pioggia
      drone(60, "sawtooth", 0.03); loopNoise(0.05, "highpass", 3000);
      tick = () => { if (Math.random() < 0.5) ping(2400 + Math.random() * 1600, 0.05, 0.006); };   // scintille elettriche lontane
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
