// Introduzione animata all'apertura dell'app (circa 7 secondi): la città di notte, un lampione che
// trema, il Velo che si incrina con una crepa di luce, il logo che emerge dalla luce.
// Solo animazioni CSS (nessun video da scaricare). Un tocco la salta; alla fine «Tocca per entrare»
// sblocca anche l'audio del telefono e fa partire campana e musica.
import { sound } from "./audio.mjs";
import { t } from "./i18n.mjs";

const crack = "M 210 -10 L 196 90 L 222 150 L 188 236 L 214 300 L 176 388 L 206 452 L 170 560 L 198 640 L 168 760 L 190 900";
const branches = ["M 222 150 L 262 176 L 300 168", "M 188 236 L 140 260 L 112 252", "M 176 388 L 232 420 L 268 446", "M 170 560 L 120 590"];

export function playIntro({ onEnter } = {}) {
  return new Promise(resolve => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const layer = document.createElement("div");
    layer.className = "intro";
    layer.setAttribute("role", "dialog");
    layer.setAttribute("aria-label", "VEILBREAK");
    layer.innerHTML = `
      <div class="intro-city"></div>
      <div class="intro-lamp"></div>
      <svg class="intro-crack" viewBox="0 0 400 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <path class="main" d="${crack}"/>
        ${branches.map(d => `<path class="branch" d="${d}"/>`).join("")}
      </svg>
      <div class="intro-flash"></div>
      <div class="intro-logo"><h1>VEILBREAK</h1><p></p></div>
      <button class="intro-enter" type="button"></button>`;
    layer.querySelector(".intro-logo p").textContent = t("Il Velo si è spezzato.");
    layer.querySelector(".intro-enter").textContent = t("Tocca per entrare");
    document.body.append(layer);
    document.body.classList.add("intro-on");
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      try { sound("turn"); } catch { /* audio non disponibile */ }
      onEnter?.();
      layer.classList.add("leaving");
      setTimeout(() => { layer.remove(); document.body.classList.remove("intro-on"); resolve(); }, 650);
    };
    // primo tocco durante l'animazione: salta alla fine; tocco alla fine: entra
    layer.addEventListener("click", () => {
      if (layer.classList.contains("ready")) finish();
      else layer.classList.add("ready", "skipped");
    });
    setTimeout(() => layer.classList.add("ready"), reduce ? 300 : 6200);
  });
}
