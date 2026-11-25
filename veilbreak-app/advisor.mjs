// Consigliere dei mazzi: crea un mazzo da 30 carte con le carte possedute e analizza un mazzo.
// Il valore di una carta viene dai mazzi predefiniti (bilanciati con le simulazioni) e dalla sua efficienza;
// il mazzo segue una buona curva di Essenza (carte economiche per partire, alcune potenti per chiudere).
import { cards } from "./cards.mjs";
import { starterDecks } from "./decks.mjs";
import { copyLimit, deckSize } from "./game.mjs";

const byId = new Map(cards.map(c => [c.id, c]));
const bucketOf = cost => (cost <= 2 ? 0 : cost <= 4 ? 1 : cost <= 6 ? 2 : 3);
export const curveLabels = ["1-2", "3-4", "5-6", "7+"];
// carte desiderate per fascia di costo in un mazzo da 30
const curveTarget = [10, 10, 6, 4];

// Valore stimato di una carta: quanto la usano i mazzi bilanciati + efficienza di Attacco e Difesa.
export function cardValue(card) {
  const starter = starterDecks[card.faction] ?? [];
  const inStarter = starter.filter(id => id === card.id).length;
  let value = 1 + inStarter * 0.9;
  if (card.type === "Creatura") value += ((card.attack + card.health) / (2 * Math.max(1, card.cost) + 1)) * 0.8;
  if (/Provocazione|Rapidità|Velato|Furia|Lascito|Urlo di battaglia/.test(card.text ?? "")) value += 0.35;
  if (card.rarity === "Legendary") value += 0.6;
  return value;
}

// Crea un mazzo: owned(id) dice quante copie possiedi. ally è la seconda fazione (facoltativa).
export function suggestDeck(main, ally, owned) {
  const factions = [main, ally].filter(Boolean);
  const items = [];
  for (const card of cards.filter(c => factions.includes(c.faction))) {
    const copies = Math.min(copyLimit(card), owned(card.id));
    for (let k = 0; k < copies; k++) {
      // le copie successive valgono un po' meno; la fazione alleata è un appoggio, non il cuore del mazzo
      const value = cardValue(card) * (1 - 0.18 * k) * (card.faction === main ? 1 : 0.85);
      items.push({ id: card.id, value, bucket: bucketOf(card.cost) });
    }
  }
  items.sort((a, b) => b.value - a.value);
  const deck = [];
  const filled = [0, 0, 0, 0];
  // prima rispettando la curva, poi con le migliori rimaste
  for (const item of items) {
    if (deck.length >= deckSize) break;
    if (filled[item.bucket] < curveTarget[item.bucket]) { deck.push(item.id); filled[item.bucket]++; item.used = true; }
  }
  for (const item of items) {
    if (deck.length >= deckSize) break;
    if (!item.used) { deck.push(item.id); item.used = true; }
  }
  return deck.sort((a, b) => (byId.get(a).cost - byId.get(b).cost) || a - b);
}

// Analisi di un mazzo: curva, tipi di carte e consigli.
export function analyzeDeck(deck) {
  const list = deck.map(id => byId.get(id)).filter(Boolean);
  const curve = [0, 0, 0, 0];
  for (const c of list) curve[bucketOf(c.cost)]++;
  const creatures = list.filter(c => c.type === "Creatura").length;
  const average = list.length ? list.reduce((s, c) => s + c.cost, 0) / list.length : 0;
  const tips = [];
  if (list.length && curve[0] < 6) tips.push("Poche carte economiche: rischi di non giocare nulla nei primi turni.");
  if (curve[3] > 6) tips.push("Molte carte da 7 Essenza o più: arriveranno tardi in partita.");
  if (list.length && creatures < 12) tips.push("Poche creature: fai fatica a controllare il tavolo.");
  if (list.length && !list.some(c => /Provocazione/.test(c.text ?? ""))) tips.push("Nessuna carta con Provocazione per proteggere il tuo eroe.");
  if (!tips.length && list.length) tips.push("Mazzo equilibrato: buona curva e abbastanza creature.");
  return { curve, creatures, spells: list.length - creatures, average, tips };
}
