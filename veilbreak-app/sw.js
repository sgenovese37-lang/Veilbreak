// Service worker: rende il gioco installabile e giocabile offline.
// Cambia VERSION quando pubblichi una nuova versione dei file.
const VERSION = "veilbreak-v13";
const SHELL = [
  "./icons.mjs", "./synth.mjs", "./sfx.mjs", "./embers.mjs", "./i18n.mjs", "./lingue/en.mjs", "./lingue/de.mjs", "./lingue/es.mjs", "./assets/fonts/cinzel-latin-600-normal.woff2", "./assets/fonts/cinzel-latin-700-normal.woff2", "./assets/fonts/cinzel-latin-900-normal.woff2", "./assets/fonts/cinzel-decorative-latin-900-normal.woff2", "./assets/fonts/cinzel-decorative-latin-700-normal.woff2", "./assets/sfondi/home-hollow.webp", "./assets/sfondi/home-neon.webp", "./assets/sfondi/home-saints.webp", "./assets/sfondi/home-undercity.webp", "./assets/originali-chatgpt/dorso-carte.webp", "./assets/eroi/carte/ada-vesper.webp", "./assets/eroi/carte/iona-volt.webp", "./assets/eroi/carte/elena-voss.webp", "./assets/eroi/carte/mara-sottorotaia.webp", "./assets/eroi/carte/orfeo-grimm.webp", "./assets/eroi/carte/dex-halogen.webp", "./assets/eroi/carte/ottavia.webp", "./assets/eroi/carte/nonna-ines.webp",
  "./", "./index.html", "./style.css", "./manifest.webmanifest",
  "./app.mjs", "./music.mjs", "./game.mjs", "./ai.mjs", "./cards.mjs", "./heroes.mjs", "./illustrations.mjs",
  "./tutorial.mjs", "./profile.mjs", "./missions.mjs", "./story.mjs", "./audio.mjs", "./decks.mjs",
  "./assets/icone/icona-192.png", "./assets/icone/icona-512.png",
  "./assets/ornamenti/filigrana.webp", "./assets/ornamenti/divisore.webp", "./environments.mjs",
  "./assets/ambientazioni/hollow.webp", "./assets/ambientazioni/neon.webp", "./assets/ambientazioni/saints.webp", "./assets/ambientazioni/undercity.webp",
  "./assets/fonts/eb-garamond-latin-500-normal.woff", "./assets/fonts/eb-garamond-latin-600-normal.woff", "./assets/fonts/eb-garamond-latin-500-italic.woff",
  "./assets/ornamenti/dorso.webp", "./assets/eroi/ritratti/ada-vesper.webp", "./assets/eroi/ritratti/iona-volt.webp", "./assets/eroi/ritratti/elena-voss.webp", "./assets/eroi/ritratti/mara-sottorotaia.webp",
  "./assets/eroi/ritratti/orfeo-grimm.webp", "./assets/eroi/ritratti/dex-halogen.webp", "./assets/eroi/ritratti/ottavia.webp", "./assets/eroi/ritratti/nonna-ines.webp", "./assets/miniature/frammento-essenza.webp", "./assets/originali-chatgpt/frammento-essenza.webp",
  "./assets/eroi/hollow.webp", "./assets/eroi/neon.webp", "./assets/eroi/saints.webp", "./assets/eroi/undercity.webp",
];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await cache.addAll(SHELL);
    try {
      const list = await (await fetch("./assets/miniature/elenco.json")).json();
      await cache.addAll(list.map(path => "./" + path));
    } catch { /* le miniature verranno salvate quando si aprono */ }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== VERSION) await caches.delete(key);
    await self.clients.claim();
  })());
});

// Prima la rete (così gli aggiornamenti arrivano subito), poi la copia salvata se si è offline.
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    try {
      const response = await fetch(request);
      if (response.ok) cache.put(request, response.clone());
      return response;
    } catch {
      return (await cache.match(request, { ignoreSearch: true })) ?? Response.error();
    }
  })());
});
