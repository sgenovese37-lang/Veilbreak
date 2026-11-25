// Scene della Storia «La Notte del Velo Spezzato»: dialoghi tra i personaggi prima di ogni capitolo
// e dopo la vittoria. "tu" è il Binder del giocatore (usa il ritratto dell'eroe scelto).
// I ritratti dei personaggi delle carte usano l'illustrazione della carta, inquadrata sul volto.
export const cast = {
  narratore: { name: "Narratore" },
  tu: { name: "Tu" },
  mara: { name: "Mara Sottorotaia", portrait: "assets/eroi/ritratti/mara-sottorotaia.webp" },
  dex: { name: "Dex Halogen", portrait: "assets/eroi/ritratti/dex-halogen.webp" },
  ottavia: { name: "Suor Ottavia", portrait: "assets/eroi/ritratti/ottavia.webp" },
  orfeo: { name: "Orfeo Grimm", portrait: "assets/eroi/ritratti/orfeo-grimm.webp" },
  iona: { name: "Iona Volt", portrait: "assets/eroi/ritratti/iona-volt.webp" },
  ines: { name: "Nonna Ines", portrait: "assets/eroi/ritratti/nonna-ines.webp" },
  elena: { name: "Elena Voss", portrait: "assets/eroi/ritratti/elena-voss.webp" },
  ada: { name: "Prefetta Ada Vesper", portrait: "assets/eroi/ritratti/ada-vesper.webp" },
  locatore: { name: "Il Locatore", card: 2 },
  re: { name: "Il Re della Fogna", card: 59 },
  sindaco: { name: "Il Sindaco", card: 1 },
  venditrice: { name: "La Venditrice", card: 28 },
};

// Una scena per capitolo (stesso ordine di story.mjs). enemyHero: eroe che guida l'avversario.
export const scenes = [
  { // 1 · Lampioni spenti
    enemyHero: null,
    before: [
      ["narratore", "Mezzanotte. Su Hollow Street i lampioni si spengono uno dopo l'altro, come candele soffiate da qualcuno che non si vede."],
      ["tu", "Il Velo trema. Lo sento nei denti."],
      ["mara", "Lo senti perché sei nuova. Noi della Sottocittà lo sentiamo da settimane, sotto le rotaie."],
      ["tu", "Chi sei?"],
      ["mara", "Mara. E questo è il mio quartiere, Binder. Se vuoi passare, dimostra che sai tenere a bada quello che esce dai tombini."],
    ],
    after: [
      ["mara", "Non male, per una che ha ancora il marchio fresco sulla mano."],
      ["mara", "Tieni. L'ho trovato in bocca a una delle mie bestie. Un biglietto della metro… con una data che non esiste."],
      ["tu", "Il 31 novembre. Chi stampa un biglietto per un giorno che non c'è?"],
      ["mara", "Qualcuno che vende passaggi attraverso il Velo. Cerca al mercato delle frequenze."],
    ],
  },
  { // 2 · Il mercato delle frequenze
    enemyHero: "dex-halogen",
    before: [
      ["narratore", "Il mercato notturno ronza come un alveare di neon. Le insegne sussurrano offerte a chi passa."],
      ["venditrice", "Un patto, dolcezza? Uno piccolo. Rate comode. Interessi… eterni."],
      ["tu", "Cerco chi ha venduto questo biglietto."],
      ["dex", "Oh-oh. Domande. Le domande al mercato si pagano, sai? E tu sembri senza credito."],
      ["dex", "Dex Halogen, il Glitch. Se mi batti, forse ti dico chi compra le crepe del Velo. Se perdi, il tuo nome finisce in vendita."],
    ],
    after: [
      ["dex", "Va bene, va bene! Tregua. Il segnale mi gira ancora in testa."],
      ["dex", "La ricevuta del biglietto. Guarda chi ha pagato: «Ufficio del Sindaco»."],
      ["tu", "Il Sindaco di Hollow Street compra crepe nel Velo?"],
      ["dex", "Il Sindaco compra tutto. E sai una cosa? Mi sta antipatico. Se ti serve un hacker, chiamami."],
    ],
  },
  { // 3 · Le campane mute
    enemyHero: "ottavia",
    before: [
      ["narratore", "La Cappella dell'Aureola Spezzata. Le campane sono mute da anni, ma qualcuno continua a lucidarle."],
      ["ottavia", "I registri dei morti non sono per i vivi. Torna da dove sei venuta."],
      ["tu", "Il Sindaco ha comprato una crepa nel Velo. Nei vostri registri c'è la verità."],
      ["ottavia", "Nei nostri registri c'è il dolore di tutta la città. Se vuoi leggerlo, dovrai prima sopportarlo."],
    ],
    after: [
      ["ottavia", "Hai combattuto senza crudeltà. Pochi Binder lo fanno."],
      ["narratore", "Sulle pagine ingiallite, lo stesso nome ripetuto mille volte: Elena Voss. Accanto, una firma che non è la sua."],
      ["ottavia", "Elena era la nostra guida. Ha firmato un patto per riportare indietro i fedeli… o qualcuno ha firmato per lei."],
      ["ottavia", "Verrò con te, Binder. Le campane suoneranno di nuovo, quando sapremo chi tiene la penna."],
    ],
  },
  { // 4 · Il Consiglio di mezzanotte
    enemyHero: "orfeo-grimm",
    before: [
      ["narratore", "La Corte di Hollow tiene udienza a mezzanotte. I fantasmi votano per alzata di mano e nessuno ricorda l'ultima volta che qualcuno ha votato contro."],
      ["orfeo", "L'udienza è privata. Il suo nome non risulta nel registro degli invitati."],
      ["tu", "Voglio sapere chi ha firmato al posto di Elena Voss."],
      ["locatore", "Che domanda impertinente. Cancelliere, la accompagni fuori. Con tutti gli onori."],
      ["orfeo", "Con rammarico, signora. Il protocollo è il protocollo."],
    ],
    after: [
      ["orfeo", "Il protocollo… prevede anche questo. La sconfitta del Cancelliere sospende l'udienza."],
      ["locatore", "Ah, che seccatura. Il contratto è valido, cara. Firmato e timbrato. Chieda al capolinea, se proprio insiste."],
      ["orfeo", "(sottovoce) Il capolinea è la stazione abbandonata. Io servo la legge, non il Sindaco. Se ne avrà bisogno, il mio sigillo è suo."],
    ],
  },
  { // 5 · L'ultimo treno
    enemyHero: null,
    before: [
      ["narratore", "La stazione abbandonata. Un treno senza conducente arriva in perfetto orario, con i finestrini pieni di volti che non battono le palpebre."],
      ["iona", "Sei tu il carico di stanotte? Strano. Il manifesto diceva «un'anima giovane, ancora calda»."],
      ["tu", "Iona Volt. Lavori per il Sindaco?"],
      ["iona", "Lavoro per chi paga la corrente. E il Sindaco paga molto bene. Sali, Binder. Il viaggio è gratis. Il ritorno no."],
    ],
    after: [
      ["iona", "Hai fatto saltare l'impianto. Il Sindaco non sarà contento."],
      ["narratore", "Le carrozze si fermano in una galleria che non compare su nessuna mappa. In fondo, una grata coronata."],
      ["iona", "Laggiù comanda il Re della Fogna. Lui sa dove passa ogni crepa. Ma non dice niente per niente."],
    ],
  },
  { // 6 · Il trono della fogna
    enemyHero: "nonna-ines",
    before: [
      ["narratore", "Il trono è fatto di rotaie piegate e tombini. Intorno, una corte di gatti spirituali che fissano senza sbattere le palpebre."],
      ["re", "Una Binder nel mio regno. Che cosa porti al Re di ciò che la città ha dimenticato?"],
      ["tu", "Domande. Chi ha aperto la crepa nel Velo?"],
      ["ines", "Il Re non risponde alle domande, piccola. Risponde ai tributi. E il tributo, stanotte, è battere questa vecchia."],
      ["ines", "Non fare quella faccia. Sotto queste gallerie ho cresciuto più mostri di quanti tu ne abbia mai visti."],
    ],
    after: [
      ["ines", "Eh, eh. Hai mani buone. Mi ricordi me, prima che la città mi seppellisse."],
      ["re", "Il tributo è pagato. Ascolta, allora: la crepa l'ha aperta chi governa sopra di noi."],
      ["ines", "Il Sindaco, sì. Ma prima di lui c'è il patto di Elena. Va' alla chiesa senza santi. E portami con te: i miei cunicoli arrivano ovunque."],
    ],
  },
  { // 7 · La chiesa senza santi
    enemyHero: null,
    before: [
      ["narratore", "Sull'altare, Elena Voss. Le candele bruciano al contrario, e la cera risale verso le fiamme."],
      ["elena", "Non dovevi venire. Il patto mi obbliga a difendere chi lo ha scritto."],
      ["ottavia", "Elena! Siamo noi. Siamo venuti a liberarti."],
      ["elena", "Allora spezzate la mia difesa. È l'unico modo per bruciare il contratto. Non trattenetevi… io non posso farlo."],
    ],
    after: [
      ["narratore", "Il contratto prende fuoco. Le parole si staccano dalla pergamena come insetti di cenere."],
      ["elena", "Sono… libera. Grazie, Binder."],
      ["elena", "Ecco l'ultima pagina. Il sigillo è quello della Corte. Il Sindaco ha firmato con il mio nome per aprire la crepa e vendere la città, un isolato alla volta."],
      ["elena", "Il Sindaco tiene la penna. Spezzala, e il Velo si richiuderà."],
    ],
  },
  { // 8 · Il Sindaco di Hollow Street
    enemyHero: null,
    before: [
      ["narratore", "Il Municipio è pieno di elettori che non respirano. Al centro della sala, il Sindaco firma documenti con una penna che gocciola notte."],
      ["sindaco", "La nostra piccola Binder. Hai fatto tanta strada per una città che non ti ringrazierà."],
      ["tu", "Hai venduto Hollow Street. Hai rubato il nome di Elena."],
      ["sindaco", "Ho amministrato. È diverso. Prefetta, si occupi della signora."],
      ["ada", "Con piacere, signor Sindaco. Il decreto è già firmato: questa notte la Binder decade dalla sua carica. E dalla sua vita."],
    ],
    after: [
      ["ada", "Impossibile… il decreto era perfetto."],
      ["sindaco", "No. No! La penna… non la penna!"],
      ["narratore", "La penna si spezza con un suono di vetro. Il Velo si richiude come una ferita che finalmente guarisce."],
      ["mara", "Guarda. I lampioni."],
      ["narratore", "All'alba Hollow Street riaccende i lampioni, uno dopo l'altro. E da qualche parte, sotto la città, qualcosa aspetta la prossima notte."],
    ],
  },
];
