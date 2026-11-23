const missions = [
  {
    title: "Benvenuto a VEILBREAK",
    lesson: "Tu e l’altro Binder iniziate con 30 punti vita. Vinci portando l’eroe avversario a 0.",
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
    lesson: "Inizi con 6 carte. Con il mulligan puoi sostituirne fino a 2 prima che inizi la partita.",
    prompt: "Quante delle tue 6 carte puoi sostituire?",
    choices: ["Tutte e 6.", "Esattamente 3.", "Da 0 a 2."],
    answer: 2,
  },
  {
    title: "Le creature",
    lesson: "Una creatura con Rapidità può attaccare nel turno in cui entra in gioco. Provocazione protegge il suo eroe dagli attacchi.",
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
    lesson: "Ogni fazione ha un eroe con un potere distintivo. Attivarlo costa 1 Essenza e puoi usarlo una volta durante il tuo turno.",
    prompt: "Quanto costa usare un potere dell’eroe?",
    choices: ["Una carta.", "Un punto Attacco.", "1 Essenza."],
    answer: 2,
  },
  {
    title: "Le quattro fazioni",
    lesson: "Corte di Hollow, Patto Neon, Senza Santi e Sottocittà hanno 15 carte a testa. Ogni mazzo predefinito raccoglie le carte di una fazione.",
    prompt: "Quante carte contiene il mazzo predefinito della Sottocittà?",
    choices: ["15.", "30.", "60."],
    answer: 0,
  },
  {
    title: "Modalità di gioco",
    lesson: "Nel prototipo puoi sfidare il computer a tre difficoltà o giocare in due sullo stesso dispositivo.",
    prompt: "Quale modalità scegli per esercitarti da solo?",
    choices: ["Due giocatori sullo stesso dispositivo.", "Contro il computer.", "Catalogo delle carte."],
    answer: 1,
  },
  {
    title: "Missioni e premi",
    lesson: "Ogni prova del tutorial superata assegna un premio. Il completamento di tutte le missioni sblocca anche un premio finale.",
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
];

const storageKey = "veilbreak-tutorial-progress";
let completed = 0;
try {
  const saved = Number(localStorage.getItem(storageKey));
  if (Number.isInteger(saved) && saved >= 0 && saved <= missions.length) completed = saved;
} catch {
  // Il tutorial funziona anche se il browser blocca la memoria locale.
}

function add(container, tag, text) {
  const node = document.createElement(tag);
  node.textContent = text;
  container.append(node);
  return node;
}

export function renderTutorial(container, index = completed, message = "") {
  container.replaceChildren();
  add(container, "h2", "Tutorial a missioni");
  add(container, "p", `Missioni completate ${completed}/${missions.length} · Gettoni tutorial ${completed}`);
  const status = add(container, "p", message);
  status.setAttribute("role", "status");
  if (completed === missions.length) add(container, "p", "Premio finale sbloccato · Distintivo Primo Binder");
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
          status.textContent = "Rileggi la regola e riprova.";
          return;
        }
        if (index === completed) {
          completed++;
          try { localStorage.setItem(storageKey, String(completed)); } catch {}
          renderTutorial(container, completed, "Missione superata · Hai ottenuto 1 gettone tutorial.");
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
