// Opzioni di gioco: animazioni veloci, vibrazione e testo grande. Si salvano nel telefono.
const keys = { fast: "veilbreak-veloce", vibration: "veilbreak-vibrazione", bigText: "veilbreak-testo-grande" };
const defaults = { fast: false, vibration: true, bigText: false };
const memory = {};

export function option(name) {
  if (name in memory) return memory[name];
  try {
    const v = localStorage.getItem(keys[name]);
    if (v === "on") return true;
    if (v === "off") return false;
  } catch { /* memoria locale bloccata */ }
  return defaults[name];
}

export function setOption(name, on) {
  memory[name] = on;
  try { localStorage.setItem(keys[name], on ? "on" : "off"); } catch { /* solo per questa sessione */ }
  applyOptions();
}

// Fattore dei tempi: con le animazioni veloci attese ed effetti durano poco più della metà.
export const speed = () => option("fast") ? 0.55 : 1;

export function applyOptions() {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("fast-anim", option("fast"));
  document.documentElement.classList.toggle("big-text", option("bigText"));
}

// Con le animazioni veloci anche le animazioni del foglio di stile vanno più svelte.
if (typeof document !== "undefined") {
  const quicken = event => {
    if (!option("fast")) return;
    for (const a of event.target.getAnimations?.() ?? []) if (a.playbackRate === 1) a.playbackRate = 1 / speed();
  };
  document.addEventListener("animationstart", quicken, true);
  document.addEventListener("transitionrun", quicken, true);
  applyOptions();
}

// Vibrazione: nell'app Android usa il motore aptico del telefono, altrimenti la vibrazione del browser.
// strength: "light" (tocchi), "medium" (attacchi), "heavy" (colpi subiti, Leggendarie).
export function vibrate(ms = 30, strength = "medium") {
  if (!option("vibration")) return;
  try {
    const haptics = globalThis.Capacitor?.isNativePlatform?.() ? globalThis.Capacitor.Plugins?.Haptics : null;
    if (haptics) {
      if (ms >= 80) haptics.vibrate({ duration: ms });
      else haptics.impact({ style: { light: "LIGHT", medium: "MEDIUM", heavy: "HEAVY" }[strength] ?? "MEDIUM" });
      return;
    }
    navigator.vibrate?.(ms);
  } catch { /* nessuna vibrazione */ }
}
