import { addShards, grantTitle, rewardOnce } from "./profile.mjs";
import { t } from "./i18n.mjs";

export const tutorialReward = { perMission: 20, final: 100 };

const missions = [
  {
    title: "Benvenuto a VEILBREAK",
    lesson: "Tu e l’altro Binder iniziate con 25 punti vita. Vinci portando l’eroe avversario a 0.",
    prompt: "L’eroe nemico ha 2 punti vita. Quale azione ti fa vincere adesso?",
    choices: ["Pescare 2 carte.", "Infliggere 2 danni all’eroe nemico.", "Curare il tuo eroe di 2."],
    answer: 1,
  },
  {
    title: "Essenza e turni",
    lesson: "All’inizio del tuo turno la tua riserva massima di Essenza aumenta di 1, fino a 10. Ricarichi l’Essenza e peschi 1 carta. Puoi tenere fino a 10 carte in mano. Se ne peschi altre, vengono scartate dalla cima del mazzo.",
    prompt: "Hai 2 Essenze disponibili. Quale carta puoi giocare?",
    choices: ["Passerotto, costo 1.", "Il Locatore, costo 6.", "Ultima Legge, costo 9."],
    answer: 0,
  },
  {
    title: "La mano iniziale",
    lesson: "Chi inizia si decide a sorte con il lancio della moneta. Inizi con 6 carte. Con il mulligan puoi sostituirne fino a 2 prima che inizi la partita. Chi inizia non pesca nel primo turno; chi gioca per secondo pesca una carta in più e, dopo il cambio, riceve il Frammento di Essenza: costa 0 e dà 1 Essenza solo per quel turno.",
    prompt: "Quante delle tue 6 carte puoi sostituire?",
    choices: ["Tutte e 6.", "Esattamente 3.", "Da 0 a 2."],
    answer: 2,
  },
  {
    title: "Le creature",
    lesson: "Una creatura con Rapidità può attaccare nel turno in cui entra in gioco. Finché c’è una creatura con Provocazione, gli avversari possono attaccare solo lei: né le altre creature né l’eroe. Lei invece può attaccare chiunque. Puoi avere al massimo 7 creature in campo.",
    prompt: "Giochi Spettro dell’Ufficio. L’avversario ha una Guardia del Turno di Notte con Provocazione. Chi puoi attaccare subito?",
    choices: ["La Guardia del Turno di Notte.", "L’eroe nemico.", "Nessuno."],
    answer: 0,
  },
  {
    title: "Incantesimi, Artefatti e Segreti",
    lesson: "Gli incantesimi si risolvono subito. Gli artefatti rimangono in gioco. I segreti aspettano che si verifichi la condizione indicata.",
    prompt: "Quale carta si attiva quando l’avversario gioca una creatura?",
    choices: ["Archivio Segreto.", "Imboscata.", "Luce Tremolante."],
    answer: 1,
  },
  {
    title: "Gli eroi",
    lesson: "Ogni fazione ha un eroe con un potere distintivo. Attivarlo costa 1 Essenza e puoi usarlo una volta durante il tuo turno. Altri sette eroi si sbloccano vincendo i capitoli della Storia.",
    prompt: "Quanto costa usare un potere dell’eroe?",
    choices: ["Una carta.", "Un punto Attacco.", "1 Essenza."],
    answer: 2,
  },
  {
    title: "Le quattro fazioni",
    lesson: "Corte di Hollow, Patto Neon, Senza Santi e Sottocittà hanno ciascuna le proprie carte. Un mazzo contiene 30 carte della fazione del tuo eroe e, se vuoi, di una seconda fazione alleata (al massimo 2 fazioni): fino a 3 copie di ogni carta, 1 sola per le Leggendarie.",
    prompt: "Quante carte contiene un mazzo?",
    choices: ["15.", "30.", "60."],
    answer: 1,
  },
  {
    title: "Modalità di gioco",
    lesson: "Puoi sfidare il computer a tre difficoltà, giocare in due sullo stesso dispositivo o seguire la modalità Storia, un capitolo alla volta. Dalla schermata iniziale si aprono anche la Discesa nel Velo e la Rissa della settimana.",
    prompt: "Quale modalità scegli per esercitarti da solo?",
    choices: ["Due giocatori sullo stesso dispositivo.", "Contro il computer.", "Catalogo delle carte."],
    answer: 1,
  },
  {
    title: "Missioni e premi",
    lesson: "Ogni prova del tutorial superata assegna un gettone e 20 Schegge. Completarle tutte sblocca il premio finale: il distintivo Primo Binder e 100 Schegge. Le missioni giornaliere e settimanali e i capitoli della Storia danno altre Schegge e buste di carte.",
    prompt: "Quando si sblocca il premio finale?",
    choices: ["Dopo aver aperto il tutorial.", "Dopo aver superato la prima missione.", "Dopo aver superato tutte le missioni."],
    answer: 2,
  },
  {
    title: "Preparare il mazzo",
    lesson: "Le carte a basso costo ti aiutano a partire. Le carte più costose entrano in gioco quando hai accumulato Essenza.",
    prompt: "Quale combinazione di costi ti lascia opzioni sia nei primi turni sia più avanti?",
    choices: ["Una combinazione di carte economiche e potenti.", "Soltanto carte da 7 o più Essenze.", "Soltanto carte da 1 Essenza."],
    answer: 0,
  },
  // Missioni aggiunte nella fase 4 (in fondo, così i progressi già salvati restano validi)
  {
    title: "Mazzo vuoto e mano piena",
    lesson: "Quando il tuo mazzo è finito, a ogni turno in cui dovresti pescare subisci danni: 1 la prima volta, poi 2, poi 3 e così via. Un avviso al centro dello schermo te lo ricorda. Se hai già 10 carte in mano, la carta pescata viene scartata.",
    prompt: "Il tuo mazzo è vuoto e hai già subito 2 danni da esaurimento. Quanti danni subisci alla prossima pescata?",
    choices: ["Nessuno.", "2.", "3."],
    answer: 2,
  },
  {
    title: "Giocare con le dita",
    lesson: "Per giocare una carta toccala oppure trascinala dalla mano al tavolo (o sul bersaglio). Tieni premuta una carta per vederla in grande con la spiegazione delle sue abilità. Per attaccare tocca una tua creatura e poi il bersaglio.",
    prompt: "Come vedi la spiegazione delle abilità di una carta?",
    choices: ["Tenendo premuta la carta.", "Scuotendo il telefono.", "Non si può vedere."],
    answer: 0,
  },
  {
    title: "Discesa nel Velo",
    lesson: "Nella Discesa nel Velo affronti una partita dopo l’altra con il mazzo della fazione che scegli. Dopo ogni vittoria aggiungi al mazzo 1 carta su 3. Gli avversari diventano sempre più forti; alla terza sconfitta la discesa finisce e ricevi Schegge (e buste, se vai lontano) in base alle vittorie.",
    prompt: "Quando finisce la Discesa nel Velo?",
    choices: ["Alla prima sconfitta.", "Alla terza sconfitta.", "Dopo 5 vittorie."],
    answer: 1,
  },
  {
    title: "Rissa della settimana",
    lesson: "Ogni settimana la Rissa ha una regola speciale diversa: per esempio tutte le creature con Furia, doppia pescata o mazzi casuali. Vincere le Risse conta anche per gli Obiettivi, i traguardi permanenti che trovi in Missioni.",
    prompt: "Che cosa cambia ogni settimana nella Rissa?",
    choices: ["La regola speciale.", "Il numero di punti vita dell’eroe: sempre 1.", "Niente."],
    answer: 0,
  },
];

const storageKey = "veilbreak-tutorial-progress";
let completed = 0;
try {
  const saved = Number(localStorage.getItem(storageKey));
  if (Number.isInteger(saved) && saved >= 0 && saved <= missions.length) completed = saved;
} catch {
  // Il tutorial funziona anche se il browser blocca la memoria locale.
}

// Premi del tutorial: una sola volta per missione, anche per i progressi salvati prima dei premi.
function grantTutorialRewards() {
  for (let i = 0; i < completed; i++) {
    rewardOnce(`tutorial-${i}`, p => addShards(tutorialReward.perMission, `${t("tutorial")} · ${t(missions[i].title)}`, p));
  }
  if (completed === missions.length) {
    rewardOnce("tutorial-finale", p => { addShards(tutorialReward.final, t("tutorial completato"), p); grantTitle("primo-binder", p); });
  }
}

function add(container, tag, text) {
  const node = document.createElement(tag);
  node.textContent = t(text);
  container.append(node);
  return node;
}

export function renderTutorial(container, index = completed, message = "") {
  grantTutorialRewards();
  container.replaceChildren();
  add(container, "h2", "Tutorial a missioni");
  add(container, "p", t("Missioni completate {n}/{max} · Gettoni tutorial {n}", { n: completed, max: missions.length }));
  const status = add(container, "p", message);
  status.setAttribute("role", "status");
  if (completed === missions.length) add(container, "p", t("Premio finale sbloccato · Distintivo Primo Binder e {n} Schegge", { n: tutorialReward.final }));
  if (index < missions.length) {
    const mission = missions[index];
    add(container, "h3", mission.title);
    add(container, "p", mission.lesson);
    add(container, "p", mission.prompt);
    const choices = add(container, "div", "");
    choices.className = "mission-options";
    mission.choices.forEach((choice, i) => {
      add(choices, "button", choice).onclick = () => {
        if (i !== mission.answer) {
          status.textContent = t("Rileggi la regola e riprova.");
          return;
        }
        if (index === completed) {
          completed++;
          try { localStorage.setItem(storageKey, String(completed)); } catch {}
          renderTutorial(container, completed, t("Missione superata · Hai ottenuto 1 gettone tutorial e {n} Schegge.", { n: tutorialReward.perMission }));
        } else {
          renderTutorial(container, index + 1, "Risposta corretta.");
        }
      };
    });
  }
  if (completed && index === completed) {
    add(container, "button", "Rivedi le missioni").onclick = () => renderTutorial(container, 0);
  }
}
