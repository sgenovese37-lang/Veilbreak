# Differenze fra illustrazioni e catalogo

Controllo a vista delle 60 carte illustrate. In partita valgono sempre le regole di `Veilbreak_Carte_Complete.md` / `cards.mjs`.

## Stato attuale

Le 13 illustrazioni che non coincidevano con il catalogo sono state corrette e il gioco usa le versioni corrette, salvate in `assets/illustrazioni-corrette/` con `mappa-correzioni.csv`. Gli originali restano intatti nelle cartelle dei due pacchetti, e nella scheda di ogni carta corretta il pulsante «Vedi originale» li mostra.

Restano solo due differenze grafiche che non cambiano le regole:
- 19 Protocollo Blackout: «−3 Attacco» con la maiuscola.
- 22 Telefono Vincolante: virgola dopo «Una volta per turno».

## Cosa è stato corretto

### Testo delle regole
| ID | Carta | Prima | Ora (come nel catalogo) |
| --- | --- | --- | --- |
| 1 | Il Sindaco di Hollow Street | Titoletto «Rapidità» sul Sindaco | «Quando entra in gioco, prendi il controllo di una creatura nemica fino alla fine del turno. Quella creatura ha Rapidità.» |
| 15 | Ultima Legge | «Prendi il controllo di tutte le creature nemiche.» | «Prendi il controllo di tutte le creature nemiche fino alla fine del turno.» |

### Fazione: riga sotto il disegno e due simboli (in alto a sinistra e in basso al centro)
| ID | Carta | Prima | Ora | Simboli presi da |
| --- | --- | --- | --- | --- |
| 3 | Chirurgo del Vicolo | Sottocittà | Corte di Hollow | 4 Guardia del Turno di Notte |
| 6 | Specchio Incrinato | Senza Santi | Corte di Hollow | 12 Ordine del Sindaco |
| 7 | Telecamera di Sicurezza | Patto Neon | Corte di Hollow | 13 Segretaria Notturna, 12 Ordine del Sindaco |
| 8 | Passerotto | Sottocittà | Corte di Hollow | 11 Assessore Corrotto |
| 9 | Luce Tremolante | Patto Neon | Corte di Hollow | 11 Assessore Corrotto, 12 Ordine del Sindaco |
| 10 | Contratto Minore | Senza Santi | Corte di Hollow | 11 Assessore Corrotto |
| 16 | L’Ultimo Treno per Nessundove | Sottocittà | Patto Neon | 17 Patto di Sangue Neon |
| 20 | Cecchino sul Tetto | Senza Santi | Patto Neon | 18 Demone dei Dati |
| 24 | Spettro dell’Ufficio | Corte di Hollow | Patto Neon | 26 Commutatore d’Ombra |
| 25 | ATM di Sangue | Senza Santi | Patto Neon | 21 Glitch di Evocazione |
| 27 | Chiamata Disperata | Sottocittà | Patto Neon | 21 Glitch di Evocazione |

Con queste correzioni sparisce anche «Sottocitta» senza accento, che compariva solo su carte assegnate alla fazione sbagliata.

## Come sono state fatte

Con `tools/correggi_illustrazioni.py`:
- la scritta sbagliata viene cancellata ricostruendo lo sfondo (inpainting di OpenCV);
- la scritta nuova usa EB Garamond (licenza SIL OFL, in `tools/fonts/`), con dimensione, spaziatura, colore e ombra misurati sull’originale;
- i simboli vengono trapiantati da una carta della fazione giusta con la stessa cornice, con bordo sfumato, lasciando all’originale titolo e bagliori colorati della cornice.

Il carattere è molto simile ma non identico a quello delle carte originali: a ingrandimento pieno un occhio attento può notare la differenza. Per un risultato perfetto servirebbe rigenerare le 13 immagini con lo strumento originale; basterebbe poi metterle in `assets/illustrazioni-corrette/illustrazioni/` con lo stesso nome e rilanciare `tools/build_illustrations.py`.

Costi, rarità, Attacco e Difesa coincidevano già con il catalogo su tutte le 60 carte.

## Secondo set (61-90), arrivato il 25 novembre 2026

Le 30 illustrazioni create con ChatGPT sono arrivate prima in un PDF di anteprima (480×720) e poi, lo stesso giorno, in uno ZIP con gli originali da 1024×1536: nel gioco sono in WebP a 900×1350 (come il set 31-60) in `assets/illustrazioni-61-90/`. Gli originali coincidono con l'anteprima. Controllate una per una: titolo, costo, nastro, regole, frase, Attacco e Difesa coincidono con il catalogo.

- **71 Hacker Posseduto, 74 Riflesso Duplicato, 78 Ostia Nera, 81 Resurrezione Profana**: differenza solo grafica, il costo in punti vita del Patto è in una gemma invece che in una goccia di sangue. In mano il gioco mostra comunque la goccia.
- Per sostituire un'immagine basta un file con lo stesso nome e rilanciare `python3 -I tools/build_illustrations.py .`.
