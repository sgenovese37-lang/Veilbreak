// Avversario "Difficile": prova ogni mossa su una copia della partita e sceglie quella che
// migliora di più la valutazione della posizione. Si ferma quando nessuna mossa aiuta.
import {
  byId, canPlay, playTargets, play, attackTargets, attack, canUseHeroPower, powerTargets,
  useHeroPower, endTurn, mulligan, stats, cardOf, rules, computerTurn, essenceShardId, shardHelps, maxAttacks, isVeiled,
} from "./game.mjs";

const fixedRandom = () => 0.5;

function clone(g) {
  const copy = structuredClone({ ...g, random: undefined, log: [] });
  copy.random = fixedRandom;
  return copy;
}

// Valore di ciò che resta quando una creatura con Lascito muore (secondo set)
const legacyValue = { 61: 1, 62: 1.5, 77: 1.5, 82: 3 };
const isTaunt = unit => !unit.silenced && /Provocazione/.test(cardOf(unit).text ?? "");

function unitValue(g, side, unit) {
  const c = cardOf(unit);
  const s = stats(g, side, unit);
  if (s.health <= 0) return 0;
  const fury = maxAttacks(unit) > 1 ? 1.5 : 1;
  const veil = isVeiled(unit) ? 1.5 : 0;
  const legacy = !unit.silenced && legacyValue[unit.card] ? legacyValue[unit.card] : 0;
  const stun = unit.stunned ? -s.attack * 0.8 : 0;
  return s.attack * 1.6 * fury + s.health * 1.1 + (isTaunt(unit) ? 2 : 0) + (c.cost ?? 1) * 0.3 + veil + legacy + stun;
}

export function evaluate(g, side) {
  if (g.phase === "finished") return g.winner === side ? 1e5 : g.winner === "draw" ? 0 : -1e5;
  const me = g.players[side];
  const enemy = g.players[1 - side];
  let score = me.life * (me.life <= 12 ? 1.2 : 0.7) - enemy.life * (enemy.life <= 12 ? 1.4 : 1);
  for (const [s, p] of g.players.entries()) {
    for (const unit of p.board) {
      const owner = unit.borrowed ?? s;
      score += (owner === side ? 1 : -1) * unitValue(g, s, unit);
    }
  }
  const cardsIn = p => p.hand.filter(id => id !== essenceShardId).length;
  score += (cardsIn(me) - cardsIn(enemy)) * 0.9;
  score += (me.artifacts.length - enemy.artifacts.length) * 3 + (me.secrets.length - enemy.secrets.length) * 2.5;
  return score;
}

function actions(g) {
  const side = g.active;
  const p = g.players[side];
  const list = [];
  p.hand.forEach((id, index) => {
    if (id === essenceShardId || !canPlay(g, index)) return;
    const targets = playTargets(g, id);
    if (targets.length) for (const target of targets) list.push({ kind: "play", index, target });
    else list.push({ kind: "play", index });
  });
  if (canUseHeroPower(g)) {
    const targets = powerTargets(g);
    if (targets.length) for (const target of targets) list.push({ kind: "power", target });
    else list.push({ kind: "power" });
  }
  for (const unit of p.board) {
    for (const target of attackTargets(g, unit.uid)) list.push({ kind: "attack", uid: unit.uid, target });
  }
  return list;
}

function apply(g, action) {
  if (action.kind === "play") return play(g, action.index, action.target);
  if (action.kind === "power") return useHeroPower(g, action.target);
  return attack(g, action.uid, action.target);
}

export function smartTurn(g, onStep = () => {}) {
  const side = g.active;
  if (g.phase === "mulligan") {
    const p = g.players[side];
    const costly = p.hand.map((id, i) => ({ i, cost: byId.get(id).cost }))
      .filter(e => e.cost >= 5).sort((a, b) => b.cost - a.cost).slice(0, rules.mulliganLimit).map(e => e.i);
    return mulligan(g, costly);
  }
  if (g.phase !== "play") return;
  for (let step = 0; step < 40 && g.phase === "play" && g.active === side; step++) {
    const current = evaluate(g, side);
    let best = null;
    let bestScore = current + 0.05;
    for (const action of actions(g)) {
      const trial = clone(g);
      if (!apply(trial, action)) continue;
      const score = evaluate(trial, side);
      if (score > bestScore) { best = action; bestScore = score; }
    }
    if (!best) {
      // nessuna mossa utile: se il Frammento di Essenza apre una giocata, lo usa e riprova
      const shard = g.players[side].hand.indexOf(essenceShardId);
      if (shard < 0 || !shardHelps(g, g.players[side]) || !play(g, shard)) break;
      onStep({ kind: "play", index: shard, side, card: essenceShardId, target: null });
      continue;
    }
    const card = best.kind === "play" ? g.players[side].hand[best.index] : undefined;
    if (!apply(g, best)) break;
    onStep({ ...best, side, card, target: best.target ?? null });
  }
  if (g.phase === "play" && g.active === side) endTurn(g);
}

// Punto unico per far giocare il computer: Difficile usa la ricerca, gli altri livelli le regole semplici.
export function runComputer(g, level, onStep) {
  return level === "Difficile" ? smartTurn(g, onStep) : computerTurn(g, level, onStep);
}
