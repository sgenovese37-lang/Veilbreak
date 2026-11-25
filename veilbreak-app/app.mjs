import { cards } from "./cards.mjs";
import {
  factions, byId, createGame, mulligan, canPlay, playTargets, play,
  attackTargets, attack, endTurn, stats, cardOf, price,
  defaultDeck, copyLimit, deckSize, validDeck, rules, powerTargets, canUseHeroPower, useHeroPower,
  essenceShard, essenceShardId, isPact, isVeiled, maxAttacks,
} from "./game.mjs";

import { renderTutorial } from "./tutorial.mjs";
import { heroFor, heroPowerCost, heroesOf, lockedHeroes, heroWithId } from "./heroes.mjs";
import { illustrationFor as catalogueArt } from "./illustrations.mjs";
import { runComputer } from "./ai.mjs";
import {
  loadProfile, owned, buyPack, openPack, packPrice, collectionProgress, rewardMatch, titles,
} from "./profile.mjs";
import { currentMissions, recordEvent, claimMission } from "./missions.mjs";
import { chapters, storyTitle, storyProgress, isUnlocked, completeChapter, finalReward, unlockedHeroes } from "./story.mjs";
import { sound, soundEnabled, setSound, buzz, cardSound, startAmbience, stopAmbience } from "./audio.mjs";
import { environments, environmentFor } from "./environments.mjs";
import { playMusic, musicEnabled, setMusic } from "./music.mjs";
import { t, languages, currentLang, setLang, translatePage } from "./i18n.mjs";
import { icon, mountIcons } from "./icons.mjs";
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
  const music = get("music-toggle");
  music.textContent = t(musicEnabled() ? "Musica: sì" : "Musica: no");
  music.setAttribute("aria-pressed", musicEnabled());
}
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
const playableDeck = name => {
  const deck = savedDecks.get(name);
  return validDeck(name, deck) && deckOwned(deck) ? deck : null;
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
    const locked = lockedHeroes[faction];
    if (locked && !unlocked.includes(locked.id)) list.push({ ...heroWithId(locked.id), unavailable: true });
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
  if (art) {
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
    const img = element("img", undefined, "viewer-art");
    img.src = art.src;
    img.alt = t("Illustrazione di {card}", { card: c.name });
    body.append(img);
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
    const img = body.querySelector(".viewer-art");
    let showingOriginal = false;
    const toggle = button("Vedi originale", () => {
      showingOriginal = !showingOriginal;
      img.src = showingOriginal ? art.original : art.src;
      toggle.textContent = t(showingOriginal ? "Vedi versione corretta" : "Vedi originale");
    });
    rules.append(toggle);
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
    draft = [...(savedDecks.get(editing) ?? defaultDeck(editing))];
    renderDeckEditor("", "faction");
  };
  header.append(select);
  const controls = element("div", undefined, "actions");
  controls.append(element("strong", t("{n}/{max} carte", { n: used, max: deckSize })));
  const save = button("Salva mazzo", () => {
    savedDecks.set(editing, [...draft]);
    try {
      localStorage.setItem(decksKey, JSON.stringify(Object.fromEntries(savedDecks)));
      renderDeckEditor("Mazzo salvato.", "save");
    } catch {
      renderDeckEditor("Mazzo disponibile per questa sessione.", "save");
    }
  }, "primary");
  save.disabled = !validDeck(editing, draft) || !deckOwned(draft);
  controls.append(save);
  controls.append(button("Ripristina predefinito", () => { draft = defaultDeck(editing); renderDeckEditor(); }));
  const status = element("p", message);
  status.setAttribute("role", "status");
  const list = element("ul", undefined, "deck-list");
  for (const c of cards.filter(c => c.faction === editing)) {
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
    thumb.src = illustrationFor(c.id)?.thumb ?? ""; thumb.alt = ""; thumb.loading = "lazy";
    const label = element("span", undefined, "deck-name");
    label.append(element("b", c.name), element("small", `${t("{n} Essenza", { n: c.cost })} · ${t("possiedi {n}", { n: owned(c.id) })}`));
    row.dataset.rarity = c.rarity;
    row.append(thumb, label, remove, element("span", count, "deck-count"), plus);
    list.append(row);
  }
  panel.replaceChildren(header, controls, status, list);
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
    draft ??= [...(savedDecks.get(editing) ?? defaultDeck(editing))];
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

function startMatch(names, decks, options = {}) {
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

function reset() {
  clearTimeout(timer);
  replayRun++;
  replaying = false;
  lastTurnKey = null;
  document.body.classList.remove("in-match");
  stopAmbience();
  hidePeek();
  const fromStory = storyChapter !== null;
  game = null;
  storyChapter = null;
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
    if (granted?.final) outcome.lines.push(t("Premio finale della Storia: {reward} e il titolo {title}", { reward: rewardText(granted.final), title: t(titles[finalReward.title].name) }));
  }
  recordEvent(event);
  updateWallet();
}

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
    await castPreview(byId.get(action.card), "L’avversario gioca", 1100);
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
  if (c.type !== "Creatura") { sound("cast"); castPreview(c, "Hai giocato", 800); }
}

// ---------- Effetti ----------
// Carta grande al centro dello schermo (incantesimi, artefatti, mosse dell'avversario).
function castPreview(c, label, ms) {
  const layer = element("div", undefined, "cast-preview");
  layer.setAttribute("aria-hidden", "true");
  layer.append(element("small", label));  // label già tradotta da element()
  const art = illustrationFor(c.id);
  if (art) { const img = element("img"); img.src = art.src; img.alt = ""; layer.append(img); }
  else layer.append(drawCard(c));
  document.body.append(layer);
  return wait(ms).then(() => { layer.classList.add("leaving"); return wait(250); }).then(() => layer.remove());
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
  if (art) { const img = element("img"); img.src = art.src; img.alt = ""; box.append(img); }
  else box.append(drawCard(c));
  const rulesBox = element("div", undefined, "peek-rules");
  rulesBox.append(element("strong", `${c.name} · ${t("{n} Essenza", { n: c.cost })}`));
  if (c.type === "Creatura") rulesBox.append(element("span", current ? t("Ora: Attacco {a} · Difesa {d}", { a: current.attack, d: current.health }) : t("Attacco {a} · Difesa {d}", { a: c.attack, d: c.health })));
  rulesBox.append(element("p", c.text || "Nessun effetto."));
  const notesPeek = keywordNotes(c); if (notesPeek) rulesBox.append(notesPeek);
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
  Provocazione: "I nemici devono attaccare questa creatura prima del tuo eroe.",
  Rapidità: "Può attaccare nel turno in cui entra in gioco.",
  "Urlo di battaglia": "Effetto che si attiva quando la carta viene giocata.",
  Lascito: "Effetto che si attiva quando la creatura muore.",
  Velato: "Non può essere bersagliato da attacchi, incantesimi e poteri nemici finché non attacca.",
  Furia: "Può attaccare due volte in ogni turno.",
  Patto: "Si paga con punti vita invece che con Essenza.",
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
  b.append(element("span", heroPowerCost, "gem"), element("span", "✦", "glyph"));
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

function extras(p, own) {
  const row = element("div", undefined, "extras");
  for (const id of p.artifacts) {
    const c = byId.get(id);
    const icon = button(undefined, () => showCard(c), "relic");
    attachPeek(icon, c);
    icon.setAttribute("aria-label", t("Artefatto: {card}", { card: c.name }));
    icon.title = c.name;
    const art = illustrationFor(id);
    if (art) { const img = element("img"); img.src = art.thumb; img.alt = ""; icon.append(img); }
    row.append(icon);
  }
  p.secrets.forEach(id => {
    const c = byId.get(id);
    const icon = own ? button("?", () => showCard(c), "secret") : element("span", "?", "secret");
    icon.setAttribute("aria-label", own ? t("Segreto: {card}", { card: c.name }) : t("Segreto nascosto"));
    row.append(icon);
  });
  return row;
}

function heroStrip(side, own, allow) {
  const p = game.players[side];
  const hero = heroFor(p);
  const strip = element("div", undefined, `hero-strip ${own ? "mine" : "enemy"}`);
  const info = element("div", undefined, "hero-info");
  info.append(element("strong", hero?.name ?? p.name), element("small", `${p.name} · ${t("Mazzo {n}", { n: p.deck.length })} · ${t("Mano {n}", { n: p.hand.length })}`));
  if (!own) {
    const backs = element("div", undefined, "card-backs");
    backs.setAttribute("aria-hidden", "true");
    for (let i = 0; i < p.hand.length; i++) backs.append(element("i"));
    info.append(backs);
  }
  strip.append(extras(p, own), heroPortrait(side, allow), powerButton(side, own, allow), info);
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
    const img = element("img", undefined, "mini-art"); img.src = art.thumb; img.alt = ""; card.append(img);
    // gemma grande con il costo attuale: verde se scontato, rossa se aumentato
    card.append(element("span", cost, `gem big${isPact(c) ? " pact" : cost < c.cost ? " cheaper" : cost > c.cost ? " pricier" : ""}`));
  } else {
    card.classList.add("placeholder");
    card.style.setProperty("--ph", `url("${placeholderArt(c)}")`);
    card.append(crestOf(c), element("span", cost, `gem big${isPact(c) ? " pact" : cost < c.cost ? " cheaper" : cost > c.cost ? " pricier" : ""}`), element("span", c.name, "mini-name"));
    if (c.type === "Creatura") card.append(element("span", c.attack, "att"), element("span", c.health, "dif"));
    else card.append(element("span", t(c.type), "mini-type"));
  }
  if (mull && replacements.has(i)) card.append(element("span", "Da cambiare", "swap-mark"));
  attachPeek(card, c);
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

function renderTable() {
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
    for (let i = 0; i < 3; i++) amb.append(element("i"));
    arena.append(amb);
    if (mull) arena.append(element("div", `${t("Ambientazione")} · ${t(environments[matchEnv].name)}`, "env-name"));
  }
  if (mull && !cpu) {
    arena.append(element("p", view === 0
      ? "Giochi per primo."
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
    if (outcome?.story) {
      const box = element("div", undefined, "recap story-outro");
      box.append(element("strong", chapters[storyChapter]?.title ?? "Storia"), element("p", outcome.story));
      end.append(box);
    }
    end.append(button(storyChapter !== null ? "Torna alla Storia" : "Nuova partita", reset, "primary"));
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
function renderStory() {
  const panel = get("story");
  const cleared = storyProgress();
  storyPick ??= Math.min(cleared, chapters.length - 1);
  const head = element("div", undefined, "section-head");
  head.append(element("h2", `${t("Storia")} · ${t(storyTitle)}`), element("span", t("Capitoli superati {n}/{max}", { n: cleared, max: chapters.length }), "muted"));
  const list = element("ol", undefined, "chapter-list");
  chapters.forEach((chapter, i) => {
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
  const start = button("Gioca il capitolo", () => {
    storyChapter = storyPick;
    mode = "cpu";
    level = chapter.level;
    startMatch([storyFaction, chapter.opponent], [playableDeck(storyFaction), null], { lives: chapter.lives, env: heroFor(chapter.opponent)?.theme, heroes: [heroOption(storyHero), null] });
  }, "primary");
  detail.append(pickFaction, start);
  const final = element("p", cleared === chapters.length
    ? t("Storia completata · Titolo {title}", { title: t(titles[finalReward.title].name) })
    : t("Premio finale: {reward} e il titolo {title}", { reward: rewardText(finalReward), title: t(titles[finalReward.title].name) }), "muted");
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
  const block = (title, note, list) => {
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
        const got = claimMission(m.id);
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
    profileBox);
}

// ---------- Buste ----------
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
  const actions = element("div", undefined, "actions");
  const buy = button(t("Compra una busta · {n} Schegge", { n: packPrice }), () => {
    if (buyPack()) { sound("reward"); lastPack = null; updateWallet(); drawShop(); }
  });
  buy.disabled = profile.shards < packPrice;
  const open = button(t("Apri una busta ({n})", { n: profile.packs }), () => {
    lastPack = openPack();
    if (lastPack) sound("pack");
    updateWallet();
    drawShop();
    get("shop").querySelector(".pack-result")?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, "primary");
  open.disabled = profile.packs < 1;
  actions.append(buy, open);
  const packArt = element("div", undefined, `pack-art${profile.packs ? " ready" : ""}`);
  packArt.setAttribute("aria-hidden", "true");
  const back = element("img"); back.src = "assets/originali-chatgpt/dorso-carte.webp"; back.alt = "";
  packArt.append(back, element("span", profile.packs, "pack-count"));
  const children = [head, wallet, packArt, element("h3", "Buste di carte"), element("p", "Ogni busta contiene 5 carte. Le copie oltre il massimo giocabile (3, o 1 per le Leggendarie) diventano Schegge.", "muted"), actions];
  if (lastPack) {
    const row = element("div", undefined, "cards pack-result");
    for (const result of lastPack) {
      const c = byId.get(result.id);
      row.append(drawCard(c, { meta: true, art: "full", badge: result.newCopy ? "Nuova copia!" : t("Doppione · +{n} Schegge", { n: result.shards }), action: () => showCard(c) }));
    }
    children.push(row);
  }
  shop.replaceChildren(...children);
}

// Nell'app Android i file sono già sul telefono: il service worker serve solo nel browser.
if (!window.Capacitor && "serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}
showSection("match");
