export const heroPowerCost = 1;

export const heroes = {
  "Corte di Hollow": {
    name: "Prefetta Ada Vesper",
    portrait: "assets/eroi/ritratti/ada-vesper.webp",
    table: "Sala del Consiglio",
    theme: "hollow",
    power: {
      // Versione precedente (playtest 1): +1 Difesa fino all'inizio del prossimo turno, con
      // { target: "ally", defense: 1 }. Cambiata perché la Corte vinceva solo il 30% delle partite.
      // Playtest 2 (novembre): era +1/+1 permanente; con la Provocazione corretta e il computer più
      // aggressivo la Corte vinceva il 60% delle partite.
      name: "Decreto di Investitura",
      text: "Una creatura alleata ottiene +1 Attacco in modo permanente.",
      target: "ally",
      atk: 1,
    },
  },
  "Patto Neon": {
    name: "Iona Volt, la Frequenza",
    portrait: "assets/eroi/ritratti/iona-volt.webp",
    table: "Centrale delle Frequenze",
    theme: "neon",
    power: {
      // Playtest 2: era 1 danno; senza il difetto del Firewall Infernale il Patto Neon vinceva il 17%.
      name: "Scarica Mirata",
      text: "Infliggi 2 danni a una creatura nemica.",
      target: "enemy",
      damage: 2,
    },
  },
  "Senza Santi": {
    name: "Elena Voss, il Contratto",
    portrait: "assets/eroi/ritratti/elena-voss.webp",
    table: "Cappella dell’Aureola Spezzata",
    theme: "saints",
    power: {
      // Versione precedente: «Cura 2 punti vita al tuo eroe» ({ heal: 2 }). Con i mazzi da 30 carte
      // le partite non arrivano più all'esaurimento del mazzo e i Senza Santi vincevano meno del 20%.
      // Playtest 2: era +2 Difesa; con la Provocazione corretta i Senza Santi diventavano un muro (85% contro il Neon).
      name: "Liturgia del Sangue",
      text: "Una creatura alleata ottiene +1 Difesa in modo permanente.",
      target: "ally",
      health: 1,
    },
  },
  "Sottocittà": {
    name: "Mara Sottorotaia",
    portrait: "assets/eroi/ritratti/mara-sottorotaia.webp",
    table: "Deposito Sotto le Rotaie",
    theme: "undercity",
    power: {
      name: "Scatto dai Cunicoli",
      text: "Una creatura alleata ottiene +1 Attacco fino alla fine del turno.",
      target: "ally",
      attack: 1,
    },
  },
};

// Eroi da sbloccare nella Storia (uno per fazione): si sbloccano vincendo il capitolo indicato in story.mjs.
export const lockedHeroes = {
  "Corte di Hollow": { id: "orfeo-grimm", name: "Cancelliere Orfeo Grimm", portrait: "assets/eroi/ritratti/orfeo-grimm.webp",
    power: { name: "Sigillo d’Ufficio", text: "Evoca un Passerotto 1/1.", summon: 8 } },
  "Patto Neon": { id: "dex-halogen", name: "Dex Halogen, il Glitch", portrait: "assets/eroi/ritratti/dex-halogen.webp",
    power: { name: "Sovraccarico", text: "Infliggi 1 danno all’eroe nemico.", heroDamage: 1 } },
  "Senza Santi": { id: "ottavia", name: "Suor Ottavia delle Ceneri", portrait: "assets/eroi/ritratti/ottavia.webp",
    power: { name: "Lama Votiva", text: "Infliggi 1 danno a una creatura nemica.", target: "enemy", damage: 1 } },
  "Sottocittà": { id: "nonna-ines", name: "Nonna Ines delle Gallerie", portrait: "assets/eroi/ritratti/nonna-ines.webp",
    power: { name: "Richiamo dei Cunicoli", text: "Evoca un Frammento di Veil 1/1.", summon: 60 } },
};

// Eroi dell'Atto II della Storia. Ritratti provvisori (ritagli di illustrazioni) finché non arrivano quelli definitivi.
export const extraHeroes = [
  { faction: "Corte di Hollow", id: "vittoria-sale", name: "Notaia Vittoria Sale", portrait: "assets/eroi/ritratti/vittoria-sale.webp",
    power: { name: "Rogito Notturno", text: "Pesca 1 carta. Subisci 2 danni.", draw: 1, selfDamage: 2 } },
  { faction: "Patto Neon", id: "kira-statica", name: "Kira Statica", portrait: "assets/eroi/ritratti/kira-statica.webp",
    power: { name: "Picco di Tensione", text: "Una creatura alleata ottiene +2 Attacco fino alla fine del turno.", target: "ally", attack: 2 } },
  { faction: "Senza Santi", id: "padre-lazzaro", name: "Padre Lazzaro, il Risorto", portrait: "assets/eroi/ritratti/padre-lazzaro.webp",
    power: { name: "Seconda Veglia", text: "Cura 3 punti vita al tuo eroe.", heal: 3 } },
];
// Tutti gli eroi da sbloccare di una fazione (Atto I e Atto II)
export const lockedHeroesOf = faction => [lockedHeroes[faction], ...extraHeroes.filter(h => h.faction === faction)].filter(Boolean);

// Ogni eroe per identificativo: quelli base usano il nome della fazione, quelli da sbloccare il loro id.
const heroById = new Map();
for (const [faction, hero] of Object.entries(heroes)) heroById.set(faction, { ...hero, id: faction, faction });
for (const [faction, hero] of [...Object.entries(lockedHeroes), ...extraHeroes.map(h => [h.faction, h])]) {
  const base = heroes[faction];
  heroById.set(hero.id, { table: base.table, theme: base.theme, ...hero, faction, locked: true });
}

export const heroWithId = id => heroById.get(id) ?? null;

// heroFor accetta il nome di una fazione oppure un giocatore della partita ({ name, hero }).
export function heroFor(who) {
  if (who && typeof who === "object") {
    const chosen = who.hero && heroById.get(who.hero);
    if (chosen && chosen.faction === who.name) return chosen;
    who = who.name;
  }
  return heroById.get(who) ?? null;
}

// Eroi disponibili per una fazione: quello base e, se sbloccato, quello della Storia.
export function heroesOf(faction, unlocked = []) {
  return [heroById.get(faction), ...[...heroById.values()].filter(h => h.locked && h.faction === faction && unlocked.includes(h.id))].filter(Boolean);
}
