// Effetti sonori in stile fantasy horror, sintetizzati (nessun file audio).
// effects[nome](ctx, dest, at) suona l'effetto; cardVoice(...) dà a ogni carta la sua voce
// secondo la fazione: campane e sussurri (Corte), scariche elettriche (Patto Neon),
// cori (Senza Santi), ringhi e gocce (Sottocittà). L'altezza cambia da carta a carta.
import { hz, envelope, choir, bell, noise, thump, organ, strings } from "./synth.mjs";

// ---------- Strumenti degli effetti ----------
// Fruscio: rumore filtrato che scorre (carte, colpi d'aria).
const whoosh = (ctx, d, at, dur, { from = 400, to = 2400, vol = 0.25, q = 2 } = {}) =>
  noise(ctx, d, at, dur, { type: "bandpass", from, to, q, vol, attack: dur * 0.45, release: dur * 0.5 });

// Lamento spettrale: due seghe filtrate su una vocale, che scendono di tono.
function wail(ctx, d, at, n, dur, { vol = 0.12, drop = 0.5, vowel = 800 } = {}) {
  const g = envelope(ctx, at, dur * 0.2, dur * 0.3, dur * 0.5, vol);
  const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = vowel; bp.Q.value = 5;
  const bp2 = ctx.createBiquadFilter(); bp2.type = "bandpass"; bp2.frequency.value = vowel * 1.5; bp2.Q.value = 6;
  const sum = ctx.createGain(); sum.gain.value = 2.5;
  bp.connect(sum); bp2.connect(sum); sum.connect(g).connect(d);
  for (const det of [-18, 15]) {
    const o = ctx.createOscillator(); o.type = "sawtooth"; o.detune.value = det;
    o.frequency.setValueAtTime(hz(n), at);
    o.frequency.exponentialRampToValueAtTime(hz(n) * drop, at + dur);
    const lfo = ctx.createOscillator(); const depth = ctx.createGain();
    lfo.frequency.value = 6; depth.gain.value = 25; lfo.connect(depth).connect(o.detune);
    o.connect(bp); o.connect(bp2); o.start(at); lfo.start(at); o.stop(at + dur + 0.2); lfo.stop(at + dur + 0.2);
  }
}

// Ringhio: sega grave modulata da rumore (bestie della Sottocittà).
function growl(ctx, d, at, n, dur, { vol = 0.18, drop = 0.8 } = {}) {
  const o = ctx.createOscillator(); o.type = "sawtooth";
  o.frequency.setValueAtTime(hz(n), at); o.frequency.exponentialRampToValueAtTime(hz(n) * drop, at + dur);
  const am = ctx.createGain(); am.gain.value = 0.6;
  const lfo = ctx.createOscillator(); lfo.type = "square"; lfo.frequency.value = 23 + Math.random() * 8;
  const depth = ctx.createGain(); depth.gain.value = 0.4; lfo.connect(depth).connect(am.gain);
  const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 520; f.Q.value = 4;
  const g = envelope(ctx, at, 0.03, dur * 0.5, dur * 0.5, vol);
  o.connect(am).connect(f).connect(g).connect(d);
  o.start(at); lfo.start(at); o.stop(at + dur + 0.2); lfo.stop(at + dur + 0.2);
}

// Scarica elettrica: brevi raffiche di rumore acuto a intermittenza.
function crackle(ctx, d, at, dur, vol = 0.12) {
  let t = 0;
  while (t < dur) {
    const len = 0.01 + Math.random() * 0.035;
    noise(ctx, d, at + t, len, { type: "highpass", from: 2500 + Math.random() * 3000, to: 3000, vol: vol * (0.4 + Math.random() * 0.6), attack: 0.002, release: len * 0.6 });
    t += len + Math.random() * 0.05;
  }
}

// Ronzio che sale o scende (elettricità del Patto Neon).
function zap(ctx, d, at, n, dur, { vol = 0.08, glide = 2 } = {}) {
  const o = ctx.createOscillator(); o.type = "sawtooth";
  o.frequency.setValueAtTime(hz(n), at); o.frequency.exponentialRampToValueAtTime(hz(n) * glide, at + dur);
  const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 1400; f.Q.value = 3;
  const g = envelope(ctx, at, 0.01, dur * 0.4, dur * 0.6, vol);
  o.connect(f).connect(g).connect(d); o.start(at); o.stop(at + dur + 0.2);
}

// Gocce d'acqua nelle gallerie.
function drip(ctx, d, at, n = 88, vol = 0.1) {
  const o = ctx.createOscillator(); o.type = "sine";
  o.frequency.setValueAtTime(hz(n), at); o.frequency.exponentialRampToValueAtTime(hz(n + 7), at + 0.06);
  const g = envelope(ctx, at, 0.003, 0, 0.12, vol);
  o.connect(g).connect(d); o.start(at); o.stop(at + 0.2);
}

// Sussurro: rumore filtrato su formanti (parole che non si capiscono).
function whisper(ctx, d, at, dur, vol = 0.06) {
  for (const [f, q] of [[1200, 8], [2600, 10]]) noise(ctx, d, at, dur, { type: "bandpass", from: f, to: f * (0.8 + Math.random() * 0.4), q, vol, attack: dur * 0.3, release: dur * 0.5 });
}

// Impatto da battaglia: colpo grave, lama che stride per un attimo, detriti che ricadono.
function impact(ctx, d, at, { weight = 1, metal = true } = {}) {
  thump(ctx, d, at, { vol: 0.55 * weight, from: 95, to: 32, length: 0.6 });
  noise(ctx, d, at, 0.09, { type: "bandpass", from: 2400, to: 900, q: 1.2, vol: 0.28 * weight, attack: 0.002, release: 0.08 });
  noise(ctx, d, at + 0.03, 0.45, { type: "lowpass", from: 1600, to: 200, vol: 0.1 * weight, attack: 0.01, release: 0.4 });
  if (metal) for (const [f, v] of [[523, 0.05], [1187, 0.035], [1932, 0.02]]) {
    const o = ctx.createOscillator(); o.type = "triangle"; o.frequency.value = f * (0.97 + Math.random() * 0.06);
    const g = envelope(ctx, at, 0.002, 0, 0.35, v * weight);
    o.connect(g).connect(d); o.start(at); o.stop(at + 0.45);
  }
}
// Fendente: aria tagliata da un colpo veloce, grave e corto (niente fischi acuti).
const slash = (ctx, d, at, vol = 0.22) => noise(ctx, d, at, 0.2, { type: "bandpass", from: 350, to: 1500, q: 1.4, vol, attack: 0.13, release: 0.06 });

// Campanella di cristallo.
function chime(ctx, d, at, n, vol = 0.06) { bell(ctx, d, n, at, { vol, length: 1.6 }); }

// ---------- Effetti di gioco ----------
export const effects = {
  // tocco su una carta o un pulsante: un ticchettio d'osso
  select: (ctx, d, at) => {
    noise(ctx, d, at, 0.035, { type: "bandpass", from: 1800, to: 1200, q: 6, vol: 0.22, attack: 0.002, release: 0.03 });
    thump(ctx, d, at, { vol: 0.12, from: 300, to: 180, length: 0.06 });
  },
  // carta giocata: fruscio della carta e colpo sordo sul tavolo
  play: (ctx, d, at) => {
    whoosh(ctx, d, at, 0.22, { from: 3000, to: 700, vol: 0.2 });
    thump(ctx, d, at + 0.16, { vol: 0.35, from: 110, to: 55, length: 0.35 });
  },
  // creatura evocata: rimbombo e respiro dal Velo
  summon: (ctx, d, at) => {
    thump(ctx, d, at, { vol: 0.45, from: 80, to: 32, length: 1.2 });
    whoosh(ctx, d, at, 0.8, { from: 200, to: 1600, vol: 0.12, q: 4 });
    whisper(ctx, d, at + 0.1, 0.7, 0.05);
  },
  // incantesimo: scintillio di campanelle scordate e soffio che sale
  cast: (ctx, d, at) => {
    whoosh(ctx, d, at, 0.5, { from: 500, to: 5000, vol: 0.12, q: 3 });
    [84, 87, 91, 96].forEach((n, i) => chime(ctx, d, at + 0.25 + i * 0.07, n + (i % 2 ? 0.3 : 0), 0.045));
    choir(ctx, d, [60, 63, 67], at + 0.2, 0.7, { vol: 0.05, vowel: "a" });
  },
  // attacco: colpo d'aria rapido
  attack: (ctx, d, at) => {
    slash(ctx, d, at);
    impact(ctx, d, at + 0.2, { weight: 0.8 });
  },
  // colpo all'eroe: impatto pesante e scricchiolio
  hit: (ctx, d, at) => {
    impact(ctx, d, at, { weight: 1.1, metal: false });
    thump(ctx, d, at + 0.06, { vol: 0.3, from: 60, to: 28, length: 0.9 });
  },
  // morte: lamento che si spegne nel riverbero
  death: (ctx, d, at) => {
    wail(ctx, d, at, 62, 1.1, { vol: 0.1, drop: 0.45 });
    noise(ctx, d, at, 0.9, { type: "lowpass", from: 900, to: 120, vol: 0.12, attack: 0.02, release: 0.8 });
  },
  // cura: coro breve e luminoso
  heal: (ctx, d, at) => {
    choir(ctx, d, [64, 68, 71], at, 0.9, { vol: 0.07, vowel: "a" });
    chime(ctx, d, at + 0.2, 88, 0.04);
  },
  // potere dell'eroe: caduta nel buio e campana lontana
  power: (ctx, d, at) => {
    thump(ctx, d, at, { vol: 0.4, from: 60, to: 28, length: 1.2 });
    whoosh(ctx, d, at, 0.6, { from: 4000, to: 300, vol: 0.12, q: 3 });
    bell(ctx, d, 57, at + 0.05, { vol: 0.05, length: 3 });
  },
  // Essenza spesa: tintinnio di cristallo
  mana: (ctx, d, at) => { chime(ctx, d, at, 93, 0.035); chime(ctx, d, at + 0.05, 100, 0.02); },
  // il tuo turno: rintocco di campana con coro
  turn: (ctx, d, at) => {
    bell(ctx, d, 52, at, { vol: 0.09, length: 5 });
    choir(ctx, d, [52, 59, 64], at + 0.05, 1.4, { vol: 0.05, vowel: "o" });
  },
  // turno avversario: corno grave e dissonante
  enemy: (ctx, d, at) => {
    strings(ctx, d, [41, 42], at, 1.2, { vol: 0.07, cut: 500, attack: 0.25 });
    thump(ctx, d, at, { vol: 0.3, from: 55, to: 35, length: 1 });
  },
  // premio: arpeggio d'arpa in minore con scintille
  reward: (ctx, d, at) => {
    [57, 60, 64, 69, 72, 76].forEach((n, i) => chime(ctx, d, at + i * 0.06, n + 12, 0.05));
    choir(ctx, d, [69, 72, 76], at + 0.3, 1, { vol: 0.04, vowel: "a" });
  },
  // vittoria: coro in maggiore, timpani e campane
  win: (ctx, d, at) => {
    for (let i = 0; i < 6; i++) thump(ctx, d, at + i * 0.08, { vol: 0.18 + i * 0.04, from: 95, to: 60, length: 0.3 });
    choir(ctx, d, [57, 61, 64, 69], at + 0.45, 2.6, { vol: 0.08, vowel: "a" });
    organ(ctx, d, [45, 57], at + 0.45, 2.4, { vol: 0.04 });
    bell(ctx, d, 69, at + 0.45, { vol: 0.06, length: 5 });
    bell(ctx, d, 76, at + 0.9, { vol: 0.04, length: 4 });
  },
  // sconfitta: cluster dissonante, campana a morto e battito che si spegne
  lose: (ctx, d, at) => {
    strings(ctx, d, [45, 46, 52], at, 2.4, { vol: 0.07, cut: 600, attack: 0.6 });
    bell(ctx, d, 40, at, { vol: 0.1, length: 7 });
    for (let i = 0; i < 3; i++) { thump(ctx, d, at + 0.8 + i * 0.9, { vol: 0.3 - i * 0.08 }); thump(ctx, d, at + 1.08 + i * 0.9, { vol: 0.18 - i * 0.05 }); }
  },
  // busta aperta: carte che frusciano e luce che sale
  pack: (ctx, d, at) => {
    for (let i = 0; i < 4; i++) whoosh(ctx, d, at + i * 0.09, 0.14, { from: 2500, to: 900, vol: 0.12 });
    whoosh(ctx, d, at + 0.35, 0.8, { from: 300, to: 6000, vol: 0.1, q: 4 });
    [76, 80, 83, 88].forEach((n, i) => chime(ctx, d, at + 0.9 + i * 0.05, n, 0.04));
  },
};

// ---------- Voci delle carte ----------
function seedOf(id) { let h = 2166136261; for (const ch of String(id)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; }

// event: "enter" (entra in gioco), "attack" (attacca), "hurt" (subisce danni), "death" (muore)
export function cardVoice(ctx, d, card, event, at) {
  const seed = seedOf(card.id);
  const base = 45 + (seed % 10);   // nota grave della carta
  const big = card.rarity === "Legendary" || card.rarity === "Epic";
  const faction = card.faction;
  if (event === "enter") {
    if (big) thump(ctx, d, at, { vol: 0.4, from: 70, to: 30, length: 1.4 });
    if (faction === "Corte di Hollow") { bell(ctx, d, base + 12, at, { vol: 0.06, length: big ? 4 : 2.2 }); whisper(ctx, d, at + 0.05, 0.6, 0.05); }
    else if (faction === "Patto Neon") { crackle(ctx, d, at, 0.35, 0.1); zap(ctx, d, at, base, 0.4, { glide: 3 }); }
    else if (faction === "Senza Santi") choir(ctx, d, [base + 12, base + 15, base + 19], at, big ? 1.6 : 0.9, { vol: 0.06, vowel: seed % 2 ? "a" : "o" });
    else if (faction === "Sottocittà") { growl(ctx, d, at, base - 12, 0.6, { vol: 0.16 }); drip(ctx, d, at + 0.35, 86 + seed % 6); }
    else effects.summon(ctx, d, at);
  } else if (event === "attack") {
    // il fendente: l'impatto arriva con il colpo ("hurt" della creatura colpita o "hit" sull'eroe)
    slash(ctx, d, at, big ? 0.28 : 0.22);
    if (faction === "Corte di Hollow") bell(ctx, d, base + 24, at + 0.05, { vol: 0.018, length: 1.2 });
    else if (faction === "Patto Neon") crackle(ctx, d, at, 0.12, 0.04);
    else if (faction === "Senza Santi") chime(ctx, d, at + 0.05, base + 31, 0.02);
    else if (faction === "Sottocittà") thump(ctx, d, at, { vol: 0.15, from: 70, to: 45, length: 0.3 });
  } else if (event === "hurt") {
    impact(ctx, d, at, { weight: big ? 0.9 : 0.7 });
  } else if (event === "death") {
    wail(ctx, d, at, base + 17, big ? 1.6 : 1, { vol: 0.09, drop: 0.4, vowel: faction === "Senza Santi" ? 700 : 900 });
    noise(ctx, d, at, 0.9, { type: "lowpass", from: 900, to: 100, vol: 0.12, attack: 0.02, release: 0.8 });
    if (faction === "Patto Neon") crackle(ctx, d, at, 0.5, 0.08);
    if (faction === "Corte di Hollow") bell(ctx, d, base, at + 0.1, { vol: 0.05, length: 3 });
  }
}

// Elenco per la registrazione di prova: tutti gli effetti e le voci di una carta per fazione.
export const showcase = [
  ...Object.keys(effects).map(name => ({ name, play: (ctx, d, at) => effects[name](ctx, d, at), length: ["win", "lose", "turn"].includes(name) ? 3.4 : 1.6 })),
];
