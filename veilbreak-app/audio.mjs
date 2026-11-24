// Suoni sintetizzati con Web Audio: nessun file da scaricare. Si possono disattivare.
const key = "veilbreak-sound";
let context = null;
let enabled = true;
try { enabled = localStorage.getItem(key) !== "off"; } catch { enabled = true; }

const sounds = {
  play: [[440, 0.07, "triangle"], [660, 0.09, "triangle"]],
  attack: [[180, 0.08, "sawtooth"], [120, 0.1, "sawtooth"]],
  hit: [[90, 0.12, "square"]],
  power: [[520, 0.06, "sine"], [780, 0.1, "sine"]],
  reward: [[523, 0.08, "triangle"], [659, 0.08, "triangle"], [784, 0.14, "triangle"]],
  win: [[392, 0.12, "triangle"], [523, 0.12, "triangle"], [659, 0.12, "triangle"], [784, 0.25, "triangle"]],
  lose: [[330, 0.18, "sine"], [262, 0.18, "sine"], [196, 0.3, "sine"]],
  pack: [[300, 0.05, "sine"], [450, 0.05, "sine"], [600, 0.05, "sine"], [900, 0.16, "triangle"]],
};

export const soundEnabled = () => enabled;

export function setSound(on) {
  enabled = on;
  try { localStorage.setItem(key, on ? "on" : "off"); } catch { /* preferenza solo per questa sessione */ }
}

export function sound(name) {
  if (!enabled || !sounds[name]) return;
  try {
    context ??= new (window.AudioContext || window.webkitAudioContext)();
    let at = context.currentTime;
    for (const [frequency, length, type] of sounds[name]) {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = type;
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.08, at + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
      osc.connect(gain).connect(context.destination);
      osc.start(at);
      osc.stop(at + length + 0.02);
      at += length * 0.85;
    }
  } catch { /* audio non disponibile */ }
}
