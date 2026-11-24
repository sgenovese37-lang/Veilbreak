// Service worker: rende il gioco installabile e giocabile offline.
// Cambia VERSION quando pubblichi una nuova versione dei file.
const VERSION = "veilbreak-v7";
const SHELL = [
  "./", "./index.html", "./style.css", "./manifest.webmanifest",
  "./app.mjs", "./game.mjs", "./ai.mjs", "./cards.mjs", "./heroes.mjs", "./illustrations.mjs",
  "./tutorial.mjs", "./profile.mjs", "./missions.mjs", "./story.mjs", "./audio.mjs", "./decks.mjs",
  "./assets/icone/icona-192.png", "./assets/icone/icona-512.png",
  "./assets/ornamenti/filigrana.webp", "./assets/ornamenti/divisore.webp", "./environments.mjs",
  "./assets/ambientazioni/hollow.webp", "./assets/ambientazioni/neon.webp", "./assets/ambientazioni/saints.webp", "./assets/ambientazioni/undercity.webp",
  "./assets/fonts/eb-garamond-latin-500-normal.woff", "./assets/fonts/eb-garamond-latin-600-normal.woff", "./assets/fonts/eb-garamond-latin-500-italic.woff",
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
