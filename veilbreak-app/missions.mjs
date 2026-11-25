// Missioni giornaliere e settimanali. Ogni giorno e ogni settimana ne vengono scelte tre,
// sempre le stesse per tutti nello stesso periodo. Valgono le partite contro il computer e la Storia.
import { factions } from "./game.mjs";
import { loadProfile, saveProfile, addShards, addPacks } from "./profile.mjs";
import { t } from "./i18n.mjs";

const perPeriod = 3;

const dailyPool = [
  { id: "d-vinci", text: "Vinci 1 partita", goal: 1, shards: 50, count: e => e.won ? 1 : 0 },
  { id: "d-gioca", text: "Gioca 2 partite", goal: 2, shards: 40, count: () => 1 },
  { id: "d-carte", text: "Gioca 12 carte", goal: 12, shards: 40, count: e => e.stats.cards },
  { id: "d-incantesimi", text: "Lancia 4 incantesimi", goal: 4, shards: 40, count: e => e.stats.spells },
  { id: "d-creature", text: "Evoca 8 creature", goal: 8, shards: 40, count: e => e.stats.creatures },
  { id: "d-danni", text: "Infliggi 25 danni all’eroe avversario", goal: 25, shards: 50, count: e => e.stats.heroDamage },
  { id: "d-uccisioni", text: "Distruggi 6 creature nemiche", goal: 6, shards: 50, count: e => e.stats.kills },
  { id: "d-poteri", text: "Usa il potere dell’eroe 4 volte", goal: 4, shards: 40, count: e => e.stats.powers },
  ...factions.map((faction, i) => ({
    id: `d-fazione-${i}`, text: "Vinci una partita con {faction}", vars: { faction }, goal: 1, shards: 60,
    count: e => e.won && e.faction === faction ? 1 : 0,
  })),
];

const weeklyPool = [
  { id: "w-vittorie", text: "Vinci 6 partite", goal: 6, shards: 150, packs: 1, count: e => e.won ? 1 : 0 },
  { id: "w-difficile", text: "Vinci 2 partite a Difficile", goal: 2, shards: 250, count: e => e.won && e.level === "Difficile" ? 1 : 0 },
  { id: "w-storia", text: "Supera 2 capitoli della Storia", goal: 2, shards: 150, packs: 1, count: e => e.chapterCleared ? 1 : 0 },
  { id: "w-carte", text: "Gioca 60 carte", goal: 60, shards: 150, count: e => e.stats.cards },
  { id: "w-uccisioni", text: "Distruggi 30 creature nemiche", goal: 30, shards: 150, count: e => e.stats.kills },
  { id: "w-fazioni", text: "Vinci con 3 fazioni diverse", goal: 3, shards: 200, packs: 1, distinct: e => e.won ? e.faction : null },
  { id: "w-danni", text: "Infliggi 120 danni agli eroi avversari", goal: 120, shards: 150, count: e => e.stats.heroDamage },
];

function hash(text) {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

function pick(pool, key) {
  return [...pool].sort((a, b) => hash(key + a.id) - hash(key + b.id)).slice(0, perPeriod);
}

const pad = n => String(n).padStart(2, "0");
export const dayKey = (date = new Date()) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
export function weekKey(date = new Date()) {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - ((date.getDay() + 6) % 7));
  return `settimana-${dayKey(monday)}`;
}

function period(profile, slot, key) {
  profile.missions ??= {};
  if (profile.missions[slot]?.key !== key) profile.missions[slot] = { key, progress: {}, claimed: [] };
  return profile.missions[slot];
}

export function currentMissions(date = new Date(), profile = loadProfile()) {
  const daily = period(profile, "daily", dayKey(date));
  const weekly = period(profile, "weekly", weekKey(date));
  const describe = (state, list) => list.map(m => {
    const raw = state.progress[m.id] ?? 0;
    const value = Array.isArray(raw) ? raw.length : raw;
    return { ...m, value: Math.min(value, m.goal), done: value >= m.goal, claimed: state.claimed.includes(m.id) };
  });
  return {
    daily: describe(daily, pick(dailyPool, daily.key)),
    weekly: describe(weekly, pick(weeklyPool, weekly.key)),
  };
}

// event: { won, level, faction, stats, chapterCleared }
export function recordEvent(event, date = new Date(), profile = loadProfile()) {
  const full = { won: false, stats: { cards: 0, creatures: 0, spells: 0, heroDamage: 0, kills: 0, powers: 0 }, ...event };
  for (const [slot, key, pool] of [["daily", dayKey(date), dailyPool], ["weekly", weekKey(date), weeklyPool]]) {
    const state = period(profile, slot, key);
    for (const mission of pick(pool, key)) {
      if (mission.distinct) {
        const value = mission.distinct(full);
        const seen = state.progress[mission.id] ?? [];
        if (value && !seen.includes(value)) state.progress[mission.id] = [...seen, value];
      } else {
        state.progress[mission.id] = (state.progress[mission.id] ?? 0) + mission.count(full);
      }
    }
  }
  saveProfile(profile);
}

export function claimMission(id, date = new Date(), profile = loadProfile()) {
  const all = currentMissions(date, profile);
  for (const [slot, list] of [["daily", all.daily], ["weekly", all.weekly]]) {
    const mission = list.find(m => m.id === id);
    if (!mission || !mission.done || mission.claimed) continue;
    profile.missions[slot].claimed.push(id);
    const reason = t("missione «{name}»", { name: t(mission.text, mission.vars) });
    addShards(mission.shards, reason, profile);
    if (mission.packs) addPacks(mission.packs, reason, profile);
    return mission;
  }
  return null;
}
