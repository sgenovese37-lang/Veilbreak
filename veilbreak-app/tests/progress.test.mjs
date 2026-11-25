import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { cards } from "../cards.mjs";
import { endTurn } from "../game.mjs";
import {
  loadProfile, resetProfileForTests, owned, openPack, buyPack, packPrice, rewardMatch, collectionProgress, startingCopies,
} from "../profile.mjs";
import { currentMissions, recordEvent, claimMission, dayKey, weekKey } from "../missions.mjs";
import { chapters, completeChapter, storyProgress, isUnlocked, finalReward, unlockedHeroes } from "../story.mjs";
import { factions, createGame, mulligan, computerTurn, useHeroPower, stats, defaultDeck, rules } from "../game.mjs";
import { smartTurn, runComputer } from "../ai.mjs";
import { heroes } from "../heroes.mjs";

const seeded = seed => () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
beforeEach(() => resetProfileForTests());

test("la collezione parte con una copia di ogni carta e una busta", () => {
  const p = loadProfile();
  assert.equal(p.packs, 1);
  for (const c of cards) assert.equal(owned(c.id), startingCopies(c.id));
  for (const faction of factions) {
    const deck = defaultDeck(faction);
    for (const id of new Set(deck)) assert.ok(owned(id) >= deck.filter(x => x === id).length, `${faction}: copie mancanti per ${id}`);
  }
  assert.equal(collectionProgress().max, cards.length * 3 - 2 * cards.filter(c => c.rarity === "Legendary").length);
});

test("le buste danno copie fino al massimo e poi Schegge", () => {
  const p = loadProfile();
  p.packs = 600;
  let shardsFromDupes = 0;
  for (let i = 0; i < 600; i++) for (const r of openPack(seeded(i + 1))) shardsFromDupes += r.shards;
  for (const c of cards) assert.ok(owned(c.id) <= (c.rarity === "Legendary" ? 1 : 3));
  assert.ok(shardsFromDupes > 0);
  assert.equal(p.shards, shardsFromDupes);
  assert.ok(p.titles.includes("collezionista"));
});

test("comprare una busta costa le Schegge giuste", () => {
  const p = loadProfile();
  assert.equal(buyPack(), false);
  p.shards = packPrice;
  assert.equal(buyPack(), true);
  assert.equal(p.shards, 0);
  assert.equal(p.packs, 2);
});

test("le missioni avanzano, si riscattano una volta e si rinnovano", () => {
  const day = new Date(2026, 10, 24);
  const p = loadProfile();
  const big = { cards: 99, creatures: 99, spells: 99, heroDamage: 999, kills: 99, powers: 99 };
  for (const faction of factions) recordEvent({ won: true, level: "Difficile", faction, stats: big, chapterCleared: true }, day);
  for (let i = 0; i < 5; i++) recordEvent({ won: true, level: "Difficile", faction: factions[0], stats: big, chapterCleared: true }, day);
  const { daily, weekly } = currentMissions(day);
  assert.equal(daily.length, 3);
  assert.equal(weekly.length, 3);
  for (const m of [...daily, ...weekly]) {
    assert.ok(m.done, m.text);
    assert.ok(claimMission(m.id, day));
    assert.equal(claimMission(m.id, day), null);
  }
  assert.ok(p.shards > 0);
  const nextDay = new Date(2026, 10, 25);
  assert.notEqual(dayKey(nextDay), dayKey(day));
  assert.equal(weekKey(nextDay), weekKey(day));
  assert.ok(currentMissions(nextDay).daily.every(m => !m.claimed && m.value === 0));
});

test("la Storia si sblocca in ordine e dà il premio finale una volta", () => {
  const p = loadProfile();
  assert.ok(isUnlocked(0) && !isUnlocked(1));
  assert.equal(completeChapter(3), null);
  for (let i = 0; i < chapters.length; i++) assert.ok(completeChapter(i));
  assert.equal(storyProgress(), chapters.length);
  assert.ok(p.titles.includes(finalReward.title));
  const shards = p.shards;
  completeChapter(0);
  assert.equal(p.shards, shards, "rigiocare non ridà i premi");
});

test("i punti vita della Storia valgono anche per le cure", () => {
  const g = createGame(["Senza Santi", "Corte di Hollow"], seeded(4), [], { lives: [25, 33] });
  assert.equal(g.players[1].life, 33);
  assert.equal(g.players[1].maxLife, 33);
});

test("le ricompense di partita dipendono dalla difficoltà", () => {
  assert.equal(rewardMatch(true, "Difficile"), 40);
  assert.equal(rewardMatch(false, "Difficile"), 5);
  assert.equal(loadProfile().stats.played, 2);
});

test("il potere della Corte dà +2 Attacco permanente", () => {
  assert.equal(heroes["Corte di Hollow"].power.atk, 2);
  const g = createGame(["Corte di Hollow", "Patto Neon"], seeded(2));
  mulligan(g, []); mulligan(g, []);
  g.players[0].board.push({ uid: 77, card: 8, damage: 0, weakened: 0, powerAttack: 0, guard: [0, 0], entered: 0, attacked: false, silenced: false, borrowed: null, haste: false });
  assert.ok(useHeroPower(g, { side: 0, uid: 77 }));
  const unit = g.players[0].board.find(u => u.uid === 77);
  assert.deepEqual([stats(g, 0, unit).attack, stats(g, 0, unit).health], [3, 1]);
  endTurn(g); endTurn(g);
  assert.equal(stats(g, 0, unit).attack, 3, "resta anche nei turni successivi");
});

test("il potere dei Senza Santi dà +1/+1 permanente", () => {
  const g = createGame(["Senza Santi", "Patto Neon"], seeded(2));
  mulligan(g, []); mulligan(g, []);
  g.players[0].board.push({ uid: 78, card: 8, damage: 0, weakened: 0, powerAttack: 0, guard: [0, 0], entered: 0, attacked: false, silenced: false, borrowed: null, haste: false });
  assert.ok(useHeroPower(g, { side: 0, uid: 78 }));
  const unit = g.players[0].board.find(u => u.uid === 78);
  assert.deepEqual([stats(g, 0, unit).attack, stats(g, 0, unit).health], [2, 2]);
});

test("chi inizia si sceglie: il secondo ha una carta in più e il Frammento di Essenza", () => {
  const g = createGame(["Corte di Hollow", "Patto Neon"], seeded(5), [], { first: 1 });
  assert.equal(g.active, 1);
  assert.equal(g.players[1].hand.length, rules.openingHand);
  assert.equal(g.players[0].hand.length, rules.openingHand + 1);
  mulligan(g, []);
  assert.equal(g.active, 0);
  mulligan(g, []);
  assert.equal(g.phase, "play");
  assert.equal(g.active, 1, "inizia il lato 1");
  assert.equal(g.players[1].hand.length, rules.openingHand, "chi inizia non pesca nel primo turno");
  assert.ok(g.players[0].hand.includes(100), "il secondo riceve il Frammento di Essenza");
});

test("le statistiche di partita alimentano le missioni", () => {
  const g = createGame(["Sottocittà", "Patto Neon"], seeded(8));
  for (let i = 0; i < 400 && g.phase !== "finished"; i++) computerTurn(g, "Normale");
  const s = g.stats[0];
  assert.ok(s.cards > 0 && s.turns > 0);
  assert.ok(s.cards >= s.creatures + s.spells);
});

test("il computer Difficile batte il Normale più spesso", () => {
  let wins = 0, games = 0;
  for (const a of factions) for (const b of factions) for (const smart of [0, 1]) for (let k = 0; k < 3; k++) {
    const g = createGame([a, b], seeded(500 + games));
    for (let i = 0; i < 400 && g.phase !== "finished"; i++) g.active === smart ? smartTurn(g) : computerTurn(g, "Normale");
    games++;
    if (g.winner === smart) wins++;
  }
  assert.ok(wins / games > 0.55, `Difficile vince solo ${wins}/${games}`);
});

test("runComputer termina le partite a ogni livello", () => {
  for (const level of ["Facile", "Normale", "Difficile"]) {
    const g = createGame(["Corte di Hollow", "Senza Santi"], seeded(31));
    for (let i = 0; i < 400 && g.phase !== "finished"; i++) runComputer(g, level);
    assert.equal(g.phase, "finished");
  }
});

test("i due scontri sbilanciati restano vicini al 50% con i mazzi predefiniti", () => {
  const share = (a, b, games = 120) => {
    let aw = 0, decided = 0;
    for (let k = 0; k < games; k++) {
      const names = k % 2 ? [b, a] : [a, b];
      const g = createGame(names, seeded(9000 + k));
      for (let t = 0; t < 400 && g.phase !== "finished"; t++) smartTurn(g);
      if (g.winner === "draw") continue;
      decided++;
      if (names[g.winner] === a) aw++;
    }
    return aw / decided;
  };
  // Gli scontri più delicati dopo il playtest 2 (Provocazione corretta, vita 25). Con 120 partite
  // l'incertezza è di circa ±9 punti, per questo il margine è 30–70%.
  for (const [a, b] of [["Corte di Hollow", "Patto Neon"], ["Patto Neon", "Senza Santi"]]) {
    const value = share(a, b);
    assert.ok(value > 0.30 && value < 0.70, `${a} contro ${b}: ${Math.round(value * 100)}%`);
  }
});

test("i sette eroi della Storia (Atto I e II) si sbloccano vincendo i loro capitoli", () => {
  assert.deepEqual(unlockedHeroes(), []);
  const found = [];
  for (let i = 0; i < chapters.length; i++) {
    const granted = completeChapter(i);
    if (granted.hero) found.push(granted.hero);
  }
  assert.deepEqual(found.sort(), ["dex-halogen", "kira-statica", "nonna-ines", "orfeo-grimm", "ottavia", "padre-lazzaro", "vittoria-sale"]);
  assert.deepEqual(unlockedHeroes().sort(), found);
  assert.equal(completeChapter(1).hero, null, "rigiocare un capitolo non ridà l'eroe");
});

test("la Storia ha una scena per capitolo e ogni carta ha la sua battuta", async () => {
  const { scenes, cast } = await import("../scene.mjs");
  const { voices } = await import("../voci.mjs");
  assert.equal(scenes.length, chapters.length);
  for (const scene of scenes) for (const [who, text] of [...scene.before, ...scene.after]) {
    assert.ok(cast[who], `personaggio sconosciuto: ${who}`);
    assert.ok(text.length > 5);
  }
  for (const c of cards) assert.ok(voices[c.id], `manca la battuta di ${c.name}`);
});
