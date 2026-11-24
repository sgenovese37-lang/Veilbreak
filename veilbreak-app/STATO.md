# Stato del progetto VEILBREAK (24 novembre 2026)

Riepilogo per riprendere il lavoro in una nuova sessione.

## Dove si trova il lavoro
- Branch di lavoro: `ccr-517789a1-ot9myj`. Le PR #1 e #2 sono già unite in `main`; il lavoro successivo è solo sul branch (manca una PR #3).
- Gioco: cartella `veilbreak-app/` (HTML/JS, si avvia con `python3 -m http.server 8000` dalla radice e si apre `/veilbreak-app/`).
- App Android: `app-android/` (Capacitor). GitHub Actions (`.github/workflows/apk.yml`) esegue i test, compila l'APK e lo pubblica nella release `apk-ultima`.
- Firma APK: chiave fissa `app-android/android/app/veilbreak-prova.keystore` (password `android`), versionCode = numero della compilazione su GitHub, così ogni APK si installa sopra il precedente.
- Ultimo APK inviato all'utente: **0.1.11** (versionCode 11).

## Accordi con l'utente
- A ogni aggiornamento: aspettare la compilazione su GitHub, scaricare l'APK, verificare firma fissa (SHA256 80:D3:EA:3B:C7:EE:4F:0D…) e versionCode più alto dell'ultimo inviato, poi mandarlo in chat. Deve sempre installarsi sopra la versione precedente.
- Lingua delle risposte: italiano, semplice e chiaro.
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
- Play Store: a gioco finito. Gioco online: in valutazione dei costi.

## Prossimi passi (Fase 1)
1. Limite di 7 creature in campo.
2. Carta extra e Frammento di Essenza per chi gioca per secondo (illustrazione pronta).
3. Mazzi da 30 carte: nuove regole, nuovi mazzi predefiniti (`tools/cerca_mazzi.mjs`) e nuovo bilanciamento.
4. Sblocco dei 4 nuovi eroi nella Storia.
5. Musica, traduzioni, correzioni dalle partite dell'utente.
