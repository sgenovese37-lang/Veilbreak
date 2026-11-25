// Avversario "Difficile": prova ogni mossa su una copia della partita e sceglie quella che
// migliora di più la valutazione della posizione, guardando anche una mossa più avanti.
// Prima cerca un colpo finale; conserva le carte che rimuovono creature per le minacce vere
// e tiene conto di quanti danni l'avversario può fargli al turno dopo. Si ferma quando nessuna mossa aiuta.
import {
  byId, canPlay, playTargets, play, attackTargets, attack, canUseHeroPower, powerTargets,
  useHeroPower, endTurn, mulligan, stats, cardOf, rules, computerTurn, essenceShardId, shardHelps, maxAttacks, isVeiled,
} from "./game.mjs";

const fixedRandom = () => 0.5;

// Copia per provare una mossa. I segreti dell'avversario sono nascosti, come per un giocatore:
// il computer non deve conoscerli (prima, vedendo Firewall Infernale, rinunciava ad attaccare l'eroe
// per molti turni e la partita non finiva più).
function clone(g) {
  const copy = structuredClone({ ...g, random: undefined, log: [] });
  copy.random = fixedRandom;
  copy.players[1 - g.active].secrets = [];
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

// Incantesimi che tolgono di mezzo una creatura: il computer li conserva per le minacce vere
// (in mano valgono di più, quindi li usa solo quando lo scambio ne vale la pena).
const removal = id => { const c = byId.get(id); return c?.type === "Incantesimo" && /Distruggi|Infliggi|Rimanda|Silenzia/.test(c.text ?? ""); };

// Danni che le creature di un lato possono fare all'eroe avversario nel prossimo turno,
// tenendo conto delle Provocazioni che li fermano.
function threat(g, side) {
  const p = g.players[side];
  const foe = g.players[1 - side];
  let damage = 0;
  for (const unit of p.board) {
    if (unit.stunned) continue;
    damage += Math.max(0, stats(g, side, unit).attack) * maxAttacks(unit);
  }
  const wall = foe.board.filter(u => isTaunt(u) && !isVeiled(u)).reduce((sum, u) => sum + Math.max(0, stats(g, 1 - side, u).health), 0);
  return Math.max(0, damage - wall);
}

export function evaluate(g, side) {
  if (g.phase === "finished") return g.winner === side ? 1e5 : g.winner === "draw" ? 0 : -1e5;
  const me = g.players[side];
  const enemy = g.players[1 - side];
  // peso alto alla vita nemica: il computer cerca di chiudere la partita invece di scambiare all'infinito
  let score = me.life * (me.life <= 12 ? 1.2 : 0.7) - enemy.life * (enemy.life <= 12 ? 2.5 : 1.8);
  for (const [s, p] of g.players.entries()) {
    for (const unit of p.board) {
      const owner = unit.borrowed ?? s;
      score += (owner === side ? 1 : -1) * unitValue(g, s, unit);
    }
  }
  const cardsIn = p => p.hand.filter(id => id !== essenceShardId).length;
  score += (cardsIn(me) - cardsIn(enemy)) * 0.9;
  for (const id of me.hand) if (removal(id)) score += 0.3 + (byId.get(id).cost ?? 1) * 0.15;
  // pericolo: se l'avversario può darmi il colpo finale al prossimo turno, la posizione è pessima
  const danger = threat(g, 1 - side);
  if (danger >= me.life) score -= 30;
  else if (danger > me.life * 0.6) score -= (danger - me.life * 0.6) * 1.5;
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

// Cerca una sequenza di mosse che vinca subito la partita (colpo finale), provando prima
// le mosse contro l'eroe. Limite di posizioni provate per restare veloce sul telefono.
function findLethal(g, side, budget = { left: 1500 }, depth = 0) {
  if (depth > 9 || budget.left <= 0) return null;
  const list = actions(g).sort((a, b) => (b.target?.uid === null ? 1 : 0) - (a.target?.uid === null ? 1 : 0));
  for (const action of list) {
    if (budget.left-- <= 0) return null;
    const trial = clone(g);
    if (!apply(trial, action)) continue;
    if (trial.phase === "finished") { if (trial.winner === side) return [action]; continue; }
    // solo mosse che avvicinano la vittoria: meno vita nemica o meno Provocazioni davanti
    const before = g.players[1 - side], after = trial.players[1 - side];
    const taunts = p => p.board.filter(isTaunt).length;
    if (after.life >= before.life && taunts(after) >= taunts(before) && action.kind !== "attack") continue;
    const rest = findLethal(trial, side, budget, depth + 1);
    if (rest) return [action, ...rest];
  }
  return null;
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
  // colpo finale: se c'è una sequenza vincente la gioca tutta
  const lethal = findLethal(clone(g), side);
  if (lethal) {
    for (const action of lethal) {
      const card = action.kind === "play" ? g.players[side].hand[action.index] : undefined;
      if (!apply(g, action)) break;
      onStep({ ...action, side, card, target: action.target ?? null });
      if (g.phase !== "play") return;
    }
  }
  for (let step = 0; step < 40 && g.phase === "play" && g.active === side; step++) {
    const current = evaluate(clone(g), side);   // stessa visione delle prove (senza segreti nemici)
    let best = null;
    let bestScore = current + 0.05;
    const tried = [];
    for (const action of actions(g)) {
      const trial = clone(g);
      if (!apply(trial, action)) continue;
      const score = evaluate(trial, side);
      tried.push({ action, trial, score });
      if (score > bestScore) { best = action; bestScore = score; }
    }
    // guarda una mossa più in là per le migliori: una giocata che da sola sembra inutile
    // (per esempio togliere una Provocazione) può aprire una mossa molto migliore subito dopo
    {
      let bestPair = bestScore;
      for (const item of tried.sort((x, y) => y.score - x.score).slice(0, 6)) {
        if (item.trial.phase !== "play") continue;
        for (const next of actions(item.trial)) {
          const t2 = clone(item.trial);
          if (!apply(t2, next)) continue;
          const score = evaluate(t2, side) - 0.1;
          if (score > bestPair && score > item.score) { bestPair = score; best = item.action; }
        }
      }
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
