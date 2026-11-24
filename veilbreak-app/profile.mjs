// Profilo del giocatore: Schegge (valuta di gioco), collezione, buste, titoli e statistiche.
// Si salva nel browser. Senza memoria locale (per esempio nei test) resta in memoria.
import { cards } from "./cards.mjs";
import { starterDecks } from "./decks.mjs";

const storageKey = "veilbreak-profile";
export const packPrice = 100;
export const packSize = 5;
export const rarityWeights = { Common: 50, Uncommon: 28, Rare: 15, Epic: 5, Legendary: 2 };
export const duplicateValue = { Common: 5, Uncommon: 10, Rare: 25, Epic: 50, Legendary: 100 };
export const matchRewards = { Facile: 15, Normale: 25, Difficile: 40, sconfitta: 5 };
export const titles = {
  "primo-binder": { name: "Primo Binder", text: "Hai completato il tutorial." },
  "custode-del-velo": { name: "Custode del Velo", text: "Hai completato la modalità Storia." },
  "collezionista": { name: "Collezionista della Notte", text: "Possiedi tutte le copie giocabili di ogni carta." },
};

const byId = new Map(cards.map(card => [card.id, card]));
const copyLimit = card => card.rarity === "Legendary" ? 1 : 2;
let memory = null;

function storage() {
  try {
    if (typeof localStorage !== "undefined") return localStorage;
  } catch { /* memoria locale bloccata */ }
  return null;
}

function blank() {
  return { version: 1, shards: 0, packs: 1, extra: {}, titles: [], history: [], stats: { played: 0, won: 0 }, rewardsSeen: {} };
}

export function loadProfile() {
  if (memory) return memory;
  let saved = null;
  try { saved = JSON.parse(storage()?.getItem(storageKey) ?? "null"); } catch { saved = null; }
  memory = { ...blank(), ...(saved && typeof saved === "object" ? saved : {}) };
  return memory;
}

export function saveProfile(profile = loadProfile()) {
  memory = profile;
  try { storage()?.setItem(storageKey, JSON.stringify(profile)); return true; } catch { return false; }
}

export function resetProfileForTests() { memory = null; }

// Ogni carta del catalogo, comprese quelle di fazioni aggiunte in futuro, parte con una copia;
// le carte doppie dei mazzi predefiniti partono con due copie, così il mazzo predefinito è sempre tuo.
const starterCopies = new Map();
for (const deck of Object.values(starterDecks)) {
  const counts = new Map();
  for (const id of deck) counts.set(id, (counts.get(id) ?? 0) + 1);
  for (const [id, n] of counts) starterCopies.set(id, Math.max(starterCopies.get(id) ?? 1, n));
}
export const startingCopies = id => starterCopies.get(id) ?? 1;

export function owned(id, profile = loadProfile()) {
  const card = byId.get(id);
  if (!card) return 0;
  return Math.min(copyLimit(card), startingCopies(id) + (profile.extra[id] ?? 0));
}

export function addShards(amount, reason, profile = loadProfile()) {
  profile.shards += amount;
  note(profile, `+${amount} Schegge · ${reason}`);
  saveProfile(profile);
}

export function addPacks(amount, reason, profile = loadProfile()) {
  profile.packs += amount;
  note(profile, `+${amount} ${amount === 1 ? "busta" : "buste"} · ${reason}`);
  saveProfile(profile);
}

export function grantTitle(id, profile = loadProfile()) {
  if (!titles[id] || profile.titles.includes(id)) return false;
  profile.titles.push(id);
  note(profile, `Titolo sbloccato · ${titles[id].name}`);
  saveProfile(profile);
  return true;
}

function note(profile, text) {
  profile.history.unshift(text);
  profile.history.length = Math.min(profile.history.length, 30);
}

export function buyPack(profile = loadProfile()) {
  if (profile.shards < packPrice) return false;
  profile.shards -= packPrice;
  profile.packs++;
  saveProfile(profile);
  return true;
}

function pickRarity(random) {
  const total = Object.values(rarityWeights).reduce((a, b) => a + b, 0);
  let roll = random() * total;
  for (const [rarity, weight] of Object.entries(rarityWeights)) {
    if ((roll -= weight) < 0) return rarity;
  }
  return "Common";
}

// Apre una busta: 5 carte. Le copie oltre il massimo giocabile diventano Schegge.
export function openPack(random = Math.random, profile = loadProfile()) {
  if (profile.packs < 1) return null;
  profile.packs--;
  const results = [];
  for (let i = 0; i < packSize; i++) {
    const rarity = pickRarity(random);
    const pool = cards.filter(card => card.rarity === rarity);
    const card = pool[Math.floor(random() * pool.length)] ?? cards[0];
    if (owned(card.id, profile) < copyLimit(card)) {
      profile.extra[card.id] = (profile.extra[card.id] ?? 0) + 1;
      results.push({ id: card.id, newCopy: true, shards: 0 });
    } else {
      const value = duplicateValue[card.rarity] ?? 5;
      profile.shards += value;
      results.push({ id: card.id, newCopy: false, shards: value });
    }
  }
  if (cards.every(card => owned(card.id, profile) >= copyLimit(card))) grantTitle("collezionista", profile);
  note(profile, "Busta aperta");
  saveProfile(profile);
  return results;
}

export function collectionProgress(profile = loadProfile()) {
  const have = cards.reduce((sum, card) => sum + owned(card.id, profile), 0);
  const max = cards.reduce((sum, card) => sum + copyLimit(card), 0);
  return { have, max };
}

// Ricompensa di fine partita contro il computer (anche in Storia).
export function rewardMatch(won, level, profile = loadProfile()) {
  const amount = won ? matchRewards[level] ?? matchRewards.Normale : matchRewards.sconfitta;
  profile.stats.played++;
  if (won) profile.stats.won++;
  addShards(amount, won ? `vittoria (${level})` : "partita giocata", profile);
  return amount;
}

// Premi assegnati una sola volta per chiave (tutorial, capitoli della Storia).
export function rewardOnce(key, apply, profile = loadProfile()) {
  if (profile.rewardsSeen[key]) return false;
  profile.rewardsSeen[key] = true;
  apply(profile);
  saveProfile(profile);
  return true;
}
