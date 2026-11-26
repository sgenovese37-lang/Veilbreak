import { test } from "node:test";
import assert from "node:assert/strict";
import { createGame, mulligan, endTurn, canPlay, discardFromHand, rules, byId } from "../game.mjs";
import { tribeOf, tribes } from "../tribes.mjs";
import { cards } from "../cards.mjs";

const seeded = seed => () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);

test("mano piena: chi sceglie lo scarto deve scartare prima di giocare o passare il turno", () => {
  const g = createGame(["Corte di Hollow", "Patto Neon"], seeded(4), [], { first: 0, chooseDiscard: [true, false] });
  mulligan(g, []); mulligan(g, []);
  const me = g.players[0];
  while (me.hand.length < rules.handLimit) me.hand.push(me.deck.shift());
  endTurn(g); endTurn(g);                                // il computer passa, io pesco l'11ª carta
  assert.equal(me.hand.length, rules.handLimit + 1);
  assert.equal(me.mustDiscard, 1);
  assert.equal(canPlay(g, 0), false, "niente giocate finché non scarto");
  assert.equal(endTurn(g), false, "niente fine turno finché non scarto");
  const dropped = me.hand[3];
  assert.ok(discardFromHand(g, 0, 3));
  assert.equal(me.hand.length, rules.handLimit);
  assert.equal(me.mustDiscard, 0);
  assert.ok(me.discard.includes(dropped));
  assert.ok(endTurn(g));
});

test("mano piena: il computer perde ancora la carta pescata", () => {
  const g = createGame(["Corte di Hollow", "Patto Neon"], seeded(5), [], { first: 0, chooseDiscard: [true, false] });
  mulligan(g, []); mulligan(g, []);
  const cpu = g.players[1];
  while (cpu.hand.length < rules.handLimit) cpu.hand.push(cpu.deck.shift());
  endTurn(g);
  assert.equal(cpu.hand.length, rules.handLimit);
  assert.equal(cpu.mustDiscard, 0);
  assert.equal(cpu.burned, 1);
});

test("ogni creatura ha un tipo tra quelli previsti", () => {
  for (const c of cards.filter(c => c.type === "Creatura")) {
    assert.ok(tribes.includes(tribeOf(c)), `${c.id} ${c.name}`);
  }
  assert.equal(tribeOf(byId.get(9)), null, "gli incantesimi non hanno tipo");
});

test("Sentiero settimanale: ogni missione riscattata è un passo, premi ogni 5 passi", async () => {
  const { claimMission, currentMissions, passState, claimPassReward, recordEvent } = await import("../missions.mjs");
  const profile = { shards: 0, packs: 0, history: [], extra: {}, titles: [], stats: { played: 0, won: 0 } };
  const day = new Date(2026, 10, 23);   // lunedì
  for (let d = 0; d < 7; d++) {
    const date = new Date(2026, 10, 23 + d);
    for (const faction of ["Sottocittà", "Patto Neon"]) recordEvent({ won: true, faction, level: "Difficile", chapterCleared: true, stats: { cards: 99, creatures: 99, spells: 99, heroDamage: 999, kills: 99, powers: 99 } }, date, profile);
    for (const m of [...currentMissions(date, profile).daily, ...currentMissions(date, profile).weekly]) claimMission(m.id, date, profile);
  }
  const pass = passState(day, profile);
  assert.ok(pass.steps >= 15, `passi: ${pass.steps}`);
  const before = profile.packs;
  assert.ok(claimPassReward(5, day, profile));
  assert.equal(profile.packs, before + 1);
  assert.equal(claimPassReward(5, day, profile), null, "un premio si riscatta una volta sola");
  assert.ok(claimPassReward(15, day, profile).final);
  assert.equal(passState(new Date(2026, 10, 30), profile).steps, 0, "il lunedì dopo si ricomincia");
});

import { attack, useHeroPower, currentPower, tradeCard, canTrade, stats } from "../game.mjs";
import { heroes } from "../heroes.mjs";

const fresh = (seed, names = ["Corte di Hollow", "Patto Neon"]) => {
  const g = createGame(names, seeded(seed), [], { first: 0 });
  mulligan(g, []); mulligan(g, []);
  return g;
};
const unitOf = (uid, card) => ({ uid, card, damage: 0, weakened: 0, powerAttack: 0, guard: [0, 0], entered: 0, attacked: false, silenced: false, borrowed: null, haste: true });

test("Rubavita: i danni dell'attacco curano l'eroe, anche quando la creatura si difende", () => {
  const card = byId.get(11);   // Assessore Corrotto 3/3
  const old = card.text;
  card.text = "Rubavita.";
  try {
    const g = fresh(21);
    g.players[0].life = 10; g.players[1].life = 10;
    g.players[0].board.push(unitOf(901, 11));
    assert.ok(attack(g, 901, { side: 1, uid: null }));
    assert.equal(g.players[1].life, 7);
    assert.equal(g.players[0].life, 13, "cura pari ai danni inflitti");
    g.players[0].life = g.players[0].maxLife - 1;
    g.players[0].board[0].attacked = false; g.players[0].board[0].attacks = 0;
    assert.ok(attack(g, 901, { side: 1, uid: null }));
    assert.equal(g.players[0].life, g.players[0].maxLife, "mai oltre il massimo");
  } finally { card.text = old; }
});

test("Scambio: 1 Essenza, la carta torna nel mazzo e se ne pesca un'altra", () => {
  const card = byId.get(9);
  const old = card.text;
  card.text = `${old} Scambio.`;
  try {
    const g = fresh(22);
    const p = g.players[0];
    p.hand[0] = 9; p.essence = 2;
    const deck = p.deck.length, hand = p.hand.length;
    assert.ok(canTrade(g, 0));
    assert.ok(tradeCard(g, 0));
    assert.equal(p.essence, 1);
    assert.equal(p.hand.length, hand);
    assert.equal(p.deck.length, deck);
    assert.ok(p.deck.includes(9));
    p.essence = 0; p.hand[0] = 9;
    assert.equal(canTrade(g, 0), false, "serve 1 Essenza");
  } finally { card.text = old; }
});

test("potere che si evolve: dopo 3 usi diventa più forte", () => {
  const power = heroes["Patto Neon"].power;
  power.evolve = { after: 3, power: { damage: 4 } };
  try {
    const g = fresh(23, ["Patto Neon", "Corte di Hollow"]);
    const p = g.players[0];
    for (let i = 0; i < 3; i++) {
      assert.equal(currentPower(p).damage, power.damage);
      g.players[1].board.push(unitOf(950 + i, 49));
      p.essence = 5; p.powerUsed = false;
      assert.ok(useHeroPower(g, { side: 1, uid: 950 + i }));
    }
    assert.equal(currentPower(p).damage, 4);
    assert.ok(currentPower(p).evolved);
  } finally { delete power.evolve; }
});
