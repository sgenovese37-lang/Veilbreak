import { cards } from "./cards.mjs";
import {
  factions, byId, createGame, mulligan, canPlay, playTargets, play,
  attackTargets, attack, endTurn, stats, cardOf, price,
  defaultDeck, copyLimit, deckSize, validDeck, rules, powerTargets, canUseHeroPower, useHeroPower,
} from "./game.mjs";

import { renderTutorial } from "./tutorial.mjs";
import { heroFor, heroPowerCost } from "./heroes.mjs";
import { illustrationFor } from "./illustrations.mjs";
import { runComputer } from "./ai.mjs";
import {
  loadProfile, owned, buyPack, openPack, packPrice, collectionProgress, rewardMatch, titles,
} from "./profile.mjs";
import { currentMissions, recordEvent, claimMission } from "./missions.mjs";
import { chapters, storyTitle, storyProgress, isUnlocked, completeChapter, finalReward } from "./story.mjs";
import { sound, soundEnabled, setSound } from "./audio.mjs";

const get = id => document.getElementById(id);
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
let lastPack = null;
let outcome = null;
let previous = new Map();
const decksKey = "veilbreak-custom-decks";
try { savedDecks = new Map(Object.entries(JSON.parse(localStorage.getItem(decksKey) ?? "{}"))); }
catch { savedDecks = new Map(); }

function element(tag, text, cls) {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
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
  get("wallet").textContent = `◆ ${profile.shards} Schegge · ${profile.packs} ${profile.packs === 1 ? "busta" : "buste"}`;
  const toggle = get("sound-toggle");
  toggle.textContent = soundEnabled() ? "Suoni: sì" : "Suoni: no";
  toggle.setAttribute("aria-pressed", soundEnabled());
}
get("sound-toggle").onclick = () => { setSound(!soundEnabled()); updateWallet(); sound("play"); };

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
form.elements.mode.onchange = () => { get("difficulty").hidden = form.elements.mode.value !== "cpu"; };

function drawCard(c, options = {}) {
  const e = options.action ? button(undefined, options.action) : element("article");
  e.className = `card ${c.rarity ?? ""}${options.target ? " target" : ""}`;
  if (options.action) e.disabled = options.disabled ?? false;
  if (options.pressed !== undefined) e.setAttribute("aria-pressed", options.pressed);
  const art = options.art !== false && illustrationFor(c.id);
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
  e.append(element("small", [options.remaining ?? c.type, options.meta ? rarity[c.rarity] : ""].filter(Boolean).join(" · ")));
  if (options.meta) e.append(element("small", c.faction));
  if (options.text !== false && c.text) e.append(element("p", c.text));
  if (c.type === "Creatura") {
    const strip = element("div", undefined, "stats");
    strip.append(element("span", `ATT ${options.attack ?? c.attack}`, "att"), element("span", `DIF ${options.health ?? c.health}`, "dif"));
    e.append(strip);
  }
  if (options.copies !== undefined) e.append(element("small", `Copie possedute ${options.copies}/${copyLimit(c)}`, "copies"));
  if (options.meta && art && ruleDifferences(art).length) e.append(element("small", "⚠ L’illustrazione differisce dal catalogo", "warning"));
  if (options.badge) e.append(element("small", options.badge, "badge"));
  return e;
}

// Le differenze solo grafiche (maiuscole, punteggiatura) non cambiano le regole: niente avviso.
const ruleDifferences = art => art.differences.filter(text => !text.startsWith("Differenza solo grafica"));

function withDetails(cardElement, c) {
  const wrap = element("div", undefined, "card-wrap");
  const info = button("Dettagli", () => showCard(c), "details");
  info.setAttribute("aria-label", `Dettagli di ${c.name}`);
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
    img.alt = `Illustrazione di ${c.name}`;
    body.append(img);
  }
  const rules = element("div", undefined, "viewer-rules");
  rules.append(element("h2", c.name));
  rules.append(element("p", [c.faction, c.type, rarity[c.rarity], `${c.cost} Essenza`].join(" · "), "muted"));
  if (c.type === "Creatura") rules.append(element("p", `Attacco ${c.attack} · Difesa ${c.health}`));
  rules.append(element("h3", "Regole in partita (catalogo)"));
  rules.append(element("p", c.text || "Nessun effetto."));
  if (art?.differences.length) {
    rules.append(element("h3", "Differenze dell’illustrazione"));
    const list = element("ul", undefined, "differences");
    for (const text of art.differences) list.append(element("li", text));
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
      toggle.textContent = showingOriginal ? "Vedi versione corretta" : "Vedi originale";
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
  drawShop();
}

function renderDeckEditor(message = "", focus) {
  const panel = get("deck-editor");
  const used = draft.length;
  const header = element("div", undefined, "section-head");
  header.append(element("h2", "Costruisci un mazzo"));
  const select = element("select");
  select.setAttribute("aria-label", "Fazione del mazzo");
  for (const name of factions) select.append(new Option(name, name));
  select.value = editing;
  select.onchange = () => {
    editing = select.value;
    draft = [...(savedDecks.get(editing) ?? defaultDeck(editing))];
    renderDeckEditor("", "faction");
  };
  header.append(select);
  const controls = element("div", undefined, "actions");
  controls.append(element("strong", `${used}/${deckSize} carte`));
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
    remove.setAttribute("aria-label", `Rimuovi ${c.name}`);
    plus.setAttribute("aria-label", `Aggiungi ${c.name}`);
    remove.disabled = count === 0;
    plus.disabled = count >= copyLimit(c) || count >= owned(c.id) || used >= deckSize;
    row.append(element("span", `${c.name} · ${c.cost} Essenza · possiedi ${owned(c.id)}`), remove, element("span", count), plus);
    list.append(row);
  }
  panel.replaceChildren(header, controls, status, list);
  if (focus === "faction") select.focus();
  else if (focus === "save") save.focus();
  else if (focus) (get(focus)?.disabled ? get(focus)?.parentElement?.querySelector("button:not(:disabled)") : get(focus))?.focus();
}

const sections = ["match", "story-nav", "quests-nav", "library", "decks", "missions"];
function showSection(name) {
  updateWallet();
  document.body.classList.toggle("in-match", name === "match" && Boolean(game));
  get("story").hidden = name !== "story-nav";
  get("quests").hidden = name !== "quests-nav";
  catalogue.hidden = name !== "library";
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
  startMatch(names, names.map((name, side) => side === 1 && mode === "cpu" ? null : playableDeck(name)));
};

function startMatch(names, decks, options = {}) {
  game = createGame(names, Math.random, decks, options);
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
  document.body.classList.remove("in-match");
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
  outcome.lines.push(`+${shards} Schegge`);
  const event = { won, level, faction: game.players[0].name, stats: game.stats[0] };
  if (storyChapter !== null && won) {
    const chapter = chapters[storyChapter];
    const granted = completeChapter(storyChapter);
    event.chapterCleared = true;
    outcome.story = chapter.outro;
    if (granted?.chapter) outcome.lines.push(`Premio del capitolo: ${rewardText(granted.chapter)}`);
    if (granted?.final) outcome.lines.push(`Premio finale della Storia: ${rewardText(granted.final)} e il titolo ${titles[finalReward.title].name}`);
  }
  recordEvent(event);
  updateWallet();
}

function rewardText(reward) {
  return [reward.shards ? `${reward.shards} Schegge` : "", reward.packs ? `${reward.packs} ${reward.packs === 1 ? "busta" : "buste"}` : ""].filter(Boolean).join(" e ");
}

function afterTurn() {
  selected = null;
  replacements.clear();
  handover = mode === "local" && game.phase !== "finished";
  render();
  if (mode === "cpu" && game.active === 1 && game.phase !== "finished") {
    timer = setTimeout(() => { runComputer(game, level); render(); }, 450);
  }
}

function selectedTargets() {
  if (selected?.kind === "play") return playTargets(game, game.players[game.active].hand[selected.index]);
  if (selected?.kind === "attack") return attackTargets(game, selected.uid);
  if (selected?.kind === "power") return powerTargets(game);
  return [];
}

function available(side, uid) {
  return selectedTargets().some(target => target.side === side && target.uid === uid);
}

function target(side, uid) {
  if (!available(side, uid)) return;
  const choice = { side, uid };
  if (selected.kind === "play") { if (play(game, selected.index, choice)) sound("play"); }
  else if (selected.kind === "power") { if (useHeroPower(game, choice)) sound("power"); }
  else if (attack(game, selected.uid, choice)) sound("attack");
  selected = null;
  render();
}

function chooseCard(index) {
  const id = game.players[game.active].hand[index];
  if (playTargets(game, id).length) selected = { kind: "play", index };
  else {
    if (play(game, index)) sound("play");
    selected = null;
  }
  render();
}

// ---------- Tavolo di gioco ----------
const keywordOf = c => ({
  taunt: /Provocazione/.test(c.text ?? ""),
  rush: /Rapidità/.test(c.text ?? ""),
});

// Numero di danno o cura che compare sopra un elemento appena aggiornato.
function floatNumber(node, delta) {
  if (!delta) return;
  const n = element("span", delta < 0 ? `${delta}` : `+${delta}`, delta < 0 ? "float damage" : "float heal");
  n.setAttribute("aria-hidden", "true");
  node.append(n);
}

function track(key, value, node) {
  const old = previous.get(key);
  previous.set(key, value);
  if (old === undefined) return true;
  if (old !== value) {
    floatNumber(node, value - old);
    node.classList.add(value < old ? "hit" : "healed");
  }
  return false;
}

function heroPortrait(side, allow) {
  const p = game.players[side];
  const hero = heroFor(p.name);
  const isTarget = allow && available(side, null);
  const portrait = isTarget ? button(undefined, () => target(side, null), "hero-portrait target") : element("div", undefined, "hero-portrait");
  portrait.setAttribute("aria-label", `${hero?.name ?? p.name}: ${p.life} punti vita su ${p.maxLife}`);
  if (hero?.theme) {
    const img = element("img", undefined, "emblem");
    img.src = `assets/eroi/${hero.theme}.webp`;
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
  const hero = heroFor(game.players[side].name);
  if (!hero) return element("span");
  const usable = allow && own && !selected && canUseHeroPower(game);
  const used = game.players[side].powerUsed;
  const b = button(undefined, () => {
    if (powerTargets(game).length) selected = { kind: "power" };
    else if (useHeroPower(game)) sound("power");
    render();
  }, `hero-power${used ? " used" : ""}${usable ? " ready" : ""}`);
  b.disabled = !usable;
  b.title = `${hero.power.name}: ${hero.power.text}`;
  b.setAttribute("aria-label", `${hero.power.name}, ${heroPowerCost} Essenza: ${hero.power.text}`);
  b.append(element("span", heroPowerCost, "gem"), element("span", "✦", "glyph"));
  return b;
}

function crystals(p) {
  const row = element("div", undefined, "crystals");
  row.setAttribute("aria-label", `Essenza ${p.essence} su ${p.capacity}`);
  row.append(element("span", `${p.essence}/${p.capacity}`, "count"));
  for (let i = 0; i < rules.maxEssence; i++) {
    row.append(element("i", undefined, i < p.essence ? "full" : i < p.capacity ? "spent" : "locked"));
  }
  return row;
}

function extras(p, own) {
  const row = element("div", undefined, "extras");
  for (const id of p.artifacts) {
    const c = byId.get(id);
    const icon = button(undefined, () => showCard(c), "relic");
    icon.setAttribute("aria-label", `Artefatto: ${c.name}`);
    icon.title = c.name;
    const art = illustrationFor(id);
    if (art) { const img = element("img"); img.src = art.thumb; img.alt = ""; icon.append(img); }
    row.append(icon);
  }
  p.secrets.forEach(id => {
    const c = byId.get(id);
    const icon = own ? button("?", () => showCard(c), "secret") : element("span", "?", "secret");
    icon.setAttribute("aria-label", own ? `Segreto: ${c.name}` : "Segreto nascosto");
    row.append(icon);
  });
  return row;
}

function heroStrip(side, own, allow) {
  const p = game.players[side];
  const hero = heroFor(p.name);
  const strip = element("div", undefined, `hero-strip ${own ? "mine" : "enemy"}`);
  const info = element("div", undefined, "hero-info");
  info.append(element("strong", hero?.name ?? p.name), element("small", `${p.name} · Mazzo ${p.deck.length} · Mano ${p.hand.length}`));
  if (!own) {
    const backs = element("div", undefined, "card-backs");
    backs.setAttribute("aria-hidden", "true");
    for (let i = 0; i < p.hand.length; i++) backs.append(element("i"));
    info.append(backs);
  }
  strip.append(extras(p, own), heroPortrait(side, allow), powerButton(side, own, allow), info);
  if (own) strip.append(crystals(p));
  else strip.append(element("span", `Essenza ${p.essence}/${p.capacity}`, "enemy-essence"));
  return strip;
}

function token(side, unit, own, allow) {
  const c = cardOf(unit);
  const current = stats(game, side, unit);
  const isTarget = allow && available(side, unit.uid);
  const canAttack = allow && own && !selected && attackTargets(game, unit.uid).length > 0;
  const details = unit.card ? () => showCard(c) : undefined;
  const action = isTarget ? () => target(side, unit.uid)
    : canAttack ? () => { selected = { kind: "attack", uid: unit.uid }; render(); }
    : details;
  const kw = unit.silenced ? {} : keywordOf(c);
  const t = button(undefined, action, ["token", c.rarity ?? "", kw.taunt ? "taunt" : "", canAttack ? "can-attack" : "",
    isTarget ? "target" : "", unit.silenced ? "silenced" : "", selected?.uid === unit.uid ? "attacking" : ""].filter(Boolean).join(" "));
  t.setAttribute("aria-label", `${c.name}, Attacco ${current.attack}, Difesa ${current.health}${kw.taunt ? ", Provocazione" : ""}${canAttack ? ", può attaccare" : ""}`);
  if (details) t.oncontextmenu = event => { event.preventDefault(); details(); };
  const art = illustrationFor(c.id);
  const face = element("span", undefined, "face");
  if (art) { const img = element("img"); img.src = art.thumb; img.alt = ""; img.decoding = "async"; face.append(img); }
  else face.append(element("span", c.name, "face-name"));
  t.append(face);
  if (kw.rush) t.append(element("span", "⚡", "badge-rush"));
  t.append(element("span", current.attack, "att"), element("span", current.health, `dif${current.health < current.maxHealth ? " wounded" : ""}`));
  if (track(unit.uid, current.health, t)) t.classList.add("summoned");
  return t;
}

function boardRow(side, own, allow) {
  const row = element("div", undefined, `board ${own ? "mine" : "enemy"}`);
  row.setAttribute("aria-label", own ? "Il tuo campo" : "Campo avversario");
  for (const unit of game.players[side].board) row.append(token(side, unit, own, allow));
  if (!game.players[side].board.length) row.append(element("span", own ? "Il tuo campo è vuoto" : "", "empty"));
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
  card.setAttribute("aria-label", `${c.name}, costo ${mull ? c.cost : price(game, side, c)}`);
  const art = illustrationFor(id);
  const cost = mull ? c.cost : price(game, side, c);
  if (art) {
    // l'illustrazione è già una carta completa: si aggiunge il costo solo se è cambiato
    const img = element("img", undefined, "mini-art"); img.src = art.thumb; img.alt = ""; card.append(img);
    if (cost !== c.cost) card.append(element("span", cost, `gem ${cost < c.cost ? "cheaper" : "pricier"}`));
  } else {
    card.append(element("span", cost, "gem"), element("span", c.name, "mini-name"));
    if (c.type === "Creatura") card.append(element("span", c.attack, "att"), element("span", c.health, "dif"));
    else card.append(element("span", c.type, "mini-type"));
  }
  if (mull && replacements.has(i)) card.append(element("span", "Da cambiare", "swap-mark"));
  const info = button("i", () => showCard(c), "info");
  info.setAttribute("aria-label", `Dettagli di ${c.name}`);
  wrap.append(card, info);
  wrap.style.setProperty("--tilt", `${(i - (game.players[side].hand.length - 1) / 2) * 1.5}deg`);
  return wrap;
}

function handRow(side) {
  const p = game.players[side];
  const hand = element("div", undefined, `hand${game.phase === "mulligan" ? " mulligan" : ""}`);
  hand.setAttribute("aria-label", "La tua mano");
  p.hand.forEach((id, i) => hand.append(handCard(side, id, i)));
  return hand;
}

function render() {
  const active = game.active;
  const cpu = mode === "cpu" && active === 1;
  const finished = game.phase === "finished";
  const mull = game.phase === "mulligan";
  document.body.classList.add("in-match");
  table.replaceChildren();
  if (handover) {
    const box = element("div", undefined, "handover");
    box.append(element("p", `Passa il dispositivo al giocatore di ${game.players[active].name}.`));
    box.append(button("Mostra la mia mano", () => { handover = false; render(); }, "primary"));
    table.append(box);
    return;
  }
  let message = mull ? `Scegli fino a ${rules.mulliganLimit} carte da cambiare` : cpu ? "Turno avversario" : `Turno di ${game.players[active].name}`;
  if (mode === "cpu" && !cpu && !mull) message = "Il tuo turno";
  if (selected) message = "Scegli un bersaglio";
  if (finished) {
    settleOutcome();
    message = game.winner === "draw" ? "Pareggio" : mode === "cpu" ? (game.winner === 0 ? "Vittoria!" : "Sconfitta") : `Vince ${game.players[game.winner].name}!`;
  }
  const view = mode === "cpu" ? 0 : active;
  const allow = !cpu && !finished;
  const arena = element("div", undefined, "arena");
  const top = element("div", undefined, "topbar");
  top.append(button("☰ Menu", () => {
    if (finished || confirm("Abbandonare la partita?")) reset();
  }, "small menu-exit"));
  const status = element("strong", message, `banner${selected ? " targeting" : ""}${cpu ? " waiting" : ""}`);
  status.setAttribute("role", "status");
  top.append(status);
  const logButton = button("Registro", () => showLog(), "small");
  top.append(logButton);
  arena.append(top);
  if (storyChapter !== null && !finished && game.round <= 1) {
    const box = element("div", undefined, "recap");
    box.append(element("strong", `Capitolo ${storyChapter + 1} · ${chapters[storyChapter].title}`), element("p", chapters[storyChapter].intro));
    arena.append(box);
  }
  const enemyTheme = heroFor(game.players[1 - view].name)?.theme ?? "default";
  const myTheme = heroFor(game.players[view].name)?.theme ?? "default";
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
  const recap = previousTurn();
  if (!mull && recap.length && !finished) {
    const last = element("div", undefined, "recap last-turn");
    last.append(element("strong", "Turno precedente"));
    const list = element("ul");
    for (const entry of recap) list.append(element("li", entry));
    last.append(list);
    veil.append(last);
  }
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
  } else if (!cpu && selected) side.append(button("Annulla", () => { selected = null; render(); }, "end-turn cancel"));
  else if (!cpu && mull) side.append(button("Conferma mano", () => { mulligan(game, [...replacements]); afterTurn(); }, "end-turn primary"));
  else if (!cpu) {
    const anyMove = game.players[active].hand.some((_, i) => canPlay(game, i)) || canUseHeroPower(game)
      || game.players[active].board.some(u => attackTargets(game, u.uid).length);
    side.append(button("Fine turno", () => { endTurn(game); afterTurn(); }, `end-turn primary${anyMove ? "" : " done"}`));
  } else side.append(button("Turno avversario", () => {}, "end-turn waiting"));
  side.querySelector("button")?.toggleAttribute("disabled", cpu);
  if (game.players[view].peek !== null && game.players[view].peek === game.players[view].deck[0] && !mull) {
    myZone.append(element("p", `In cima al mazzo: ${byId.get(game.players[view].peek).name}`, "peek"));
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
  const starts = game.log.flatMap((entry, i) => entry.startsWith("Turno di ") ? [i] : []);
  if (starts.length < 2) return [];
  return game.log.slice(starts.at(-2) + 1, starts.at(-1)).slice(-6);
}

// ---------- Storia ----------
function renderStory() {
  const panel = get("story");
  const cleared = storyProgress();
  storyPick ??= Math.min(cleared, chapters.length - 1);
  const head = element("div", undefined, "section-head");
  head.append(element("h2", `Storia · ${storyTitle}`), element("span", `Capitoli superati ${cleared}/${chapters.length}`, "muted"));
  const list = element("ol", undefined, "chapter-list");
  chapters.forEach((chapter, i) => {
    const unlocked = isUnlocked(i);
    const state = i < cleared ? "✓ Superato" : unlocked ? "Disponibile" : "Bloccato";
    const item = element("li");
    const choose = button(`${i + 1}. ${chapter.title} · ${state}`, () => { storyPick = i; renderStory(); });
    choose.disabled = !unlocked;
    choose.setAttribute("aria-pressed", storyPick === i);
    item.append(choose);
    list.append(item);
  });
  const chapter = chapters[storyPick];
  const detail = element("article", undefined, "chapter");
  detail.append(element("h3", `Capitolo ${storyPick + 1} · ${chapter.title}`), element("p", chapter.intro));
  const enemyHero = heroFor(chapter.opponent);
  detail.append(element("p", `Avversario: ${enemyHero?.name ?? chapter.opponent} (${chapter.opponent}) · ${chapter.level} · ${chapter.lives[1]} PV contro i tuoi ${chapter.lives[0]}`, "muted"));
  const firstTime = storyPick >= cleared;
  detail.append(element("p", firstTime ? `Premio alla prima vittoria: ${rewardText(chapter.reward)}` : "Capitolo già superato: puoi rigiocarlo per le Schegge della vittoria.", "reward-line"));
  const pickFaction = element("label", "La tua fazione ");
  const select = element("select");
  for (const name of factions) select.append(new Option(name, name));
  select.value = storyFaction;
  select.onchange = () => { storyFaction = select.value; };
  pickFaction.append(select);
  const start = button("Gioca il capitolo", () => {
    storyChapter = storyPick;
    mode = "cpu";
    level = chapter.level;
    startMatch([storyFaction, chapter.opponent], [playableDeck(storyFaction), null], { lives: chapter.lives });
  }, "primary");
  detail.append(pickFaction, start);
  const final = element("p", cleared === chapters.length
    ? `Storia completata · Titolo ${titles[finalReward.title].name}`
    : `Premio finale: ${rewardText(finalReward)} e il titolo ${titles[finalReward.title].name}`, "muted");
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
      text.append(element("strong", m.text), element("small", `Premio: ${rewardText(m)}`));
      const bar = element("progress");
      bar.max = m.goal; bar.value = m.value;
      bar.setAttribute("aria-label", `${m.text}: ${m.value} su ${m.goal}`);
      const claim = button(m.claimed ? "Riscattata" : m.done ? "Riscatta" : `${m.value}/${m.goal}`, () => {
        const got = claimMission(m.id);
        if (got) { sound("reward"); updateWallet(); renderQuests(`Hai ottenuto ${rewardText(got)}.`); }
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
  profileBox.append(element("p", `Partite contro il computer ${profile.stats.played} · Vittorie ${profile.stats.won}`));
  const { have, max } = collectionProgress();
  profileBox.append(element("p", `Collezione ${have}/${max} copie giocabili`));
  profileBox.append(element("p", profile.titles.length ? `Titoli: ${profile.titles.map(id => titles[id]?.name).join(", ")}` : "Nessun titolo ancora: completa il tutorial e la Storia.", "muted"));
  if (profile.history.length) {
    const details = element("details");
    details.append(element("summary", "Ultimi premi"));
    const ol = element("ul", undefined, "log");
    for (const line of profile.history.slice(0, 10)) ol.append(element("li", line));
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
  head.append(element("h2", "Buste"), element("span", `Collezione ${have}/${max}`, "muted"));
  const actions = element("div", undefined, "actions");
  const buy = button(`Compra una busta · ${packPrice} Schegge`, () => {
    if (buyPack()) { sound("reward"); lastPack = null; updateWallet(); drawCatalogue(); }
  });
  buy.disabled = profile.shards < packPrice;
  const open = button(`Apri una busta (${profile.packs})`, () => {
    lastPack = openPack();
    if (lastPack) sound("pack");
    updateWallet();
    drawCatalogue();
    get("shop").scrollIntoView({ block: "start" });
  }, "primary");
  open.disabled = profile.packs < 1;
  actions.append(buy, open);
  const children = [head, element("p", "Ogni busta contiene 5 carte. Le copie oltre il massimo giocabile (2, o 1 per le Leggendarie) diventano Schegge.", "muted"), actions];
  if (lastPack) {
    const row = element("div", undefined, "cards pack-result");
    for (const result of lastPack) {
      const c = byId.get(result.id);
      row.append(drawCard(c, { meta: true, art: "full", badge: result.newCopy ? "Nuova copia!" : `Doppione · +${result.shards} Schegge`, action: () => showCard(c) }));
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
