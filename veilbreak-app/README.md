# VEILBREAK · Prototipo giocabile

Avvia un server statico dalla radice del repository, per esempio con `python3 -m http.server 8000`, e apri http://localhost:8000/veilbreak-app/.

Il prototipo include le 60 carte del catalogo del repository, la sfida contro il computer a tre difficoltà e una partita in due sullo stesso dispositivo. Ogni fazione parte da un mazzo predefinito da 15 carte. L’editor salva un mazzo personale per fazione, con un massimo di due copie per carta e una per ciascuna Leggendaria. La modalità contro il computer usa il mazzo predefinito per l’avversario. Il tutorial riprende i dieci capitoli del repository come prove a scelta multipla, con un gettone per il primo completamento di ciascuna missione e il distintivo Primo Binder al termine. I progressi sono salvati nel browser. I gettoni del tutorial e il distintivo sono premi del prototipo.

Le regole del catalogo e del tutorial hanno priorità. Per i casi che i documenti lasciano aperti, il prototipo usa queste convenzioni di playtest.

- Le creature si infliggono danno contemporaneamente. Provocazione impedisce di attaccare l’eroe avversario. I danni alle creature persistono fra i turni.
- Luce Rossa può colpire qualsiasi creatura o l’eroe avversario. Le cure senza bersaglio esplicito curano il proprio eroe. Se un effetto non indica quale carta scartare, la scelta è casuale.
- Telecamera di Sicurezza rivela la carta una volta, quando entra in gioco. Telefono Vincolante sconta il primo incantesimo del turno per ogni copia in campo. ATM di Sangue si attiva alla fine del turno di entrambi i giocatori.
- L’Attacco ha un minimo di zero. Quando il mazzo è vuoto, ogni pesca obbligatoria di inizio turno infligge un danno al proprio eroe in più rispetto alla volta precedente.

Il gioco completo richiede ancora le illustrazioni nel catalogo dell’app, il multiplayer online, la storia, le missioni e le ricompense.

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
