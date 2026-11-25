// Discesa nel Velo: una serie di partite di fila contro avversari sempre più forti.
// Si parte dal mazzo predefinito della fazione scelta; dopo ogni vittoria si sceglie 1 carta su 3
// da aggiungere al mazzo. Tre sconfitte e la discesa finisce: il premio dipende dalle vittorie.
import { cards } from "./cards.mjs";
import { factions, defaultDeck } from "./game.mjs";
import { loadProfile, saveProfile, addShards, addPacks } from "./profile.mjs";
import { t } from "./i18n.mjs";

export const maxLosses = 3;
const byId = new Map(cards.map(c => [c.id, c]));

export const descentState = (profile = loadProfile()) => profile.descent ?? null;
export const descentBest = (profile = loadProfile()) => profile.descentBest ?? 0;

export function startDescent(faction, profile = loadProfile()) {
  profile.descent = { faction, deck: defaultDeck(faction), wins: 0, losses: 0, choices: null, rival: null };
  nextRival(profile.descent);
  saveProfile(profile);
  return profile.descent;
}

// Avversario della prossima partita: più vittorie, più difficile e con più punti vita.
function nextRival(run, random = Math.random) {
  const others = factions.filter(f => f !== run.faction);
  const faction = (random() < .75 ? others : factions)[Math.floor(random() * (random() < .75 ? others : factions).length)] ?? others[0];
  run.rival = {
    faction,
    level: run.wins < 2 ? "Facile" : run.wins < 5 ? "Normale" : "Difficile",
    life: Math.min(40, 20 + run.wins * 2),
  };
}

// Tre carte tra cui scegliere: della fazione della discesa (e qualche volta di altre), più rare andando avanti.
function offer(run, random = Math.random) {
  const rare = run.wins >= 4;
  const pool = cards.filter(c => (c.faction === run.faction || random() < .25) && (rare || c.rarity !== "Legendary"));
  const picks = [];
  while (picks.length < 3 && pool.length) {
    const c = pool.splice(Math.floor(random() * pool.length), 1)[0];
    if (c.rarity === "Legendary" && run.deck.includes(c.id)) continue;
    picks.push(c.id);
  }
  return picks;
}

// Esito di una partita della discesa. Restituisce { ended, reward } quando la discesa finisce.
export function recordDescent(won, profile = loadProfile()) {
  const run = profile.descent;
  if (!run) return null;
  if (won) {
    run.wins++;
    run.choices = offer(run);
  } else {
    run.losses++;
  }
  profile.descentBest = Math.max(profile.descentBest ?? 0, run.wins);
  if (run.losses >= maxLosses) {
    const reward = { shards: 20 + run.wins * 25, packs: run.wins >= 10 ? 2 : run.wins >= 5 ? 1 : 0, wins: run.wins };
    profile.descent = null;
    const reason = t("Discesa nel Velo ({n} vittorie)", { n: reward.wins });
    addShards(reward.shards, reason, profile);
    if (reward.packs) addPacks(reward.packs, reason, profile);
    saveProfile(profile);
    return { ended: true, reward };
  }
  nextRival(run);
  saveProfile(profile);
  return { ended: false };
}

export function pickDescentCard(id, profile = loadProfile()) {
  const run = profile.descent;
  if (!run?.choices?.includes(id)) return false;
  run.deck.push(id);
  run.choices = null;
  saveProfile(profile);
  return true;
}

export function skipDescentCard(profile = loadProfile()) {
  if (profile.descent) { profile.descent.choices = null; saveProfile(profile); }
}

export function abandonDescent(profile = loadProfile()) {
  if (!profile.descent) return null;
  const wins = profile.descent.wins;
  profile.descent.losses = maxLosses - 1;
  return recordDescent(false, profile) ?? { ended: true, reward: { wins } };
}

export const cardOfDescent = id => byId.get(id);
