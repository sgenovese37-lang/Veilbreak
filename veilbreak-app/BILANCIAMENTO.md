# Bilanciamento delle fazioni

Simulazione con `node tools/bilanciamento.mjs 200`: computer Difficile contro computer Difficile, 200 partite per ogni coppia ordinata di fazioni, alternando chi gioca per primo.

## Risultati

| Fazione | Inizio (mazzi e poteri originali) | Nuovo potere della Corte | Ora: anche i mazzi predefiniti rivisti |
| --- | --- | --- | --- |
| Corte di Hollow | 30,1% | 44,2% | 47,3% |
| Patto Neon | 64,8% | 60,9% | 45,2% |
| Senza Santi | 49,1% | 41,9% | 53,3% |
| Sottocittà | 56,1% | 53,0% | 54,2% |

I due scontri sbilanciati (vittorie della Corte, media dei due ordini di gioco):

| Scontro | Prima | Ora |
| --- | --- | --- |
| Corte di Hollow contro Patto Neon | 19% | 49% |
| Corte di Hollow contro Senza Santi | 83% | 50% |

Tutti gli scontri sono ora tra il 39% e il 61%; prima andavano dal 7% al 92%. I mazzi sono stati verificati anche su due gruppi di partite diversi da quelli usati per comporli, con risultati simili (scarto massimo dal 50% di 10–13 punti).

## Cosa è cambiato

### 1. Potere della Corte di Hollow (prima modifica)
Prima: +1 Difesa a una creatura alleata fino all’inizio del tuo prossimo turno. Ora: +1/+1 permanente a una creatura alleata. Costa sempre 1 Essenza. Per tornare indietro basta ripristinare la riga indicata in `heroes.mjs`.

### 2. Mazzi predefiniti (`decks.mjs`)
Prima ogni mazzo predefinito conteneva semplicemente le 15 carte della fazione, una per tipo. I poteri degli eroi non bastavano: Corte contro Patto Neon restava sotto il 27% qualunque potere avesse il Patto. Ora i mazzi restano da 15 carte ma tolgono le carte meno utili e usano qualche seconda copia:

| Fazione | Tolte | Seconda copia |
| --- | --- | --- |
| Corte di Hollow | Il Locatore, Telecamera di Sicurezza, Ordine del Sindaco, Ultima Legge | Specchio Incrinato, Luce Tremolante, Contratto Minore, Archivio Segreto |
| Patto Neon | L’Ultimo Treno per Nessundove, Protocollo Blackout, Glitch di Evocazione, Neon Succube, Schermo Rotto | Patto di Sangue Neon, Demone dei Dati, Telefono Vincolante, ATM di Sangue, Commutatore d’Ombra |
| Senza Santi | Pulsante di Panico | Prete Spezzato |
| Sottocittà | Sanguisuga dei Dati, Frammento di Veil | Profeta di Strada, Maledizione Statica |

- Le carte tolte restano nel catalogo e in collezione, e si possono mettere nel proprio mazzo dall’editor.
- Le seconde copie dei mazzi predefiniti sono possedute fin dall’inizio, così il mazzo predefinito è sempre giocabile.
- Le regole delle carte non sono cambiate.

I mazzi sono stati trovati con `node tools/cerca_mazzi.mjs`, che cambia una carta alla volta e tiene la modifica solo se tutti gli scontri si avvicinano al 50%. Lo stesso strumento serve per una nuova fazione.

## Problemi aperti

- **Vantaggio di chi gioca per primo (circa 60%).** Si può compensare dando al secondo giocatore una carta in più nella mano iniziale o 1 Essenza extra al primo turno. È un cambio di regola, quindi non l’ho applicato.
- **Patto Neon un po’ sotto la media (45%)**, soprattutto contro Senza Santi (39–42%). È dentro la fascia accettabile, ma è il prossimo candidato a un ritocco.
- **Equilibrio misurato sul computer.** Giocatori reali potrebbero trovare combinazioni diverse: conviene ripetere l’analisi dopo i primi playtest.

## Fase 1 (25 novembre 2026): mazzi da 30 carte

Nuove regole: mazzi da 30 carte (3 copie, 1 per le Leggendarie), massimo 7 creature in campo, chi gioca per secondo pesca una carta in più e riceve il Frammento di Essenza.

- Con 30 carte le partite non arrivano più all’esaurimento del mazzo: i Senza Santi, che vincevano curandosi fino alla fine, scendevano sotto il 20% e la Sottocittà dominava.
- **Nuovo potere di Elena Voss** (Liturgia del Sangue): «Una creatura alleata ottiene +2 Difesa in modo permanente» al posto di «Cura 2 punti vita al tuo eroe».
- **Nuovi mazzi predefiniti** (`decks.mjs`) trovati con `tools/cerca_mazzi.mjs` (ora cambia da 1 a 3 carte per tentativo) e verificati su due gruppi di partite nuove, mai usati nella ricerca.

Risultati con 150 partite per coppia (Difficile contro Difficile):

| Fazione | Vittorie |
| --- | --- |
| Corte di Hollow | 54,0% |
| Patto Neon | 46,9% |
| Senza Santi | 46,7% |
| Sottocittà | 52,4% |

Scontri tra il 41% e il 63% nelle verifiche su partite nuove. Chi gioca per primo vince ancora circa il 60% contro il computer: il Frammento di Essenza aiuta poco il computer, che lo usa solo quando gli apre una giocata. Va rivisto con le partite vere.
