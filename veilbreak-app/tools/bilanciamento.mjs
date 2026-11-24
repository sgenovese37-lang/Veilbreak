// Simula partite Difficile contro Difficile per ogni coppia di fazioni.
// Uso: node tools/bilanciamento.mjs [partite per coppia, predefinito 200]
import { factions, createGame } from "../game.mjs";
import { smartTurn } from "../ai.mjs";

const perPair = Number(process.argv[2] ?? 200);
const seeded = seed => () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const wins = Object.fromEntries(factions.map(f => [f, { won: 0, played: 0 }]));
const pairs = {};
let first = 0, total = 0, turns = 0, seed = 7;
for (const a of factions) for (const b of factions) {
  if (a === b) continue;
  let aw = 0;
  for (let i = 0; i < perPair; i++) {
    const names = i % 2 ? [b, a] : [a, b];
    const g = createGame(names, seeded(seed++));
    for (let n = 0; n < 400 && g.phase !== "finished"; n++) smartTurn(g);
    total++; turns += g.round;
    if (g.winner === 0) first++;
    if (g.winner === "draw") continue;
    const winner = names[g.winner];
    if (winner === a) aw++;
    wins[winner].won++;
  }
  wins[a].played += perPair; wins[b].played += perPair;
  pairs[`${a} contro ${b}`] = Math.round(100 * aw / perPair);
}
console.log("Vittorie per fazione (Difficile contro Difficile)");
for (const [f, w] of Object.entries(wins)) console.log(`  ${f}: ${(100 * w.won / w.played).toFixed(1)}%`);
console.log("Coppie (vittorie della prima fazione)");
for (const [k, v] of Object.entries(pairs)) console.log(`  ${k}: ${v}%`);
console.log(`Vince chi gioca per primo: ${(100 * first / total).toFixed(1)}% · Durata media: ${(turns / total).toFixed(1)} turni totali`);
