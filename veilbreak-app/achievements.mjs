// Obiettivi: traguardi permanenti (non si rinnovano) con un premio da riscattare.
// Contano le partite contro il computer: normali, Storia, Discesa nel Velo e Rissa della settimana.
import { loadProfile, saveProfile, addShards, addPacks } from "./profile.mjs";
import { t } from "./i18n.mjs";

export const achievements = [
  { id: "a-prima", text: "Prima vittoria", goal: 1, shards: 50, metric: "won" },
  { id: "a-veterano", text: "Vinci 25 partite", goal: 25, shards: 300, packs: 1, metric: "won" },
  { id: "a-cento", text: "Gioca 100 partite", goal: 100, shards: 500, metric: "played" },
  { id: "a-carnefice", text: "Distruggi 200 creature nemiche", goal: 200, shards: 300, metric: "kills" },
  { id: "a-martello", text: "Infliggi 1000 danni agli eroi avversari", goal: 1000, shards: 300, metric: "heroDamage" },
  { id: "a-arcano", text: "Lancia 150 incantesimi", goal: 150, shards: 250, metric: "spells" },
  { id: "a-bandiere", text: "Vinci con tutte e 4 le fazioni", goal: 4, shards: 200, packs: 1, metric: "factions" },
  { id: "a-difficile", text: "Vinci 10 partite a Difficile", goal: 10, shards: 400, metric: "hardWins" },
  { id: "a-storia", text: "Supera 8 capitoli della Storia", goal: 8, shards: 300, packs: 1, metric: "chapters" },
  { id: "a-discesa", text: "Arriva a 5 vittorie in una Discesa nel Velo", goal: 5, shards: 300, metric: "descentBest" },
  { id: "a-abisso", text: "Arriva a 10 vittorie in una Discesa nel Velo", goal: 10, shards: 500, packs: 2, metric: "descentBest" },
  { id: "a-rissa", text: "Vinci 5 Risse della settimana", goal: 5, shards: 200, packs: 1, metric: "brawlWins" },
];

function life(profile) {
  profile.lifetime ??= { won: 0, played: 0, kills: 0, heroDamage: 0, spells: 0, factions: [], hardWins: 0, chapters: 0, descentBest: 0, brawlWins: 0 };
  profile.achievementsClaimed ??= [];
  return profile.lifetime;
}

const valueOf = (lt, metric) => metric === "factions" ? lt.factions.length : lt[metric] ?? 0;

// event: { won, level, faction, stats, chapterCleared, descentWins, brawl }
export function recordAchievements(event, profile = loadProfile()) {
  const lt = life(profile);
  const stats = event.stats ?? {};
  lt.played++;
  if (event.won) {
    lt.won++;
    if (event.level === "Difficile") lt.hardWins++;
    if (event.faction && !lt.factions.includes(event.faction)) lt.factions.push(event.faction);
    if (event.brawl) lt.brawlWins++;
  }
  lt.kills += stats.kills ?? 0;
  lt.heroDamage += stats.heroDamage ?? 0;
  lt.spells += stats.spells ?? 0;
  if (event.chapterCleared) lt.chapters++;
  if (event.descentWins) lt.descentBest = Math.max(lt.descentBest, event.descentWins);
  saveProfile(profile);
}

export function currentAchievements(profile = loadProfile()) {
  const lt = life(profile);
  return achievements.map(a => {
    const value = valueOf(lt, a.metric);
    return { ...a, value: Math.min(value, a.goal), done: value >= a.goal, claimed: profile.achievementsClaimed.includes(a.id) };
  });
}

export function claimAchievement(id, profile = loadProfile()) {
  const a = currentAchievements(profile).find(x => x.id === id);
  if (!a || !a.done || a.claimed) return null;
  profile.achievementsClaimed.push(id);
  const reason = t("obiettivo «{name}»", { name: t(a.text) });
  addShards(a.shards, reason, profile);
  if (a.packs) addPacks(a.packs, reason, profile);
  return a;
}

// Obiettivi pronti da riscattare (per il segnale sul pulsante Missioni)
export const achievementsReady = (profile = loadProfile()) => currentAchievements(profile).filter(a => a.done && !a.claimed).length;
