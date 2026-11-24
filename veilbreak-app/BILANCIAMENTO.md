# Bilanciamento delle fazioni

Simulazione con `node tools/bilanciamento.mjs 200`: computer Difficile contro computer Difficile, 200 partite per ogni coppia ordinata di fazioni, alternando chi gioca per primo. Mazzi predefiniti da 15 carte.

## Risultati

| Fazione | Prima (potere originale) | Dopo il nuovo potere della Corte |
| --- | --- | --- |
| Corte di Hollow | 30,1% | 44,2% |
| Patto Neon | 64,8% | 60,9% |
| Senza Santi | 49,1% | 41,9% |
| Sottocittà | 56,1% | 53,0% |

Chi gioca per primo vince circa il 60% delle partite. Una partita dura in media 22 turni complessivi, 11 per giocatore.

## Cosa ho cambiato

Solo il potere della Prefetta Ada Vesper (Corte di Hollow), che era una proposta da playtest. Costa sempre 1 Essenza.

- Prima: una creatura alleata ottiene +1 Difesa fino all’inizio del tuo prossimo turno.
- Ora: una creatura alleata ottiene +1/+1 in modo permanente.

Varianti provate per la Corte (vittorie complessive): +2 Difesa temporanea 29%, 1 danno all’eroe nemico 34%, 1 danno a una creatura nemica 43%, evoca un Passerotto 1/1 44%, +1/+1 permanente 45%. Ho scelto quella più vicina all’idea originale del «decreto» che protegge e rafforza. Per tornare indietro basta ripristinare la riga indicata in `heroes.mjs`.

Le carte del catalogo non sono state modificate.

## Problemi aperti (servono decisioni di design)

- **Patto Neon contro Corte di Hollow: 82% per il Patto.** Gli incantesimi di danno del Patto (Luce Rossa, Impulso Elettrico, Patto di Sangue Neon) e il potere da 1 danno eliminano le creature piccole della Corte. Possibili interventi: ridurre il costo dell’Ultima Legge o del Sindaco, oppure dare Provocazione o +1 Difesa a una creatura economica della Corte.
- **Corte di Hollow contro Senza Santi: 84% per la Corte.** Le creature rafforzate in modo permanente superano le cure dei Senza Santi, che hanno poco danno. Possibile intervento: un danno ad area in più o un costo minore per Maledizione della Città.
- **Vantaggio di chi gioca per primo (60%).** Si può compensare dando al secondo giocatore una carta in più nella mano iniziale o 1 Essenza extra al primo turno. È un cambio di regola, quindi non l’ho applicato.
- **Mazzi da 15 carte.** La fatica arriva verso l’undicesimo turno e le carte da 8–9 Essenza (Ultima Legge, Ultimo Treno) si giocano poco. Mazzi da 20 carte, possibili ora che la collezione permette due copie, renderebbero più utili le carte costose.
