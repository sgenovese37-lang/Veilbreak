// Mazzi predefiniti da 30 carte, uno per fazione (al massimo 3 copie, 1 per le Leggendarie).
// Sono il mazzo del computer e il punto di partenza del giocatore. Composti con tools/cerca_mazzi.mjs
// (partite Difficile contro Difficile) e verificati con partite nuove: vedi BILANCIAMENTO.md.
// Una fazione senza voce qui usa le sue carte del catalogo.
export const starterDecks = {
  "Corte di Hollow": [1, 2, 2, 3, 3, 3, 4, 4, 5, 6, 6, 7, 7, 7, 8, 8, 9, 9, 9, 10, 10, 11, 12, 13, 13, 13, 14, 14, 14, 15],
  "Patto Neon": [16, 17, 17, 17, 18, 18, 18, 19, 19, 20, 20, 20, 21, 22, 23, 23, 23, 24, 24, 24, 25, 25, 25, 26, 26, 26, 27, 29, 30, 30],
  "Senza Santi": [31, 32, 32, 32, 33, 33, 34, 34, 34, 35, 36, 36, 36, 37, 37, 37, 38, 38, 38, 39, 39, 40, 41, 41, 42, 43, 43, 43, 44, 44],
  "Sottocittà": [46, 47, 47, 48, 48, 49, 49, 49, 50, 50, 50, 51, 51, 51, 52, 53, 53, 54, 54, 55, 55, 55, 56, 57, 57, 57, 58, 58, 58, 60],
};
