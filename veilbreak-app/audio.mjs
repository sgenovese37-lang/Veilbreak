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
