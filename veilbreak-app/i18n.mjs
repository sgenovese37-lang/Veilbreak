// Lingue del gioco: italiano (testo di partenza), inglese, tedesco, spagnolo.
// Le frasi italiane fanno da chiave: t("Il tuo turno") cerca la traduzione nel file della lingua
// (cartella lingue/) e, se manca, mostra l'italiano. La lingua predefinita è l'italiano. {nome} nelle frasi viene sostituito dai valori.
// Le illustrazioni delle carte restano in italiano; si traducono interfaccia, regole e schede.
import en from "./lingue/en.mjs";
import de from "./lingue/de.mjs";
import es from "./lingue/es.mjs";

export const languages = { it: "Italiano", en: "English", de: "Deutsch", es: "Español" };
const dictionaries = { en, de, es };
const key = "veilbreak-lang";

function detect() {
  try {
    const saved = localStorage.getItem(key);
    if (saved && languages[saved]) return saved;
  } catch { /* memoria locale non disponibile */ }
  // Il gioco parte sempre in italiano: le altre lingue solo se scelte nelle impostazioni.
  return "it";
}

let lang = detect();
export const currentLang = () => lang;

export function setLang(code) {
  if (!languages[code]) return false;
  lang = code;
  try { localStorage.setItem(key, code); } catch { /* solo per questa sessione */ }
  return true;
}

export function t(text, vars) {
  if (text === undefined || text === null) return text;
  let out = (lang !== "it" && dictionaries[lang]?.[text]) || text;
  if (vars) out = out.replace(/\{(\w+)\}/g, (match, name) => (vars[name] ?? match));
  return out;
}

// Frasi che non sono ancora tradotte in una lingua (per i test e per chi traduce).
export function missing(code, texts) {
  const dict = dictionaries[code] ?? {};
  return texts.filter(text => !dict[text]);
}

// Traduce i testi fissi della pagina (index.html): nodi di testo, opzioni, aria-label e titoli.
export function translatePage(root) {
  if (lang === "it" || !root) return;
  const walker = root.ownerDocument.createTreeWalker(root, 4 /* NodeFilter.SHOW_TEXT */);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const raw = node.nodeValue;
    const text = raw.trim();
    if (text && dictionaries[lang]?.[text]) node.nodeValue = raw.replace(text, dictionaries[lang][text]);
  }
  for (const el of root.querySelectorAll("[aria-label]")) el.setAttribute("aria-label", t(el.getAttribute("aria-label")));
  root.ownerDocument.documentElement.lang = lang;
}
