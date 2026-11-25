// Modalità Storia «La Notte del Velo Spezzato». Ogni capitolo si sblocca vincendo il precedente.
// Premio a ogni capitolo superato la prima volta e premio finale al termine della Storia.
import { loadProfile, saveProfile, addShards, addPacks, grantTitle, rewardOnce } from "./profile.mjs";
import { t } from "./i18n.mjs";

export const storyTitle = "La Notte del Velo Spezzato";

export const chapters = [
  {
    title: "Lampioni spenti",
    opponent: "Sottocittà", level: "Facile", lives: [25, 20],
    intro: "Hollow Street si sveglia senza luce. Dai tombini sale un vapore che sa di ferro e qualcosa graffia sotto l’asfalto. Sei un Binder alle prime armi e il Velo, stanotte, ha una crepa.",
    outro: "Le creature tornano nei cunicoli. Sul selciato resta un biglietto della metro, timbrato con una data che non esiste.",
    reward: { shards: 80, packs: 0 },
  },
  {
    title: "Il mercato delle frequenze",
    opponent: "Patto Neon", level: "Facile", lives: [25, 23],
    intro: "Il biglietto ti porta a un mercato notturno dove le insegne ronzano parole che nessuno ha scritto. Il Patto Neon vende patti a rate, e qualcuno ha comprato la crepa del Velo.",
    outro: "Un venditore ti consegna una ricevuta prima di sparire nel rumore bianco: «Pagato da: Ufficio del Sindaco».",
    reward: { shards: 80, packs: 1, hero: "dex-halogen" },
  },
  {
    title: "Le campane mute",
    opponent: "Senza Santi", level: "Normale", lives: [25, 25],
    intro: "Nella cappella dell’Aureola Spezzata le campane non suonano da anni. I Senza Santi custodiscono i registri dei morti e non vogliono che tu li legga.",
    outro: "Nei registri trovi lo stesso nome ripetuto su ogni pagina: Elena Voss. Accanto, una firma che non è sua.",
    reward: { shards: 100, packs: 0, hero: "ottavia" },
  },
  {
    title: "Il Consiglio di mezzanotte",
    opponent: "Corte di Hollow", level: "Normale", lives: [25, 25],
    intro: "La Corte di Hollow tiene udienza a mezzanotte e i fantasmi votano per alzata di mano. Entri senza invito per chiedere chi abbia firmato al posto di Elena Voss.",
    outro: "Il Locatore ti lascia andare con un sorriso: «Il contratto è valido. Chiedi al capolinea.»",
    reward: { shards: 100, packs: 1, hero: "orfeo-grimm" },
  },
  {
    title: "L’ultimo treno",
    opponent: "Patto Neon", level: "Normale", lives: [25, 28],
    intro: "Alla stazione abbandonata arriva un treno senza conducente. Il Patto Neon lo usa per trasportare ciò che passa attraverso il Velo, e stanotte il carico sei tu.",
    outro: "Le carrozze si fermano in una galleria che non compare su nessuna mappa. In fondo, una grata coronata.",
    reward: { shards: 120, packs: 0 },
  },
  {
    title: "Il trono della fogna",
    opponent: "Sottocittà", level: "Difficile", lives: [25, 27],
    intro: "Il Re della Fogna regna su chi la città ha dimenticato. Sa dove passa ogni crepa del Velo, ma vuole un tributo: battilo davanti alla sua corte di gatti spirituali.",
    outro: "Il Re ti indica la strada verso l’alto: «La crepa l’ha aperta chi governa sopra di noi.»",
    reward: { shards: 150, packs: 1, hero: "nonna-ines" },
  },
  {
    title: "La chiesa senza santi",
    opponent: "Senza Santi", level: "Difficile", lives: [25, 28],
    intro: "Elena Voss ti aspetta sull’altare. Ha firmato un patto per riportare indietro i suoi fedeli e ora non riesce a romperlo. Per liberarla devi spezzare la sua difesa.",
    outro: "Il contratto brucia. Elena ti consegna l’ultima pagina, con il sigillo della Corte: «Il Sindaco tiene la penna.»",
    reward: { shards: 150, packs: 0 },
  },
  {
    title: "Il Sindaco di Hollow Street",
    opponent: "Corte di Hollow", level: "Difficile", lives: [25, 33],
    intro: "Il Municipio è pieno di elettori che non respirano. Il Sindaco ha venduto la città un isolato alla volta e la crepa del Velo è la sua firma. È l’ultima udienza.",
    outro: "La penna si spezza e il Velo si richiude con un suono di vetro. All’alba Hollow Street riaccende i lampioni, uno dopo l’altro.",
    reward: { shards: 200, packs: 1 },
  },
  // ---------- Atto II · La Marea sotto la Città ----------
  {
    act: 2, title: "La marea nera",
    opponent: "Sottocittà", level: "Normale", lives: [25, 26],
    intro: "Una settimana dopo la caduta del Sindaco, i tombini di Hollow Street traboccano di un’acqua nera che non riflette la luce. Nei cunicoli qualcosa cresce, e ogni notte la muffa sale di un gradino.",
    outro: "Nel cuore della muffa trovi un registro di pietra. Ogni pagina porta lo stesso timbro: «Archivio Eterno · da conservare fino alla fine dei tempi».",
    reward: { shards: 150, packs: 0 },
  },
  {
    act: 2, title: "L’Archivio Eterno",
    opponent: "Corte di Hollow", level: "Normale", lives: [25, 27],
    intro: "Sotto il Municipio si apre un archivio che nessuna mappa riporta. Gli scaffali scendono per chilometri. Chi lo custodisce non ha volto, e cataloga tutto ciò che la città ha perso.",
    outro: "L’Archivista indica una sola parola tra milioni di fascicoli: «Cisterne». Poi il suo volto vuoto si gira verso il basso, dove l’acqua nera sale.",
    reward: { shards: 150, packs: 1 },
  },
  {
    act: 2, title: "Frequenze fantasma",
    opponent: "Patto Neon", level: "Normale", lives: [25, 28],
    intro: "Le radio di tutta la città trasmettono lo stesso respiro, lento, profondo, bagnato. Al centro della rete una regina di statica ascolta il mare che sta sotto Hollow Street.",
    outro: "Kira Statica stacca la spina della Regina e ti consegna una frequenza registrata: è il battito di qualcosa di enorme, sepolto sotto le cisterne.",
    reward: { shards: 150, packs: 0, hero: "kira-statica" },
  },
  {
    act: 2, title: "La santa delle candele",
    opponent: "Senza Santi", level: "Difficile", lives: [25, 28],
    intro: "Nella cripta della Cappella, Santa Lucrezia riaccende le candele dei morti. Per ogni fiamma un’anima torna a camminare, e tutte camminano verso le cisterne.",
    outro: "Padre Lazzaro spegne l’ultima candela con le dita. «I morti non obbediscono alla santa», dice. «Obbediscono a chi li chiama dal fondo.»",
    reward: { shards: 200, packs: 1, hero: "padre-lazzaro" },
  },
  {
    act: 2, title: "Il notaio dei morti",
    opponent: "Corte di Hollow", level: "Difficile", lives: [25, 29],
    intro: "Ogni anima risvegliata firma un atto di cessione. La Notaia Vittoria Sale li timbra tutti, uno dopo l’altro, con un sigillo che gocciola acqua nera.",
    outro: "Il sigillo della Notaia si incrina. Negli atti c’è un nome solo come beneficiario: «Il Gran Conservatore, per conto di Ciò che Dorme».",
    reward: { shards: 200, packs: 0, hero: "vittoria-sale" },
  },
  {
    act: 2, title: "Binari morti",
    opponent: "Sottocittà", level: "Difficile", lives: [25, 30],
    intro: "Per raggiungere le cisterne bisogna percorrere la linea chiusa nel 1953. Sui binari morti un guardiano senza riposo controlla i biglietti di chi non tornerà.",
    outro: "Il Guardiano si fa da parte. In fondo alla galleria, una porta di bronzo con un catalogo inciso: è l’ingresso privato dell’Archivio Eterno.",
    reward: { shards: 200, packs: 1 },
  },
  {
    act: 2, title: "Il Gran Conservatore",
    opponent: "Corte di Hollow", level: "Difficile", lives: [25, 32],
    intro: "Il Gran Conservatore ha catalogato la città intera per offrirla in pasto a ciò che dorme sotto di essa. Nessun potere sfugge alla sua catalogazione. Il tuo sarà l’ultimo.",
    outro: "Il catalogo brucia, pagina dopo pagina. Sotto i tuoi piedi il pavimento vibra: qualcosa, in fondo alle cisterne, si è appena svegliato.",
    reward: { shards: 250, packs: 1 },
  },
  {
    act: 2, title: "Il Leviatano delle Cisterne",
    opponent: "Sottocittà", level: "Difficile", lives: [25, 38],
    intro: "Sotto la città c’è un mare, e nel mare il Leviatano ha fame da mille anni. Hollow Street trema. Tutti i Binder che hai incontrato sono con te, sulla riva nera.",
    outro: "Il Leviatano affonda nel buio da cui è venuto. L’acqua nera si ritira dai tombini e all’alba, per la prima volta da settimane, Hollow Street profuma di pioggia pulita.",
    reward: { shards: 300, packs: 2 },
  },
];

export const finalReward = { shards: 500, packs: 2, title: "custode-del-velo" };
// Fine dell'Atto II (capitolo 16)
export const actTwoReward = { shards: 600, packs: 3, title: "signore-delle-cisterne" };
export const actOneLength = 8;
export const actOf = index => chapters[index]?.act ?? 1;

export function storyProgress(profile = loadProfile()) {
  return Math.min(profile.story?.cleared ?? 0, chapters.length);
}

// Eroi sbloccati: quelli dei capitoli già vinti (vale anche per chi li aveva vinti prima di questa regola).
export function unlockedHeroes(profile = loadProfile()) {
  const cleared = storyProgress(profile);
  return chapters.filter((chapter, i) => chapter.reward.hero && i < cleared).map(chapter => chapter.reward.hero);
}

export function isUnlocked(index, profile = loadProfile()) {
  return index <= storyProgress(profile);
}

// Registra la vittoria di un capitolo e assegna i premi solo la prima volta.
export function completeChapter(index, profile = loadProfile()) {
  const chapter = chapters[index];
  if (!chapter || !isUnlocked(index, profile)) return null;
  const granted = { chapter: null, final: null, hero: null };
  rewardOnce(`storia-${index}`, p => {
    const reason = `${t("Storia")} · ${t(chapter.title)}`;
    if (chapter.reward.shards) addShards(chapter.reward.shards, reason, p);
    if (chapter.reward.packs) addPacks(chapter.reward.packs, reason, p);
    granted.chapter = chapter.reward;
  }, profile);
  if (chapter.reward.hero && storyProgress(profile) <= index) granted.hero = chapter.reward.hero;
  profile.story = { cleared: Math.max(storyProgress(profile), index + 1) };
  saveProfile(profile);
  if (storyProgress(profile) >= chapters.length) {
    rewardOnce("storia-atto-2", p => {
      addShards(actTwoReward.shards, "Atto II completato", p);
      addPacks(actTwoReward.packs, "Atto II completato", p);
      grantTitle(actTwoReward.title, p);
      granted.actTwo = actTwoReward;
    }, profile);
  }
  if (storyProgress(profile) >= actOneLength) {
    rewardOnce("storia-finale", p => {
      addShards(finalReward.shards, "Storia completata", p);
      addPacks(finalReward.packs, "Storia completata", p);
      grantTitle(finalReward.title, p);
      granted.final = finalReward;
    }, profile);
  }
  return granted;
}
