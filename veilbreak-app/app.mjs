import { cards } from "./cards.mjs";
import {
  factions, byId, createGame, mulligan, canPlay, playTargets, play,
  attackTargets, attack, endTurn, computerTurn, stats, cardOf, price,
  defaultDeck, copyLimit, deckSize, validDeck, rules, powerTargets, canUseHeroPower, useHeroPower,
} from "./game.mjs";

import { renderTutorial } from "./tutorial.mjs";
import { heroFor, heroPowerCost } from "./heroes.mjs";
import { illustrationFor } from "./illustrations.mjs";

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
  if (options.meta && art?.differences.length) e.append(element("small", "⚠ L’illustrazione differisce dal catalogo", "warning"));
  return e;
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
  get("cards").replaceChildren(...cards.filter(c => !filter.value || c.faction === filter.value).map(c => drawCard(c, { meta: true, art: "full", action: () => showCard(c) })));
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
  save.disabled = !validDeck(editing, draft);
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
    plus.disabled = count >= copyLimit(c) || used >= deckSize;
    row.append(element("span", `${c.name} · ${c.cost} Essenza`), remove, element("span", count), plus);
    list.append(row);
  }
  panel.replaceChildren(header, controls, status, list);
  if (focus === "faction") select.focus();
  else if (focus === "save") save.focus();
  else if (focus) (get(focus)?.disabled ? get(focus)?.parentElement?.querySelector("button:not(:disabled)") : get(focus))?.focus();
}

function showSection(name) {
  catalogue.hidden = name !== "library";
  get("tutorial").hidden = name !== "missions";
  get("deck-editor").hidden = name !== "decks";
  setup.hidden = name !== "match" || Boolean(game);
  table.hidden = name !== "match" || !game;
  for (const id of ["match", "library", "decks", "missions"]) get(id).setAttribute("aria-pressed", id === name);
  if (name === "library") drawCatalogue();
  if (name === "missions") renderTutorial(get("tutorial"));
  if (name === "decks") {
    draft ??= [...(savedDecks.get(editing) ?? defaultDeck(editing))];
    renderDeckEditor();
  }
}

for (const id of ["match", "library", "decks", "missions"]) get(id).onclick = () => showSection(id);
filter.onchange = drawCatalogue;
form.onsubmit = event => {
  event.preventDefault();
  mode = form.elements.mode.value;
  level = form.elements.level.value;
  const names = [form.elements.first.value, form.elements.second.value];
  game = createGame(names, Math.random, names.map((name, side) => side === 1 && mode === "cpu" ? null : savedDecks.get(name)));
  handover = false;
  selected = null;
  replacements.clear();
  showSection("match");
  render();
};

function reset() {
  clearTimeout(timer);
  game = null;
  showSection("match");
}

function afterTurn() {
  selected = null;
  replacements.clear();
  handover = mode === "local" && game.phase !== "finished";
  render();
  if (mode === "cpu" && game.active === 1 && game.phase !== "finished") {
    timer = setTimeout(() => { computerTurn(game, level); render(); }, 450);
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
  if (selected.kind === "play") play(game, selected.index, choice);
  else if (selected.kind === "power") useHeroPower(game, choice);
  else attack(game, selected.uid, choice);
  selected = null;
  render();
}

function chooseCard(index) {
  const id = game.players[game.active].hand[index];
  if (playTargets(game, id).length) selected = { kind: "play", index };
  else {
    play(game, index);
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
  const life = `${p.life}/${rules.maxLife} PV`;
  head.append(allow && available(side, null) ? button(life, () => target(side, null), "target") : element("p", life));
  head.append(element("p", `Essenza ${p.essence}/${p.capacity} · Mazzo ${p.deck.length} · Mano ${p.hand.length}/${rules.handLimit}`));
  section.append(head);
  if (hero) {
    const power = element("div", undefined, "hero-power");
    const activate = button(`${hero.power.name} · ${heroPowerCost} Essenza`, () => {
      if (powerTargets(game).length) selected = { kind: "power" };
      else useHeroPower(game);
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
    board.append(drawCard(cardOf(unit), {
      action, target: isTarget, cost: false, attack: current.attack, health: current.health,
      text: !unit.silenced, remaining: unit.silenced ? "Silenziata" : undefined,
      pressed: action && own ? selected?.uid === unit.uid : undefined,
    }));
  }
  section.append(board);
  if (p.artifacts.length) section.append(element("p", `Artefatti · ${p.artifacts.map(id => byId.get(id).name).join(", ")}`, "muted"));
  if (p.secrets.length) section.append(element("p", own ? `Segreti · ${p.secrets.map(id => byId.get(id).name).join(", ")}` : `Segreti · ${p.secrets.length}`, "muted"));
  if (own && allow) {
    if (p.peek !== null && p.peek === p.deck[0]) section.append(element("p", `In cima al mazzo: ${byId.get(p.peek).name}.`, "muted"));
    section.append(element("h3", "Mano"));
    const hand = element("div", undefined, "cards");
    p.hand.forEach((id, i) => hand.append(drawCard(byId.get(id), {
      action: () => {
        if (game.phase !== "mulligan") return chooseCard(i);
        if (replacements.has(i)) replacements.delete(i);
        else if (replacements.size < rules.mulliganLimit) replacements.add(i);
        render();
      },
      disabled: game.phase === "play" && !canPlay(game, i),
      pressed: game.phase === "mulligan" ? replacements.has(i) : selected?.index === i,
      cost: game.phase === "play" ? price(game, side, byId.get(id)) : undefined,
    })));
    section.append(hand);
  }
  return section;
}

function render() {
  const active = game.active;
  const cpu = mode === "cpu" && active === 1;
  const finished = game.phase === "finished";
  const mull = game.phase === "mulligan";
  const controls = element("div", undefined, "actions");
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
  if (finished) message = game.winner === "draw" ? "Pareggio" : `Vince ${game.players[game.winner].name}!`;
  const status = element("strong", message);
  status.setAttribute("role", "status");
  controls.append(status);
  if (finished) controls.append(button("Nuova partita", reset, "primary"));
  else if (!cpu && selected) controls.append(button("Annulla", () => { selected = null; render(); }));
  else if (!cpu && mull) controls.append(button("Conferma mano", () => { mulligan(game, [...replacements]); afterTurn(); }, "primary"));
  else if (!cpu) controls.append(button("Fine turno", () => { endTurn(game); afterTurn(); }, "primary"));
  const view = mode === "cpu" ? 0 : active;
  table.append(controls);
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
}
showSection("match");
