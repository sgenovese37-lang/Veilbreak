export const heroPowerCost = 1;

export const heroes = {
  "Corte di Hollow": {
    name: "Prefetta Ada Vesper",
    table: "Sala del Consiglio",
    theme: "hollow",
    power: {
      name: "Decreto di Protezione",
      text: "Una creatura alleata ottiene +1 Difesa fino all’inizio del tuo prossimo turno.",
      target: "ally",
      defense: 1,
    },
  },
  "Patto Neon": {
    name: "Iona Volt, la Frequenza",
    table: "Centrale delle Frequenze",
    theme: "neon",
    power: {
      name: "Scarica Mirata",
      text: "Infliggi 1 danno a una creatura nemica.",
      target: "enemy",
      damage: 1,
    },
  },
  "Senza Santi": {
    name: "Elena Voss, il Contratto",
    table: "Cappella dell’Aureola Spezzata",
    theme: "saints",
    power: {
      name: "Liturgia del Sangue",
      text: "Cura 2 punti vita al tuo eroe.",
      heal: 2,
    },
  },
  "Sottocittà": {
    name: "Mara Sottorotaia",
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

export function heroFor(faction) {
  return Object.hasOwn(heroes, faction) ? heroes[faction] : null;
}
