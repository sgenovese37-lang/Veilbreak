// Cerca mazzi predefiniti più equilibrati: cambia una carta alla volta e tiene la modifica
// solo se gli scontri Difficile contro Difficile si avvicinano tutti al 50%.
// Uso: node tools/cerca_mazzi.mjs [partite per coppia=80] [tentativi=150] [seme=7]
// Variabili facoltative: START='<json dei mazzi di partenza>', SEEDBASE=<seme delle partite di prova>.
// Il risultato (riga MAZZI) va verificato con partite nuove prima di copiarlo in decks.mjs.
import { factions, createGame, defaultDeck, validDeck } from "../game.mjs";
import { smartTurn } from "../ai.mjs";
import { cards } from "../cards.mjs";

const [nArg = "80", itArg = "150", seedArg = "7"] = process.argv.slice(2);
const seeded = seed => () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const n = Number(nArg), iters = Number(itArg);
const rng = seeded(Number(seedArg));
const decks = process.env.START ? JSON.parse(process.env.START) : Object.fromEntries(factions.map(f => [f, defaultDeck(f)]));

function evaluate(d) {
  const mu = {};
  let seed = Number(process.env.SEEDBASE ?? 5000);
  for (let i = 0; i < factions.length; i++) for (let j = i + 1; j < factions.length; j++) {
    const a = factions[i], b = factions[j];
    let aw = 0, decided = 0;
    for (let k = 0; k < n; k++) {
      const names = k % 2 ? [b, a] : [a, b];
      const g = createGame(names, seeded(seed++), names.map(f => d[f]));
      for (let t = 0; t < 400 && g.phase !== "finished"; t++) smartTurn(g);
      if (g.winner === "draw") continue;
      decided++;
      if (names[g.winner] === a) aw++;
    }
    mu[`${a} contro ${b}`] = Math.round(100 * aw / decided);
  }
  const values = Object.values(mu);
  const score = values.reduce((s, v) => s + (v - 50) ** 2, 0) + 2 * Math.max(...values.map(v => Math.abs(v - 50))) ** 2;
  return { mu, score };
}

let best = evaluate(decks);
console.log("inizio", JSON.stringify(best.mu));
for (let it = 0; it < iters; it++) {
  const f = factions[Math.floor(rng() * factions.length)];
  const pool = cards.filter(c => c.faction === f).map(c => c.id);
  const trial = { ...decks, [f]: [...decks[f]] };
  trial[f].splice(Math.floor(rng() * trial[f].length), 1);
  trial[f].push(pool[Math.floor(rng() * pool.length)]);
  if (!validDeck(f, trial[f])) continue;
  const result = evaluate(trial);
  if (result.score < best.score) {
    decks[f] = trial[f].sort((x, y) => x - y);
    best = result;
    console.log(`tentativo ${it}`, JSON.stringify(best.mu));
  }
}
console.log("MAZZI", JSON.stringify(decks));
