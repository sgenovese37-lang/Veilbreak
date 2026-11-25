# VEILBREAK · Prototipo giocabile

Avvia un server statico dalla radice del repository, per esempio con `python3 -m http.server 8000`, e apri http://localhost:8000/veilbreak-app/.

Il gioco include le 60 carte del catalogo con le illustrazioni, la sfida contro il computer a tre difficoltà, una partita in due sullo stesso dispositivo, la modalità Storia in 8 capitoli, missioni giornaliere e settimanali, Schegge, buste e collezione. Si può installare sul telefono e funziona anche offline. Ogni fazione parte da un mazzo predefinito da 15 carte, definito in `decks.mjs` e composto per bilanciare gli scontri. L’editor salva un mazzo personale per fazione, con un massimo di due copie per carta e una per ciascuna Leggendaria. La modalità contro il computer usa il mazzo predefinito per l’avversario. Il tutorial riprende i dieci capitoli del repository come prove a scelta multipla, con un gettone per il primo completamento di ciascuna missione e il distintivo Primo Binder al termine. I progressi sono salvati nel browser. Ogni missione del tutorial dà anche 20 Schegge e il completamento 100 Schegge e il titolo Primo Binder.

Le regole del catalogo e del tutorial hanno priorità. Per i casi che i documenti lasciano aperti, il prototipo usa queste convenzioni di playtest.

- Le creature si infliggono danno contemporaneamente. Provocazione impedisce di attaccare l’eroe avversario. I danni alle creature persistono fra i turni.
- Luce Rossa può colpire qualsiasi creatura o l’eroe avversario. Le cure senza bersaglio esplicito curano il proprio eroe. Se un effetto non indica quale carta scartare, la scelta è casuale.
- Telecamera di Sicurezza rivela la carta una volta, quando entra in gioco. Telefono Vincolante sconta il primo incantesimo del turno per ogni copia in campo. ATM di Sangue si attiva alla fine del turno di entrambi i giocatori.
- L’Attacco ha un minimo di zero. Quando il mazzo è vuoto, ogni pesca obbligatoria di inizio turno infligge un danno al proprio eroe in più rispetto alla volta precedente.

Manca ancora il gioco 1 contro 1 online, che richiede un server.

## Regole di partita

Ogni giocatore inizia con 25 punti vita e 6 carte. Prima del primo turno può sostituirne fino a 2, senza ripescare subito le stesse copie. A ogni turno il massimo di Essenza aumenta di 1 fino a 10 e la riserva si ricarica. La mano contiene al massimo 10 carte. Le carte pescate in eccesso vanno perse. Con il mazzo vuoto, a ogni pescata mancata si subiscono danni crescenti (1, 2, 3…).

Ogni metà del tavolo usa il tema del suo eroe, anche quando si affrontano fazioni diverse. I poteri costano 1 Essenza e sono attivabili una volta durante il proprio turno. Stati e bersagli validi vengono controllati anche dal motore.

| Fazione | Eroe | Potere |
| --- | --- | --- |
| Corte di Hollow | Prefetta Ada Vesper | +2 Attacco permanente a una creatura alleata |
| Patto Neon | Iona Volt, la Frequenza | 2 danni a una creatura nemica |
| Senza Santi | Elena Voss, il Contratto | +1 Attacco e +1 Difesa permanenti a una creatura alleata |
| Sottocittà | Mara Sottorotaia | +1 Attacco a una creatura alleata fino alla fine del turno |

I nomi degli eroi e i poteri sono proposte per il playtest.

## Ampliare il catalogo

Aggiungi o modifica le schede in `cards.mjs`. Ogni scheda usa un ID numerico stabile, nome, fazione, rarità, costo, tipo, testo e, per le creature, Attacco e Difesa. Il catalogo, l’editor e la selezione della partita derivano le fazioni dalle schede. Una nuova fazione deve avere almeno 15 carte per giocare con un mazzo predefinito; se non ha una voce in `decks.mjs` usa le sue prime 15 carte. Gli effetti si risolvono in `game.mjs`; le nuove meccaniche richiedono una regola nel motore. Le sei carte segnate Legendary nel catalogo sono tutte incluse.

Per assegnare un eroe e un tavolo a una nuova fazione, aggiungi una voce in `heroes.mjs` e uno stile in `style.css` per il relativo tema. Il motore riusa i tipi di potere già supportati: `damage` (danno a una creatura), `heal` (cura), `attack` e `defense` (temporanei), `buff` (+X/+X permanente), `summon` (evoca la carta con quell’ID) e `heroDamage` (danno all’eroe nemico). Le nuove fazioni entrano automaticamente in collezione (una copia per carta), nelle missioni «Vinci con…» e nell’analisi del bilanciamento.

## Illustrazioni

Le 60 illustrazioni stanno in due cartelle separate, ognuna con il proprio `mappa-carte.csv`: `assets/illustrazioni-01-30/` e `assets/illustrazioni-31-60/`. Le carte sono collegate alle immagini tramite la colonna `id_prototipo`. Le differenze trovate controllando a vista le immagini sono in `assets/note-verifica.csv` e nel resoconto `DIFFERENZE-ILLUSTRAZIONI.md`.

Le 13 illustrazioni che non coincidevano con il catalogo (11 fazioni, il testo del Sindaco e quello di Ultima Legge) sono state corrette in `assets/illustrazioni-corrette/`; il gioco usa queste, e gli originali restano intatti. Per rigenerarle servono anche numpy e opencv-python-headless:

    python3 -I tools/correggi_illustrazioni.py .

Dopo aver cambiato le immagini o le note, rigenera `illustrations.mjs` e le miniature in `assets/miniature/` (serve Pillow):

    python3 -I tools/build_illustrations.py .

In partita valgono sempre testo, fazione e statistiche del catalogo (`cards.mjs`). Nel catalogo dell’app tocca una carta per vedere l’illustrazione intera, le regole del catalogo e le eventuali differenze.

Per una nuova fazione aggiungi anche le sue righe in un nuovo `assets/illustrazioni-<intervallo>/mappa-carte.csv`; lo script le raccoglie automaticamente.

## Test

    node --test tests/*.test.mjs

I 22 test controllano carte, immagini, regole, poteri degli eroi, partite complete a ogni livello, collezione e buste, missioni, Storia e la forza del computer Difficile.

Prove su schermo mobile (iPhone 13 simulato, richiede Playwright e il server avviato su `127.0.0.1:8000`):

    node tests/e2e/partita-e-tutorial-mobile.cjs
    node tests/e2e/barra-e-dettagli-mobile.cjs
    node tests/e2e/storia-missioni-buste-mobile.cjs

## Interfaccia su telefono

Durante la partita la barra con lo stato e il pulsante «Fine turno» resta fissa in basso. La mano scorre in orizzontale. Ogni carta in mano e in campo ha il pulsante «Dettagli», che apre illustrazione, regole del catalogo e differenze. In cima al tavolo il riquadro «Turno precedente» riassume le mosse appena fatte dall’avversario.

## Modalità Storia

«La Notte del Velo Spezzato» ha 8 capitoli contro le quattro fazioni, da Facile a Difficile, alcuni con più punti vita per l’avversario. Ogni capitolo si sblocca vincendo il precedente e dà un premio alla prima vittoria. Il premio finale vale 500 Schegge, 2 buste e il titolo Custode del Velo. Testi, avversari e premi sono in `story.mjs`.

## Missioni, Schegge e buste

Ogni giorno ci sono 3 missioni giornaliere e ogni lunedì 3 settimanali, scelte da `missions.mjs`. Contano le partite contro il computer e la Storia; le partite in due sullo stesso dispositivo non danno premi. Una vittoria vale 15, 25 o 40 Schegge secondo la difficoltà, una sconfitta 5.

Si parte con una copia di ogni carta e una busta. Una busta costa 100 Schegge e contiene 5 carte (probabilità: Comune 50%, Non comune 28%, Rara 15%, Epica 5%, Leggendaria 2%). Le copie oltre il massimo giocabile diventano Schegge. L’editor dei mazzi permette solo le copie possedute. Valori e probabilità sono in `profile.mjs`.

## Computer e bilanciamento

A Difficile il computer prova ogni mossa possibile su una copia della partita e sceglie quella che migliora di più la posizione (`ai.mjs`); batte il livello Normale in circa due partite su tre. L’analisi delle fazioni si rilancia con `node tools/bilanciamento.mjs` e i risultati sono commentati in `BILANCIAMENTO.md`. Per comporre mazzi predefiniti più equilibrati, anche per una nuova fazione, c’è `node tools/cerca_mazzi.mjs`.

## Installazione e offline

`manifest.webmanifest` e `sw.js` rendono il gioco installabile dal browser del telefono («Aggiungi a schermata Home»). Le miniature e i file del gioco vengono salvati per l’uso offline; le illustrazioni grandi restano disponibili dopo la prima apertura. Quando pubblichi una nuova versione, cambia `VERSION` in `sw.js`. Le icone si rigenerano con `python3 -I tools/build_icons.py .`.

Animazioni (evocazione, danni, cure, apertura delle buste) e suoni sintetizzati si possono disattivare: i suoni dal pulsante in alto, le animazioni con l’impostazione di sistema «Riduci movimento».

## Tavolo di gioco

Durante la partita il tavolo occupa tutto lo schermo: eroe avversario e sue creature in alto, le tue in basso, divise dalla crepa del Velo. Ogni eroe ha il medaglione della sua fazione con i punti vita e, accanto, il potere da 1 Essenza. Sotto il tuo eroe ci sono i cristalli di Essenza; in fondo la mano a ventaglio, dove ogni carta mostra la sua illustrazione (il pulsante «i» apre i dettagli). Le creature in campo sono gettoni con Attacco e Difesa: un contorno verde indica chi può attaccare, quello rosso i bersagli possibili, il bordo spesso la Provocazione. Danni e cure compaiono come numeri animati. Il pulsante «Fine turno» diventa verde quando non restano mosse. «☰ Menu» abbandona la partita, «Registro» mostra le ultime mosse; tenendo premuta una creatura se ne vedono i dettagli. I ritratti degli eroi si rigenerano con `python3 -I tools/build_heroes.py .`.

Animazioni e turni: all’inizio di ogni turno compare a tutto schermo «Il tuo turno» o «Turno avversario» (con suono e una breve vibrazione), la barra in alto diventa oro o rossa e la metà del tavolo di chi non gioca si scurisce. Il computer mostra le sue mosse una alla volta: la carta giocata appare grande al centro, l’attaccante scatta verso il bersaglio, le creature distrutte svaniscono. Tenendo premuta una carta in mano, una creatura o un artefatto se ne vede l’anteprima ingrandita con le regole. I cristalli di Essenza si svuotano e si riempiono con un’animazione e un numero «−N». Nella schermata «Nuova partita» e nella Storia l’eroe si sceglie toccando la sua scheda.

## App Android (APK)

La cartella `app-android/` impacchetta il gioco come app Android con Capacitor. A ogni invio di modifiche GitHub Actions (`.github/workflows/apk.yml`) esegue i test, compila l'APK e lo pubblica nella release **apk-ultima** del repository: dal telefono apri la pagina delle release, scarica `VEILBREAK.apk` e installalo, consentendo l'installazione da quella fonte quando Android lo chiede. È una versione di prova, non adatta al Play Store. Ogni APK è firmato con la stessa chiave di prova (`app-android/android/app/veilbreak-prova.keystore`, password `android`) e ha un numero di versione crescente, così ogni aggiornamento si installa sopra il precedente senza perdere i progressi. Per pubblicare sul Play Store servirà una chiave vera, da tenere nei segreti di GitHub e non nel repository.

Per compilarla in locale servono Node, Java 17 e l’Android SDK:

    cd app-android
    npm ci
    npm run sync
    cd android && ./gradlew assembleDebug

L’icona e la schermata di avvio Android si rigenerano con `python3 -I icone-android.py .` dentro `app-android/`.

## Stile grafico, negozio e attacco multiplo

L'interfaccia riprende lo stile delle carte: cornici di rame smussate, fondo scuro come i riquadri di testo, carattere EB Garamond (licenza SIL OFL, in `assets/fonts/`), filigrana e divisore con il rombo ritagliati dalle cornici delle carte (`python3 -I tools/build_ornaments.py .`).

Il **Negozio** (nel menu, o toccando il saldo in alto) mostra Schegge e buste e permette di comprarle e aprirle. Le Schegge sono le monete del gioco.

**Attacco multiplo:** tocca una o più creature pronte (o «Tutte»), poi il bersaglio: attaccano una dopo l'altra finché il bersaglio resta in piedi. Durante l'animazione il tavolo è bloccato. Le mosse dell'avversario non compaiono più in un riquadro sul tavolo: il pulsante «Registro» mostra quante sono nuove.

## Ambientazioni, suoni delle carte, costo e anteprima

**Ambientazioni:** quattro, una per fazione (`environments.mjs`), con lo sfondo ricavato dalle illustrazioni (`python3 -I tools/build_environments.py .`), effetti animati e un sottofondo sonoro sintetizzato:
- Sala del Consiglio (Corte di Hollow): archivio, nebbia, lampade che tremano, campana lontana.
- Centrale delle Frequenze (Patto Neon): stazione allagata, pioggia, neon che sfarfalla, ronzio elettrico.
- Cappella dell’Aureola Spezzata (Senza Santi): corsia abbandonata, candele, cenere che sale, coro.
- Deposito Sotto le Rotaie (Sottocittà): bus sotto la pioggia, gocce, foschia verde, rombo.

Si scelgono in «Nuova partita»; «Automatica» usa quella della fazione avversaria, e nella Storia vale quella del capitolo.

**Suoni delle carte:** ogni carta ha la sua voce quando entra in gioco, attacca, subisce danni e muore (`cardSound` in `audio.mjs`). Il timbro dipende dalla fazione e l'altezza dall'ID della carta; le Leggendarie e le Epiche hanno un'entrata più lunga.

**Costo:** ogni carta in mano mostra il costo attuale in una gemma grande (verde se scontato, rossa se aumentato). **Anteprima:** tenendo premuta una carta si apre l'anteprima con le regole, che resta aperta finché non si tocca di nuovo lo schermo.

## Ritratti degli eroi e dorso delle carte

Le illustrazioni create con ChatGPT sono salvate in `assets/originali-chatgpt/` (ritratti degli 8 eroi, dorso delle carte, Frammento di Essenza con e senza testo). `python3 -I tools/build_portraits.py .` ritaglia i ritratti in tondo sul volto (`assets/eroi/ritratti/`) e prepara il dorso. I 4 eroi attuali usano già i ritratti; i 4 eroi da sbloccare sono descritti in `lockedHeroes` dentro `heroes.mjs`, in attesa dello sblocco nella Storia.
