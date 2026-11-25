import { cards } from "./cards.mjs";
import { heroFor, heroPowerCost } from "./heroes.mjs";
import { starterDecks } from "./decks.mjs";
import { t } from "./i18n.mjs";

export const rules = Object.freeze({ maxLife: 25, openingHand: 6, mulliganLimit: 2, maxEssence: 10, handLimit: 10, boardLimit: 7 });

export const factions = [...new Set(cards.map(card => card.faction))];
const byId = new Map(cards.map(card => [card.id, card]));
const fragment = { id: 0, name: "Frammento", type: "Creatura", attack: 1, health: 1, text: "" };
// Frammento di Essenza: lo riceve chi gioca per secondo. Costa 0, dà 1 Essenza in questo turno e scompare.
export const essenceShardId = 100;
export const essenceShard = Object.freeze({
  id: essenceShardId, name: "Frammento di Essenza", faction: "Neutrale", type: "Incantesimo", rarity: "Common",
  cost: 0, text: "Ottieni 1 Essenza solo in questo turno.", art: "assets/originali-chatgpt/frammento-essenza.webp",
});
byId.set(essenceShardId, essenceShard);
const rush = new Set([24, 46, 47, 48, 86, 89]);
const taunt = new Set([4, 13, 32, 34, 37, 45, 49, 51, 62, 68, 80, 82]);
// Secondo set: parole chiave nuove
const fury = new Set([69, 75]);            // Furia: attacca due volte per turno
const veiledCards = new Set([72, 85, 90]); // Velato: non bersagliabile dai nemici finché non attacca
// Bersagli delle carte: enemy = solo nemici, own = solo alleati, any = tutte le creature, weak = nemici con 3 Attacco o meno
const targetRule = { 1: "enemy", 9: "any", 12: "enemy", 17: "any", 23: "any", 55: "any", 63: "enemy", 66: "any", 67: "weak", 70: "any", 74: "own" };
const targeted = new Set(Object.keys(targetRule).map(Number));
export const isPact = card => Boolean(card?.pact);       // Patto: si paga con punti vita
export const isVeiled = unit => Boolean(unit.veiled && !unit.silenced);
export const maxAttacks = unit => (!unit.silenced && (fury.has(unit.card) || unit.fury) ? 2 : 1);
export const keywords = { rush, taunt, fury, veiled: veiledCards };
export const cardOf = unit => byId.get(unit.card) ?? fragment;
export const boardFull = player => player.board.length >= rules.boardLimit;
export const has = (player, id) => player.board.some(unit => unit.card === id && !unit.silenced);
const rival = side => 1 - side;
const damageText = n => n === 1 ? t("1 danno") : t("{n} danni", { n });
const heal = (p, n) => { p.life = Math.min(p.maxLife, p.life + n); };
const emptyStats = () => ({ cards: 0, creatures: 0, spells: 0, artifacts: 0, secrets: 0, heroDamage: 0, kills: 0, powers: 0, turns: 0, played: {} });

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
  p.burned = (p.burned ?? 0) + overflow.length;   // carte perse per mano piena (l'interfaccia lo segnala)
  if (overflow.length && g) {
    note(g, t("{name} ha la mano piena: {n} carta pescata va persa.", { name: p.name, n: overflow.length }));
  }
}

export const deckSize = 30;
export const copyLimit = card => card.rarity === "Legendary" ? 1 : 3;
// Senza mazzo predefinito (fazione nuova): le carte della fazione in ordine, ripetute fino a 30.
function fallbackDeck(name) {
  const pool = cards.filter(card => card.faction === name);
  const deck = [];
  for (let copy = 0; copy < 3 && deck.length < deckSize; copy++) {
    for (const card of pool) if (copy < copyLimit(card) && deck.length < deckSize) deck.push(card.id);
  }
  return deck;
}
export const defaultDeck = name => validDeck(name, starterDecks[name]) ? [...starterDecks[name]] : fallbackDeck(name);

// Un mazzo usa al massimo 2 fazioni: la principale (che sceglie l'eroe) e, se vuoi, una fazione alleata.
// Il mazzo può essere un elenco di carte oppure { cards, ally } con la fazione alleata.
export const maxFactions = 2;
export const deckCards = deck => (Array.isArray(deck) ? deck : deck?.cards);
export const deckAlly = deck => (Array.isArray(deck) ? null : deck?.ally ?? null);

export function validDeck(name, deck, ally = deckAlly(deck)) {
  const list = deckCards(deck);
  if (!Array.isArray(list) || list.length !== deckSize) return false;
  if (ally !== null && (ally === name || !factions.includes(ally))) return false;
  const allowed = new Set([name, ally].filter(Boolean));
  if (allowed.size > maxFactions) return false;
  const counts = new Map();
  return list.every(id => {
    const c = byId.get(id);
    const count = (counts.get(id) ?? 0) + 1;
    counts.set(id, count);
    return c && allowed.has(c.faction) && count <= copyLimit(c);
  });
}

// options.lives: punti vita iniziali per lato (Storia). options.decks: mazzi già decisi, senza i limiti dell'editor.
// options.first: chi inizia (0 o 1, di solito tirato a sorte; senza indicazione inizia il lato 0).
export function createGame(names, random = Math.random, customDecks = [], options = {}) {
  const first = options.first === 1 ? 1 : 0;
  const players = names.map((name, side) => {
    const custom = customDecks[side];
    const forced = options.decks?.[side];
    const deck = shuffle(forced?.length ? [...forced] : validDeck(name, custom) ? [...deckCards(custom)] : defaultDeck(name), random);
    const maxLife = options.lives?.[side] ?? rules.maxLife;
    const player = { name, ally: !forced?.length && validDeck(name, custom) ? deckAlly(custom) : null, hero: options.heroes?.[side] ?? null, life: maxLife, maxLife, capacity: 0, essence: 0, deck, hand: [], discard: [], powerUsed: false, board: [], artifacts: [], secrets: [], discount: 0, fatigue: 0, peek: null };
    // chi gioca per secondo pesca una carta in più (e dopo la sostituzione riceve il Frammento di Essenza)
    draw(player, rules.openingHand + (side !== first ? 1 : 0));
    return player;
  });
  // Rissa della settimana: una regola speciale (vedi brawls più sotto)
  const brawl = options.brawl ?? null;
  if (brawl === "rich") for (const p of players) p.capacity = 2;
  return { players, first, active: first, phase: "mulligan", round: 0, next: 1, winner: null, log: [], random, stats: [emptyStats(), emptyStats()], brawl };
}

// Regole delle Risse della settimana. id → testo; la regola «chaos» usa mazzi casuali (vedi chaosDeck).
export const brawls = [
  { id: "fury", name: "Furia per tutti", text: "Tutte le creature hanno Furia: attaccano due volte per turno." },
  { id: "rush", name: "Assalto notturno", text: "Tutte le creature hanno Rapidità: attaccano subito." },
  { id: "double", name: "Doppia pescata", text: "Ogni giocatore pesca 2 carte a ogni turno." },
  { id: "rich", name: "Rituale accelerato", text: "Si parte con 2 Essenza in più." },
  { id: "cheap", name: "Mercato nero", text: "Le creature costano 1 Essenza in meno." },
  { id: "chaos", name: "Mazzi del caos", text: "Ogni giocatore riceve un mazzo casuale di 30 carte di tutte le fazioni." },
];
export function chaosDeck(random = Math.random) {
  const pool = cards.filter(c => c.rarity !== "Legendary");
  const legends = cards.filter(c => c.rarity === "Legendary");
  const deck = [legends[Math.floor(random() * legends.length)].id];
  while (deck.length < deckSize) {
    const c = pool[Math.floor(random() * pool.length)];
    if (deck.filter(id => id === c.id).length < 2) deck.push(c.id);
  }
  return deck;
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
  const first = g.first ?? 0;
  if (g.active === first) g.active = rival(first);
  else {
    g.phase = "play";
    p.hand.push(essenceShardId);
    startTurn(g, first);
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
  const shepherd = !unit.silenced && rush.has(unit.card) ? aura(p, 89, unit.uid) : 0;
  const maxHealth = c.health + boost + bonus + (unit.healthBonus ?? 0) + unit.guard[0] + unit.guard[1] + p.artifacts.filter(id => id === 44).length;
  return { attack: Math.max(0, c.attack + boost + bonus + (unit.atkBonus ?? 0) + shepherd + unit.powerAttack - loss - unit.weakened), health: maxHealth - unit.damage, maxHealth };
}

function summon(g, side, card) {
  if (boardFull(g.players[side])) return null;
  const unit = { uid: g.next++, card, damage: 0, weakened: 0, powerAttack: 0, guard: [0, 0], entered: g.round, attacked: false, attacks: 0, silenced: false, borrowed: null, haste: g.brawl === "rush" };
  if (g.brawl === "fury") unit.fury = true;   // Rissa «Furia per tutti»
  if (veiledCards.has(card)) unit.veiled = true;
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
  for (const unit of p.board) if (unit.card === 76 && !unit.silenced) unit.atkBonus = (unit.atkBonus ?? 0) + 1;
  if (takeSecret(p, 39)) {
    draw(p, 2, g);
    note(g, t("Testimone Finale si attiva."));
  }
}

function settle(g) {
  const deadIds = new Set();
  let dead;
  do {
    // Martire della Cattedrale: ogni volta che subisce danni cura 1 punto vita al suo eroe
    for (const [side, p] of g.players.entries()) for (const unit of p.board) {
      if (unit.card !== 80) continue;
      if (!unit.silenced && unit.damage > (unit.seenDamage ?? 0)) heal(p, 1);
      unit.seenDamage = unit.damage;
    }
    dead = g.players.flatMap((p, side) => p.board
      .filter(unit => stats(g, side, unit).health <= 0).map(unit => ({ side, unit })));
    for (const { side, unit } of dead) {
      const p = g.players[side];
      p.board = p.board.filter(other => other.uid !== unit.uid);
      deadIds.add(unit.uid);
      if (unit.card) g.stats[rival(side)].kills++;
      if (!unit.silenced && unit.card === 31) draw(p, 3, g);
      if (!unit.silenced && unit.card === 45) heal(p, p.maxLife);
      // cimitero: le creature morte tornano al loro proprietario (anche se erano prese in controllo)
      const owner = unit.borrowed ?? side;
      if (unit.card) (g.players[owner].graveyard ??= []).push(unit.card);
      for (const id of g.players[rival(side)].artifacts) if (id === 65) heal(g.players[rival(side)], 2);
      if (!unit.silenced) lascito(g, side, unit.card);
    }
  } while (dead.length);
  const [a, b] = g.players;
  if (a.life <= 0 || b.life <= 0) {
    g.winner = a.life <= 0 && b.life <= 0 ? "draw" : a.life > 0 ? 0 : 1;
    g.phase = "finished";
  }
  return deadIds;
}

// Lascito: effetto quando la creatura muore
function lascito(g, side, id) {
  const p = g.players[side];
  if (id === 61) draw(p, 1, g);
  if (id === 62) summon(g, side, 8);
  if (id === 77) heal(p, 3);
  if (id === 82) summon(g, side, 34);
}

export function price(g, side, card) {
  const p = g.players[side];
  const enemy = g.players[rival(side)];
  if (isPact(card)) return card.cost;
  if (card.id === 90) return Math.max(0, card.cost - p.board.length - enemy.board.length) + aura(enemy, 2);
  if (card.type === "Creatura") return Math.max(0, card.cost + aura(enemy, 2) - (g.brawl === "cheap" ? 1 : 0));
  if (card.type === "Incantesimo") return Math.max(0, card.cost - p.discount);
  return card.cost;
}

export function playTargets(g, id) {
  if (!targeted.has(id)) return [];
  const side = g.active;
  const enemy = rival(side);
  const rule = targetRule[id];
  const targets = [];
  for (const s of [side, enemy]) {
    if (s === side && (rule === "enemy" || rule === "weak")) continue;
    if (s === enemy && rule === "own") continue;
    for (const unit of g.players[s].board) {
      if (s === enemy && isVeiled(unit)) continue;   // le creature Velate nemiche non si possono bersagliare
      if (rule === "weak" && stats(g, s, unit).attack > 3) continue;
      targets.push({ side: s, uid: unit.uid });
    }
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
  const power = heroFor(g.players[side])?.power;
  if (!power?.target) return [];
  const owner = power.target === "ally" ? side : rival(side);
  const list = g.players[owner].board.filter(unit => owner === side || !isVeiled(unit)).map(unit => ({ side: owner, uid: unit.uid }));
  // "foe": una creatura nemica oppure l'eroe nemico
  if (power.target === "foe") list.push({ side: owner, uid: null });
  return list;
}

export function canUseHeroPower(g) {
  const p = g.players[g.active];
  const power = heroFor(p)?.power;
  return Boolean(g.phase === "play" && power && !p.powerUsed && p.essence >= heroPowerCost
    && (!power.target || powerTargets(g).length) && (!power.heal || p.life < p.maxLife)
    && (!power.summon || !boardFull(p)) && (!power.selfDamage || p.life > power.selfDamage));
}

export function useHeroPower(g, target) {
  if (!canUseHeroPower(g)) return false;
  const side = g.active;
  const p = g.players[side];
  const hero = heroFor(p);
  const power = hero.power;
  if (power.target && !powerTargets(g).some(choice => matchTarget(choice, target))) return false;
  const unit = unitAt(g, target);
  p.essence -= heroPowerCost;
  p.powerUsed = true;
  g.stats[side].powers++;
  if (power.defense) unit.guard[side] = power.defense;
  if (power.attack) unit.powerAttack += power.attack;
  if (power.buff) unit.bonus = (unit.bonus ?? 0) + power.buff;
  if (power.damage && unit) unit.damage += power.damage;
  if (power.damage && !unit) damageHero(g, target.side, power.damage);
  if (power.heal) heal(p, power.heal);
  if (power.summon) summon(g, side, power.summon);
  if (power.heroDamage) damageHero(g, rival(side), power.heroDamage);
  if (power.health) unit.healthBonus = (unit.healthBonus ?? 0) + power.health;
  if (power.atk) unit.atkBonus = (unit.atkBonus ?? 0) + power.atk;   // +Attacco permanente
  if (power.selfDamage) damageHero(g, side, power.selfDamage, false);
  if (power.draw) draw(p, power.draw, g);
  note(g, t("{hero} usa {power}.", { hero: hero.name, power: t(power.name) }));
  settle(g);
  return true;
}

// Con il campo pieno la creatura presa in controllo resta all'avversario.
function transfer(g, from, to, unit, haste) {
  if (boardFull(g.players[to])) return false;
  const p = g.players[from];
  p.board = p.board.filter(other => other.uid !== unit.uid);
  unit.borrowed ??= from;
  unit.haste = haste;
  g.players[to].board.push(unit);
  return true;
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
    case 1: if (unit && !transfer(g, opponent, side, unit, true)) note(g, t("Campo pieno: la creatura resta all’avversario.")); break;
    case 3: heal(p, 4); break;
    case 5: draw(p, 1, g); break;
    case 7: note(g, enemy.deck.length ? t("Carta rivelata: {card}.", { card: byId.get(enemy.deck[0]).name }) : t("Il mazzo avversario è vuoto.")); break;
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
    case essenceShardId: p.essence = Math.min(rules.maxEssence, p.essence + 1); break;
    // ---------- Secondo set ----------
    case 63: unit.stunned = true; break;
    case 64: {
      const relics = enemy.artifacts.map(a => byId.get(a)).sort((x, y) => y.cost - x.cost);
      if (relics.length) { enemy.artifacts.splice(enemy.artifacts.indexOf(relics[0].id), 1); note(g, t("Artefatto distrutto: {card}.", { card: relics[0].name })); }
      else { const self = p.board.at(-1); if (self?.card === 64) self.bonus = (self.bonus ?? 0) + 1; }
      break;
    }
    case 66: bounce(g, target.side, unit); break;
    case 67: if (transfer(g, opponent, side, unit, false)) { unit.borrowed = null; unit.entered = g.round; } break;
    case 68: for (const other of enemy.board) { other.silenced = true; other.veiled = false; } break;
    case 70: unit.damage += 2; damageHero(g, opponent, 1); break;
    case 71: p.discount += 2; break;
    case 74: summon(g, side, unit.card); break;
    case 75: damageHero(g, opponent, Math.min(5, g.stats[side].spells)); break;
    case 78: draw(p, 2, g); break;
    case 81: { const last = deadCommon(p).at(-1); if (last) summon(g, side, last); break; }
    case 83: {
      const best = [...new Set(deadCommon(p))].sort((x, y) => (byId.get(y)?.cost ?? 0) - (byId.get(x)?.cost ?? 0)).slice(0, 2);
      for (const id of best) summon(g, side, id);
      break;
    }
    case 84: for (let i = 0; i < 3; i++) summon(g, side, 60); break;
  }
}

// Creature alleate morte che si possono riportare in campo (le Leggendarie no)
function deadCommon(p) {
  return (p.graveyard ?? []).filter(id => byId.get(id)?.rarity !== "Legendary");
}

// Rimanda una creatura nella mano del suo proprietario (le pedine scompaiono).
function bounce(g, side, unit) {
  if (!unit) return;
  const owner = unit.borrowed ?? side;
  g.players[side].board = g.players[side].board.filter(other => other.uid !== unit.uid);
  if (!unit.card) return;
  const p = g.players[owner];
  if (p.hand.length < rules.handLimit) p.hand.push(unit.card); else p.discard.push(unit.card);
}

export function canPlay(g, index) {
  const p = g.players[g.active];
  const c = byId.get(p.hand[index]);
  const affordable = isPact(c) ? p.life > c.cost : p.essence >= price(g, g.active, c);
  const needsRoom = c.type === "Creatura" || [74, 81, 84].includes(c.id);
  return g.phase === "play" && c && affordable
    && !(needsRoom && boardFull(p))
    && !(c.id === 81 && !deadCommon(p).length)
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
  if (isPact(c)) { damageHero(g, side, c.cost, false); note(g, t("{name} paga {n} punti vita per il Patto.", { name: p.name, n: c.cost })); }
  else p.essence -= price(g, side, c);
  p.hand.splice(index, 1);
  const tally = g.stats[side];
  tally.cards++;
  if (c.id !== essenceShardId) {
    tally[{ Creatura: "creatures", Incantesimo: "spells", Artefatto: "artifacts", Segreto: "secrets" }[c.type]]++;
    tally.played[c.id] = (tally.played[c.id] ?? 0) + 1;
    if (c.type === "Incantesimo" && !isPact(c)) p.discount = 0;
    // Spirito nel Cavo: +1 Attacco a ogni incantesimo
    if (c.type === "Incantesimo") for (const u of p.board) if (u.card === 72 && !u.silenced) u.atkBonus = (u.atkBonus ?? 0) + 1;
  } else tally.cards--;
  note(g, c.type === "Segreto" ? t("{name} prepara un Segreto.", { name: p.name }) : t("{name} gioca {card}.", { name: p.name, card: c.name }));
  const unit = c.type === "Creatura" ? summon(g, side, c.id) : null;
  if (c.type === "Artefatto") p.artifacts.push(c.id);
  if (c.type === "Segreto") p.secrets.push(c.id);
  resolve(g, side, c.id, target);
  if (unit && enemy.secrets.includes(50)) {
    takeSecret(enemy, 50);
    unit.damage += 3;
    note(g, t("Imboscata si attiva."));
  }
  settle(g);
  return true;
}

export const isGuard = unit => !unit.silenced && taunt.has(unit.card) && !isVeiled(unit);

export function attackTargets(g, uid) {
  if (g.phase !== "play") return [];
  const side = g.active;
  const p = g.players[side];
  const unit = p.board.find(u => u.uid === uid);
  if (!unit || unit.attacked || (unit.attacks ?? 0) >= maxAttacks(unit) || stats(g, side, unit).attack <= 0) return [];
  if (unit.entered === g.round && !(unit.haste || (!unit.silenced && rush.has(unit.card)) || has(p, 59))) return [];
  const opponent = rival(side);
  const enemy = g.players[opponent];
  const visible = enemy.board.filter(other => !isVeiled(other));
  // Provocazione: finché c'è una creatura con Provocazione, si possono attaccare solo quelle.
  // Le creature con Provocazione invece attaccano chi vogliono, come le altre.
  const guards = visible.filter(isGuard);
  const targets = (guards.length ? guards : visible).map(other => ({ side: opponent, uid: other.uid }));
  if (!guards.length || (!unit.silenced && unit.card === 20)) targets.push({ side: opponent, uid: null });
  return targets;
}

export function attack(g, uid, target) {
  if (!attackTargets(g, uid).some(choice => matchTarget(choice, target))) return false;
  const side = g.active;
  const p = g.players[side];
  const unit = p.board.find(other => other.uid === uid);
  unit.attacks = (unit.attacks ?? 0) + 1;
  unit.attacked = unit.attacks >= maxAttacks(unit);
  unit.veiled = false;   // attaccando, una creatura Velata si rivela
  const foe = g.players[target.side];
  // Trappola a Ganascia: 2 danni all'attaccante prima del combattimento
  if (takeSecret(foe, 87)) {
    unit.damage += 2;
    note(g, t("Trappola a Ganascia si attiva."));
    if (settle(g).has(unit.uid)) return true;
  }
  // Firewall Infernale: distrugge chi attacca l'eroe
  if (target.uid === null && takeSecret(foe, 73)) {
    unit.damage = Infinity;
    note(g, t("Firewall Infernale si attiva."));
    settle(g);
    return true;
  }
  const power = stats(g, side, unit).attack;
  const defender = unitAt(g, target);
  if (defender) {
    const retaliation = stats(g, target.side, defender).attack;
    defender.damage += power;
    unit.damage += retaliation;
    note(g, t("{card} attacca {target}.", { card: cardOf(unit).name, target: cardOf(defender).name }));
    const died = settle(g);
    if (died.has(defender.uid) && unit.card === 56 && !unit.silenced) draw(p, 1, g);
    if (died.has(defender.uid) && unit.card === 86 && !unit.silenced && !died.has(unit.uid)) unit.bonus = (unit.bonus ?? 0) + 1;
  } else {
    damageHero(g, target.side, power);
    if (!unit.silenced && unit.card === 18) discard(g.players[target.side], g);
    note(g, t("{card} infligge {damage} all’eroe.", { card: cardOf(unit).name, damage: damageText(power) }));
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
  for (const unit of p.board) {
    unit.attacked = false;
    unit.attacks = 0;
    if (unit.stunned) { unit.attacked = true; unit.stunned = false; }   // Timbro del Vincolo
  }
  (g.turnStarts ??= []).push(g.log.length);
  note(g, t("Turno di {name}.", { name: p.name }));
  // chi gioca per primo (sempre il giocatore 0) non pesca nel suo primo turno: compensa il vantaggio di iniziare
  if (g.round === 1 && side === (g.first ?? 0)) { /* niente pescata */ } else if (p.deck.length) draw(p, g.brawl === "double" ? 2 : 1, g);
  else {
    p.fatigue++;
    damageHero(g, side, p.fatigue, false);
    note(g, t("{name} subisce {damage} da esaurimento del mazzo.", { name: p.name, damage: damageText(p.fatigue) }));
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
  for (const unit of [...p.board]) {
    if (unit.silenced) continue;
    if (unit.card === 28) damageHero(g, opponent, 1);
    if (unit.card === 32) heal(p, 2);
    if (unit.card === 88) summon(g, side, 60);   // Madre della Muffa
  }
  // Confessionale Infestato: cura 3 punti vita alla creatura alleata più ferita
  for (const id of p.artifacts) if (id === 79) {
    const hurt = p.board.filter(u => u.damage > 0).sort((x, y) => y.damage - x.damage)[0];
    if (hurt) hurt.damage = Math.max(0, hurt.damage - 3);
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
        if (!boardFull(g.players[original])) g.players[original].board.push(unit);
      }
    }
  }
  settle(g);
  if (g.phase === "play") startTurn(g, opponent);
  return true;
}

// Il Frammento di Essenza serve solo se con 1 Essenza in più si può giocare qualcosa che ora non si può.
export function shardHelps(g, p) {
  return p.hand.some(id => {
    const c = byId.get(id);
    return id !== essenceShardId && price(g, g.active, c) === p.essence + 1 && !(c.type === "Creatura" && boardFull(p));
  }) || (!p.powerUsed && p.essence === heroPowerCost - 1);
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
      if (id === essenceShardId && !shardHelps(g, p)) return [];
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
    const power = heroFor(p).power;
    const best = options.find(t => power.damage
      ? stats(g, t.side, unitAt(g, t)).health <= power.damage
      : attackTargets(g, t.uid).length);
    if (useHeroPower(g, best ?? options[0])) onStep({ kind: "power", side, target: best ?? options[0] ?? null });
  }
  for (const unit of [...p.board, ...p.board.filter(u => maxAttacks(u) > 1)]) {
    if (!p.board.includes(unit)) continue;
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
