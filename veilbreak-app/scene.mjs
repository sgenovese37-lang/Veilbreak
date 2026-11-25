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
  // Atto II
  kira: { name: "Kira Statica", portrait: "assets/eroi/ritratti/kira-statica.webp" },
  lazzaro: { name: "Padre Lazzaro", portrait: "assets/eroi/ritratti/padre-lazzaro.webp" },
  vittoria: { name: "Notaia Vittoria Sale", portrait: "assets/eroi/ritratti/vittoria-sale.webp" },
  muffa: { name: "La Madre della Muffa", card: 88 },
  archivista: { name: "L’Archivista Senza Volto", card: 62 },
  regina: { name: "La Regina Statica", card: 75 },
  lucrezia: { name: "Santa Lucrezia", card: 83 },
  guardiano: { name: "Il Guardiano dei Binari", card: 86 },
  conservatore: { name: "Il Gran Conservatore", card: 68 },
  leviatano: { name: "Il Leviatano", card: 90 },
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
  // ---------- Atto II · La Marea sotto la Città ----------
  { // 9 · La marea nera
    enemyHero: null,
    before: [
      ["narratore", "Una settimana di lampioni accesi. Poi, una notte, i tombini cominciano a piangere acqua nera."],
      ["mara", "Binder. Sotto le rotaie c'è qualcosa che cresce. La muffa ha mangiato tre gallerie in due giorni."],
      ["tu", "Il Velo è chiuso. Da dove arriva?"],
      ["muffa", "Dal basso, piccola. Sempre dal basso. Io sono solo la prima a salire."],
    ],
    after: [
      ["mara", "Guarda qui. Un registro di pietra, sepolto nella muffa."],
      ["narratore", "Su ogni pagina lo stesso timbro: «Archivio Eterno · da conservare fino alla fine dei tempi»."],
      ["tu", "Un archivio sotto la città. Chi conserva qualcosa per sempre… di solito ha paura di perderlo."],
    ],
  },
  { // 10 · L'Archivio Eterno
    enemyHero: null,
    before: [
      ["orfeo", "L'Archivio Eterno non esiste, ufficialmente. Il che significa che esiste, e che è pericoloso."],
      ["narratore", "Scaffali che scendono per chilometri. In fondo, una figura senza volto timbra fascicoli nel silenzio."],
      ["archivista", "Pratica respinta. Pratica respinta. Visitatrice non prevista: da catalogare."],
      ["tu", "Cerco chi ha fatto salire l'acqua nera."],
    ],
    after: [
      ["archivista", "Pratica… evasa. Una sola parola è autorizzata all'uscita."],
      ["narratore", "Tra milioni di fascicoli, l'Archivista ne indica uno: «Cisterne»."],
      ["orfeo", "Le vecchie cisterne della città. Chiuse da un secolo. Nessuno ci scende più."],
    ],
  },
  { // 11 · Frequenze fantasma
    enemyHero: "kira-statica",
    before: [
      ["dex", "Senti anche tu? Tutte le radio della città trasmettono un respiro. Lento. Bagnato."],
      ["kira", "Non toccare la mia rete, Binder. La Regina sta ascoltando il mare sotto la città, e il mare risponde."],
      ["regina", "Ogni parola sussurrata al telefono è mia. E ogni parola, adesso, parla di lui."],
      ["tu", "Kira, quella cosa ti sta usando."],
      ["kira", "Forse. Ma prima mi batti, poi ne parliamo."],
    ],
    after: [
      ["kira", "Va bene. Hai vinto tu. Stacco la spina alla Regina."],
      ["kira", "Prima però ho registrato il segnale. Ascolta: non è un respiro. È un battito."],
      ["dex", "Qualcosa di enorme, sotto le cisterne. E ha il cuore che batte sempre più forte."],
      ["kira", "Conta su di me, Binder. Nessuno usa la mia corrente senza pagare."],
    ],
  },
  { // 12 · La santa delle candele
    enemyHero: "padre-lazzaro",
    before: [
      ["ottavia", "Le candele della cripta si sono riaccese da sole. Per ogni fiamma, un morto si alza."],
      ["lucrezia", "Per ogni candela accesa, un'anima torna. Non è questo che chiedevano i fedeli?"],
      ["lazzaro", "Tornano, sì. Ma non verso di noi. Camminano tutti verso le cisterne."],
      ["lazzaro", "Io sono già morto una volta, Binder. Lasciami vedere se sai difendere i vivi."],
    ],
    after: [
      ["narratore", "Padre Lazzaro spegne l'ultima candela con due dita. Il fumo sale dritto, come una preghiera."],
      ["lazzaro", "I morti non obbediscono alla santa. Obbediscono a chi li chiama dal fondo."],
      ["ottavia", "Allora scendiamo a prenderlo. Insieme."],
      ["lazzaro", "Insieme. Ho ancora una veglia da vegliare."],
    ],
  },
  { // 13 · Il notaio dei morti
    enemyHero: "vittoria-sale",
    before: [
      ["narratore", "In un ufficio senza finestre, una notaia timbra atti di cessione. Ogni firma è di un'anima appena risvegliata."],
      ["vittoria", "Firma qui. E anche dopo la morte. Le anime sono beni trasferibili, Binder: lo dice il regolamento."],
      ["tu", "Trasferibili a chi?"],
      ["vittoria", "Riservato. A meno che tu non mi costringa a parlare."],
    ],
    after: [
      ["vittoria", "Il sigillo… si è incrinato. Un atto senza sigillo non vale nulla."],
      ["vittoria", "Il beneficiario è uno solo: «Il Gran Conservatore, per conto di Ciò che Dorme»."],
      ["vittoria", "Ho servito la legge sbagliata. Lascia che ti aiuti a servire quella giusta."],
    ],
  },
  { // 14 · Binari morti
    enemyHero: null,
    before: [
      ["ines", "La linea chiusa nel 1953 porta dritta alle cisterne. Ma sui binari morti c'è un guardiano che non dorme mai."],
      ["guardiano", "Biglietto. Andata soltanto: il ritorno non è previsto."],
      ["tu", "Non ho biglietto. Ho una buona ragione."],
      ["guardiano", "Le ragioni non si timbrano. Sui binari morti, l'ultimo treno sei tu."],
    ],
    after: [
      ["guardiano", "Passa. Non ho mai visto nessuno arrivare fin qui con tanta voglia di tornare."],
      ["narratore", "In fondo alla galleria, una porta di bronzo con un catalogo inciso."],
      ["ines", "L'ingresso privato dell'Archivio Eterno. Il Gran Conservatore ti aspetta, piccola."],
    ],
  },
  { // 15 · Il Gran Conservatore
    enemyHero: null,
    before: [
      ["conservatore", "Benvenuta nell'Archivio Eterno. Qui nessun potere sfugge alla catalogazione."],
      ["tu", "Hai catalogato la città per darla in pasto a qualcosa."],
      ["conservatore", "Ho conservato la città. Per lui. Ciò che dorme sotto Hollow Street ha diritto a ogni cosa che la città dimentica."],
      ["conservatore", "E tu, Binder, sei l'ultima voce del catalogo. Archiviazione definitiva."],
    ],
    after: [
      ["narratore", "Il catalogo brucia pagina dopo pagina. Il Gran Conservatore si sbriciola in polvere di carta."],
      ["conservatore", "Troppo tardi… il registro è chiuso. Lui… è sveglio."],
      ["narratore", "Sotto i piedi il pavimento vibra. Molto più in basso, un battito enorme, sempre più vicino."],
    ],
  },
  { // 16 · Il Leviatano delle Cisterne
    enemyHero: null,
    before: [
      ["narratore", "Le cisterne. Un mare nero sotto la città, immobile come vetro. Poi il vetro si incrina."],
      ["leviatano", "Mille anni di fame. E la città sopra di me, come un piatto apparecchiato."],
      ["mara", "Non sei sola, Binder. Siamo tutti qui."],
      ["kira", "Ho portato la corrente."],
      ["lazzaro", "Io le preghiere."],
      ["tu", "E io il Velo. Torna a dormire."],
    ],
    after: [
      ["narratore", "Il Leviatano affonda nel buio da cui è venuto. Il mare nero si richiude su di lui come una palpebra."],
      ["ottavia", "Le campane… stanno suonando. Tutte."],
      ["vittoria", "Ho appena timbrato l'ultimo atto: la città appartiene a chi ci vive. Vale per sempre."],
      ["narratore", "All'alba, per la prima volta da settimane, Hollow Street profuma di pioggia pulita. E i Binder, per una notte, dormono."],
    ],
  },
];
