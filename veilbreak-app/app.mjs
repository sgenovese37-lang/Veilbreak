import { cards } from "./cards.mjs";
import {
  factions, byId, createGame, mulligan, canPlay, playTargets, play,
  attackTargets, attack, endTurn, stats, cardOf, price,
  defaultDeck, copyLimit, deckSize, validDeck, rules, powerTargets, canUseHeroPower, useHeroPower,
  essenceShard, essenceShardId, isPact, isVeiled, maxAttacks, deckCards, deckAlly, maxFactions, brawls, chaosDeck,
} from "./game.mjs";

import { renderTutorial } from "./tutorial.mjs";
import { heroFor, heroPowerCost, heroesOf, lockedHeroesOf, heroWithId } from "./heroes.mjs";
import { illustrationFor as catalogueArt } from "./illustrations.mjs";
import { runComputer } from "./ai.mjs";
import {
  loadProfile, owned, buyPack, openPack, packPrice, collectionProgress, rewardMatch, titles,
  packOffers, buyOffer, cardBacks, ownedBacks, currentBack, buyBack, setBack,
  craftCost, canCraft, craftCard, addShards, addPacks,
} from "./profile.mjs";
import { currentMissions, recordEvent, claimMission } from "./missions.mjs";
import { currentAchievements, recordAchievements, claimAchievement } from "./achievements.mjs";
import { chapters, storyTitle, storyProgress, isUnlocked, completeChapter, finalReward, unlockedHeroes, actTwoReward, actOneLength } from "./story.mjs";
import { sound, soundEnabled, setSound, buzz, cardSound, startAmbience, stopAmbience } from "./audio.mjs";
import { environments, environmentFor } from "./environments.mjs";
import { playMusic, musicEnabled, setMusic } from "./music.mjs";
import { t, languages, currentLang, setLang, translatePage } from "./i18n.mjs";
import { icon, mountIcons } from "./icons.mjs";
import { voiceOf } from "./voci.mjs";
import { playIntro } from "./intro.mjs";
import { descentState, descentBest, startDescent, recordDescent, pickDescentCard, skipDescentCard, abandonDescent, maxLosses } from "./descent.mjs";
import { weekKey } from "./missions.mjs";
import { suggestDeck, analyzeDeck, curveLabels } from "./advisor.mjs";
import { scenes, cast } from "./scene.mjs";
import { startEmbers } from "./embers.mjs";

const get = id => document.getElementById(id);
// Lingua: i testi fissi della pagina si traducono subito; cambiando lingua la pagina si ricarica.
mountIcons();
translatePage(document.body);
startEmbers(document.getElementById("embers"));
document.title = "VEILBREAK";
{
  const langSelect = document.getElementById("lang-select");
  for (const [code, name] of Object.entries(languages)) langSelect.append(new Option(name, code));
  langSelect.value = currentLang();
  langSelect.onchange = () => { if (setLang(langSelect.value)) location.reload(); };
}
// Il Frammento di Essenza non fa parte del catalogo: ha la sua illustrazione.
const shardArt = { src: essenceShard.art, thumb: "assets/miniature/frammento-essenza.webp", differences: [], correction: null, original: null };
const illustrationFor = id => id === essenceShardId ? shardArt : catalogueArt(id);
const form = get("settings");
const setup = get("setup");
const table = get("table");
const catalogue = get("catalogue");
const filter = get("filter");
const rarity = { Common: "Comune", Uncommon: "Non comune", Rare: "Rara", Epic: "Epica", Legendary: "Leggendaria" };
let game;
let mode;
let level;
let handover = false;
let selected = null;
let replacements = new Set();
let timer;
let editing = factions[0];
let draft;
let savedDecks;
let storyChapter = null;
let storyPick = null;
let storyFaction = factions[0];
let storyHero = factions[0];
let lastPack = null;
let outcome = null;
let previous = new Map();
let replaying = false;     // il computer sta mostrando le sue mosse una alla volta
let matchEnv = null;       // ambientazione della partita in corso
let replayRun = 0;         // cambia quando si esce dalla partita: ferma l'animazione in corso
let lastTurnKey = null;    // per annunciare il cambio di turno
let logSeenKey = null;     // turno in cui il registro è stato aperto l'ultima volta
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const decksKey = "veilbreak-custom-decks";
try { savedDecks = new Map(Object.entries(JSON.parse(localStorage.getItem(decksKey) ?? "{}"))); }
catch { savedDecks = new Map(); }

// I testi passano da t(): se la frase ha una traduzione nella lingua scelta, compare tradotta.
function element(tag, text, cls) {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = typeof text === "string" ? t(text) : text;
  if (cls) e.className = cls;
  return e;
}

function button(text, action, cls) {
  const b = element("button", text, cls);
  b.type = "button";
  b.onclick = action;
  return b;
}

function updateWallet() {
  const profile = loadProfile();
  const shards = element("span", undefined, "res shards");
  shards.append(icon("gem"), element("b", profile.shards), element("small", "Schegge"));
  const packs = element("span", undefined, "res packs");
  packs.append(icon("pack"), element("b", profile.packs), element("small", profile.packs === 1 ? "busta" : "buste"));
  get("wallet").replaceChildren(shards, packs);
  const toggle = get("sound-toggle");
  toggle.textContent = t(soundEnabled() ? "Suoni: sì" : "Suoni: no");
  toggle.setAttribute("aria-pressed", soundEnabled());
  const saver = get("saver-toggle");
  saver.textContent = t(energySaver() ? "Risparmio energetico: sì" : "Risparmio energetico: no");
  saver.setAttribute("aria-pressed", energySaver());
  const introButton = get("intro-toggle");
  introButton.textContent = t(introEnabled() ? "Introduzione: sì" : "Introduzione: no");
  introButton.setAttribute("aria-pressed", introEnabled());
  const music = get("music-toggle");
  music.textContent = t(musicEnabled() ? "Musica: sì" : "Musica: no");
  music.setAttribute("aria-pressed", musicEnabled());
}
// Risparmio energetico: meno animazioni (niente braci, sfondo fermo, effetti del tavolo ridotti, niente sfocature).
// Si attiva dalle impostazioni oppure da solo quando la batteria è sotto il 20% e il telefono non è in carica.
const saverKey = "veilbreak-risparmio";
let autoSaver = false;
const energySaver = () => { try { const v = localStorage.getItem(saverKey); return v === "on" || (v !== "off" && autoSaver); } catch { return autoSaver; } };
function applySaver() { document.body.classList.toggle("energy-save", energySaver()); }
get("saver-toggle").onclick = () => { try { localStorage.setItem(saverKey, energySaver() ? "off" : "on"); } catch { /* solo per ora */ } applySaver(); updateWallet(); };
navigator.getBattery?.().then(battery => {
  const check = () => { autoSaver = battery.level < 0.2 && !battery.charging; applySaver(); };
  check();
  battery.addEventListener?.("levelchange", check);
  battery.addEventListener?.("chargingchange", check);
}).catch(() => {});
applySaver();

// Introduzione animata all'avvio (si può disattivare dalle impostazioni; le prove automatiche la saltano).
const introKey = "veilbreak-intro";
const introEnabled = () => { try { return localStorage.getItem(introKey) !== "off"; } catch { return true; } };
get("intro-toggle").onclick = () => { try { localStorage.setItem(introKey, introEnabled() ? "off" : "on"); } catch { /* solo per ora */ } updateWallet(); };
const musicTheme = () => game && document.body.classList.contains("in-match") ? matchEnv : "menu";
get("music-toggle").onclick = () => { setMusic(!musicEnabled(), musicTheme()); updateWallet(); };
get("wallet").onclick = () => showSection("shop-nav");
// Impostazioni: suoni, musica e lingua in un pannello a parte
const settingsPanel = get("settings-panel");
get("settings-open").onclick = () => { updateWallet(); settingsPanel.showModal(); };
get("settings-close").onclick = () => settingsPanel.close();
settingsPanel.addEventListener("click", event => { if (event.target === settingsPanel) settingsPanel.close(); });
get("sound-toggle").onclick = () => {
  setSound(!soundEnabled());
  updateWallet();
  sound("play");
  if (!soundEnabled()) stopAmbience();
  else if (game && document.body.classList.contains("in-match")) startAmbience(matchEnv);
};

// I mazzi salvati valgono solo se usano carte possedute nella collezione.
function deckOwned(deck) {
  if (!Array.isArray(deck)) return false;
  const counts = new Map();
  for (const id of deck) counts.set(id, (counts.get(id) ?? 0) + 1);
  return [...counts].every(([id, n]) => n <= owned(id));
}
// Mazzo salvato per una fazione principale: { cards, ally } (i mazzi vecchi sono solo elenchi di carte).
const playableDeck = name => {
  const saved = savedDecks.get(name);
  const list = deckCards(saved);
  return validDeck(name, saved) && deckOwned(list) ? { cards: [...list], ally: deckAlly(saved) } : null;
};

for (const select of [form.elements.first, form.elements.second, filter]) {
  for (const name of factions) select.append(new Option(name, name));
}
form.elements.second.selectedIndex = 1;

// Scelta dell'eroe: una scheda per eroe con ritratto, fazione e potere. Gli eroi della Storia
// compaiono bloccati finché non si vince il capitolo che li sblocca.
const chosenHero = { first: factions[0], second: factions[1] ?? factions[0] };
const unlockChapter = id => chapters.findIndex(chapter => chapter.reward.hero === id);
function heroChoices(current, onPick, id) {
  const grid = element("div", undefined, "hero-picker");
  if (id) grid.id = id;
  const unlocked = unlockedHeroes();
  for (const faction of factions) {
    const list = heroesOf(faction, unlocked);
    for (const locked of lockedHeroesOf(faction)) if (!unlocked.includes(locked.id)) list.push({ ...heroWithId(locked.id), unavailable: true });
    if (!list.length) list.push({ id: faction, faction, name: faction });
    for (const hero of list) {
      const choice = button(undefined, () => onPick(hero), `hero-choice${hero.unavailable ? " locked" : ""}`);
      choice.dataset.faction = faction;
      choice.dataset.hero = hero.id;
      choice.disabled = Boolean(hero.unavailable);
      choice.setAttribute("aria-pressed", current === hero.id);
      const slug = hero.portrait?.split("/").pop();
      if (slug) { const img = element("img", undefined, "hero-art"); img.src = `assets/eroi/carte/${slug}`; img.alt = ""; img.decoding = "async"; choice.append(img); }
      else choice.append(element("span", faction.slice(0, 1), "hero-art initial"));
      if (hero.theme) { const crest = element("img", undefined, "crest"); crest.src = `assets/eroi/${hero.theme}.webp`; crest.alt = ""; choice.append(crest); }
      const text = element("span", undefined, "hero-choice-text");
      text.append(element("small", faction), element("strong", hero.name));
      if (hero.unavailable) {
        choice.append(icon("lock", "ico lock-mark"));
        text.append(element("span", t("🔒 Si sblocca vincendo il capitolo {n} della Storia", { n: unlockChapter(hero.id) + 1 }).replace(/^🔒\s*/u, ""), "hero-choice-power"));
      } else if (hero.power) {
        const power = element("span", undefined, "hero-choice-power");
        power.append(element("span", heroPowerCost, "mini-gem"), element("b", t(hero.power.name)), element("span", t(hero.power.text)));
        text.append(power);
      }
      choice.append(text);
      grid.append(choice);
    }
  }
  return grid;
}
// id dell'eroe da passare alla partita: null per quello base della fazione
const heroOption = id => heroWithId(id)?.locked ? id : null;

function mountPicker(select, heading) {
  const label = select.closest("label");
  label.hidden = true;
  const box = element("div", undefined, "picker-box");
  const title = element("h3", heading());
  const draw = (smooth = false) => {
    title.textContent = t(heading());
    if (heroWithId(chosenHero[select.name])?.faction !== select.value) chosenHero[select.name] = select.value;
    const scroller = heroChoices(chosenHero[select.name], hero => {
      select.value = hero.faction; chosenHero[select.name] = hero.id; sound("select"); draw(true);
    }, `pick-${select.name}`);
    const before = box.querySelector(".hero-picker")?.scrollLeft ?? 0;
    box.replaceChildren(title, scroller);
    scroller.scrollLeft = before;
    // l'eroe scelto scorre al centro del carosello
    requestAnimationFrame(() => {
      const chosen = scroller.querySelector('[aria-pressed="true"]');
      if (!chosen) return;
      const left = chosen.offsetLeft - (scroller.clientWidth - chosen.offsetWidth) / 2;
      if (scroller.scrollTo) scroller.scrollTo({ left, behavior: smooth ? "smooth" : "auto" }); else scroller.scrollLeft = left;
    });
  };
  label.after(box);
  draw();
  return draw;
}
const redrawFirst = mountPicker(form.elements.first, () => form.elements.mode.value === "cpu" ? "Il tuo eroe" : "Giocatore 1");
const redrawSecond = mountPicker(form.elements.second, () => form.elements.mode.value === "cpu" ? "Avversario" : "Giocatore 2");
form.elements.mode.onchange = () => {
  get("difficulty").hidden = form.elements.mode.value !== "cpu";
  redrawFirst();
  redrawSecond();
};

// Scelte a tessere al posto dei menu a tendina (le tendine restano nascoste e tengono il valore).
function segmented(select, cls, options) {
  const label = select.closest("label");
  const box = element("div", undefined, `seg ${cls}`);
  box.setAttribute("role", "group");
  box.setAttribute("aria-label", t(label.firstChild.nodeValue.trim()));
  const draw = () => box.replaceChildren(...options.map(o => {
    const b = button(undefined, () => {
      if (o.action) return o.action();
      select.value = o.value; select.dispatchEvent(new Event("change")); sound("select"); draw();
    }, "seg-item");
    b.dataset.value = o.value ?? "";
    b.dataset[o.key] = o.value ?? "";
    if (!o.action) b.setAttribute("aria-pressed", select.value === o.value);
    if (o.image) { b.style.setProperty("--thumb", `url("${o.image}")`); b.classList.add("thumb"); }
    if (o.icon) b.append(icon(o.icon));
    b.append(element("span", o.label));
    if (o.note) b.append(element("small", o.note));
    return b;
  }));
  label.classList.add("seg-label");
  select.classList.add("visually-hidden");
  label.append(box);
  draw();
  return draw;
}
segmented(form.elements.mode, "modes", [
  { key: "mode", value: "cpu", icon: "skull", label: "Contro il computer" },
  { key: "mode", value: "local", icon: "users", label: "Due giocatori" },
  { key: "mode", icon: "book", label: "Storia", action: () => showSection("story-nav") },
]);
segmented(form.elements.level, "levels", ["Facile", "Normale", "Difficile"].map(value => ({ key: "level", value, label: value })));
segmented(form.elements.env, "envs", [
  { key: "env", value: "auto", label: "Automatica", icon: "moon" },
  ...Object.entries(environments).map(([value, env]) => ({ key: "env", value, label: env.name, image: `assets/sfondi/home-${value}.webp` })),
]);

function drawCard(c, options = {}) {
  const e = options.action ? button(undefined, options.action) : element("article");
  e.className = `card ${c.rarity ?? ""}${options.target ? " target" : ""}`;
  if (options.action) e.disabled = options.disabled ?? false;
  if (options.pressed !== undefined) e.setAttribute("aria-pressed", options.pressed);
  const art = options.art !== false && illustrationFor(c.id);
  if (!art && options.art !== false && c.set === 2) {
    const ph = element("div", undefined, `art placeholder${options.art === "full" ? " full" : ""}`);
    ph.style.setProperty("--ph", `url("${placeholderArt(c)}")`);
    ph.append(crestOf(c), element("strong", c.name), element("small", "Illustrazione in arrivo"));
    e.append(ph);
  }
  if (art && options.art === "full" && art.circles) {
    e.append(cardFace(c, art, { cost: options.cost, attack: options.attack, health: options.health }, { thumb: true, className: "art full" }));
  } else if (art) {
    const img = element("img", undefined, options.art === "full" ? "art full" : "art");
    img.src = art.thumb;
    img.alt = "";
    img.loading = "lazy";
    img.decoding = "async";
    e.append(img);
  }
  const head = element("div", undefined, "card-head");
  head.append(element("strong", c.name));
  if (c.cost !== undefined && options.cost !== false) head.append(element("span", options.cost ?? c.cost, "cost"));
  e.append(head);
  e.append(element("small", [options.remaining ?? t(c.type), options.meta ? t(rarity[c.rarity]) : ""].filter(Boolean).join(" · ")));
  if (options.meta) e.append(element("small", c.faction));
  if (options.text !== false && c.text) e.append(element("p", c.text));
  if (c.type === "Creatura") {
    const strip = element("div", undefined, "stats");
    strip.append(element("span", `${t("ATT")} ${options.attack ?? c.attack}`, "att"), element("span", `${t("DIF")} ${options.health ?? c.health}`, "dif"));
    e.append(strip);
  }
  if (options.copies !== undefined) e.append(element("small", t("Copie possedute {n}/{max}", { n: options.copies, max: copyLimit(c) }), "copies"));
  if (options.meta && art && ruleDifferences(art).length) e.append(element("small", "⚠ L’illustrazione differisce dal catalogo", "warning"));
  if (options.badge) e.append(element("small", options.badge, "badge"));
  return e;
}

// Le differenze solo grafiche (maiuscole, punteggiatura) non cambiano le regole: niente avviso.
const ruleDifferences = art => art.differences.filter(text => !text.startsWith("Differenza solo grafica"));

function withDetails(cardElement, c) {
  const wrap = element("div", undefined, "card-wrap");
  const info = button("Dettagli", () => showCard(c), "details");
  info.setAttribute("aria-label", t("Dettagli di {card}", { card: c.name }));
  wrap.append(cardElement, info);
  return wrap;
}

const viewer = get("card-viewer");
function showCard(c) {
  const art = illustrationFor(c.id);
  const body = element("div", undefined, "viewer-body");
  if (art) {
    const face = cardFace(c, art, {}, { className: "viewer-art" });
    face.setAttribute("role", "img");
    face.setAttribute("aria-label", t("Illustrazione di {card}", { card: c.name }));
    body.append(face);
  }
  const rules = element("div", undefined, "viewer-rules");
  rules.append(element("h2", c.name));
  rules.append(element("p", [c.faction, t(c.type), t(rarity[c.rarity]), t("{n} Essenza", { n: c.cost })].join(" · "), "muted"));
  if (c.type === "Creatura") rules.append(element("p", t("Attacco {a} · Difesa {d}", { a: c.attack, d: c.health })));
  rules.append(element("h3", "Regole in partita (catalogo)"));
  rules.append(element("p", c.text || "Nessun effetto."));
  const notesCard = keywordNotes(c); if (notesCard) rules.append(notesCard);
  if (!art && c.set === 2) rules.append(element("p", "Illustrazione in arrivo: per ora la carta usa una grafica provvisoria.", "muted"));
  if (art?.differences.length) {
    rules.append(element("h3", "Differenze dell’illustrazione"));
    const list = element("ul", undefined, "differences");
    for (const text of art.differences) list.append(element("li", text));
    if (currentLang() !== "it") rules.append(element("p", "Le note sulle illustrazioni sono in italiano, come le immagini delle carte.", "muted"));
    rules.append(list);
  } else if (art) {
    rules.append(element("p", "L’illustrazione coincide con il catalogo.", "muted"));
  }
  if (art?.correction) {
    rules.append(element("h3", "Illustrazione corretta"));
    rules.append(element("p", art.correction, "muted"));
    const face = body.querySelector(".viewer-art");
    const img = face.querySelector("img");
    let showingOriginal = false;
    const toggle = button("Vedi originale", () => {
      showingOriginal = !showingOriginal;
      img.src = showingOriginal ? art.original : art.src;
      face.classList.toggle("original", showingOriginal);   // l'originale ha già i numeri stampati
      toggle.textContent = t(showingOriginal ? "Vedi versione corretta" : "Vedi originale");
    });
    rules.append(toggle);
  }
  // Creare una copia con le Schegge (solo carte del catalogo che non hai al completo)
  if (byId.get(c.id) === c && owned(c.id) < copyLimit(c)) {
    const cost = craftCost[c.rarity];
    rules.append(element("p", t("Ne possiedi {n} su {max}.", { n: owned(c.id), max: copyLimit(c) }), "muted"));
    const craft = button(t("Crea una copia · {n} Schegge", { n: cost }), () => {
      if (craftCard(c.id)) { sound("reward"); updateWallet(); showCard(c); viewer.querySelector(".viewer-rules")?.append(element("p", "Copia creata: ora puoi metterla nei tuoi mazzi.", "reward-line")); }
    }, "craft");
    craft.disabled = !canCraft(c.id);
    if (craft.disabled) craft.title = t("Ti servono {n} Schegge.", { n: cost });
    rules.append(craft);
  }
  const close = button("Chiudi", () => viewer.close(), "primary");
  rules.append(close);
  body.append(rules);
  viewer.replaceChildren(body);
  viewer.showModal();
  close.focus();
}
viewer.addEventListener("click", event => { if (event.target === viewer) viewer.close(); });

function drawCatalogue() {
  get("cards").replaceChildren(...cards.filter(c => !filter.value || c.faction === filter.value).map(c => drawCard(c, { meta: true, art: "full", copies: owned(c.id), action: () => showCard(c) })));
}

let draftAlly = null;   // fazione alleata del mazzo in costruzione (al massimo 2 fazioni)
let choosingAlly = false;
function loadDraft() {
  const saved = savedDecks.get(editing);
  draft = [...(deckCards(saved) ?? defaultDeck(editing))];
  draftAlly = deckAlly(saved);
  choosingAlly = false;
}

// «I tuoi mazzi»: una scheda per fazione con il mazzo che il gioco usa quando giochi con quella fazione.
function myDecks() {
  const box = element("section", undefined, "my-decks");
  box.setAttribute("aria-label", t("I tuoi mazzi"));
  box.append(element("h2", "I tuoi mazzi"));
  box.append(element("p", "Quando giochi con una fazione, il gioco usa il mazzo salvato di quella fazione. Se non ne hai salvato uno, usa il mazzo predefinito.", "muted"));
  const grid = element("div", undefined, "my-decks-grid");
  for (const faction of factions) {
    const saved = savedDecks.get(faction);
    const ready = playableDeck(faction);
    const list = ready ? ready.cards : defaultDeck(faction);
    const ally = ready?.ally ?? null;
    const cardBox = element("article", undefined, `my-deck${faction === editing ? " editing" : ""}${ready ? " custom" : ""}`);
    cardBox.dataset.faction = faction;
    const face = element("div", undefined, "my-deck-face");
    const img = element("img"); img.src = heroFor(faction)?.portrait ?? ""; img.alt = ""; img.loading = "lazy";
    face.append(img);
    if (ally) face.append(element("span", "2 fazioni", "my-deck-ally"));
    const info = element("div", undefined, "my-deck-info");
    info.append(element("strong", ally ? `${faction} + ${ally}` : faction));
    const kind = ready ? t("Il tuo mazzo · {n} carte", { n: list.length }) : saved ? t("Mazzo incompleto: si usa il predefinito") : t("Mazzo predefinito");
    info.append(element("span", kind, `my-deck-kind${ready ? " ok" : saved ? " warn" : ""}`));
    const actions = element("div", undefined, "my-deck-actions");
    const see = button("Vedi", () => showDeck(faction, list, ally), "small");
    const edit = button(ready ? "Modifica" : "Crea", () => {
      editing = faction; loadDraft(); renderDeckEditor("", "faction");
      get("deck-editor").querySelector(".section-head")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, "small");
    const play = button("Gioca", () => {
      mode = "cpu"; level = form.elements.level.value;
      const rivals = factions.filter(f => f !== faction);
      const rival = rivals[Math.floor(Math.random() * rivals.length)];
      startMatch([faction, rival], [ready, null]);
    }, "small primary");
    see.dataset.deck = faction; edit.dataset.deck = faction; play.dataset.deck = faction;
    actions.append(see, edit, play);
    info.append(actions);
    cardBox.append(face, info);
    grid.append(cardBox);
  }
  box.append(grid);
  return box;
}

// Elenco delle carte di un mazzo, con le copie, nella finestra delle carte.
function showDeck(faction, list, ally) {
  const body = element("div", undefined, "deck-view");
  body.append(element("h2", ally ? `${faction} + ${ally}` : faction));
  const report = analyzeDeck(list);
  body.append(element("p", t("{n} carte · {c} creature · costo medio {a}", { n: list.length, c: report.creatures, a: report.average.toFixed(1) }), "muted"));
  const grid = element("div", undefined, "deck-view-grid");
  const counts = new Map();
  for (const id of list) counts.set(id, (counts.get(id) ?? 0) + 1);
  for (const [id, n] of [...counts].sort((a, b) => byId.get(a[0]).cost - byId.get(b[0]).cost || a[0] - b[0])) {
    const c = byId.get(id);
    const art = illustrationFor(id);
    const cell = button(undefined, () => showCard(c), "deck-view-card");
    cell.setAttribute("aria-label", `${c.name} ×${n}`);
    if (art) cell.append(cardFace(c, art, {}, { thumb: true })); else cell.append(drawCard(c));
    cell.append(element("span", `×${n}`, "deck-view-count"));
    grid.append(cell);
  }
  body.append(grid, button("Chiudi", () => viewer.close(), "primary"));
  viewer.replaceChildren(body);
  viewer.showModal();
}

function renderDeckEditor(message = "", focus) {
  const panel = get("deck-editor");
  const used = draft.length;
  const header = element("div", undefined, "section-head");
  header.append(element("h2", "Costruisci un mazzo"));
  const select = element("select");
  select.setAttribute("aria-label", t("Fazione del mazzo"));
  for (const name of factions) select.append(new Option(name, name));
  select.value = editing;
  select.onchange = () => {
    editing = select.value;
    loadDraft();
    renderDeckEditor("", "faction");
  };
  header.append(select);

  // Fazioni del mazzo: la principale (dà l'eroe) e al massimo una alleata, scelta con il pulsante.
  const factionBox = element("div", undefined, "deck-factions");
  factionBox.append(element("span", "Fazioni del mazzo", "deck-factions-title"));
  const chips = element("div", undefined, "deck-chips");
  chips.append(element("span", editing, "deck-chip main"));
  if (draftAlly) {
    const chip = element("span", undefined, "deck-chip ally");
    chip.append(element("span", draftAlly));
    const drop = button("✕", () => {
      draft = draft.filter(id => byId.get(id)?.faction !== draftAlly);
      draftAlly = null;
      renderDeckEditor("Seconda fazione tolta: le sue carte sono uscite dal mazzo.", "add-ally");
    }, "chip-x");
    drop.id = "remove-ally";
    drop.setAttribute("aria-label", t("Togli la fazione {name}", { name: draftAlly }));
    chip.append(drop);
    chips.append(chip);
  } else {
    const add = button("＋ Seconda fazione", () => { choosingAlly = !choosingAlly; renderDeckEditor("", "add-ally"); }, "deck-add-ally");
    add.id = "add-ally";
    add.setAttribute("aria-expanded", choosingAlly);
    chips.append(add);
  }
  factionBox.append(chips);
  if (choosingAlly && !draftAlly) {
    const options = element("div", undefined, "ally-options");
    for (const name of factions.filter(f => f !== editing)) {
      const pick = button(name, () => { draftAlly = name; choosingAlly = false; renderDeckEditor(t("Ora puoi aggiungere anche le carte di {name}.", { name }), "remove-ally"); }, "ally-option");
      pick.dataset.ally = name;
      options.append(pick);
    }
    factionBox.append(options);
  }
  factionBox.append(element("small", t("Al massimo {n} fazioni. L’eroe è quello della fazione principale.", { n: maxFactions }), "muted"));

  const controls = element("div", undefined, "actions");
  controls.append(element("strong", t("{n}/{max} carte", { n: used, max: deckSize })));
  const save = button("Salva mazzo", () => {
    savedDecks.set(editing, draftAlly ? { cards: [...draft], ally: draftAlly } : [...draft]);
    try {
      localStorage.setItem(decksKey, JSON.stringify(Object.fromEntries(savedDecks)));
      renderDeckEditor(t("Mazzo salvato: lo trovi in «I tuoi mazzi» e lo userai ogni volta che giochi con {name}.", { name: editing }), "save");
    } catch {
      renderDeckEditor("Mazzo disponibile per questa sessione.", "save");
    }
  }, "primary");
  save.disabled = !validDeck(editing, draft, draftAlly) || !deckOwned(draft);
  controls.append(save);
  controls.append(button("Ripristina predefinito", () => { draft = defaultDeck(editing); draftAlly = null; renderDeckEditor(); }));
  const status = element("p", message);
  status.setAttribute("role", "status");
  const list = element("ul", undefined, "deck-list");
  for (const faction of [editing, draftAlly].filter(Boolean)) {
    const head = element("li", undefined, "deck-group");
    head.append(element("strong", faction), element("small", faction === editing ? "fazione principale" : "fazione alleata"));
    list.append(head);
    for (const c of cards.filter(c => c.faction === faction)) {
      const count = draft.filter(id => id === c.id).length;
      const row = element("li");
      const remove = button("−", () => {
        draft.splice(draft.indexOf(c.id), 1);
        renderDeckEditor("", `remove-${c.id}`);
      });
      const plus = button("+", () => {
        draft.push(c.id);
        renderDeckEditor("", `plus-${c.id}`);
      });
      remove.id = `remove-${c.id}`;
      plus.id = `plus-${c.id}`;
      remove.setAttribute("aria-label", t("Rimuovi {card}", { card: c.name }));
      plus.setAttribute("aria-label", t("Aggiungi {card}", { card: c.name }));
      remove.disabled = count === 0;
      plus.disabled = count >= copyLimit(c) || count >= owned(c.id) || used >= deckSize;
      const thumb = element("img", undefined, "deck-thumb");
      thumb.src = illustrationFor(c.id)?.thumb ?? placeholderArt(c); thumb.alt = ""; thumb.loading = "lazy";
      const label = element("span", undefined, "deck-name");
      label.append(element("b", c.name), element("small", `${t("{n} Essenza", { n: c.cost })} · ${t("possiedi {n}", { n: owned(c.id) })}`));
      row.dataset.rarity = c.rarity;
      row.append(thumb, label, remove, element("span", count, "deck-count"), plus);
      list.append(row);
    }
  }
  // Consigliere: crea un mazzo con le carte possedute e analizza quello in costruzione
  const advisor = element("section", undefined, "advisor");
  const advHead = element("div", undefined, "advisor-head");
  advHead.append(icon("candle"), element("strong", "Consigliere dei mazzi"));
  const make = button("✦ Crea mazzo per me", () => {
    draft = suggestDeck(editing, draftAlly, id => owned(id));
    sound("reward");
    renderDeckEditor(t("Mazzo creato con le carte che possiedi ({n} carte). Controllalo e salvalo.", { n: draft.length }), "make-deck");
  }, "primary advisor-make");
  make.id = "make-deck";
  const report = analyzeDeck(draft);
  const bars = element("div", undefined, "curve");
  const peak = Math.max(1, ...report.curve);
  report.curve.forEach((n, i) => {
    const col = element("div", undefined, "curve-col");
    const bar = element("span", undefined, "curve-bar"); bar.style.height = `${Math.round((n / peak) * 100)}%`;
    col.append(element("b", n), bar, element("small", curveLabels[i]));
    bars.append(col);
  });
  const facts = element("p", t("{c} creature · {s} altre carte · costo medio {a}", { c: report.creatures, s: report.spells, a: report.average.toFixed(1) }), "muted");
  const tips = element("ul", undefined, "advisor-tips");
  for (const tip of report.tips) tips.append(element("li", tip));
  advisor.append(advHead, element("small", "Curva di Essenza del mazzo", "advisor-label"), bars, facts, tips, make);
  panel.replaceChildren(myDecks(), header, factionBox, advisor, controls, status, list);
  if (focus === "faction") select.focus();
  else if (focus === "save") save.focus();
  else if (focus) (get(focus)?.disabled ? get(focus)?.parentElement?.querySelector("button:not(:disabled)") : get(focus))?.focus();
}

const sections = ["match", "story-nav", "quests-nav", "shop-nav", "library", "decks", "missions"];
function showSection(name) {
  updateWallet();
  document.body.classList.toggle("in-match", name === "match" && Boolean(game));
  playMusic(musicTheme());
  get("story").hidden = name !== "story-nav";
  get("modes-view").hidden = name !== "modes-view";
  get("quests").hidden = name !== "quests-nav";
  catalogue.hidden = name !== "library";
  get("negozio").hidden = name !== "shop-nav";
  if (name === "shop-nav") drawShop();
  get("tutorial").hidden = name !== "missions";
  get("deck-editor").hidden = name !== "decks";
  setup.hidden = name !== "match" || Boolean(game);
  table.hidden = name !== "match" || !game;
  for (const id of sections) get(id).setAttribute("aria-pressed", id === name);
  if (name === "story-nav") renderStory();
  if (name === "quests-nav") renderQuests();
  if (name === "library") drawCatalogue();
  if (name === "missions") renderTutorial(get("tutorial"));
  if (name === "decks") {
    if (!draft) loadDraft();
    renderDeckEditor();
  }
}

for (const id of sections) get(id).onclick = () => showSection(id);
get("tutorial").addEventListener("click", () => setTimeout(updateWallet));
filter.onchange = drawCatalogue;
form.onsubmit = event => {
  event.preventDefault();
  mode = form.elements.mode.value;
  level = form.elements.level.value;
  const names = [form.elements.first.value, form.elements.second.value];
  const env = form.elements.env.value;
  const heroes = [heroOption(chosenHero.first), heroOption(chosenHero.second)];
  startMatch(names, names.map((name, side) => side === 1 && mode === "cpu" ? null : playableDeck(name)), { heroes, ...(env === "auto" ? {} : { env }) });
};

let lastMatch = null;   // per la rivincita
let matchKind = null;   // null, "descent" (Discesa nel Velo) o "brawl" (Rissa della settimana)
function startMatch(names, decks, options = {}) {
  matchKind = options.kind ?? null;
  if (!matchKind) matchExtras = null;
  lastMatch = { names: [...names], decks, options: { ...options }, mode, level, chapter: storyChapter };
  replayRun++;
  replaying = false;
  lastTurnKey = null;
  game = createGame(names, Math.random, decks, options);
  // ambientazione: scelta nella partita, altrimenti quella della fazione avversaria
  matchEnv = environmentFor(options.env) ?? environmentFor(heroFor(names[1])?.theme) ?? environmentFor(heroFor(names[0])?.theme);
  startAmbience(matchEnv);
  handover = false;
  selected = null;
  outcome = null;
  previous = new Map();
  replacements.clear();
  showSection("match");
  render();
}

// Rivincita: stessi eroi, mazzi e regole (in Storia, lo stesso capitolo).
function rematch() {
  if (!lastMatch) return reset();
  if (lastMatch.chapter !== null) return playChapter(lastMatch.chapter);
  mode = lastMatch.mode; level = lastMatch.level;
  startMatch(lastMatch.names, lastMatch.decks, lastMatch.options);
}

function reset() {
  clearTimeout(timer);
  replayRun++;
  replaying = false;
  lastTurnKey = null;
  document.body.classList.remove("in-match");
  stopAmbience();
  hidePeek();
  const fromStory = storyChapter !== null;
  const fromMode = matchKind;
  // lasciare a metà una partita della Discesa conta come sconfitta
  if (matchKind === "descent" && game && game.phase !== "finished") recordDescent(false);
  game = null;
  storyChapter = null;
  matchKind = null;
  if (fromMode) return openModes(fromMode);
  showSection(fromStory ? "story-nav" : "match");
}

// Ricompense di fine partita: solo contro il computer (anche in Storia), una volta per partita.
function settleOutcome() {
  if (outcome || game.phase !== "finished") return;
  outcome = { lines: [] };
  if (mode !== "cpu") {
    sound("win");
    return;
  }
  const won = game.winner === 0;
  sound(won ? "win" : "lose");
  const shards = rewardMatch(won, level);
  outcome.lines.push(`+${t("{n} Schegge", { n: shards })}`);
  const event = { won, level, faction: game.players[0].name, stats: game.stats[0] };
  if (storyChapter !== null && won) {
    const chapter = chapters[storyChapter];
    const granted = completeChapter(storyChapter);
    event.chapterCleared = true;
    outcome.story = chapter.outro;
    if (granted?.chapter) outcome.lines.push(t("Premio del capitolo: {reward}", { reward: rewardText(granted.chapter) }));
    if (granted?.hero) outcome.lines.push(t("Nuovo eroe sbloccato: {hero}. Sceglilo prima della partita!", { hero: heroWithId(granted.hero).name }));
    if (granted?.actTwo) outcome.lines.push(t("Premio dell’Atto II: {reward} e il titolo {title}", { reward: rewardText(granted.actTwo), title: t(titles[actTwoReward.title].name) }));
    if (granted?.final) outcome.lines.push(t("Premio finale della Storia: {reward} e il titolo {title}", { reward: rewardText(granted.final), title: t(titles[finalReward.title].name) }));
  }
  Object.assign(event, matchExtras?.(won) ?? {});   // Discesa nel Velo e Rissa aggiungono i loro dati
  recordEvent(event);
  recordAchievements(event);
  updateWallet();
}
let matchExtras = null;

function rewardText(reward) {
  return [reward.shards ? t("{n} Schegge", { n: reward.shards }) : "", reward.packs ? t(reward.packs === 1 ? "{n} busta" : "{n} buste", { n: reward.packs }) : ""].filter(Boolean).join(t(" e "));
}

function afterTurn() {
  selected = null;
  replacements.clear();
  handover = mode === "local" && game.phase !== "finished";
  render();
  if (mode === "cpu" && game.active === 1 && game.phase !== "finished") {
    timer = setTimeout(playComputer, game.phase === "mulligan" ? 300 : 900);
  }
}

// Il computer gioca tutto il turno su una copia, registrando ogni mossa; poi le mosse
// vengono mostrate una alla volta con le loro animazioni.
const snapshot = g => ({ ...structuredClone({ ...g, random: undefined }), random: g.random });
async function playComputer() {
  const run = ++replayRun;
  const real = game;
  const frames = [];
  runComputer(real, level, action => frames.push({ state: snapshot(real), action }));
  if (!frames.length || real.phase === "mulligan") { render(); return; }
  replaying = true;
  try {
    for (const frame of frames) {
      await showAction(frame.action);
      if (run !== replayRun) return;
      game = frame.state;
      render();
      await wait(frame.action.kind === "play" ? 650 : 450);
    }
  } finally {
    replaying = false;
  }
  if (run !== replayRun) return;
  game = real;
  render();
}

async function showAction(action) {
  if (action.kind === "play") {
    cardSound(byId.get(action.card), "enter");
    if (isPact(byId.get(action.card))) popSymbols(document.querySelector(`.hero-portrait[data-side="${action.side}"]`), ["pact"]);
    const played = byId.get(action.card);
    if (played?.type === "Segreto") await castPreview(played, "L’avversario prepara un Segreto", 1000, true);
    else if (played?.rarity === "Legendary") await legendaryEntrance(played, action.side);
    else await castPreview(played, "L’avversario gioca", 1100);
  } else if (action.kind === "attack") {
    await lunge(action.side, action.uid, action.target);
  } else if (action.kind === "power") {
    sound("power");
    document.querySelector(".hero-strip.enemy .hero-power")?.classList.add("flash");
    await wait(550);
  }
}

function selectedTargets() {
  if (selected?.kind === "play") return playTargets(game, game.players[game.active].hand[selected.index]);
  if (selected?.kind === "attack") {
    // bersagli raggiungibili da almeno una delle creature scelte
    const all = selected.uids.flatMap(uid => attackTargets(game, uid));
    return all.filter((t, i) => all.findIndex(o => o.side === t.side && o.uid === t.uid) === i);
  }
  if (selected?.kind === "power") return powerTargets(game);
  return [];
}

function available(side, uid) {
  return selectedTargets().some(target => target.side === side && target.uid === uid);
}

let busy = false;
async function target(side, uid) {
  if (busy || !available(side, uid)) return;
  const choice = { side, uid };
  const action = selected;
  selected = null;
  busy = true;
  render(); // tavolo bloccato finché l'azione non è finita
  try {
    if (action.kind === "play") {
      const c = byId.get(game.players[game.active].hand[action.index]);
      if (play(game, action.index, choice)) playedFx(c);
    } else if (action.kind === "power") {
      if (useHeroPower(game, choice)) sound("power");
    } else {
      // le creature scelte attaccano una dopo l'altra finché il bersaglio è in piedi
      for (const uid of action.uids) {
        const stillThere = choice.uid === null || game.players[choice.side].board.some(u => u.uid === choice.uid);
        if (!stillThere || game.phase !== "play") break;
        if (!attackTargets(game, uid).some(t => t.side === choice.side && t.uid === choice.uid)) continue;
        await lunge(game.active, uid, choice);
        attack(game, uid, choice);
        if (action.uids.length > 1) { render(); await wait(180); }
      }
    }
  } finally {
    busy = false;
  }
  render();
}

function chooseCard(index) {
  if (busy) return;
  const id = game.players[game.active].hand[index];
  if (playTargets(game, id).length) { selected = { kind: "play", index }; sound("select"); }
  else {
    const c = byId.get(id);
    if (play(game, index)) playedFx(c);
    selected = null;
  }
  render();
}

function playedFx(c) {
  if (isPact(c)) popSymbols(document.querySelector(`.hero-portrait[data-side="${game.active}"]`), ["pact"]);
  sound("mana");
  cardSound(c, "enter");
  if (c.rarity === "Legendary") legendaryEntrance(c, game.active);
  else if (c.type !== "Creatura") { sound("cast"); castPreview(c, "Hai giocato", 800); }
}

// ---------- Effetti ----------
// Carta grande al centro dello schermo (incantesimi, artefatti, mosse dell'avversario).
function castPreview(c, label, ms, hidden = false) {
  const layer = element("div", undefined, "cast-preview");
  layer.setAttribute("aria-hidden", "true");
  layer.append(element("small", label));  // label già tradotta da element()
  const art = illustrationFor(c.id);
  if (hidden) { const img = element("img", undefined, "back"); img.src = cardBackSrc(); img.alt = ""; layer.append(img); }
  else if (art) layer.append(cardFace(c, art, {}, { className: "cast-face" }));
  else layer.append(drawCard(c));
  if (!hidden && c.type !== "Creatura" && voiceOf(c.id)) layer.append(element("q", voiceOf(c.id), "cast-voice"));
  document.body.append(layer);
  return wait(ms).then(() => { layer.classList.add("leaving"); return wait(250); }).then(() => layer.remove());
}

// Impatto dell'attacco, diverso per fazione: sigillo d'oro (Corte), scariche al neon (Patto Neon),
// raggi di luce (Senza Santi), artigli (Sottocittà).
function impactFx(target, faction) {
  if (!target || document.body.classList.contains("energy-save")) return;
  const theme = heroFor(faction)?.theme ?? "plain";
  const r = target.getBoundingClientRect();
  const fx = element("div", undefined, `impact impact-${theme}`);
  fx.setAttribute("aria-hidden", "true");
  Object.assign(fx.style, { left: `${r.left + r.width / 2}px`, top: `${r.top + r.height / 2}px` });
  if (theme === "neon") fx.innerHTML = `<svg viewBox="-50 -50 100 100"><polyline points="-44,-10 -20,-4 -26,8 0,2 -4,16 30,6"/><polyline points="40,-30 18,-12 26,-2 4,10 12,24"/><polyline points="-30,34 -8,14 -2,26 16,8"/></svg>`;
  else if (theme === "undercity") fx.innerHTML = `<i></i><i></i><i></i>`;
  else if (theme === "saints") fx.innerHTML = `<b></b>`;
  else if (theme === "hollow") fx.innerHTML = `<b></b><span>✠</span>`;
  else fx.innerHTML = `<b></b>`;
  document.body.append(fx);
  setTimeout(() => fx.remove(), 700);
}

// Entrata delle carte Leggendarie: lo schermo si scurisce, esplode la luce della fazione e la carta entra in grande con la sua battuta.
function legendaryEntrance(c, side) {
  const theme = heroFor(c.faction)?.theme ?? "hollow";
  const art = illustrationFor(c.id);
  const layer = element("div", undefined, `legend-entrance legend-${theme}${side === 0 || mode !== "cpu" ? "" : " foe"}`);
  layer.setAttribute("aria-hidden", "true");
  layer.append(element("div", undefined, "legend-burst"));
  layer.append(element("small", side === 0 || mode !== "cpu" ? "Leggendaria" : "Leggendaria dell’avversario", "legend-label"));
  if (art) layer.append(cardFace(c, art, {}, { className: "legend-card" })); else layer.append(drawCard(c));
  if (voiceOf(c.id)) layer.append(element("q", voiceOf(c.id), "legend-voice"));
  document.body.append(layer);
  sound("reward"); buzz(60);
  const quick = document.body.classList.contains("energy-save");
  const close = () => { if (!layer.isConnected) return; layer.classList.add("leaving"); setTimeout(() => layer.remove(), 300); };
  layer.addEventListener("click", close);
  return wait(quick ? 900 : 2100).then(close).then(() => wait(300));
}

// L'attaccante scatta verso il bersaglio e torna indietro.
async function lunge(side, uid, targetChoice) {
  const from = document.querySelector(`.token[data-side="${side}"][data-uid="${uid}"]`);
  const to = targetChoice?.uid == null
    ? document.querySelector(`.hero-portrait[data-side="${targetChoice?.side}"]`)
    : document.querySelector(`.token[data-side="${targetChoice.side}"][data-uid="${targetChoice.uid}"]`);
  const attacker = game.players[side]?.board.find(u => u.uid === uid);
  if (attacker?.card) cardSound(byId.get(attacker.card), "attack"); else sound("attack");
  if (!from || !to || !from.animate) { await wait(200); return; }
  const a = from.getBoundingClientRect();
  const b = to.getBoundingClientRect();
  const dx = (b.left + b.width / 2 - (a.left + a.width / 2)) * 0.82;
  const dy = (b.top + b.height / 2 - (a.top + a.height / 2)) * 0.82;
  from.style.zIndex = 20;
  const go = from.animate([{ transform: "none" }, { transform: `translate(${dx}px, ${dy}px) scale(1.12)` }], { duration: 230, easing: "cubic-bezier(.5,0,.9,.5)", fill: "forwards" });
  await go.finished;
  if (targetChoice?.uid == null) sound("hit"); // le creature colpite hanno il loro suono (vedi track)
  impactFx(to, attacker?.card ? byId.get(attacker.card)?.faction : null);
  buzz(25);
  to.animate([{ transform: "none" }, { transform: "translateX(-5px)" }, { transform: "translateX(5px)" }, { transform: "none" }], { duration: 240 });
  await from.animate([{ transform: `translate(${dx}px, ${dy}px) scale(1.12)` }, { transform: "none" }], { duration: 200, easing: "ease-out", fill: "forwards" }).finished;
}

// Tenere premuto: anteprima ingrandita della carta con le regole del catalogo.
const peekLayer = element("div", undefined, "peek-layer");
peekLayer.hidden = true;
peekLayer.setAttribute("role", "dialog");
peekLayer.setAttribute("aria-label", t("Anteprima della carta"));
document.body.append(peekLayer);
function showPeek(c, current) {
  const art = illustrationFor(c.id);
  const box = element("div", undefined, "peek-card");
  if (art) box.append(cardFace(c, art, current ? { attack: current.attack, health: current.health, cost: current.cost } : {}, { className: "peek-face" }));
  else box.append(drawCard(c));
  const rulesBox = element("div", undefined, "peek-rules");
  rulesBox.append(element("strong", c.name, "peek-name"));
  const cost = isPact(c) ? t("{n} punti vita (Patto)", { n: c.cost }) : t("{n} Essenza", { n: c.cost });
  rulesBox.append(element("span", `${t(c.type)} · ${cost}`, "peek-meta"));
  if (c.type === "Creatura") rulesBox.append(element("span", current ? t("Ora: Attacco {a} · Difesa {d}", { a: current.attack, d: current.health }) : t("Attacco {a} · Difesa {d}", { a: c.attack, d: c.health }), "peek-meta"));
  rulesBox.append(element("h4", "Abilità"), element("p", c.text || "Nessun effetto.", "peek-text"));
  // schede delle parole chiave, come nei giochi di carte
  const notes = element("div", undefined, "peek-notes");
  for (const [word, text] of Object.entries(glossary)) {
    if (!(c.text ?? "").includes(word)) continue;
    const kw = keywordOf(c);
    const sym = { Provocazione: kw.taunt && "shield", Rapidità: kw.rush && "bolt", Velato: kw.veiled && "veil", Furia: kw.fury && "fury", Patto: "drop", Lascito: "skull", "Urlo di battaglia": "horn" }[word];
    const note = element("div", undefined, "peek-note");
    const head = element("b"); if (sym) head.append(icon(sym)); head.append(document.createTextNode(t(word)));
    note.append(head, element("span", text));
    notes.append(note);
  }
  if (typeNotes[c.type]) {
    const note = element("div", undefined, "peek-note type");
    note.append(element("b", c.type), element("span", typeNotes[c.type]));
    notes.append(note);
  }
  rulesBox.append(notes);
  box.append(rulesBox, element("small", "Tocca lo schermo per chiudere", "peek-hint"));
  peekLayer.replaceChildren(box);
  peekLayer.hidden = false;
}
function hidePeek() { peekLayer.hidden = true; peekLayer.dataset.open = ""; }
// Resta aperta dopo aver alzato il dito: si chiude con un nuovo tocco in qualunque punto.
peekLayer.addEventListener("pointerdown", e => {
  if (peekLayer.dataset.open !== "ready") return;
  e.preventDefault();
  e.stopPropagation();
  hidePeek();
});
peekLayer.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); });
function attachPeek(el, c, current) {
  let timerId = null, shown = false, x = 0, y = 0;
  el.addEventListener("pointerdown", e => {
    shown = false; x = e.clientX; y = e.clientY;
    timerId = setTimeout(() => {
      shown = true;
      showPeek(c, current);
      peekLayer.dataset.open = "holding";
      buzz(15);
    }, 420);
  });
  el.addEventListener("pointermove", e => { if (!shown && Math.hypot(e.clientX - x, e.clientY - y) > 14) clearTimeout(timerId); });
  // dito alzato (o gesto annullato dal sistema): l'anteprima resta e da ora un tocco la chiude
  const release = () => {
    clearTimeout(timerId);
    if (shown && peekLayer.dataset.open === "holding") setTimeout(() => { peekLayer.dataset.open = "ready"; }, 60);
  };
  for (const ev of ["pointerup", "pointercancel", "pointerleave"]) el.addEventListener(ev, release);
  el.addEventListener("click", e => { if (shown) { e.stopImmediatePropagation(); e.preventDefault(); shown = false; } }, true);
  el.addEventListener("contextmenu", e => e.preventDefault());
}

// Trascinare una carta dalla mano al tavolo. Verso l'alto parte il trascinamento (in orizzontale la mano
// continua a scorrere). Rilasciata sul tavolo la carta si gioca; quelle con un bersaglio si rilasciano
// sul bersaglio (creatura o eroe), altrimenti si apre la scelta del bersaglio. Rilasciata sulla mano, si annulla.
function attachDrag(el, index, c) {
  let start = null, ghost = null, dragged = false, targets = [], lastHover = null;
  const handTop = () => (document.querySelector(".hand")?.getBoundingClientRect().top ?? window.innerHeight) - 8;
  const targetAt = (x, y) => {
    const hit = document.elementFromPoint(x, y)?.closest(".token[data-side], .hero-portrait[data-side]");
    if (!hit) return null;
    const choice = { side: Number(hit.dataset.side), uid: hit.dataset.uid !== undefined ? Number(hit.dataset.uid) : null };
    return targets.some(t => t.side === choice.side && t.uid === choice.uid) ? { choice, hit } : null;
  };
  const cleanup = () => {
    ghost?.remove(); ghost = null; start = null;
    document.body.classList.remove("dragging-card");
    document.querySelectorAll(".drop-target, .drop-hover, .drop-zone").forEach(n => n.classList.remove("drop-target", "drop-hover", "drop-zone"));
    el.classList.remove("drag-source");
  };
  el.style.touchAction = "pan-x";
  el.addEventListener("dragstart", e => e.preventDefault());   // niente trascinamento nativo dell'immagine
  el.querySelectorAll("img").forEach(img => { img.draggable = false; });
  el.addEventListener("pointerdown", e => {
    if (busy || e.button > 0) return;
    start = { x: e.clientX, y: e.clientY, id: e.pointerId };
    dragged = false;
  });
  el.addEventListener("pointermove", e => {
    if (!start || e.pointerId !== start.id) return;
    const dx = e.clientX - start.x, dy = e.clientY - start.y;
    if (!ghost) {
      if (dy > -16 || Math.abs(dy) < Math.abs(dx)) return;   // solo verso l'alto
      dragged = true;
      try { el.setPointerCapture(e.pointerId); } catch { /* non disponibile */ }
      const rect = el.getBoundingClientRect();
      ghost = el.cloneNode(true);
      ghost.classList.add("drag-ghost");
      Object.assign(ghost.style, { width: `${rect.width}px`, height: `${rect.height}px` });
      document.body.append(ghost);
      el.classList.add("drag-source");
      document.body.classList.add("dragging-card");
      targets = playTargets(game, game.players[game.active].hand[index]);
      if (targets.length) {
        for (const t of targets) {
          const sel = t.uid === null ? `.hero-portrait[data-side="${t.side}"]` : `.token[data-side="${t.side}"][data-uid="${t.uid}"]`;
          document.querySelector(sel)?.classList.add("drop-target");
        }
      } else document.querySelector(".board.mine")?.classList.add("drop-zone");
      sound("select");
    }
    ghost.style.transform = `translate(${e.clientX - ghost.offsetWidth / 2}px, ${e.clientY - ghost.offsetHeight * .6}px) rotate(${Math.max(-8, Math.min(8, dx / 20))}deg) scale(1.15)`;
    const over = targets.length ? targetAt(e.clientX, e.clientY)?.hit ?? null : null;
    if (over !== lastHover) { lastHover?.classList.remove("drop-hover"); over?.classList.add("drop-hover"); lastHover = over; }
    ghost.classList.toggle("will-play", e.clientY < handTop());
  });
  const finish = e => {
    if (!start) return;
    if (!ghost) { start = null; return; }
    const x = e.clientX, y = e.clientY;
    const hit = targets.length ? targetAt(x, y) : null;
    const above = y < handTop();
    cleanup();
    if (e.type === "pointercancel" || busy) return;
    if (hit) { selected = { kind: "play", index }; target(hit.choice.side, hit.choice.uid); }
    else if (above) chooseCard(index);
  };
  el.addEventListener("pointerup", finish);
  el.addEventListener("pointercancel", finish);
  // dopo un trascinamento il «clic» del dito alzato non deve rigiocare la carta
  el.addEventListener("click", e => { if (dragged) { e.stopImmediatePropagation(); e.preventDefault(); dragged = false; } }, true);
}

// ---------- Tavolo di gioco ----------
const keywordOf = c => ({
  taunt: /Provocazione/.test(c.text ?? ""),
  rush: /Rapidità/.test(c.text ?? ""),
  fury: /Furia/.test(c.text ?? ""),
  legacy: /Lascito/.test(c.text ?? ""),
  battlecry: /Urlo di battaglia/.test(c.text ?? ""),
  veiled: /Velato/.test(c.text ?? ""),
});

// Simboli delle meccaniche: icona, nome (per chi legge lo schermo) e classe di colore.
const mechanicSymbols = {
  taunt: ["shield", "Provocazione"], rush: ["bolt", "Rapidità"], veiled: ["veil", "Velato"], fury: ["fury", "Furia"],
  legacy: ["skull", "Lascito"], battlecry: ["horn", "Urlo di battaglia"], pact: ["drop", "Patto"],
  stunned: ["chain", "Bloccata"], silenced: ["mute", "Silenziata"],
};
function symbolBadge(kind, extra) {
  const [name, label] = mechanicSymbols[kind];
  const b = element("span", undefined, `kw kw-${kind}`);
  b.title = t(label);
  b.append(icon(name));
  if (extra !== undefined) b.append(element("b", extra));
  return b;
}
// Fumetto con la battuta della carta appena entrata in gioco.
let lastSpeech = 0;
function speak(anchor, line, side) {
  if (!line || !anchor || Date.now() - lastSpeech < 900) return;
  lastSpeech = Date.now();
  const show = () => {
    const rect = anchor.getBoundingClientRect();
    if (!rect.width) return;
    const bubble = element("div", line, `speech ${side === 0 || side === undefined ? "mine" : "enemy"}`);
    bubble.setAttribute("aria-live", "polite");
    const x = Math.min(window.innerWidth - 150, Math.max(150, rect.left + rect.width / 2));
    Object.assign(bubble.style, { left: `${x}px`, top: `${rect.top - 8}px` });
    document.body.append(bubble);
    setTimeout(() => bubble.classList.add("leaving"), 3400);
    setTimeout(() => bubble.remove(), 3800);
  };
  requestAnimationFrame(() => requestAnimationFrame(show));
}

// Simboli che compaiono in grande sopra un elemento quando una meccanica si attiva.
function popSymbols(anchor, kinds) {
  if (!anchor || !kinds.length) return;
  const show = () => {
    const rect = anchor.getBoundingClientRect();
    if (!rect.width) return;
    const layer = element("div", undefined, "kw-pop");
    layer.setAttribute("aria-hidden", "true");
    Object.assign(layer.style, { left: `${rect.left + rect.width / 2}px`, top: `${rect.top + rect.height / 2}px` });
    for (const kind of kinds) layer.append(symbolBadge(kind));
    document.body.append(layer);
    setTimeout(() => layer.remove(), 1300);
  };
  if (anchor.isConnected) show(); else requestAnimationFrame(() => requestAnimationFrame(show));
}

// Spiegazione delle parole chiave che compaiono nel testo di una carta (anteprima e scheda).
const glossary = {
  Provocazione: "I nemici devono attaccare prima questa creatura: finché è in campo non possono colpire le altre né il tuo eroe. Lei può attaccare chiunque.",
  Rapidità: "Può attaccare nel turno in cui entra in gioco.",
  "Urlo di battaglia": "Effetto che si attiva quando la carta viene giocata.",
  Lascito: "Effetto che si attiva quando la creatura muore.",
  Velato: "Non può essere bersagliato da attacchi, incantesimi e poteri nemici finché non attacca.",
  Furia: "Può attaccare due volte in ogni turno.",
  Patto: "Si paga con punti vita invece che con Essenza.",
  Silenzia: "Toglie alla creatura tutti i suoi effetti e le sue abilità.",
  "Prendi il controllo": "La creatura passa dalla tua parte del tavolo.",
  Rimanda: "La creatura torna nella mano del suo proprietario e perde i potenziamenti.",
  Evoca: "Mette in campo una nuova creatura (se c’è posto: massimo 7).",
  "Riporta in campo": "Rimette in gioco una creatura morta, come nuova.",
};
// Spiegazione del tipo di carta
const typeNotes = {
  Creatura: "Resta sul tavolo e può attaccare dal turno dopo (subito se ha Rapidità). Muore quando la Difesa arriva a 0.",
  Incantesimo: "Si usa una volta sola: il suo effetto avviene subito, poi la carta va negli scarti.",
  Artefatto: "Resta in gioco accanto al tuo eroe e il suo effetto continua a funzionare.",
  Segreto: "Resta nascosto all’avversario e si attiva da solo quando succede quello che c’è scritto.",
};
function keywordNotes(c) {
  const box = element("dl", undefined, "keyword-notes");
  for (const [word, text] of Object.entries(glossary)) {
    if (!(c.text ?? "").includes(word)) continue;
    box.append(element("dt", word), element("dd", text));
  }
  return box.childElementCount ? box : null;
}
// Grafica provvisoria delle carte senza illustrazione (secondo set): sfondo della fazione.
// Grafica provvisoria: il dorso delle carte (si capisce subito che l'illustrazione deve ancora arrivare).
const placeholderArt = () => "assets/originali-chatgpt/dorso-carte.webp";
// Dorso delle carte scelto nel Negozio (piccolo per il tavolo, grande per le buste).
const backSrc = (id, big = false) => `assets/dorsi/${id}${big ? "-grande" : ""}.webp`;
const cardBackSrc = () => backSrc(currentBack());
function applyCardBack() { document.documentElement.style.setProperty("--card-back", `url("${cardBackSrc()}")`); }
applyCardBack();
const crestOf = c => { const img = element("img", undefined, "ph-crest"); img.src = `assets/eroi/${heroFor(c.faction)?.theme ?? "hollow"}.webp`; img.alt = ""; return img; };

// Numero di danno o cura che compare sopra un elemento appena aggiornato.
function floatNumber(node, delta) {
  if (!delta) return;
  const n = element("span", delta < 0 ? `${delta}` : `+${delta}`, delta < 0 ? "float damage" : "float heal");
  n.setAttribute("aria-hidden", "true");
  node.append(n);
}

function track(key, value, node, card) {
  const old = previous.get(key);
  previous.set(key, value);
  if (old === undefined) return true;
  if (old !== value) {
    if (card && value < old) cardSound(card, "hurt");
    floatNumber(node, value - old);
    node.classList.add(value < old ? "hit" : "healed");
  }
  return false;
}

function heroPortrait(side, allow) {
  const p = game.players[side];
  const hero = heroFor(p);
  const isTarget = allow && available(side, null);
  const portrait = isTarget ? button(undefined, () => target(side, null), "hero-portrait target") : element("div", undefined, "hero-portrait");
  portrait.setAttribute("aria-label", t("{hero}: {life} punti vita su {max}", { hero: hero?.name ?? p.name, life: p.life, max: p.maxLife }));
  portrait.dataset.side = side;
  if (hero?.theme || hero?.portrait) {
    const img = element("img", undefined, "emblem");
    img.src = hero.portrait ?? `assets/eroi/${hero.theme}.webp`;
    img.alt = "";
    portrait.append(img);
  } else {
    portrait.append(element("span", p.name.slice(0, 1), "emblem initial"));
  }
  const life = element("span", p.life, "life");
  portrait.append(life);
  track(`hero-${side}`, p.life, portrait);
  return portrait;
}

// Simbolo dentro il cerchio del potere, secondo cosa fa il potere.
function powerIcon(power) {
  if (power.damage || power.heroDamage) return "bolt";
  if (power.heal) return "heart";
  if (power.health || power.defense) return "shield";
  if (power.attack) return "swords";
  if (power.buff) return "crown";
  if (power.summon) return "users";
  return "gem";
}

function powerButton(side, own, allow) {
  const hero = heroFor(game.players[side]);
  if (!hero) return element("span");
  const usable = allow && own && !selected && canUseHeroPower(game);
  const used = game.players[side].powerUsed;
  const b = button(undefined, () => {
    if (powerTargets(game).length) selected = { kind: "power" };
    else if (useHeroPower(game)) sound("power");
    render();
  }, `hero-power${used ? " used" : ""}${usable ? " ready" : ""}`);
  b.disabled = !usable;
  b.title = `${t(hero.power.name)}: ${t(hero.power.text)}`;
  b.setAttribute("aria-label", `${t(hero.power.name)}, ${t("{n} Essenza", { n: heroPowerCost })}: ${t(hero.power.text)}`);
  b.append(element("span", heroPowerCost, "gem"), icon(powerIcon(hero.power), "ico glyph"));
  return b;
}

function crystals(p, side, small = false) {
  const row = element("div", undefined, `crystals${small ? " small" : ""}`);
  row.setAttribute("aria-label", t("Essenza {n} su {max}", { n: p.essence, max: p.capacity }));
  const key = `essence-${side}`;
  const old = previous.get(key);
  previous.set(key, p.essence);
  const count = element("span", undefined, "count");
  count.append(element("b", p.essence), element("span", `/${p.capacity}`));
  row.append(count);
  for (let i = 0; i < rules.maxEssence; i++) {
    const gem = element("i", undefined, i < p.essence ? "full" : i < p.capacity ? "spent" : "locked");
    if (old !== undefined && old > p.essence && i >= p.essence && i < old) gem.classList.add("draining");
    if (old !== undefined && old < p.essence && i >= old && i < p.essence) gem.classList.add("filling");
    row.append(gem);
  }
  if (old !== undefined && old !== p.essence) {
    const f = element("span", old > p.essence ? `-${old - p.essence}` : `+${p.essence - old}`, `float mana ${old > p.essence ? "down" : "up"}`);
    f.setAttribute("aria-hidden", "true");
    row.append(f);
  }
  return row;
}

// Carte che restano in gioco (artefatti e segreti): miniature visibili accanto all'eroe.
function permanents(p, own) {
  const row = element("div", undefined, "permanents");
  for (const id of p.artifacts) {
    const c = byId.get(id);
    const card = button(undefined, () => showCard(c), "perm relic");
    attachPeek(card, c);
    card.setAttribute("aria-label", t("Artefatto: {card}", { card: c.name }));
    const art = illustrationFor(id);
    if (art) { const img = element("img"); img.src = art.thumb; img.alt = ""; img.decoding = "async"; card.append(img); }
    else card.append(element("span", c.name, "perm-name"));
    card.append(element("span", undefined, "perm-tag artifact"));
    row.append(card);
  }
  p.secrets.forEach(id => {
    const c = byId.get(id);
    const card = own ? button(undefined, () => showCard(c), "perm secret mine") : element("span", undefined, "perm secret");
    if (own) attachPeek(card, c);
    card.setAttribute("aria-label", own ? t("Segreto: {card}", { card: c.name }) : t("Segreto nascosto"));
    const img = element("img"); img.alt = "";
    img.src = own ? (illustrationFor(id)?.thumb ?? cardBackSrc()) : cardBackSrc();
    card.append(img, element("span", "?", "perm-tag secret-mark"));
    row.append(card);
  });
  return row;
}

function heroStrip(side, own, allow) {
  const p = game.players[side];
  const hero = heroFor(p);
  const strip = element("div", undefined, `hero-strip ${own ? "mine" : "enemy"}`);
  const info = element("div", undefined, "hero-info");
  info.append(element("strong", hero?.name ?? p.name), element("small", p.ally ? `${p.name} + ${p.ally}` : p.name));
  // Mazzo e mano sempre in vista: in rosso il mazzo vuoto (danni a ogni pescata) e la mano piena.
  const counts = element("div", undefined, "pile-counts");
  const deckChip = element("span", p.deck.length ? t("Mazzo {n}", { n: p.deck.length }) : t("Mazzo vuoto: −{n} PV a turno", { n: (p.fatigue ?? 0) + 1 }),
    `pile pile-deck${p.deck.length === 0 ? " empty" : p.deck.length <= 3 ? " low" : ""}`);
  deckChip.prepend(icon("layers"));
  const handChip = element("span", t("Mano {n}/{max}", { n: p.hand.length, max: rules.handLimit }), `pile pile-hand${p.hand.length >= rules.handLimit ? " full" : ""}`);
  handChip.prepend(icon("cards"));
  counts.append(deckChip, handChip);
  info.append(counts);
  if (!own) {
    const backs = element("div", undefined, "card-backs");
    backs.setAttribute("aria-hidden", "true");
    for (let i = 0; i < p.hand.length; i++) backs.append(element("i"));
    info.append(backs);
  }
  if (p.artifacts.length || p.secrets.length) info.append(permanents(p, own));
  strip.append(heroPortrait(side, allow), powerButton(side, own, allow), info);
  strip.append(crystals(p, side, !own));
  return strip;
}

function token(side, unit, own, allow) {
  const c = cardOf(unit);
  const current = stats(game, side, unit);
  const isTarget = allow && available(side, unit.uid);
  const canAttack = allow && own && (!selected || selected.kind === "attack") && attackTargets(game, unit.uid).length > 0;
  const chosen = selected?.kind === "attack" && selected.uids.includes(unit.uid);
  const details = unit.card ? () => showCard(c) : undefined;
  const action = isTarget ? () => target(side, unit.uid)
    : canAttack ? () => toggleAttacker(unit.uid)
    : details;
  const kw = unit.silenced ? {} : keywordOf(c);
  const tok = button(undefined, action, ["token", c.rarity ?? "", kw.taunt ? "taunt" : "", canAttack ? "can-attack" : "",
    isTarget ? "target" : "", unit.silenced ? "silenced" : "", chosen ? "attacking" : ""].filter(Boolean).join(" "));
  tok.setAttribute("aria-label", `${c.name}, ${t("Attacco {a} · Difesa {d}", { a: current.attack, d: current.health })}${kw.taunt ? `, ${t("Provocazione")}` : ""}${canAttack ? `, ${t("può attaccare")}` : ""}`);
  tok.dataset.side = side;
  tok.dataset.uid = unit.uid;
  if (unit.card) attachPeek(tok, c, current);
  const art = illustrationFor(c.id);
  const face = element("span", undefined, "face");
  if (art) { const img = element("img"); img.src = art.thumb; img.alt = ""; img.decoding = "async"; face.append(img); }
  else { face.classList.add("placeholder"); face.style.setProperty("--ph", `url("${placeholderArt(c)}")`); face.append(crestOf(c), element("span", c.name, "face-name")); }
  tok.append(face);
  if (isVeiled(unit)) tok.classList.add("veiled");
  // fila di simboli in alto: meccaniche della carta e stati della creatura
  const badges = element("span", undefined, "kw-row");
  if (kw.taunt) badges.append(symbolBadge("taunt"));
  if (kw.rush) badges.append(symbolBadge("rush"));
  if (isVeiled(unit)) badges.append(symbolBadge("veiled"));
  if (kw.fury) badges.append(symbolBadge("fury", Math.max(0, maxAttacks(unit) - (unit.attacks ?? 0))));
  if (kw.legacy) badges.append(symbolBadge("legacy"));
  if (unit.stunned) badges.append(symbolBadge("stunned"));
  if (unit.silenced && unit.card) badges.append(symbolBadge("silenced"));
  if (badges.childElementCount) tok.append(badges);
  tok.append(element("span", current.attack, "att"), element("span", current.health, `dif${current.health < current.maxHealth ? " wounded" : ""}`));
  tok.dataset.card = unit.card;
  if (track(unit.uid, current.health, tok, unit.card ? c : null)) {
    tok.classList.add("summoned");
    // appena entrata in gioco: i simboli delle sue meccaniche compaiono in grande
    const kinds = ["battlecry", "taunt", "rush", "veiled", "fury", "legacy"].filter(k => kw[k]);
    popSymbols(tok, kinds);
    if (unit.card) speak(tok, voiceOf(unit.card), side);
  }
  return tok;
}

// Tocca una o più creature per attaccare insieme; un secondo tocco la toglie dalla selezione.
function toggleAttacker(uid) {
  const uids = selected?.kind === "attack" ? [...selected.uids] : [];
  const at = uids.indexOf(uid);
  if (at >= 0) uids.splice(at, 1); else uids.push(uid);
  selected = uids.length ? { kind: "attack", uids } : null;
  sound("select");
  render();
}
function selectAllAttackers() {
  const uids = game.players[game.active].board.filter(u => attackTargets(game, u.uid).length).map(u => u.uid);
  selected = uids.length ? { kind: "attack", uids } : null;
  sound("select");
  render();
}

function boardRow(side, own, allow) {
  const row = element("div", undefined, `board ${own ? "mine" : "enemy"}`);
  row.setAttribute("aria-label", t(own ? "Il tuo campo" : "Campo avversario"));
  for (const unit of game.players[side].board) row.append(token(side, unit, own, allow));
  if (!game.players[side].board.length) row.append(element("span", own ? "Il tuo campo è vuoto" : "", "empty"));
  if (game.players[side].board.length >= rules.boardLimit) row.append(element("span", t("Campo pieno · {n}/{n}", { n: rules.boardLimit }), "board-full"));
  return row;
}

// Gemma del costo: verde se scontata, rossa se rincarata; goccia di sangue con «PV» per i Patti.
// Carta illustrata con i cerchi di costo, Attacco e Difesa. Le scritte stampate sono state tolte dalle
// immagini (tools/pulisci_carte.py): i cerchi mostrano i valori attuali, verdi se migliorati, rossi se peggiorati.
function cardFace(c, art, values = {}, { thumb = false, className = "" } = {}) {
  const face = element("div", undefined, `card-face ${className}`.trim());
  const img = element("img"); img.src = thumb ? art.thumb : art.src; img.alt = ""; img.decoding = "async";
  face.append(img);
  const at = art.circles;
  if (!at) return face;
  const ring = (kind, value, better) => {
    const r = element("span", undefined, `stat-ring ring-${kind}${better === true ? " up" : better === false ? " down" : ""}`);
    r.append(element("b", String(value)));
    r.style.left = `${at[kind][0]}%`; r.style.top = `${at[kind][1]}%`;
    face.append(r);
    return r;
  };
  const cmp = (now, base, lowerIsBetter = false) => now === base ? undefined : (lowerIsBetter ? now < base : now > base);
  if (at.cost && c.cost !== undefined) {
    const cost = values.cost ?? c.cost;
    const r = ring("cost", cost, cmp(cost, c.cost, true));
    if (isPact(c)) { r.classList.add("pact"); r.append(element("small", "PV")); }
  }
  if (c.type === "Creatura" && at.att) {
    ring("att", values.attack ?? c.attack, cmp(values.attack ?? c.attack, c.attack));
    ring("dif", values.health ?? c.health, cmp(values.health ?? c.health, c.health));
  }
  return face;
}

function costGem(c, cost) {
  const gem = element("span", undefined, `gem big${isPact(c) ? " pact" : cost < c.cost ? " cheaper" : cost > c.cost ? " pricier" : ""}`);
  gem.append(element("b", cost));
  if (isPact(c)) gem.append(element("small", "PV"));
  return gem;
}

function handCard(side, id, i) {
  const c = byId.get(id);
  const mull = game.phase === "mulligan";
  const wrap = element("div", undefined, "hand-slot");
  const playable = !mull && canPlay(game, i);
  const card = button(undefined, () => {
    if (!mull) return chooseCard(i);
    if (replacements.has(i)) replacements.delete(i);
    else if (replacements.size < rules.mulliganLimit) replacements.add(i);
    render();
  }, `hand-card ${c.rarity}${playable ? " playable" : ""}`);
  card.disabled = !mull && !playable;
  card.setAttribute("aria-pressed", mull ? replacements.has(i) : selected?.index === i);
  card.setAttribute("aria-label", t("{card}, costo {n}", { card: c.name, n: mull ? c.cost : price(game, side, c) }));
  const art = illustrationFor(id);
  const cost = mull ? c.cost : price(game, side, c);
  if (art) {
    // l'illustrazione è già una carta completa: si aggiunge il costo solo se è cambiato
    if (art.circles) card.append(cardFace(c, art, { cost }, { thumb: true, className: "mini-art" }));
    else {
      const img = element("img", undefined, "mini-art"); img.src = art.thumb; img.alt = ""; card.append(img);
      card.append(costGem(c, cost));
    }
  } else {
    card.classList.add("placeholder");
    card.style.setProperty("--ph", `url("${placeholderArt(c)}")`);
    card.append(crestOf(c), costGem(c, cost), element("span", c.name, "mini-name"));
    if (c.type === "Creatura") card.append(element("span", c.attack, "att"), element("span", c.health, "dif"));
    else card.append(element("span", t(c.type), "mini-type"));
  }
  if (mull && replacements.has(i)) card.append(element("span", "Da cambiare", "swap-mark"));
  attachPeek(card, c);
  if (playable) attachDrag(card, i, c);
  const info = button("i", () => showCard(c), "info");
  info.setAttribute("aria-label", t("Dettagli di {card}", { card: c.name }));
  wrap.append(card, info);
  wrap.style.setProperty("--tilt", `${(i - (game.players[side].hand.length - 1) / 2) * 1.5}deg`);
  return wrap;
}

function handRow(side) {
  const p = game.players[side];
  const hand = element("div", undefined, `hand${game.phase === "mulligan" ? " mulligan" : ""}`);
  hand.setAttribute("aria-label", t("La tua mano"));
  p.hand.forEach((id, i) => hand.append(handCard(side, id, i)));
  return hand;
}

// Prima di ridisegnare: posizione delle creature in campo, per far svanire quelle distrutte.
function captureTokens() {
  const map = new Map();
  for (const t of table.querySelectorAll(".token[data-uid]")) map.set(`${t.dataset.side}:${t.dataset.uid}`, { rect: t.getBoundingClientRect(), node: t.cloneNode(true) });
  return map;
}
function fadeDestroyed(before) {
  let died = 0;
  let voiced = 0;
  for (const [key, { rect, node }] of before) {
    const [side, uid] = key.split(":");
    if (table.querySelector(`.token[data-side="${side}"][data-uid="${uid}"]`)) continue;
    died++;
    node.classList.add("ghost");
    node.removeAttribute("data-uid");
    // ogni carta ha il suo suono di morte (al massimo due insieme, per non coprire tutto)
    const card = byId.get(Number(node.dataset.card));
    if (card && voiced < 2) { cardSound(card, "death"); voiced++; }
    if (card && /Lascito/.test(card.text ?? "") && !node.classList.contains("silenced")) setTimeout(() => popSymbols(node, ["legacy"]), 60);
    Object.assign(node.style, { position: "fixed", left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`, margin: 0 });
    document.body.append(node);
    setTimeout(() => node.remove(), 750);
  }
  if (died && !voiced) sound("death");
}

// Annuncio grande al cambio di turno.
function announceTurn(text, mine) {
  const splash = element("div", undefined, `turn-splash ${mine ? "mine" : "enemy"}`);
  splash.setAttribute("aria-hidden", "true");
  splash.append(element("strong", text));
  document.body.append(splash);
  sound(mine ? "turn" : "enemy");
  if (mine) buzz(40);
  setTimeout(() => splash.remove(), 1500);
}

function render() {
  const before = captureTokens();
  renderTable();
  fadeDestroyed(before);
  if (game.phase === "play") {
    const key = `${game.round}:${game.active}`;
    if (key !== lastTurnKey) {
      lastTurnKey = key;
      const mine = mode !== "cpu" || game.active === 0;
      announceTurn(mode === "cpu" ? (mine ? "Il tuo turno" : "Turno avversario") : t("Turno di {name}", { name: game.players[game.active].name }), mine);
    }
  }
}

// Avvisi grandi al centro dello schermo: mazzo finito, danni da mazzo vuoto, carta persa per mano piena.
let alertState = null;
function centerAlert(title, text, kind = "") {
  const box = element("div", undefined, `center-alert ${kind}`);
  box.setAttribute("role", "alert");
  box.append(icon(kind === "alert-hand" ? "cards" : "skull"), element("strong", title), element("p", text));
  document.querySelectorAll(".center-alert").forEach(old => old.remove());
  document.body.append(box);
  setTimeout(() => box.classList.add("leaving"), 3200);
  setTimeout(() => box.remove(), 3700);
}
function matchAlerts() {
  if (alertState?.game !== game) {
    alertState = { game, fatigue: game.players.map(p => p.fatigue ?? 0), burned: game.players.map(p => p.burned ?? 0), empty: game.players.map(p => !p.deck.length) };
    return;
  }
  game.players.forEach((p, side) => {
    const mine = mode !== "cpu" || side === 0;
    const who = mode === "cpu" ? (side === 0 ? t("Tu") : t("L'avversario")) : p.name;
    if ((p.fatigue ?? 0) > alertState.fatigue[side]) {
      centerAlert(t("Mazzo esaurito!"), t("{who}: nessuna carta da pescare, {damage}. Il danno aumenta di 1 a ogni turno.", { who, damage: p.fatigue === 1 ? t("1 danno") : t("{n} danni", { n: p.fatigue }) }), mine ? "" : "foe");
      sound("hit");
    } else if (!p.deck.length && !alertState.empty[side] && mine) {
      centerAlert(t("Ultima carta pescata"), t("Il tuo mazzo è finito: da ora, a ogni turno senza carte da pescare subirai danni crescenti (1, poi 2, poi 3…)."), "");
    }
    else if ((p.burned ?? 0) > alertState.burned[side] && mine) {
      centerAlert(t("Mano piena"), t("Puoi tenere al massimo {max} carte in mano: la carta pescata è andata persa.", { max: rules.handLimit }), "alert-hand");
    }
    alertState.fatigue[side] = p.fatigue ?? 0;
    alertState.burned[side] = p.burned ?? 0;
    alertState.empty[side] = !p.deck.length;
  });
}

function renderTable() {
  matchAlerts();
  const active = game.active;
  const cpu = mode === "cpu" && (active === 1 || replaying);
  const finished = game.phase === "finished";
  const mull = game.phase === "mulligan";
  document.body.classList.add("in-match");
  table.replaceChildren();
  if (handover) {
    const box = element("div", undefined, "handover");
    box.append(element("p", t("Passa il dispositivo al giocatore di {name}.", { name: game.players[active].name })));
    box.append(button("Mostra la mia mano", () => { handover = false; render(); }, "primary"));
    table.append(box);
    return;
  }
  let message = mull ? t("Scegli fino a {n} carte da cambiare", { n: rules.mulliganLimit }) : cpu ? "Turno avversario" : t("Turno di {name}", { name: game.players[active].name });
  if (mode === "cpu" && !cpu && !mull) message = "Il tuo turno";
  if (selected) message = selected.kind === "attack"
    ? (game.players[1 - game.active].board.some(u => !u.silenced && keywordOf(cardOf(u)).taunt && !isVeiled(u))
      ? t("Provocazione: scegli come bersaglio una creatura con lo scudo")
      : t(selected.uids.length === 1 ? "{n} creatura pronta: scegli il bersaglio" : "{n} creature pronte: scegli il bersaglio", { n: selected.uids.length }))
    : "Scegli un bersaglio";
  if (finished) {
    settleOutcome();
    message = game.winner === "draw" ? "Pareggio" : mode === "cpu" ? (game.winner === 0 ? "Vittoria!" : "Sconfitta") : t("Vince {name}!", { name: game.players[game.winner].name });
  }
  const view = mode === "cpu" ? 0 : active;
  const allow = !cpu && !finished;
  const arena = element("div", undefined, `arena ${cpu ? "enemy-turn" : "my-turn"}${busy ? " busy" : ""}`);
  if (matchEnv) {
    arena.dataset.env = matchEnv;
    const amb = element("div", undefined, "ambience");
    amb.setAttribute("aria-hidden", "true");
    for (let i = 0; i < 6; i++) amb.append(element("i"));
    amb.append(element("b", undefined, "env-flash"));
    arena.append(amb);
    if (mull) arena.append(element("div", `${t("Ambientazione")} · ${t(environments[matchEnv].name)}`, "env-name"));
  }
  if (mull && !cpu) {
    arena.append(element("p", view === 0
      ? "Giochi per primo: nel tuo primo turno non peschi."
      : "Giochi per secondo: hai una carta in più e, dopo il cambio, ricevi il Frammento di Essenza (0 Essenza: +1 Essenza per un turno).", "order-note"));
  }
  const top = element("div", undefined, "topbar");
  top.append(button("☰ Menu", () => {
    if (finished || confirm(t("Abbandonare la partita?"))) reset();
  }, "small menu-exit"));
  const status = element("strong", message, `banner${selected ? " targeting" : ""}${cpu ? " waiting" : ""}`);
  status.setAttribute("role", "status");
  top.append(status);
  const fresh = !mull && logSeenKey !== lastTurnKey ? previousTurn().length : 0;
  const logButton = button(fresh ? `${t("Registro")} · ${fresh}` : "Registro", () => { logSeenKey = lastTurnKey; showLog(); }, `small${fresh ? " has-new" : ""}`);
  logButton.setAttribute("aria-label", fresh ? t("Registro, {n} mosse nuove", { n: fresh }) : t("Registro della partita"));
  top.append(logButton);
  arena.append(top);
  if (storyChapter !== null && !finished && game.round <= 1) {
    const box = element("div", undefined, "recap");
    box.append(element("strong", `${t("Capitolo {n}", { n: storyChapter + 1 })} · ${t(chapters[storyChapter].title)}`), element("p", chapters[storyChapter].intro));
    arena.append(box);
  }
  const enemyTheme = heroFor(game.players[1 - view])?.theme ?? "default";
  const myTheme = heroFor(game.players[view])?.theme ?? "default";
  const enemyZone = element("section", undefined, "zone enemy");
  enemyZone.dataset.theme = enemyTheme;
  const myZone = element("section", undefined, "zone mine");
  myZone.dataset.theme = myTheme;
  if (!mull) {
    enemyZone.append(heroStrip(1 - view, false, allow), boardRow(1 - view, false, allow));
    myZone.append(boardRow(view, true, allow), heroStrip(view, true, allow));
  } else {
    myZone.append(heroStrip(view, true, false));
  }
  const veil = element("div", undefined, "veil-line");
  if (mull) enemyZone.hidden = true;
  // Azione principale a destra del tavolo
  const side = element("div", undefined, "turn-bar");
  if (finished) {
    const end = element("div", undefined, "result");
    end.append(element("strong", message, "result-title"));
    if (outcome?.lines.length) end.append(element("span", outcome.lines.join(" · "), "reward-line"));
    if (storyChapter !== null && game.winner === 0 && outcome && !outcome.scenePlayed && scenes[storyChapter]?.after?.length) {
      outcome.scenePlayed = true;
      const chapter = chapters[storyChapter];
      setTimeout(() => playScene(scenes[chapters.indexOf(chapter)].after, chapter), 900);
    }
    if (outcome?.story) {
      const box = element("div", undefined, "recap story-outro");
      box.append(element("strong", chapters[storyChapter]?.title ?? "Storia"), element("p", outcome.story));
      end.append(box);
    }
    // riepilogo della partita
    const tally = game.stats[view];
    const sum = element("div", undefined, "result-stats");
    for (const [label, value] of [["Turni", tally.turns], ["Carte giocate", tally.cards], ["Danni all’eroe", tally.heroDamage], ["Creature distrutte", tally.kills]]) {
      const cell = element("div"); cell.append(element("b", value), element("small", label)); sum.append(cell);
    }
    end.append(sum);
    const actions = element("div", undefined, "result-actions");
    const won = game.winner === view || (mode !== "cpu" && game.winner !== "draw");
    if (storyChapter !== null) {
      const next = storyChapter + 1;
      if (game.winner === 0 && next < chapters.length) actions.append(button("Prossimo capitolo", () => playChapter(next), "primary"));
      else if (game.winner !== 0) actions.append(button("Riprova il capitolo", rematch, "primary"));
      actions.append(button("Torna alla Storia", reset));
    } else if (matchKind === "descent") {
      actions.append(button(descentState() ? "Continua la discesa" : "Torna alla Discesa", reset, "primary"));
    } else if (matchKind === "brawl") {
      actions.append(button("Gioca ancora la Rissa", () => { const f = lastMatch.names[0]; reset(); startBrawl(f); }, "primary"), button("Torna alle modalità", reset));
    } else {
      actions.append(button("Rivincita", rematch, "primary"), button("Cambia eroe", reset));
    }
    end.append(actions);
    end.classList.add(won ? "won" : "lost");
    arena.append(end);
  } else if (!cpu && selected) {
    if (selected.kind === "attack") {
      const ready = game.players[active].board.filter(u => attackTargets(game, u.uid).length).length;
      if (ready > selected.uids.length) side.append(button("Tutte", selectAllAttackers, "end-turn all"));
    }
    side.append(button("Annulla", () => { selected = null; render(); }, "end-turn cancel"));
  }
  else if (!cpu && mull) side.append(button("Conferma mano", () => { mulligan(game, [...replacements]); afterTurn(); }, "end-turn primary"));
  else if (!cpu) {
    const anyMove = game.players[active].hand.some((_, i) => canPlay(game, i)) || canUseHeroPower(game)
      || game.players[active].board.some(u => attackTargets(game, u.uid).length);
    side.append(button("Fine turno", () => { endTurn(game); afterTurn(); }, `end-turn primary${anyMove ? "" : " done"}`));
  } else side.append(button("Turno avversario", () => {}, "end-turn waiting"));
  side.querySelector("button")?.toggleAttribute("disabled", cpu);
  if (game.players[view].peek !== null && game.players[view].peek === game.players[view].deck[0] && !mull) {
    myZone.append(element("p", t("In cima al mazzo: {card}", { card: byId.get(game.players[view].peek).name }), "peek"));
  }
  arena.append(enemyZone, veil, myZone);
  arena.classList.toggle("mulligan", mull);
  if (mull) {
    if (!cpu) arena.append(handRow(view));
    side.classList.add("inline");
    arena.append(side);
  } else {
    if (!finished) veil.append(side);
    if (allow) arena.append(handRow(view));
  }
  table.append(arena);
}

function showLog() {
  const body = element("div", undefined, "viewer-rules");
  body.append(element("h2", "Registro della partita"));
  const list = element("ol", undefined, "log");
  for (const entry of game.log.slice(-30)) list.append(element("li", entry));
  const close = button("Chiudi", () => viewer.close(), "primary");
  body.append(list, close);
  const wrap = element("div", undefined, "viewer-body single");
  wrap.append(body);
  viewer.replaceChildren(wrap);
  viewer.showModal();
  close.focus();
}

function previousTurn() {
  const starts = game.turnStarts ?? [];
  if (starts.length < 2) return [];
  return game.log.slice(starts.at(-2) + 1, starts.at(-1)).slice(-6);
}

// ---------- Storia ----------
async function playChapter(index, { skipScene = false } = {}) {
  const chapter = chapters[index];
  if (!chapter) return;
  const scene = scenes[index];
  if (!skipScene && scene?.before?.length) await playScene(scene.before, chapter);
  storyChapter = index;
  storyPick = index;
  mode = "cpu";
  level = chapter.level;
  startMatch([storyFaction, chapter.opponent], [playableDeck(storyFaction), null], { lives: chapter.lives, env: heroFor(chapter.opponent)?.theme, heroes: [heroOption(storyHero), scene?.enemyHero ?? null] });
}

// ---------- Scene di dialogo della Storia ----------
// Mostra le battute una alla volta: un tocco completa la frase, un altro passa alla successiva.
function playScene(lines, chapter) {
  return new Promise(resolve => {
    const theme = heroFor(chapter?.opponent)?.theme ?? "hollow";
    const layer = element("div", undefined, "scene");
    layer.style.setProperty("--bg", `url("assets/sfondi/home-${theme}.webp")`);
    layer.setAttribute("role", "dialog");
    layer.setAttribute("aria-label", t(chapter?.title ?? "Storia"));
    const skip = button("Salta ›", () => finish(), "scene-skip");
    const title = element("div", chapter ? `${t("Capitolo {n}", { n: chapters.indexOf(chapter) + 1 })} · ${t(chapter.title)}` : "", "scene-title");
    const box = element("div", undefined, "scene-box");
    const face = element("div", undefined, "scene-face");
    const name = element("strong", undefined, "scene-name");
    const text = element("p", undefined, "scene-text");
    const hint = element("small", "Tocca per continuare", "scene-hint");
    box.append(face, name, text, hint);
    layer.append(title, skip, box);
    document.body.append(layer);
    let index = -1, typing = null, full = "";
    const me = heroWithId(storyHero) ?? heroFor(storyFaction);
    function show(i) {
      const [who, line] = lines[i];
      const person = cast[who] ?? { name: who };
      const narrator = who === "narratore";
      box.classList.toggle("narrator", narrator);
      box.classList.toggle("player", who === "tu");
      name.textContent = who === "tu" ? (me?.name ?? t("Tu")) : t(person.name);
      face.replaceChildren();
      face.style.backgroundImage = "";
      if (!narrator) {
        const src = who === "tu" ? me?.portrait : person.portrait;
        if (src) face.style.backgroundImage = `url("${src}")`;
        else if (person.card) { face.style.backgroundImage = `url("${illustrationFor(person.card)?.src}")`; face.classList.add("from-card"); }
      }
      face.classList.toggle("from-card", Boolean(person.card) && !narrator);
      full = t(line);
      text.textContent = "";
      let n = 0;
      clearInterval(typing);
      typing = setInterval(() => { n += 2; text.textContent = full.slice(0, n); if (n >= full.length) { clearInterval(typing); typing = null; } }, 24);
      box.classList.remove("enter"); void box.offsetWidth; box.classList.add("enter");
    }
    function next() {
      if (typing) { clearInterval(typing); typing = null; text.textContent = full; return; }
      index++;
      if (index >= lines.length) return finish();
      sound("select");
      show(index);
    }
    function finish() {
      clearInterval(typing);
      layer.classList.add("leaving");
      setTimeout(() => { layer.remove(); resolve(); }, 300);
    }
    layer.addEventListener("click", e => { if (e.target !== skip) next(); });
    next();
  });
}

function renderStory() {
  const panel = get("story");
  const cleared = storyProgress();
  storyPick ??= Math.min(cleared, chapters.length - 1);
  const head = element("div", undefined, "section-head");
  head.append(element("h2", `${t("Storia")} · ${t(storyTitle)}`), element("span", t("Capitoli superati {n}/{max}", { n: cleared, max: chapters.length }), "muted"));
  const list = element("ol", undefined, "chapter-list");
  chapters.forEach((chapter, i) => {
    if (i === 0 || i === actOneLength) list.append(element("li", t(i === 0 ? "Atto I · La Notte del Velo Spezzato" : "Atto II · La Marea sotto la Città"), "act-title"));
    const unlocked = isUnlocked(i);
    const state = t(i < cleared ? "✓ Superato" : unlocked ? "Disponibile" : "Bloccato");
    const item = element("li");
    const choose = button(`${i + 1}. ${t(chapter.title)} · ${state}`, () => { storyPick = i; renderStory(); });
    choose.disabled = !unlocked;
    choose.setAttribute("aria-pressed", storyPick === i);
    choose.classList.add("chapter-tile");
    choose.dataset.state = i < cleared ? "done" : unlocked ? "open" : "locked";
    choose.style.setProperty("--bg", `url("assets/sfondi/home-${heroFor(chapter.opponent)?.theme ?? "hollow"}.webp")`);
    item.append(choose);
    list.append(item);
  });
  const chapter = chapters[storyPick];
  const detail = element("article", undefined, "chapter");
  detail.style.setProperty("--bg", `url("assets/sfondi/home-${heroFor(chapter.opponent)?.theme ?? "hollow"}.webp")`);
  detail.append(element("h3", `${t("Capitolo {n}", { n: storyPick + 1 })} · ${t(chapter.title)}`), element("p", chapter.intro));
  const enemyHero = heroFor(chapter.opponent);
  detail.append(element("p", t("Avversario: {hero} ({faction}) · {level} · {enemy} PV contro i tuoi {mine}", { hero: enemyHero?.name ?? chapter.opponent, faction: chapter.opponent, level: t(chapter.level), enemy: chapter.lives[1], mine: chapter.lives[0] }), "muted"));
  const firstTime = storyPick >= cleared;
  const heroPrize = chapter.reward.hero && heroWithId(chapter.reward.hero);
  detail.append(element("p", firstTime ? t("Premio alla prima vittoria: {reward}", { reward: rewardText(chapter.reward) }) + (heroPrize ? t(" e il nuovo eroe {hero}", { hero: heroPrize.name }) : "") : "Capitolo già superato: puoi rigiocarlo per le Schegge della vittoria.", "reward-line"));
  const pickFaction = element("div", undefined, "picker-box");
  pickFaction.append(element("h3", "Il tuo eroe"), heroChoices(storyHero, hero => { storyFaction = hero.faction; storyHero = hero.id; sound("select"); renderStory(); }));
  const start = button("Gioca il capitolo", () => playChapter(storyPick), "primary");
  if (storyPick < cleared && scenes[storyPick]) {
    const again = button("Rivedi i dialoghi", async () => { await playScene(scenes[storyPick].before, chapter); await playScene(scenes[storyPick].after, chapter); });
    detail.append(again);
  }
  detail.append(pickFaction, start);
  const actOne = cleared >= actOneLength
    ? t("Atto I completato · Titolo {title}", { title: t(titles[finalReward.title].name) })
    : t("Premio dell’Atto I: {reward} e il titolo {title}", { reward: rewardText(finalReward), title: t(titles[finalReward.title].name) });
  const actTwo = cleared >= chapters.length
    ? t("Atto II completato · Titolo {title}", { title: t(titles[actTwoReward.title].name) })
    : t("Premio dell’Atto II: {reward} e il titolo {title}", { reward: rewardText(actTwoReward), title: t(titles[actTwoReward.title].name) });
  const final = element("p", `${actOne} · ${actTwo}`, "muted");
  panel.replaceChildren(head, list, detail, final);
}

// ---------- Missioni e profilo ----------
function renderQuests(message = "") {
  const panel = get("quests");
  const profile = loadProfile();
  const all = currentMissions();
  const head = element("div", undefined, "section-head");
  head.append(element("h2", "Missioni"));
  const status = element("p", message, "reward-line");
  status.setAttribute("role", "status");
  const block = (title, note, list, claimFn = claimMission) => {
    const box = element("section", undefined, "quest-block");
    box.append(element("h3", title), element("p", note, "muted"));
    const ul = element("ul", undefined, "quest-list");
    for (const m of list) {
      const li = element("li", undefined, m.claimed ? "claimed" : m.done ? "done" : "");
      const text = element("div");
      text.append(element("strong", t(m.text, m.vars)), element("small", t("Premio: {reward}", { reward: rewardText(m) })));
      const bar = element("progress");
      bar.max = m.goal; bar.value = m.value;
      bar.setAttribute("aria-label", `${t(m.text, m.vars)}: ${t("{n} su {max}", { n: m.value, max: m.goal })}`);
      const claim = button(m.claimed ? "Riscattata" : m.done ? "Riscatta" : `${m.value}/${m.goal}`, () => {
        const got = claimFn(m.id);
        if (got) { sound("reward"); updateWallet(); renderQuests(t("Hai ottenuto {reward}.", { reward: rewardText(got) })); }
      }, m.done && !m.claimed ? "primary" : "");
      claim.disabled = !m.done || m.claimed;
      li.append(text, bar, claim);
      ul.append(li);
    }
    box.append(ul);
    return box;
  };
  const profileBox = element("section", undefined, "quest-block");
  profileBox.append(element("h3", "Profilo"));
  profileBox.append(element("p", t("Partite contro il computer {n} · Vittorie {won}", { n: profile.stats.played, won: profile.stats.won })));
  const { have, max } = collectionProgress();
  profileBox.append(element("p", t("Collezione {n}/{max} copie giocabili", { n: have, max })));
  profileBox.append(element("p", profile.titles.length ? t("Titoli: {list}", { list: profile.titles.map(id => t(titles[id]?.name)).join(", ") }) : "Nessun titolo ancora: completa il tutorial e la Storia.", "muted"));
  if (profile.history.length) {
    const details = element("details");
    details.append(element("summary", "Ultimi premi"));
    const ol = element("ul", undefined, "log");
    for (const line of profile.history.slice(0, 10)) ol.append(element("li", typeof line === "string" ? line : t(line.text, line.vars)));
    details.append(ol);
    profileBox.append(details);
  }
  panel.replaceChildren(head, status,
    block("Giornaliere", "Si rinnovano a mezzanotte. Contano le partite contro il computer e la Storia.", all.daily),
    block("Settimanali", "Si rinnovano ogni lunedì.", all.weekly),
    block("Obiettivi", "Traguardi permanenti: il premio si riscatta una volta sola.", currentAchievements(), claimAchievement),
    profileBox);
}

// ---------- Altre modalità: Discesa nel Velo e Rissa della settimana ----------
function hashText(text) { let h = 2166136261; for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; }
const weeklyBrawl = () => brawls[hashText(weekKey()) % brawls.length];

function renderExtraModes() {
  const box = get("extra-modes");
  box.replaceChildren(element("h2", "Altre modalità"));
  const tile = (kind, iconName, title, text, extra) => {
    const b = button(undefined, () => openModes(kind), `mode-tile ${kind}`);
    b.append(icon(iconName), element("strong", title), element("small", text));
    if (extra) b.append(element("span", extra, "mode-tag"));
    return b;
  };
  const run = descentState();
  box.append(
    tile("descent", "skull", "Discesa nel Velo", "Vittorie di fila contro avversari sempre più forti. Tre sconfitte e finisce.",
      run ? t("In corso: {w} vittorie", { w: run.wins }) : descentBest() ? t("Record: {n} vittorie", { n: descentBest() }) : ""),
    tile("brawl", "moon", "Rissa della settimana", t("Questa settimana: {name}", { name: t(weeklyBrawl().name) }),
      loadProfile().brawlWeek === weekKey() ? t("Premio della settimana ottenuto") : t("Prima vittoria: 1 busta + 100 Schegge")),
  );
}

function openModes(kind) {
  showSection("modes-view");
  if (kind === "descent") renderDescent(); else renderBrawl();
}

function factionPicker(onPick, label) {
  const grid = element("div", undefined, "mode-factions");
  for (const faction of factions) {
    const b = button(undefined, () => onPick(faction), "mode-faction");
    const img = element("img"); img.src = heroFor(faction)?.portrait ?? ""; img.alt = "";
    b.append(img, element("strong", faction), element("small", t(label)));
    b.dataset.faction = faction;
    grid.append(b);
  }
  return grid;
}

function renderDescent(message = "") {
  const panel = get("modes-view");
  const run = descentState();
  const head = element("div", undefined, "section-head");
  head.append(element("h2", "Discesa nel Velo"), button("‹ Indietro", () => showSection("match")));
  const status = element("p", message, "reward-line"); status.setAttribute("role", "status");
  const parts = [head, status];
  if (!run) {
    parts.push(element("p", "Scegli una fazione: parti dal suo mazzo predefinito. Dopo ogni vittoria scegli una carta su tre da aggiungere al mazzo. Gli avversari diventano più forti a ogni vittoria. Alla terza sconfitta la discesa finisce e ricevi Schegge (e buste dalle 5 vittorie in su).", "muted"));
    if (descentBest()) parts.push(element("p", t("Il tuo record: {n} vittorie.", { n: descentBest() })));
    parts.push(factionPicker(faction => { startDescent(faction); sound("select"); renderDescent(); }, "Inizia la discesa"));
  } else if (run.choices) {
    parts.push(element("h3", t("Vittoria n. {n}! Scegli una carta da aggiungere al mazzo", { n: run.wins })));
    const grid = element("div", undefined, "descent-choices");
    for (const id of run.choices) {
      const c = byId.get(id); const art = illustrationFor(id);
      const b = button(undefined, () => { pickDescentCard(id); sound("reward"); renderDescent(t("{card} aggiunta al mazzo.", { card: c.name })); }, "descent-choice");
      b.setAttribute("aria-label", c.name);
      b.dataset.card = id;
      b.append(art ? cardFace(c, art, {}, { thumb: true }) : drawCard(c));
      grid.append(b);
    }
    parts.push(grid, button("Non aggiungere nulla", () => { skipDescentCard(); renderDescent(); }));
  } else {
    const info = element("div", undefined, "descent-status");
    const hearts = element("span", undefined, "descent-hearts");
    for (let i = 0; i < maxLosses; i++) hearts.append(element("i", i < maxLosses - run.losses ? "♥" : "♡"));
    info.append(element("strong", t("{f} · {w} vittorie", { f: run.faction, w: run.wins })), hearts, element("small", t("Mazzo di {n} carte", { n: run.deck.length })));
    const rival = run.rival;
    const next = element("div", undefined, "descent-next");
    next.append(element("h3", "Prossimo avversario"), element("p", t("{f} · {level} · {life} punti vita", { f: rival.faction, level: t(rival.level), life: rival.life })));
    const actions = element("div", undefined, "actions");
    actions.append(button("Combatti", () => playDescent(), "primary"), button("Vedi mazzo", () => showDeck(run.faction, run.deck, null)),
      button("Abbandona", () => { if (confirm(t("Vuoi davvero chiudere la discesa? Riceverai il premio per le vittorie ottenute."))) { const r = abandonDescent(); renderDescent(r?.reward ? descentRewardText(r.reward) : ""); renderExtraModes(); } }));
    parts.push(info, next, actions);
  }
  panel.replaceChildren(...parts);
}

const descentRewardText = r => t("Discesa finita con {w} vittorie: {reward}.", { w: r.wins, reward: rewardText(r) });

function playDescent() {
  const run = descentState();
  if (!run) return renderDescent();
  mode = "cpu"; level = run.rival.level; storyChapter = null;
  startMatch([run.faction, run.rival.faction], [null, null], { kind: "descent", decks: [run.deck, null], lives: [rules.maxLife, run.rival.life] });
  matchExtras = won => {
    const result = recordDescent(won);
    const extra = { descentWins: (descentState()?.wins ?? result?.reward?.wins ?? 0) };
    if (result?.ended) outcome.lines.push(descentRewardText(result.reward));
    else if (won) outcome.lines.push(t("Discesa: {w} vittorie. Scegli la tua nuova carta!", { w: descentState().wins }));
    else outcome.lines.push(t("Discesa: ti restano {n} vite.", { n: maxLosses - descentState().losses }));
    renderExtraModes();
    return extra;
  };
}

function renderBrawl(message = "") {
  const panel = get("modes-view");
  const rule = weeklyBrawl();
  const head = element("div", undefined, "section-head");
  head.append(element("h2", "Rissa della settimana"), button("‹ Indietro", () => showSection("match")));
  const status = element("p", message, "reward-line"); status.setAttribute("role", "status");
  const card = element("div", undefined, "brawl-rule");
  card.append(icon("moon"), element("strong", rule.name), element("p", rule.text));
  const done = loadProfile().brawlWeek === weekKey();
  card.append(element("small", done ? "Hai già ottenuto il premio di questa settimana: puoi continuare a giocare per divertimento." : "Prima vittoria della settimana: 1 busta e 100 Schegge.", "muted"));
  const note = element("p", "La regola cambia ogni lunedì. Si gioca contro il computer a livello Normale.", "muted");
  panel.replaceChildren(head, status, card, note, factionPicker(startBrawl, rule.id === "chaos" ? "Mazzo casuale" : "Gioca la Rissa"));
}

function startBrawl(faction) {
  const rule = weeklyBrawl();
  const rivals = factions.filter(f => f !== faction);
  const rival = rivals[Math.floor(Math.random() * rivals.length)];
  mode = "cpu"; level = "Normale"; storyChapter = null;
  const decks = rule.id === "chaos" ? [chaosDeck(), chaosDeck()] : [playableDeck(faction)?.cards ?? null, null];
  startMatch([faction, rival], [null, null], { kind: "brawl", brawl: rule.id, decks });
  matchExtras = won => {
    const profile = loadProfile();
    if (won && profile.brawlWeek !== weekKey()) {
      profile.brawlWeek = weekKey();
      const reason = t("Rissa della settimana");
      addPacks(1, reason, profile); addShards(100, reason, profile);
      outcome.lines.push(t("Premio della Rissa: 1 busta e 100 Schegge"));
    }
    renderExtraModes();
    return { brawl: true };
  };
}

// ---------- Buste ----------
let shopTab = "buste";
function drawShop() {
  const shop = get("shop");
  const profile = loadProfile();
  const { have, max } = collectionProgress();
  const head = element("div", undefined, "section-head");
  head.append(element("h2", "Negozio"), element("span", t("Collezione {n}/{max}", { n: have, max }), "muted"));
  const wallet = element("div", undefined, "wallet-card");
  const coins = element("div", undefined, "coin-total");
  coins.append(icon("gem", "ico coin-icon"), element("strong", profile.shards), element("span", "Schegge"));
  const packsBox = element("div", undefined, "coin-total");
  packsBox.append(icon("pack", "ico coin-icon pack"), element("strong", profile.packs), element("span", profile.packs === 1 ? "busta da aprire" : "buste da aprire"));
  wallet.append(coins, packsBox,
    element("p", "Le Schegge sono le monete del gioco: le guadagni vincendo le partite (15, 25 o 40 secondo la difficoltà, 5 se perdi), con le missioni, la Storia e il tutorial.", "muted"));
  // schede del Negozio
  const tabs = element("div", undefined, "seg shop-tabs");
  for (const [id, label, ico] of [["buste", "Buste", "pack"], ["dorsi", "Dorsi delle carte", "cards"]]) {
    const b = button(undefined, () => { shopTab = id; drawShop(); }, "seg-item");
    b.setAttribute("aria-pressed", shopTab === id);
    b.append(icon(ico), element("span", label));
    tabs.append(b);
  }
  const children = [head, wallet, tabs];
  const showResult = cardsWon => {
    lastPack = cardsWon;
    sound("pack");
    updateWallet();
    drawShop();
    get("shop").querySelector(".pack-result")?.scrollIntoView({ block: "start", behavior: "smooth" });
  };
  if (shopTab === "buste") {
    // scorta di buste da aprire
    const packArt = element("div", undefined, `pack-art${profile.packs ? " ready" : ""}`);
    packArt.setAttribute("aria-hidden", "true");
    const back = element("img"); back.src = backSrc(currentBack(profile), true); back.alt = "";
    packArt.append(back, element("span", profile.packs, "pack-count"));
    const open = button(t("Apri una busta ({n})", { n: profile.packs }), () => { const r = openPack(); if (r) showResult(r); }, "primary");
    open.disabled = profile.packs < 1;
    children.push(packArt, open);
    if (lastPack) {
      const row = element("div", undefined, "cards pack-result");
      for (const result of lastPack) {
        const c = byId.get(result.id);
        row.append(drawCard(c, { meta: true, art: "full", badge: result.newCopy ? "Nuova copia!" : t("Doppione · +{n} Schegge", { n: result.shards }), action: () => showCard(c) }));
      }
      children.push(row);
    }
    children.push(element("h3", "Buste di carte"), element("p", "Ogni busta contiene 5 carte. Le copie oltre il massimo giocabile (3, o 1 per le Leggendarie) diventano Schegge.", "muted"));
    const grid = element("div", undefined, "offer-grid");
    for (const offer of packOffers) {
      const tile = element("div", undefined, `offer${offer.legendary ? " legendary" : ""}${offer.faction ? " faction" : ""}`);
      if (offer.faction) tile.dataset.faction = offer.faction;
      const art = element("img", undefined, "offer-art");
      art.src = offer.faction ? backSrc({ "Corte di Hollow": "corte", "Patto Neon": "neon", "Senza Santi": "santi", "Sottocittà": "sottocitta" }[offer.faction] ?? "velo")
        : offer.legendary ? backSrc("santi") : offer.id === "archivi" ? backSrc("ossa") : backSrc(currentBack(profile));
      art.alt = "";
      const name = offer.faction ? `${t("Busta")}: ${offer.faction}` : t(offer.name);
      const buy = button(t("{n} Schegge", { n: offer.price }), () => {
        const r = buyOffer(offer.id);
        if (!r) return;
        if (r.cards) showResult(r.cards);
        else { sound("reward"); updateWallet(); drawShop(); }
      }, "primary");
      buy.disabled = profile.shards < offer.price;
      buy.setAttribute("aria-label", t("Compra {name} per {n} Schegge", { name, n: offer.price }));
      if (offer.count > 1) tile.append(element("span", `×${offer.count}`, "offer-count"));
      tile.append(art, element("strong", name), element("small", offer.text), element("small", offer.special ? "Si apre subito" : "Va nella tua scorta", "offer-note"), buy);
      grid.append(tile);
    }
    children.push(grid);
  } else {
    children.push(element("p", "I dorsi cambiano il retro delle tue carte in partita e delle buste nel Negozio.", "muted"));
    const grid = element("div", undefined, "offer-grid backs");
    const mine = ownedBacks(profile);
    for (const back of cardBacks) {
      const tile = element("div", undefined, `offer back-tile${currentBack(profile) === back.id ? " equipped" : ""}`);
      const art = element("img", undefined, "offer-art"); art.src = backSrc(back.id, true); art.alt = "";
      tile.append(art, element("strong", back.name));
      let action;
      if (currentBack(profile) === back.id) action = element("span", "In uso", "offer-note equipped-note");
      else if (mine.includes(back.id)) action = button("Usa", () => { setBack(back.id); applyCardBack(); drawShop(); });
      else {
        action = button(t("{n} Schegge", { n: back.price }), () => { if (buyBack(back.id)) { sound("reward"); applyCardBack(); updateWallet(); drawShop(); } }, "primary");
        action.disabled = profile.shards < back.price;
      }
      tile.append(action);
      grid.append(tile);
    }
    children.push(grid);
  }
  shop.replaceChildren(...children);
}

// Nell'app Android i file sono già sul telefono: il service worker serve solo nel browser.
if (!window.Capacitor && "serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}
// solo nei test automatici: richiamare gli effetti per fotografarli
if (navigator.webdriver) window.__vb = {
  legend: id => legendaryEntrance(byId.get(id), 0),
  impact: (faction, selector) => impactFx(document.querySelector(selector), faction),
};
renderExtraModes();
showSection("match");
if (introEnabled() && !navigator.webdriver) playIntro({ onEnter: () => playMusic(musicTheme()) });
// interfaccia pronta (e introduzione già sopra): via la copertina di avvio
{
  const boot = document.getElementById("boot");
  if (boot) requestAnimationFrame(() => { boot.classList.add("gone"); setTimeout(() => boot.remove(), 400); });
}
