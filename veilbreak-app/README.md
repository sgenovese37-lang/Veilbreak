# VEILBREAK · Prototipo giocabile

Avvia un server statico dalla radice del repository, per esempio con `python3 -m http.server 8000`, e apri http://localhost:8000/veilbreak-app/.

Il prototipo include le 60 carte del catalogo del repository, la sfida contro il computer a tre difficoltà e una partita in due sullo stesso dispositivo. Ogni fazione parte da un mazzo predefinito da 15 carte. L’editor salva un mazzo personale per fazione, con un massimo di due copie per carta e una per ciascuna Leggendaria. La modalità contro il computer usa il mazzo predefinito per l’avversario. Il tutorial riprende i dieci capitoli del repository come prove a scelta multipla, con un gettone per il primo completamento di ciascuna missione e il distintivo Primo Binder al termine. I progressi sono salvati nel browser. I gettoni del tutorial e il distintivo sono premi del prototipo.

Le regole del catalogo e del tutorial hanno priorità. Per i casi che i documenti lasciano aperti, il prototipo usa queste convenzioni di playtest.

- Le creature si infliggono danno contemporaneamente. Provocazione impedisce di attaccare l’eroe avversario. I danni alle creature persistono fra i turni.
- Luce Rossa può colpire qualsiasi creatura o l’eroe avversario. Le cure senza bersaglio esplicito curano il proprio eroe. Se un effetto non indica quale carta scartare, la scelta è casuale.
- Telecamera di Sicurezza rivela la carta una volta, quando entra in gioco. Telefono Vincolante sconta il primo incantesimo del turno per ogni copia in campo. ATM di Sangue si attiva alla fine del turno di entrambi i giocatori.
- L’Attacco ha un minimo di zero. Quando il mazzo è vuoto, ogni pesca obbligatoria di inizio turno infligge un danno al proprio eroe in più rispetto alla volta precedente.

Il gioco completo richiede ancora il multiplayer online, la storia, le missioni giornaliere e settimanali e un sistema di ricompense reale.

## Regole di partita

Ogni giocatore inizia con 30 punti vita e 6 carte. Prima del primo turno può sostituirne fino a 2, senza ripescare subito le stesse copie. A ogni turno il massimo di Essenza aumenta di 1 fino a 10 e la riserva si ricarica. La mano contiene al massimo 10 carte. Le carte pescate in eccesso vanno negli scarti.

Ogni metà del tavolo usa il tema del suo eroe, anche quando si affrontano fazioni diverse. I poteri costano 1 Essenza e sono attivabili una volta durante il proprio turno. Stati e bersagli validi vengono controllati anche dal motore.

| Fazione | Eroe | Potere |
| --- | --- | --- |
| Corte di Hollow | Prefetta Ada Vesper | +1 Difesa a una creatura alleata fino all’inizio del proprio prossimo turno |
| Patto Neon | Iona Volt, la Frequenza | 1 danno a una creatura nemica |
| Senza Santi | Elena Voss, il Contratto | Cura di 2 punti vita al proprio eroe |
| Sottocittà | Mara Sottorotaia | +1 Attacco a una creatura alleata fino alla fine del turno |

I nomi degli eroi e i poteri sono proposte per il playtest.

## Ampliare il catalogo

Aggiungi o modifica le schede in `cards.mjs`. Ogni scheda usa un ID numerico stabile, nome, fazione, rarità, costo, tipo, testo e, per le creature, Attacco e Difesa. Il catalogo, l’editor e la selezione della partita derivano le fazioni dalle schede. Una nuova fazione deve avere almeno 15 carte per giocare con un mazzo predefinito. Gli effetti si risolvono in `game.mjs`; le nuove meccaniche richiedono una regola nel motore. Le sei carte segnate Legendary nel catalogo sono tutte incluse.

Per assegnare un eroe e un tavolo a una nuova fazione, aggiungi una voce in `heroes.mjs` e uno stile in `style.css` per il relativo tema. Il motore riusa i tipi di potere già supportati (danno, cura, Attacco e Difesa).

## Illustrazioni

Le 60 illustrazioni stanno in due cartelle separate, ognuna con il proprio `mappa-carte.csv`: `assets/illustrazioni-01-30/` e `assets/illustrazioni-31-60/`. Le carte sono collegate alle immagini tramite la colonna `id_prototipo`. Le differenze trovate controllando a vista le immagini sono in `assets/note-verifica.csv` e nel resoconto `DIFFERENZE-ILLUSTRAZIONI.md`.

Dopo aver cambiato le immagini o le note, rigenera `illustrations.mjs` e le miniature in `assets/miniature/` (serve Pillow):

    python3 -I tools/build_illustrations.py .

In partita valgono sempre testo, fazione e statistiche del catalogo (`cards.mjs`). Nel catalogo dell’app tocca una carta per vedere l’illustrazione intera, le regole del catalogo e le eventuali differenze.

Per una nuova fazione aggiungi anche le sue righe in un nuovo `assets/illustrazioni-<intervallo>/mappa-carte.csv`; lo script le raccoglie automaticamente.

## Test

    node --test tests/*.test.mjs

I test controllano le creature corrette, il collegamento delle 60 immagini, artefatti, Sindaco, poteri degli eroi e 48 partite complete computer contro computer.

Prove su schermo mobile (iPhone 13 simulato, richiede Playwright e il server avviato su `127.0.0.1:8000`):

    node tests/e2e/partita-e-tutorial-mobile.cjs
    node tests/e2e/barra-e-dettagli-mobile.cjs

## Interfaccia su telefono

Durante la partita la barra con lo stato e il pulsante «Fine turno» resta fissa in basso. La mano scorre in orizzontale. Ogni carta in mano e in campo ha il pulsante «Dettagli», che apre illustrazione, regole del catalogo e differenze. In cima al tavolo il riquadro «Turno precedente» riassume le mosse appena fatte dall’avversario.
