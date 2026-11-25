// Prova su iPhone 13 simulato delle aggiunte della Fase 1: Frammento di Essenza per chi gioca
// per secondo, eroi della Storia bloccati e sbloccati, musica, lingue (italiano, inglese, tedesco, spagnolo).
const { chromium, devices } = require('playwright');
const shots = (process.env.SHOTS ?? require('os').tmpdir()) + '/';
const url = 'http://127.0.0.1:8000/veilbreak-app/';
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'it-IT' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept());
  await page.goto(url);

  // Eroi della Storia: bloccati all'inizio
  const locked = page.locator('#pick-first .hero-choice.locked');
  console.log('eroi bloccati:', await locked.count(), '|', (await locked.first().innerText()).replace(/\n/g, ' · '));
  console.log('pulsante musica:', await page.locator('#music-toggle').innerText(), '| lingua:', await page.locator('#lang-select').inputValue());

  // Due giocatori: il secondo riceve una carta in più e il Frammento di Essenza
  await page.selectOption('select[name=mode]', 'local');
  await page.click('text=Inizia partita');
  console.log('mano del primo:', await page.locator('.hand .hand-card').count(), '|', await page.locator('.order-note').innerText());
  await page.click('text=Conferma mano');
  await page.click('text=Mostra la mia mano');
  console.log('mano del secondo:', await page.locator('.hand .hand-card').count(), '|', await page.locator('.order-note').innerText());
  await page.screenshot({ path: shots + '80-secondo-giocatore.png' });
  await page.click('text=Conferma mano');
  await page.click('text=Mostra la mia mano');
  await page.waitForSelector('.end-turn:not([disabled])');
  await page.click('text=Fine turno');
  await page.click('text=Mostra la mia mano');
  const shard = page.locator('.hand-card[aria-label^="Frammento di Essenza"]');
  console.log('Frammento di Essenza in mano al secondo:', await shard.count());
  const before = await page.locator('.hero-strip.mine .crystals .count b').innerText();
  await page.screenshot({ path: shots + '81-frammento-in-mano.png' });
  await shard.click();
  await page.waitForTimeout(900);
  const after = await page.locator('.hero-strip.mine .crystals .count b').innerText();
  console.log(`Essenza prima ${before} → dopo ${after} · frammento ancora in mano: ${await shard.count()}`);
  await page.click('text=☰ Menu');

  // Sblocco degli eroi: Storia completata
  await page.evaluate(() => {
    const p = JSON.parse(localStorage.getItem('veilbreak-profile') ?? '{}');
    p.story = { cleared: 8 };
    localStorage.setItem('veilbreak-profile', JSON.stringify(p));
  });
  await page.goto(url);
  console.log('eroi bloccati dopo la Storia:', await page.locator('#pick-first .hero-choice.locked').count(),
    '| eroi disponibili:', await page.locator('#pick-first .hero-choice').count());
  await page.click('#pick-first [data-hero="orfeo-grimm"]');
  await page.screenshot({ path: shots + '82-eroi-sbloccati.png', fullPage: true });
  await page.click('text=Inizia partita');
  await page.click('text=Conferma mano');
  await page.waitForSelector('.hero-strip.mine');
  console.log('eroe in partita:', await page.locator('.hero-strip.mine .hero-info strong').innerText(),
    '| potere:', await page.locator('.hero-strip.mine .hero-power').getAttribute('aria-label'));
  await page.click('text=☰ Menu');

  // Lingue
  for (const [lang, start, card] of [['en', 'Start match', 'Draw 2 cards.'], ['de', 'Partie starten', 'Ziehe 2 Karten.'], ['es', 'Empezar partida', 'Roba 2 cartas.']]) {
    await page.selectOption('#lang-select', lang);
    await page.waitForLoadState('load');
    await page.waitForSelector('#settings button.primary');
    const startText = await page.locator('#settings button.primary').innerText();
    await page.click('#library');
    const found = await page.locator('.card p', { hasText: card }).count();
    console.log(`${lang}: pulsante «${startText}» (${startText === start ? 'ok' : 'NO'}) · regola tradotta in Collezione: ${found > 0 ? 'sì' : 'no'} · menu: ${(await page.locator('nav').innerText()).replace(/\n/g, ' / ')}`);
    await page.screenshot({ path: shots + `83-lingua-${lang}.png` });
    await page.click('#match');
  }
  await page.click('text=Empezar partida');
  await page.waitForSelector('.order-note');
  console.log('es partita:', await page.locator('.banner').innerText(), '|', await page.locator('.end-turn').innerText());
  await page.screenshot({ path: shots + '84-partita-es.png' });
  await page.selectOption('#lang-select', 'it').catch(() => {});
  console.log('larghezza', await page.evaluate(() => document.documentElement.scrollWidth));
  console.log('errori:', errors.length ? errors.join(' | ') : 'nessuno');
  await browser.close();
})();
