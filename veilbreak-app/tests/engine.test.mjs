import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { cards } from "../cards.mjs";
import { illustrations } from "../illustrations.mjs";
import { heroes, heroPowerCost } from "../heroes.mjs";
import {
  factions, createGame, mulligan, play, endTurn, computerTurn, stats, attackTargets,
  canUseHeroPower, useHeroPower, defaultDeck, validDeck, canPlay, rules, deckSize, essenceShardId,
} from "../game.mjs";
import { heroFor, lockedHeroes } from "../heroes.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const seeded = seed => () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);

test("le otto creature del LEGGIMI hanno tipo, Attacco e Difesa del catalogo", () => {
  const expected = { 1: [6, 6], 2: [5, 4], 3: [2, 3], 5: [2, 2], 18: [4, 2], 20: [3, 2], 31: [5, 5], 46: [4, 4] };
  for (const [id, [attack, health]] of Object.entries(expected)) {
    const card = cards.find(c => c.id === Number(id));
    assert.equal(card.type, "Creatura", card.name);
    assert.equal(card.attack, attack, card.name);
    assert.equal(card.health, health, card.name);
  }
});

test("il catalogo ha 60 carte con tipi validi e statistiche per tutte le creature", () => {
  assert.equal(cards.length, 60);
  assert.deepEqual(new Set(cards.map(c => c.id)).size, 60);
  for (const card of cards) {
    assert.ok(["Creatura", "Incantesimo", "Artefatto", "Segreto"].includes(card.type), `${card.id} ${card.type}`);
    if (card.type === "Creatura") assert.ok(Number.isInteger(card.attack) && Number.isInteger(card.health), card.name);
  }
  for (const faction of factions) assert.equal(cards.filter(c => c.faction === faction).length, 15);
});

test("ogni carta ha la sua illustrazione collegata per ID e i file esistono", () => {
  for (const card of cards) {
    const art = illustrations[card.id];
    assert.ok(art, `illustrazione mancante per ${card.id}`);
    assert.equal(art.card, card.name, `nome diverso per ${card.id}`);
    assert.ok(existsSync(root + art.src), art.src);
    assert.ok(existsSync(root + art.thumb), art.thumb);
    if (art.original) assert.ok(existsSync(root + art.original), art.original);
  }
});

test("le 13 illustrazioni corrette coincidono con il catalogo", () => {
  const fixed = Object.entries(illustrations).filter(([, art]) => art.correction).map(([id]) => Number(id));
  assert.deepEqual(fixed.sort((a, b) => a - b), [1, 3, 6, 7, 8, 9, 10, 15, 16, 20, 24, 25, 27]);
  for (const id of fixed) {
    assert.deepEqual(illustrations[id].differences, [], `carta ${id}`);
    assert.match(illustrations[id].src, /illustrazioni-corrette/);
  }
  const left = Object.values(illustrations).flatMap(art => art.differences);
  assert.ok(left.every(text => text.startsWith("Differenza solo grafica")), "restano solo differenze grafiche");
});

test("gli artefatti entrano in campo e Specchio Incrinato infligge danni", () => {
  const g = createGame(["Corte di Hollow", "Patto Neon"], seeded(3));
  mulligan(g, []); mulligan(g, []);
  const p = g.players[0];
  p.hand = [6]; p.essence = 10;
  g.players[1].board.push({ uid: 99, card: 29, damage: 0, weakened: 0, powerAttack: 0, guard: [0, 0], entered: 0, attacked: false, silenced: false, borrowed: null, haste: false });
  assert.ok(play(g, 0));
  assert.deepEqual(p.artifacts, [6]);
  endTurn(g);
  assert.equal(g.players[1].board.length, 0);
});

test("il Sindaco prende una creatura nemica con Rapidità fino a fine turno", () => {
  const g = createGame(["Corte di Hollow", "Sottocittà"], seeded(5));
  mulligan(g, []); mulligan(g, []);
  const p = g.players[0];
  g.players[1].board.push({ uid: 50, card: 54, damage: 0, weakened: 0, powerAttack: 0, guard: [0, 0], entered: 0, attacked: false, silenced: false, borrowed: null, haste: false });
  p.hand = [1]; p.essence = 10;
  assert.ok(play(g, 0, { side: 1, uid: 50 }));
  assert.ok(p.board.some(u => u.uid === 50));
  assert.ok(attackTargets(g, 50).length > 0, "la creatura presa deve avere Rapidità");
  const mayor = p.board.find(u => u.card === 1);
  assert.equal(attackTargets(g, mayor.uid).length, 0, "il Sindaco non ha Rapidità secondo il catalogo");
  endTurn(g);
  assert.ok(g.players[1].board.some(u => u.uid === 50));
});

test("i quattro eroi hanno poteri da 1 Essenza utilizzabili", () => {
  assert.equal(heroPowerCost, 1);
  assert.deepEqual(Object.keys(heroes).sort(), [...factions].sort());
  const g = createGame(["Senza Santi", "Patto Neon"], seeded(7));
  mulligan(g, []); mulligan(g, []);
  assert.equal(canUseHeroPower(g), false, "Liturgia del Sangue serve una creatura alleata");
  g.players[0].board.push({ uid: 77, card: 34, damage: 0, weakened: 0, powerAttack: 0, guard: [0, 0], entered: 0, attacked: false, silenced: false, borrowed: null, haste: false });
  assert.ok(canUseHeroPower(g));
  assert.ok(useHeroPower(g, { side: 0, uid: 77 }));
  assert.equal(stats(g, 0, g.players[0].board[0]).health, 5);
  assert.equal(g.players[0].essence, 0);
});

test("Elena Voss dà +1/+1 alle altre creature", () => {
  const g = createGame(["Senza Santi", "Patto Neon"], seeded(9));
  mulligan(g, []); mulligan(g, []);
  const p = g.players[0];
  p.hand = [42, 31]; p.essence = 10;
  play(g, 0); play(g, 0);
  const candle = p.board.find(u => u.card === 42);
  assert.deepEqual([stats(g, 0, candle).attack, stats(g, 0, candle).health], [2, 2]);
});

test("i mazzi predefiniti sono validi", () => {
  for (const faction of factions) assert.ok(validDeck(faction, defaultDeck(faction)), faction);
});

test("partite complete computer contro computer per ogni coppia di fazioni", () => {
  let seed = 1;
  for (const a of factions) for (const b of factions) for (const level of ["Facile", "Normale", "Difficile"]) {
    const g = createGame([a, b], seeded(seed++));
    for (let i = 0; i < 400 && g.phase !== "finished"; i++) computerTurn(g, level);
    assert.equal(g.phase, "finished", `${a} contro ${b} (${level}) non è terminata`);
    for (const p of g.players) assert.ok(p.hand.length <= 10 && p.life >= 0);
  }
});

const unitOf = (uid, card) => ({ uid, card, damage: 0, weakened: 0, powerAttack: 0, guard: [0, 0], entered: 0, attacked: false, silenced: false, borrowed: null, haste: false });

test("al massimo 7 creature in campo", () => {
  assert.equal(rules.boardLimit, 7);
  const g = createGame(["Senza Santi", "Patto Neon"], seeded(11));
  mulligan(g, []); mulligan(g, []);
  const p = g.players[0];
  for (let i = 0; i < 7; i++) p.board.push(unitOf(200 + i, 42));
  p.hand = [42, 33]; p.essence = 10;
  assert.equal(canPlay(g, 0), false, "creatura con il campo pieno");
  assert.equal(canPlay(g, 1), true, "un incantesimo si può giocare");
  p.board.pop();
  p.hand = [21];
  assert.ok(play(g, 0), "Glitch di Evocazione con un solo posto libero");
  assert.equal(p.board.length, 7);
});

test("con il campo pieno il Sindaco non ruba la creatura", () => {
  const g = createGame(["Corte di Hollow", "Sottocittà"], seeded(12));
  mulligan(g, []); mulligan(g, []);
  const p = g.players[0];
  for (let i = 0; i < 7; i++) p.board.push(unitOf(300 + i, 42));
  g.players[1].board.push(unitOf(50, 54));
  p.hand = [1]; p.essence = 10;
  assert.equal(canPlay(g, 0), false, "il Sindaco è una creatura: con il campo pieno non si gioca");
});

test("chi gioca per secondo ha una carta in più e il Frammento di Essenza", () => {
  const g = createGame(["Corte di Hollow", "Patto Neon"], seeded(13));
  assert.equal(g.players[0].hand.length, rules.openingHand);
  assert.equal(g.players[1].hand.length, rules.openingHand + 1);
  mulligan(g, []); mulligan(g, []);
  assert.ok(g.players[1].hand.includes(essenceShardId));
  assert.ok(!g.players[0].hand.includes(essenceShardId));
  endTurn(g);
  const p = g.players[1];
  const before = p.essence;
  assert.ok(play(g, p.hand.indexOf(essenceShardId)));
  assert.equal(p.essence, before + 1);
  assert.ok(!p.hand.includes(essenceShardId));
  endTurn(g); endTurn(g);
  assert.equal(p.essence, p.capacity, "il bonus vale solo per un turno");
});

test("mazzi da 30 carte: 3 copie, 1 per le Leggendarie", () => {
  assert.equal(deckSize, 30);
  for (const faction of factions) {
    const deck = defaultDeck(faction);
    assert.equal(deck.length, 30);
    for (const id of new Set(deck)) {
      const c = cards.find(card => card.id === id);
      assert.ok(deck.filter(x => x === id).length <= (c.rarity === "Legendary" ? 1 : 3), `${faction}: ${c.name}`);
    }
  }
  const tooMany = [...defaultDeck("Patto Neon")];
  tooMany.splice(0, 1, 16); tooMany.splice(1, 1, 16);
  assert.equal(validDeck("Patto Neon", tooMany), false, "due copie di una Leggendaria");
});

test("gli eroi della Storia giocano con il loro potere", () => {
  for (const [faction, locked] of Object.entries(lockedHeroes)) {
    const g = createGame([faction, "Patto Neon"], seeded(14), [], { heroes: [locked.id, null] });
    assert.equal(heroFor(g.players[0]).name, locked.name);
    assert.equal(heroFor(g.players[1]).name, heroes["Patto Neon"].name);
  }
  const g = createGame(["Corte di Hollow", "Patto Neon"], seeded(15), [], { heroes: ["orfeo-grimm", null] });
  mulligan(g, []); mulligan(g, []);
  assert.ok(useHeroPower(g));
  assert.equal(g.players[0].board[0].card, 8, "Sigillo d’Ufficio evoca un Passerotto");
  const d = createGame(["Patto Neon", "Corte di Hollow"], seeded(16), [], { heroes: ["dex-halogen", null] });
  mulligan(d, []); mulligan(d, []);
  assert.ok(useHeroPower(d));
  assert.equal(d.players[1].life, 29);
  const wrong = createGame(["Patto Neon", "Corte di Hollow"], seeded(17), [], { heroes: ["orfeo-grimm", null] });
  assert.equal(heroFor(wrong.players[0]).name, heroes["Patto Neon"].name, "un eroe di un'altra fazione non vale");
});
