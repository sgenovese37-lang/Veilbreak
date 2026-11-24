// Ambientazioni del tavolo, una per fazione: sfondo dalle illustrazioni, effetti animati e sottofondo.
// Una nuova fazione può aggiungere qui la sua voce con lo stesso tema usato in heroes.mjs.
export const environments = {
  hollow: { name: "Sala del Consiglio", text: "Archivi infiniti, nebbia tra gli scaffali, lampade che tremano." },
  neon: { name: "Centrale delle Frequenze", text: "Binari allagati, pioggia elettrica, insegne che sfarfallano." },
  saints: { name: "Cappella dell’Aureola Spezzata", text: "Corsie abbandonate, candele votive e cenere che sale." },
  undercity: { name: "Deposito Sotto le Rotaie", text: "Gallerie umide, gocce che cadono e un rombo lontano." },
};
export const environmentFor = theme => (Object.hasOwn(environments, theme) ? theme : null);
