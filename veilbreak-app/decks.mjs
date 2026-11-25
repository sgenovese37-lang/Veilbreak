// Mazzi predefiniti da 30 carte, uno per fazione (al massimo 3 copie, 1 per le Leggendarie), con le carte del secondo set.
// Sono il mazzo del computer e il punto di partenza del giocatore. Composti con tools/cerca_mazzi.mjs
// (partite Difficile contro Difficile) e verificati con partite nuove: vedi BILANCIAMENTO.md.
// Una fazione senza voce qui usa le sue carte del catalogo.
export const starterDecks = {
  "Corte di Hollow": [1, 2, 3, 3, 3, 4, 6, 7, 9, 9, 9, 10, 13, 13, 14, 14, 61, 62, 63, 63, 64, 64, 64, 65, 65, 66, 66, 66, 67, 68],
  "Patto Neon": [16, 17, 17, 18, 18, 18, 19, 19, 20, 20, 23, 24, 25, 25, 26, 26, 28, 28, 29, 29, 30, 69, 70, 70, 71, 72, 73, 73, 74, 75],
  "Senza Santi": [32, 32, 32, 33, 33, 34, 34, 36, 36, 37, 39, 41, 43, 43, 76, 76, 77, 77, 77, 78, 78, 79, 79, 80, 80, 81, 81, 82, 82, 83],
  "Sottocittà": [46, 47, 47, 48, 48, 49, 49, 49, 50, 50, 51, 51, 53, 55, 55, 55, 57, 57, 58, 84, 84, 85, 86, 86, 87, 87, 88, 89, 89, 90],
};
