# Stato del progetto VEILBREAK (25 novembre 2026)

Riepilogo per riprendere il lavoro in una nuova sessione.

## Dove si trova il lavoro
- Branch di lavoro: `ccr-517789a1-ot9myj`. Le PR #1 e #2 sono già unite in `main`; il lavoro successivo è solo sul branch (manca una PR #3).
- Gioco: cartella `veilbreak-app/` (HTML/JS, si avvia con `python3 -m http.server 8000` dalla radice e si apre `/veilbreak-app/`).
- App Android: `app-android/` (Capacitor). GitHub Actions (`.github/workflows/apk.yml`) esegue i test, compila l'APK e lo pubblica nella release `apk-ultima`.
- Firma APK: chiave fissa `app-android/android/app/veilbreak-prova.keystore` (password `android`), versionCode = numero della compilazione su GitHub, così ogni APK si installa sopra il precedente.
- Ultimo APK inviato all'utente: vedi `ultima-versione-inviata.txt` nella cartella di lavoro (0.1.29 prima della fase 4).

## Accordi con l'utente
- A ogni aggiornamento: aspettare la compilazione su GitHub, scaricare l'APK, verificare firma fissa (SHA256 80:D3:EA:3B:C7:EE:4F:0D…) e versionCode più alto dell'ultimo inviato, poi mandarlo in chat. Deve sempre installarsi sopra la versione precedente.
- Lingua delle risposte: italiano, semplice e chiaro.
- Volti tutti diversi dal terzo set in poi (richiesta dell'utente): nei prompt per le illustrazioni ogni personaggio ha una descrizione del volto unica (età, etnia, forma del viso, naso, occhi, capelli, cicatrici, segni) e una riga «non deve somigliare a…» per i personaggi dello stesso tipo già esistenti (per esempio suora ≠ infermiera, giudice ≠ frate). Tenere un elenco dei volti già usati.
- Stile grafico: quello delle carte (cornici di rame, EB Garamond). Niente elementi copiati da Hearthstone: solo la struttura del genere.

## Fatto finora (in breve)
- 60 carte illustrate (13 illustrazioni corrette in `assets/illustrazioni-corrette/`), 4 eroi con ritratti, mazzi predefiniti bilanciati (`decks.mjs`), computer a 3 livelli (`ai.mjs`).
- Storia in 8 capitoli, missioni, Schegge, buste, Negozio, collezione, editor dei mazzi, tutorial con premi.
- Tavolo a tutto schermo con 4 ambientazioni (sfondo, effetti, sottofondo), animazioni, suoni per ogni carta, annuncio del turno, anteprima a dito premuto che resta aperta, costo grande sulle carte, attacco con più creature, Registro con mosse nuove.
- Illustrazioni create con ChatGPT in `assets/originali-chatgpt/`: 8 ritratti (4 eroi attuali + 4 da sbloccare), dorso delle carte, Frammento di Essenza (con e senza testo).
- 22 test (`node --test tests/*.test.mjs`) e 8 prove Playwright su telefono in `tests/e2e/`.

## Decisioni prese (dettagli in `DECISIONI.md`)
- Massimo 7 creature in campo.
- Chi gioca per secondo: una carta in più + 1 Frammento di Essenza (0 Essenza, +1 Essenza per il turno).
- Mazzi da 30 carte: 3 copie per le non leggendarie, 1 per le Leggendarie (finché non arrivano nuove carte).
- Eroi: 4 subito + 4 sbloccabili nella Storia (dati in `lockedHeroes` dentro `heroes.mjs`).
- Musica generata dal gioco, a tema. Lingue: italiano, inglese, tedesco, spagnolo (illustrazioni in italiano, testi tradotti).
- Play Store: a gioco finito, per ultimo. L'utente lavora da solo e ha poco tempo (3-5 ore a settimana): prima perfezionare il gioco, poi pubblicarlo offline e gratis (costo: 25 $ una tantum per l'account sviluppatore). Per guadagnare: versione «Sostenitore» una tantum o pubblicità facoltative, senza server. Gioco online solo se il gioco ha successo (Firebase per iniziare, 0-10 €/mese con pochi giocatori).

## Fase 1 (fatta il 25 novembre)
1. Limite di 7 creature in campo (le carte che evocano o prendono il controllo non hanno effetto oltre il limite).
2. Chi gioca per secondo: una carta in più e il Frammento di Essenza (carta id 100, illustrazione ChatGPT).
3. Mazzi da 30 carte con 3 copie (1 per le Leggendarie), nuovi mazzi predefiniti e nuovo potere di Elena Voss (vedi `BILANCIAMENTO.md`).
4. I 4 eroi della Storia si sbloccano vincendo i capitoli 2 (Dex Halogen), 4 (Orfeo Grimm), 6 (Nonna Ines) e 7 (Suor Ottavia).
5. Musica generata dal gioco (`music.mjs`), rifatta il 25 novembre in stile horror cinematografico (archi, cori, campane, riverbero): un tema per il menu e uno per ogni ambientazione, con pulsante «Musica». Per ascoltarla fuori dal gioco: `node tools/registra_musica.cjs <cartella>`.
6. Lingue: italiano, inglese, tedesco, spagnolo (`i18n.mjs`, file in `lingue/`). La lingua parte da quella del telefono e si cambia dal menu in alto. Le frasi italiane fanno da chiave; per aggiungere frasi vedi `tools/crea_lingue.mjs` e il test `tests/i18n.test.mjs`.

## Secondo set (25 novembre)
- 30 carte nuove (61-90) in `cards.mjs`, dati e descrizioni in `set2-carte.json` e `SET-2.md`, PDF dei prompt per ChatGPT mandato all'utente.
- Parole chiave nuove nel motore: Velato, Lascito, Furia, Patto (si paga con la vita).
- Illustrazioni del secondo set in `assets/illustrazioni-61-90/`, dagli originali in alta risoluzione (WebP 900×1350). La grafica provvisoria resta per eventuali carte future senza immagine.
- Mazzi predefiniti rifatti con le carte nuove (vedi `BILANCIAMENTO.md`).

## Aggiunte del 25 novembre (sera)
- Tavolo: artefatti e segreti visibili come carte; eroe, potere ed Essenza più grandi; simbolo nel cerchio del potere.
- Fine partita con riepilogo, Rivincita e Cambia eroe; Storia con Prossimo capitolo.
- Storia interattiva: dialoghi con ritratti in `scene.mjs`; battuta d'entrata per ogni carta in `voci.mjs` (per ora solo in italiano).
- Introduzione animata (`intro.mjs`), Negozio con offerte e 7 dorsi (`assets/dorsi/`), consigliere dei mazzi (`advisor.mjs`).
- Nuovi suoni di attacco, ambientazioni più ricche, menu più grandi, risparmio energetico (anche automatico sotto il 20% di batteria).

## Playtest 2 (25 novembre)
- Provocazione corretta, IA che non vede più i segreti nemici, vita 25, poteri e mazzi riequilibrati (vedi `BILANCIAMENTO.md`).
- In partita: contatori di mazzo e mano sempre visibili, avvisi al centro per mazzo finito, danni da mazzo vuoto e carta persa per mano piena; battute delle carte più grandi.

## Aggiunte del 25 novembre (notte)
- Cerchi per costo, Attacco e Difesa: le scritte stampate sono tolte dalle immagini (`tools/pulisci_carte.py`, serve OpenCV) e le immagini pulite sono in `assets/carte-pulite/`; i cerchi mostrano i valori attuali.
- Carte trascinabili dalla mano al tavolo (o sul bersaglio).
- Sezione «I tuoi mazzi» in cima a Mazzi: un mazzo per fazione, con Vedi, Modifica/Crea e Gioca.
- Test: il computer attacca solo la Provocazione finché è in campo (Normale e Difficile).

## Fase 3 (25 novembre)
- Chi gioca per primo non pesca nel primo turno (vittorie del primo giocatore dal 64% al 53% nelle simulazioni).
- Dialoghi della Storia e battute delle carte tradotti in inglese, tedesco e spagnolo.
- Obiettivi permanenti (`achievements.mjs`) nella sezione Missioni; creazione di carte con le Schegge dalla scheda della carta.
- Discesa nel Velo (`descent.mjs`) e Rissa della settimana (regole in `game.mjs`, `brawls`), dalla schermata iniziale.
- Storia Atto II «La Marea sotto la Città»: capitoli 9-16 con dialoghi; 3 nuovi eroi (Kira Statica, Padre Lazzaro, Notaia Vittoria Sale) con ritratti provvisori; PDF con i prompt dei ritratti.
- Entrata scenica delle Leggendarie e impatti degli attacchi diversi per fazione.
- Copertina di avvio in `index.html`: niente lampo del modulo grezzo all'apertura.

## Fase 4 (25 novembre)
- Backup dei progressi (`backup.mjs`): Impostazioni → Salva backup / Ripristina backup. Nell'app Android il file si condivide con i plugin Capacitor Filesystem e Share; nel browser si scarica.
- Opzioni (`options.mjs`): animazioni veloci, vibrazione (plugin Haptics nell'app), testo grande (in partita solo i testi da leggere).
- Profilo e statistiche (Impostazioni → Profilo e statistiche): vittorie per fazione, eroe e modalità, carte più giocate, serie, record. I dati sono in `profile.lifetime` (`achievements.mjs`).
- Chi inizia si tira a sorte; computer Difficile più forte; nuovi poteri di Ada ed Elena (vedi `BILANCIAMENTO.md`).
- Tutorial aggiornato (13 lezioni) e presentazione alla prima apertura di Discesa nel Velo e Rissa.

## Fase 5 (fatta il 26 novembre, in attesa dell'ok dell'utente sui tipi prima dell'APK)
- Collezione: contatore N/250 con barra, contatore della fazione, filtri «Tipo» e «Solo carte incomplete».
- Negozio: acquisto dei dorsi verificato; buste disegnate dal gioco (`packVisual`), diverse per set, fazione e Reliquiario.
- Tavolo: creature più grandi (si stringono con 5+ creature), plancia del campo, punti vita grandi (rossi pulsanti sotto 9), decorazioni per ambientazione (`zoneDecor`: filigrane, fregio, lanterne/neon/candele/gocce), altezza totale ~750 px su telefono.
- Animazioni: entrata con caduta e anello di luce, bagliore sulle creature pronte, attacco con carica/rinculo/tremore, morte che si sbriciola. Suoni di attacco nuovi per fazione (`sfx.mjs`).
- Mano piena: il giocatore sceglie la carta da scartare (`chooseDiscard`, `mustDiscard`, `discardFromHand`); il computer perde ancora la carta pescata.
- Sentiero settimanale (`passState`, `claimPassReward` in `missions.mjs`): 15 passi, uno per missione riscattata; premi ai passi 5, 10 e 15 (finale).
- Motore: Rubavita (`hasLifesteal`), Scambio (`tradeCard`, pulsante nell'anteprima), poteri che si evolvono (`power.evolve = { after, power }`, `currentPower`, puntini sul potere), `power.maxAttack` e `power.transform` per il Dottore della Peste.
- Tipi di creatura in `tribes.mjs` (proposta da far approvare); fascia del tipo disegnata dal gioco sopra quella stampata, posizioni trovate da `tools/trova_fasce.py` → `fasce.mjs`.

## Fase 5 (piano originale)
0. **Per primo (promesso all'utente)**: contatore in cima alla Collezione: «Collezione: N/250 copie» con barra, contatore della fazione filtrata («Corte di Hollow: 40/62») e filtro «Solo carte incomplete». Il calcolo esiste già (`collectionProgress` in `profile.mjs`). Stesso APK dei tipi di creatura. Aggiungere anche qui le decisioni sulla pubblicazione (vedi sotto, se mancano).
0b. **Richieste dell'utente del 26 novembre (solo in roadmap, da fare nella fase 5)**:
   - Negozio: verificare che l'acquisto dei dorsi delle carte funzioni davvero.
   - Buste con una decorazione diversa per ogni set/espansione (set 1, Archivi del Velo, terzo set, fazioni, Reliquiario).
   - Animazioni delle carte in gioco ancora migliori; suoni di attacco delle creature nuovi.
   - Tavolo: le due metà sono troppo grandi rispetto alle carte in campo → rimpicciolire la schermata in partita o solo le carte, per un aspetto più proporzionato.
   - Punti vita dei due eroi più grandi.
   - Limite di carte in mano: verificare il limite di 10 e valutare di far scegliere al giocatore quale scartare quando si supera.
   - Ambientazioni in partita più belle: abbellire tutto il tavolo (cornici, bordi, decorazioni, luci, particelle), non solo lo sfondo.
   - Missioni a percorso: un pass settimanale gratuito (senza soldi veri), con un premio più grande ogni 5 missioni e un premio finale.
1. **Tipi di creatura**: Umano, Non Morto, Spettro, Bestia, Costrutto, Demone, Aberrazione (Annegato per la futura fazione). Riga «CREATURA NON MORTA · Rara» scritta dal gioco (tolta dalle illustrazioni come per i cerchi, e tradotta), tipo nell'anteprima, filtro per tipo nella Collezione. Prima: elenco dei tipi per le 52 creature da far approvare all'utente.
2. **Regole per rarità**: Comune 1-3 mana statistiche oneste; Non comune 2-4 piccolo effetto; Rara 3-5; Epica 4-6 effetti forti; Leggendaria 6-9 mana con effetti «wow» che ribaltano la partita, spesso con una condizione o un rischio. Poche Leggendarie per fazione.
3. **Rubavita**: i danni inflitti dalla carta curano il proprio eroe (danno scritto, fino al massimo). Poche carte, soprattutto Senza Santi e qualcuna Sottocittà, statistiche un po' più basse; controllare che la durata delle partite e l'equilibrio non cambino. Simbolo: cuore rosso.
4. **Poteri che si evolvono** per i nuovi eroi (niente potere doppio, scartato dall'utente): più forti dei poteri attuali, migliorano dopo alcuni usi.
5. Poi: terzo set (91-120) con tipi, sinergie di tipo e Rubavita; Atto III; nuovi eroi; PDF dei prompt per le illustrazioni.
- Spunti meccanici dati dall'utente (26 novembre, da carte di Hearthstone: solo le meccaniche, mai nomi/testi/grafica) per il terzo set e per il Carnevale: Missione (obiettivo da completare → ricompensa Leggendaria), risorsa che si accumula (per il Carnevale «Acqua alta»: sale quando muoiono creature, carte che la consumano e diventano più forti), Scambio (paghi 1 e rimetti la carta nel mazzo pescandone un'altra), costo variabile (es. pari alle carte nel mazzo), potenziare le creature ancora nel mazzo, riempire la mano avversaria di carte inutili, resuscitare le creature di un tipo, copiare creature di tipi diversi dalla mano, rendere gratis gli incantesimi per un turno.
- **Venezia Sommersa** (26 novembre): dati di 30 carte (91-120) + 3 speciali (121 Dogaressa, 122 Marionetta, 123 Maschera) in `set3-venezia.json`; PDF dei prompt mandato all'utente. **Illustrazioni arrivate il 26 novembre**: tutte e 37 (33 carte + ritratto dell'eroe, sfondo «Teatro Allagato», dorso «Carnevale», busta «Venezia Sommersa») in `VEILBREAK-illustrazioni-91-123-venezia.zip` nella radice del repository (JPEG 1024×1536, sfondo 1024×1792, ritratto 1024×1024). Gemma, targhette e nastro sono vuoti come richiesto: il gioco ci disegna costo, ATT/DIF e tipo. Da usare anche per la decorazione della busta del set e per il dorso nel Negozio. Nei prompt gemma del costo, targhette ATT/DIF e nastro del tipo sono VUOTI (li disegna il gioco). Da inserire dopo la fase 5 (servono tipi, Rubavita, Scambio; nuove: Maschera, Acqua alta, Missione).
- Idea approvata per il futuro: quinta fazione «Il Carnevale degli Annegati» (Venezia sommersa, maschere, inganno, parola chiave Maschera, eroe Dottore della Peste).

## Prossimi passi (ordine concordato)
1. Fase 5 in un unico APK: contatore della Collezione, richieste del 26 novembre (negozio, buste decorate, animazioni e suoni, tavolo proporzionato, vita più grande, mano piena, ambientazioni, pass settimanale), tipi di creatura (elenco da far approvare), regole per rarità, Rubavita, Scambio, poteri che si evolvono.
2. **Venezia Sommersa / Carnevale degli Annegati** (illustrazioni già pronte): quinta fazione con le 30 carte 91-120 e le speciali 121-123, parole chiave Maschera, Acqua alta e Missione, eroe Dottore della Peste con potere che si evolve, tavolo «Teatro Allagato» con musica (valzer distorto), dorso e busta nel Negozio, mazzo predefinito, traduzioni, bilanciamento su tutte le 10 coppie di fazioni, IA che sa usare Maschera e Acqua alta.
3. Terzo set per le 4 fazioni originali, Atto III della Storia, nuovi eroi.
4. Più avanti: gioco online (solo se il gioco ha successo), poi Play Store per ultimo.
- Correzioni dalle partite dell'utente in qualsiasi momento.
