// Mazzi predefiniti da 15 carte, uno per fazione (al massimo 2 copie, 1 per le Leggendarie).
// Sono il mazzo del computer e il punto di partenza del giocatore. Composti con l'analisi di
// tools/bilanciamento.mjs per avvicinare tutti gli scontri al 50%; vedi BILANCIAMENTO.md.
// Una fazione senza voce qui usa le sue prime 15 carte del catalogo.
export const starterDecks = {
  // senza Il Locatore, Telecamera di Sicurezza, Ordine del Sindaco e Ultima Legge;
  // doppi Specchio Incrinato, Luce Tremolante, Contratto Minore e Archivio Segreto
  "Corte di Hollow": [1, 3, 4, 5, 6, 6, 8, 9, 9, 10, 10, 11, 13, 14, 14],
  // senza L’Ultimo Treno, Protocollo Blackout, Glitch di Evocazione, Neon Succube e Schermo Rotto;
  // doppi Patto di Sangue Neon, Demone dei Dati, Telefono Vincolante, ATM di Sangue e Commutatore d’Ombra
  "Patto Neon": [17, 17, 18, 18, 20, 22, 22, 23, 24, 25, 25, 26, 26, 27, 30],
  // senza Pulsante di Panico; doppio Prete Spezzato
  "Senza Santi": [31, 32, 33, 34, 36, 37, 37, 38, 39, 40, 41, 42, 43, 44, 45],
  // senza Sanguisuga dei Dati e Frammento di Veil; doppi Profeta di Strada e Maledizione Statica
  "Sottocittà": [46, 47, 48, 49, 50, 51, 52, 52, 53, 54, 55, 55, 57, 58, 59],
};
