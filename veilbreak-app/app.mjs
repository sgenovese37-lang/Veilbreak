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
  if (options.meta && art?.differences.length) e.append(element("small", "⚠ L’illustrazione differisce dal catalogo", "warning"));
  if (options.badge) e.append(element("small", options.badge, "badge"));
  return e;
}

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

function sidePanel(side, own, allow) {
  const p = game.players[side];
  const hero = heroFor(p.name);
  const section = element("section", undefined, "side");
  section.dataset.theme = hero?.theme ?? "default";
  const head = element("div", undefined, "hero");
  const identity = element("div", undefined, "identity");
  identity.append(element("small", hero ? `${p.name} · ${hero.table}` : p.name));
  identity.append(element("h2", hero?.name ?? p.name));
  head.append(identity);
  const life = `${p.life}/${p.maxLife} PV`;
  const lifeNode = allow && available(side, null) ? button(life, () => target(side, null), "target") : element("p", life);
  const oldLife = previous.get(`hero-${side}`);
  if (oldLife !== undefined && oldLife !== p.life) lifeNode.classList.add(p.life < oldLife ? "hit" : "healed");
  previous.set(`hero-${side}`, p.life);
  head.append(lifeNode);
  head.append(element("p", `Essenza ${p.essence}/${p.capacity} · Mazzo ${p.deck.length} · Mano ${p.hand.length}/${rules.handLimit}`));
  section.append(head);
  if (hero) {
    const power = element("div", undefined, "hero-power");
    const activate = button(`${hero.power.name} · ${heroPowerCost} Essenza`, () => {
      if (powerTargets(game).length) selected = { kind: "power" };
      else if (useHeroPower(game)) sound("power");
      render();
    });
    activate.disabled = !allow || !own || Boolean(selected) || !canUseHeroPower(game);
    const text = element("p", hero.power.text);
    power.append(activate, text);
    section.append(power);
  }
  const board = element("div", undefined, "cards");
  for (const unit of p.board) {
    const isTarget = allow && available(side, unit.uid);
    const canAttack = allow && own && attackTargets(game, unit.uid).length;
    const action = isTarget ? () => target(side, unit.uid) : canAttack ? () => {
      selected = { kind: "attack", uid: unit.uid };
      render();
    } : undefined;
    const current = stats(game, side, unit);
    const drawn = drawCard(cardOf(unit), {
      action, target: isTarget, cost: false, attack: current.attack, health: current.health,
      text: !unit.silenced, remaining: unit.silenced ? "Silenziata" : undefined,
      pressed: action && own ? selected?.uid === unit.uid : undefined,
    });
    const oldHealth = previous.get(unit.uid);
    if (oldHealth === undefined) drawn.classList.add("summoned");
    else if (current.health < oldHealth) drawn.classList.add("hit");
    previous.set(unit.uid, current.health);
    board.append(unit.card ? withDetails(drawn, cardOf(unit)) : drawn);
  }
  section.append(board);
  if (p.artifacts.length) section.append(element("p", `Artefatti · ${p.artifacts.map(id => byId.get(id).name).join(", ")}`, "muted"));
  if (p.secrets.length) section.append(element("p", own ? `Segreti · ${p.secrets.map(id => byId.get(id).name).join(", ")}` : `Segreti · ${p.secrets.length}`, "muted"));
  if (own && allow) {
    if (p.peek !== null && p.peek === p.deck[0]) section.append(element("p", `In cima al mazzo: ${byId.get(p.peek).name}.`, "muted"));
    section.append(element("h3", "Mano"));
    const hand = element("div", undefined, "cards hand");
    p.hand.forEach((id, i) => hand.append(withDetails(drawCard(byId.get(id), {
      action: () => {
        if (game.phase !== "mulligan") return chooseCard(i);
        if (replacements.has(i)) replacements.delete(i);
        else if (replacements.size < rules.mulliganLimit) replacements.add(i);
        render();
      },
      disabled: game.phase === "play" && !canPlay(game, i),
      pressed: game.phase === "mulligan" ? replacements.has(i) : selected?.index === i,
      cost: game.phase === "play" ? price(game, side, byId.get(id)) : undefined,
    }), byId.get(id))));
    section.append(hand);
  }
  return section;
}

function render() {
  const active = game.active;
  const cpu = mode === "cpu" && active === 1;
  const finished = game.phase === "finished";
  const mull = game.phase === "mulligan";
  const controls = element("div", undefined, "actions turn-bar");
  table.replaceChildren();
  if (handover) {
    controls.append(element("p", `Passa il dispositivo al giocatore di ${game.players[active].name}.`));
    controls.append(button("Mostra la mia mano", () => { handover = false; render(); }, "primary"));
    table.append(controls);
    return;
  }
  let message = mull ? `Puoi sostituire fino a ${rules.mulliganLimit} carte.` : `Turno di ${game.players[active].name}`;
  if (cpu) message = "Il computer sta giocando.";
  if (selected) message = "Scegli un bersaglio evidenziato.";
  if (finished) {
    settleOutcome();
    message = game.winner === "draw" ? "Pareggio" : mode === "cpu" ? (game.winner === 0 ? "Vittoria!" : "Sconfitta") : `Vince ${game.players[game.winner].name}!`;
  }
  const status = element("strong", message);
  status.setAttribute("role", "status");
  controls.append(status);
  if (finished) {
    if (outcome?.lines.length) controls.append(element("span", outcome.lines.join(" · "), "reward-line"));
    controls.append(button(storyChapter !== null ? "Torna alla Storia" : "Nuova partita", reset, "primary"));
  }
  else if (!cpu && selected) controls.append(button("Annulla", () => { selected = null; render(); }));
  else if (!cpu && mull) controls.append(button("Conferma mano", () => { mulligan(game, [...replacements]); afterTurn(); }, "primary"));
  else if (!cpu) controls.append(button("Fine turno", () => { endTurn(game); afterTurn(); }, "primary"));
  const view = mode === "cpu" ? 0 : active;
  if (finished && outcome?.story) {
    const box = element("div", undefined, "recap story-outro");
    box.append(element("strong", chapters[storyChapter]?.title ?? "Storia"), element("p", outcome.story));
    table.append(box);
  }
  if (storyChapter !== null && !finished && game.round <= 1) {
    const box = element("div", undefined, "recap");
    box.append(element("strong", `Capitolo ${storyChapter + 1} · ${chapters[storyChapter].title}`), element("p", chapters[storyChapter].intro));
    table.append(box);
  }
  const recap = previousTurn();
  if (!mull && recap.length) {
    const box = element("div", undefined, "recap");
    box.append(element("strong", "Turno precedente"));
    const list = element("ul");
    for (const entry of recap) list.append(element("li", entry));
    box.append(list);
    table.append(box);
  }
  if (!mull) table.append(sidePanel(1 - view, false, !cpu && !finished));
  table.append(sidePanel(view, true, !cpu && !finished));
  if (!mull && game.log.length) {
    const log = element("details");
    log.append(element("summary", "Registro della partita"));
    const list = element("ol", undefined, "log");
    for (const entry of game.log.slice(-12)) list.append(element("li", entry));
    log.append(list);
    table.append(log);
  }
  table.append(controls);
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

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}
showSection("match");
