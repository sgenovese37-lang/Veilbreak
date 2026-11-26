// Tipi di creatura (fase 5): ogni creatura può avere un tipo, scritto sulla carta («Creatura · Non Morto»),
// visibile nell'anteprima e usato dal filtro della Collezione e dalle carte che premiano un tipo.
export const tribes = ["Umano", "Non Morto", "Spettro", "Bestia", "Costrutto", "Demone", "Aberrazione", "Annegato"];

// id della carta → tipo. Le creature senza voce non hanno tipo.
export const tribeById = {
  // Corte di Hollow
  1: "Spettro", 2: "Demone", 3: "Umano", 4: "Umano", 5: "Spettro", 8: "Bestia", 10: "Demone", 11: "Umano", 13: "Spettro",
  61: "Spettro", 62: "Non Morto", 64: "Umano", 68: "Non Morto",
  // Patto Neon
  18: "Demone", 20: "Umano", 24: "Spettro", 26: "Costrutto", 28: "Demone", 29: "Costrutto",
  69: "Spettro", 71: "Umano", 72: "Spettro", 75: "Demone",
  // Senza Santi
  31: "Umano", 32: "Non Morto", 34: "Umano", 37: "Umano", 41: "Umano", 42: "Spettro", 45: "Non Morto",
  76: "Umano", 77: "Spettro", 80: "Non Morto", 82: "Non Morto", 83: "Non Morto",
  // Sottocittà
  46: "Aberrazione", 47: "Bestia", 48: "Bestia", 49: "Costrutto", 51: "Aberrazione", 52: "Umano", 54: "Costrutto",
  56: "Bestia", 57: "Spettro", 58: "Demone", 59: "Bestia", 60: "Aberrazione",
  85: "Aberrazione", 86: "Non Morto", 88: "Aberrazione", 89: "Umano", 90: "Aberrazione",
};

export const tribeOf = card => (card && card.type === "Creatura" ? card.tribe ?? tribeById[card.id] ?? null : null);
