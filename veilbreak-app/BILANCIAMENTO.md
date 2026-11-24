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
