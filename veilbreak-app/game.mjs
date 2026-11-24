import { cards } from "./cards.mjs";
import { heroFor, heroPowerCost } from "./heroes.mjs";
import { starterDecks } from "./decks.mjs";

export const rules = Object.freeze({ maxLife: 30, openingHand: 6, mulliganLimit: 2, maxEssence: 10, handLimit: 10 });

export const factions = [...new Set(cards.map(card => card.faction))];
const byId = new Map(cards.map(card => [card.id, card]));
const fragment = { id: 0, name: "Frammento", type: "Creatura", attack: 1, health: 1, text: "" };
const rush = new Set([24, 46, 47, 48]);
const taunt = new Set([4, 13, 32, 34, 37, 45, 49, 51]);
const targeted = new Set([1, 9, 12, 17, 23, 55]);
export const cardOf = unit => byId.get(unit.card) ?? fragment;
export const has = (player, id) => player.board.some(unit => unit.card === id && !unit.silenced);
const rival = side => 1 - side;
const damageText = n => n === 1 ? "1 danno" : `${n} danni`;
const heal = (p, n) => { p.life = Math.min(p.maxLife, p.life + n); };
const emptyStats = () => ({ cards: 0, creatures: 0, spells: 0, artifacts: 0, secrets: 0, heroDamage: 0, kills: 0, powers: 0, turns: 0 });

function shuffle(items, random) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function draw(p, count, g) {
  const drawn = p.deck.splice(0, count);
  const room = Math.max(0, rules.handLimit - p.hand.length);
  p.hand.push(...drawn.slice(0, room));
  const overflow = drawn.slice(room);
  p.discard.push(...overflow);
  if (overflow.length && g) {
    note(g, `${p.name} scarta ${overflow.length} dalla cima del mazzo: mano piena.`);
  }
}

export const deckSize = 15;
export const defaultDeck = name => validDeck(name, starterDecks[name])
  ? [...starterDecks[name]]
  : cards.filter(card => card.faction === name).slice(0, deckSize).map(card => card.id);
export const copyLimit = card => card.rarity === "Legendary" ? 1 : 2;

export function validDeck(name, deck) {
  if (!Array.isArray(deck) || deck.length !== deckSize) return false;
  const counts = new Map();
  return deck.every(id => {
    const c = byId.get(id);
    const count = (counts.get(id) ?? 0) + 1;
    counts.set(id, count);
    return c?.faction === name && count <= copyLimit(c);
  });
}

// options.lives: punti vita iniziali per lato (Storia). options.decks: mazzi già decisi, senza i limiti dell'editor.
export function createGame(names, random = Math.random, customDecks = [], options = {}) {
  const players = names.map((name, side) => {
    const custom = customDecks[side];
    const forced = options.decks?.[side];
    const deck = shuffle(forced?.length ? [...forced] : validDeck(name, custom) ? [...custom] : defaultDeck(name), random);
    const maxLife = options.lives?.[side] ?? rules.maxLife;
    const player = { name, life: maxLife, maxLife, capacity: 0, essence: 0, deck, hand: [], discard: [], powerUsed: false, board: [], artifacts: [], secrets: [], discount: 0, fatigue: 0, peek: null };
    draw(player, rules.openingHand);
    return player;
  });
  return { players, active: 0, phase: "mulligan", round: 0, next: 1, winner: null, log: [], random, stats: [emptyStats(), emptyStats()] };
}

export function note(g, text) {
  g.log.push(text);
}

export function mulligan(g, indexes) {
  if (g.phase !== "mulligan") return false;
  const p = g.players[g.active];
  const selected = [...new Set(indexes)].sort((a, b) => b - a);
  if (selected.length > rules.mulliganLimit || selected.some(i => !Number.isInteger(i) || i < 0 || i >= p.hand.length)) return false;
  const returned = selected.map(i => p.hand.splice(i, 1)[0]);
  draw(p, selected.length, g);
  p.deck = shuffle([...p.deck, ...returned], g.random);
  if (g.active === 0) g.active = 1;
  else {
    g.phase = "play";
    startTurn(g, 0);
  }
  return true;
}

function aura(p, id, uid) {
  return p.board.filter(unit => unit.card === id && !unit.silenced && unit.uid !== uid).length;
}

export function stats(g, side, unit) {
  const p = g.players[side];
  const enemy = g.players[rival(side)];
  const c = cardOf(unit);
  const boost = aura(p, 31, unit.uid);
  const loss = enemy.artifacts.filter(id => id === 53).length;
  const bonus = unit.bonus ?? 0;
  const maxHealth = c.health + boost + bonus + unit.guard[0] + unit.guard[1] + p.artifacts.filter(id => id === 44).length;
  return { attack: Math.max(0, c.attack + boost + bonus + unit.powerAttack - loss - unit.weakened), health: maxHealth - unit.damage, maxHealth };
}

function summon(g, side, card) {
  const unit = { uid: g.next++, card, damage: 0, weakened: 0, powerAttack: 0, guard: [0, 0], entered: g.round, attacked: false, silenced: false, borrowed: null, haste: false };
  g.players[side].board.push(unit);
  return unit;
}

function discard(p, g) {
  if (p.hand.length) p.discard.push(...p.hand.splice(Math.floor(g.random() * p.hand.length), 1));
}

function takeSecret(p, id) {
  const i = p.secrets.indexOf(id);
  if (i < 0) return false;
  p.secrets.splice(i, 1);
  return true;
}

function damageHero(g, side, value, credited = true) {
  const p = g.players[side];
  if (value <= 0) return;
  if (credited) g.stats[rival(side)].heroDamage += Math.min(value, p.life);
  p.life = Math.max(0, p.life - value);
  if (takeSecret(p, 39)) {
    draw(p, 2, g);
    note(g, "Testimone Finale si attiva.");
  }
}

function settle(g) {
  const deadIds = new Set();
  let dead;
  do {
    dead = g.players.flatMap((p, side) => p.board
      .filter(unit => stats(g, side, unit).health <= 0).map(unit => ({ side, unit })));
    for (const { side, unit } of dead) {
      const p = g.players[side];
      p.board = p.board.filter(other => other.uid !== unit.uid);
      deadIds.add(unit.uid);
      if (unit.card) g.stats[rival(side)].kills++;
      if (!unit.silenced && unit.card === 31) draw(p, 3, g);
      if (!unit.silenced && unit.card === 45) heal(p, p.maxLife);
    }
  } while (dead.length);
  const [a, b] = g.players;
  if (a.life <= 0 || b.life <= 0) {
    g.winner = a.life <= 0 && b.life <= 0 ? "draw" : a.life > 0 ? 0 : 1;
    g.phase = "finished";
  }
  return deadIds;
}

export function price(g, side, card) {
  const p = g.players[side];
  const enemy = g.players[rival(side)];
  if (card.type === "Creatura") return card.cost + aura(enemy, 2);
  if (card.type === "Incantesimo") return Math.max(0, card.cost - p.discount);
  return card.cost;
}

export function playTargets(g, id) {
  if (!targeted.has(id)) return [];
  const side = g.active;
  const enemy = rival(side);
  const targets = [];
  for (const s of [side, enemy]) {
    if (s === side && [1, 12].includes(id)) continue;
    targets.push(...g.players[s].board.map(unit => ({ side: s, uid: unit.uid })));
  }
  if (id === 23) targets.push({ side: enemy, uid: null });
  return targets;
}

function matchTarget(a, b) {
  return a && b && a.side === b.side && a.uid === b.uid;
}

function unitAt(g, target) {
  return target && g.players[target.side].board.find(unit => unit.uid === target.uid);
}

export function powerTargets(g) {
  const side = g.active;
  const power = heroFor(g.players[side].name)?.power;
  if (!power?.target) return [];
  const owner = power.target === "enemy" ? rival(side) : side;
  return g.players[owner].board.map(unit => ({ side: owner, uid: unit.uid }));
}

export function canUseHeroPower(g) {
  const p = g.players[g.active];
  const power = heroFor(p.name)?.power;
  return Boolean(g.phase === "play" && power && !p.powerUsed && p.essence >= heroPowerCost
    && (!power.target || powerTargets(g).length) && (!power.heal || p.life < p.maxLife));
}

export function useHeroPower(g, target) {
  if (!canUseHeroPower(g)) return false;
  const side = g.active;
  const p = g.players[side];
  const hero = heroFor(p.name);
  const power = hero.power;
  if (power.target && !powerTargets(g).some(choice => matchTarget(choice, target))) return false;
  const unit = unitAt(g, target);
  p.essence -= heroPowerCost;
  p.powerUsed = true;
  g.stats[side].powers++;
  if (power.defense) unit.guard[side] = power.defense;
  if (power.attack) unit.powerAttack += power.attack;
  if (power.buff) unit.bonus = (unit.bonus ?? 0) + power.buff;
  if (power.damage) unit.damage += power.damage;
  if (power.heal) heal(p, power.heal);
  if (power.summon) summon(g, side, power.summon);
  if (power.heroDamage) damageHero(g, rival(side), power.heroDamage);
  note(g, `${hero.name} usa ${power.name}.`);
  settle(g);
  return true;
}

function transfer(g, from, to, unit, haste) {
  const p = g.players[from];
  p.board = p.board.filter(other => other.uid !== unit.uid);
  unit.borrowed ??= from;
  unit.haste = haste;
  g.players[to].board.push(unit);
}

function hitAll(p, value) {
  for (const unit of p.board) unit.damage += value;
}

function resolve(g, side, id, target) {
  const p = g.players[side];
  const opponent = rival(side);
  const enemy = g.players[opponent];
  const unit = unitAt(g, target);
  switch (id) {
    case 1: if (unit) transfer(g, opponent, side, unit, true); break;
    case 3: heal(p, 4); break;
    case 5: draw(p, 1, g); break;
    case 7: note(g, enemy.deck.length ? `Carta rivelata: ${byId.get(enemy.deck[0]).name}.` : "Il mazzo avversario è vuoto."); break;
    case 9:
    case 55: unit.damage += 2; break;
    case 12: unit.silenced = true; unit.damage += 2; break;
    case 15: for (const other of [...enemy.board]) transfer(g, opponent, side, other, false); break;
    case 16:
      for (const player of g.players) for (const creature of player.board) creature.damage = Infinity;
      settle(g);
      for (const player of g.players) draw(player, 2, g);
      break;
    case 17:
      unit.damage += 4;
      if (settle(g).has(unit.uid)) p.essence += 2;
      break;
    case 19: for (const other of enemy.board) other.weakened += 3; break;
    case 21: summon(g, side, 0); summon(g, side, 0); break;
    case 22: p.discount++; break;
    case 23: if (unit) unit.damage += 3; else damageHero(g, target.side, 3); break;
    case 27: draw(p, 2, g); break;
    case 30: hitAll(enemy, 1); break;
    case 33: heal(p, 5); break;
    case 35: heal(p, 3); break;
    case 38: hitAll(enemy, 2); break;
    case 40: damageHero(g, opponent, 2); damageHero(g, side, 1, false); break;
    case 41: heal(p, 2); break;
    case 43: heal(p, 4); draw(p, 1, g); break;
    case 46: draw(p, enemy.board.length, g); break;
    case 52: p.peek = p.deck[0] ?? null; break;
    case 58: discard(p, g); draw(p, 2, g); break;
  }
}

export function canPlay(g, index) {
  const p = g.players[g.active];
  const c = byId.get(p.hand[index]);
  return g.phase === "play" && c && p.essence >= price(g, g.active, c)
    && (!targeted.has(c.id) || c.id === 1 || playTargets(g, c.id).length > 0);
}

export function play(g, index, target) {
  if (!canPlay(g, index)) return false;
  const side = g.active;
  const p = g.players[side];
  const enemy = g.players[rival(side)];
  const c = byId.get(p.hand[index]);
  const targets = playTargets(g, c.id);
  if (targets.length && !targets.some(choice => matchTarget(choice, target))) return false;
  p.essence -= price(g, side, c);
  p.hand.splice(index, 1);
  const tally = g.stats[side];
  tally.cards++;
  tally[{ Creatura: "creatures", Incantesimo: "spells", Artefatto: "artifacts", Segreto: "secrets" }[c.type]]++;
  if (c.type === "Incantesimo") p.discount = 0;
  note(g, c.type === "Segreto" ? `${p.name} prepara un Segreto.` : `${p.name} gioca ${c.name}.`);
  const unit = c.type === "Creatura" ? summon(g, side, c.id) : null;
  if (c.type === "Artefatto") p.artifacts.push(c.id);
  if (c.type === "Segreto") p.secrets.push(c.id);
  resolve(g, side, c.id, target);
  if (unit && enemy.secrets.includes(50)) {
    takeSecret(enemy, 50);
    unit.damage += 3;
    note(g, "Imboscata si attiva.");
  }
  settle(g);
  return true;
}

export function attackTargets(g, uid) {
  if (g.phase !== "play") return [];
  const side = g.active;
  const p = g.players[side];
  const unit = p.board.find(u => u.uid === uid);
  if (!unit || unit.attacked || stats(g, side, unit).attack <= 0) return [];
  if (unit.entered === g.round && !(unit.haste || (!unit.silenced && rush.has(unit.card)) || has(p, 59))) return [];
  const opponent = rival(side);
  const enemy = g.players[opponent];
  const targets = enemy.board.map(other => ({ side: opponent, uid: other.uid }));
  if (!enemy.board.some(other => !other.silenced && taunt.has(other.card)) || (!unit.silenced && unit.card === 20)) {
    targets.push({ side: opponent, uid: null });
  }
  return targets;
}

export function attack(g, uid, target) {
  if (!attackTargets(g, uid).some(choice => matchTarget(choice, target))) return false;
  const side = g.active;
  const p = g.players[side];
  const unit = p.board.find(other => other.uid === uid);
  const power = stats(g, side, unit).attack;
  unit.attacked = true;
  const defender = unitAt(g, target);
  if (defender) {
    const retaliation = stats(g, target.side, defender).attack;
    defender.damage += power;
    unit.damage += retaliation;
    note(g, `${cardOf(unit).name} attacca ${cardOf(defender).name}.`);
    if (settle(g).has(defender.uid) && unit.card === 56 && !unit.silenced) draw(p, 1, g);
  } else {
    damageHero(g, target.side, power);
    if (!unit.silenced && unit.card === 18) discard(g.players[target.side], g);
    note(g, `${cardOf(unit).name} infligge ${damageText(power)} all’eroe.`);
    settle(g);
  }
  return true;
}

function startTurn(g, side) {
  g.active = side;
  g.round++;
  const p = g.players[side];
  p.capacity = Math.min(rules.maxEssence, p.capacity + 1);
  p.powerUsed = false;
  g.stats[side].turns++;
  for (const player of g.players) {
    for (const unit of player.board) unit.guard[side] = 0;
  }
  settle(g);
  if (g.phase === "finished") return;
  p.essence = p.capacity;
  p.discount = p.artifacts.filter(id => id === 22).length;
  for (const unit of p.board) unit.attacked = false;
  note(g, `Turno di ${p.name}.`);
  if (p.deck.length) draw(p, 1, g);
  else {
    p.fatigue++;
    damageHero(g, side, p.fatigue, false);
    note(g, `${p.name} subisce ${damageText(p.fatigue)} da esaurimento del mazzo.`);
  }
  if (p.life === 0) { settle(g); return; }
  for (const id of p.artifacts) {
    if (id === 14) draw(p, 1, g);
    if (id === 36) heal(p, 2);
  }
  settle(g);
}

export function endTurn(g) {
  if (g.phase !== "play") return false;
  const side = g.active;
  const opponent = rival(side);
  const p = g.players[side];
  for (const id of p.artifacts) if (id === 6) hitAll(g.players[opponent], 1);
  for (const unit of p.board) {
    if (unit.silenced) continue;
    if (unit.card === 28) damageHero(g, opponent, 1);
    if (unit.card === 32) heal(p, 2);
  }
  for (const [owner, player] of g.players.entries()) {
    for (const id of player.artifacts) if (id === 25) damageHero(g, rival(owner), 1);
  }
  settle(g);
  for (const [owner, player] of g.players.entries()) {
    for (const unit of [...player.board]) {
      unit.weakened = 0;
      unit.powerAttack = 0;
      if (unit.borrowed === null) continue;
      const original = unit.borrowed;
      unit.borrowed = null;
      unit.haste = false;
      if (owner !== original) {
        player.board = player.board.filter(other => other.uid !== unit.uid);
        g.players[original].board.push(unit);
      }
    }
  }
  settle(g);
  if (g.phase === "play") startTurn(g, opponent);
  return true;
}

// onStep(azione), facoltativo: chiamato dopo ogni mossa per animarla nell'interfaccia.
export function computerTurn(g, level, onStep = () => {}) {
  const p = g.players[g.active];
  if (g.phase === "mulligan") return mulligan(g, p.hand.map((id, i) => ({ id, i })).filter(({ id }) => byId.get(id).cost >= 5).slice(0, rules.mulliganLimit).map(e => e.i));
  if (g.phase !== "play") return;
  const side = g.active;
  const high = level === "Difficile";
  const easy = level === "Facile";
  for (let n = 0; n < 30 && g.phase === "play"; n++) {
    const options = p.hand.flatMap((id, index) => {
      if (!canPlay(g, index)) return [];
      const c = byId.get(id);
      const targets = playTargets(g, id).filter(t => t.side !== side);
      if (targeted.has(id) && id !== 1 && !targets.length) return [];
      if (id === 16 && p.board.length >= g.players[rival(side)].board.length) return [];
      const target = targets.sort((a, b) => (unitAt(g, b) ? stats(g, b.side, unitAt(g, b)).attack : 3) - (unitAt(g, a) ? stats(g, a.side, unitAt(g, a)).attack : 3))[0];
      return [{ index, target, value: easy ? g.random() : c.cost + (high && c.type === "Creatura" ? 1 : 0) }];
    });
    options.sort((a, b) => b.value - a.value);
    if (!options.length) break;
    const card = p.hand[options[0].index];
    if (!play(g, options[0].index, options[0].target)) break;
    onStep({ kind: "play", side, card, target: options[0].target ?? null });
  }
  if (canUseHeroPower(g)) {
    const options = powerTargets(g);
    const power = heroFor(p.name).power;
    const best = options.find(t => power.damage
      ? stats(g, t.side, unitAt(g, t)).health <= power.damage
      : attackTargets(g, t.uid).length);
    if (useHeroPower(g, best ?? options[0])) onStep({ kind: "power", side, target: best ?? options[0] ?? null });
  }
  for (const unit of [...p.board]) {
    const options = attackTargets(g, unit.uid);
    const kill = high && options.find(t => t.uid !== null && stats(g, t.side, unitAt(g, t)).health <= stats(g, side, unit).attack);
    const hero = options.find(t => t.uid === null);
    const lethal = hero && stats(g, side, unit).attack >= g.players[hero.side].life;
    const target = lethal ? hero : kill || (easy ? options[Math.floor(g.random() * options.length)] : hero || options[0]);
    if (target && attack(g, unit.uid, target)) onStep({ kind: "attack", side, uid: unit.uid, target });
  }
  if (g.phase === "play") endTurn(g);
}

export { byId };
