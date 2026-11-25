// Prova su iPhone 13 simulato: mazzo con due fazioni (principale + alleata) dall'editor, al massimo 2.
const { chromium, devices } = require('playwright');
const shots = (process.env.SHOTS ?? require('os').tmpdir()) + '/';
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ ...devices['iPhone 13'], locale: 'it-IT' })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept());
  await page.goto('http://127.0.0.1:8000/veilbreak-app/');
  await page.click('#decks');
  await page.click('#add-ally');
  console.log('fazioni proposte:', (await page.locator('.ally-option').allInnerTexts()).join(', '));
  await page.click('.ally-option[data-ally="Patto Neon"]');
  console.log('pulsante «Seconda fazione» ancora presente:', await page.locator('#add-ally').count(), '| fazioni scelte:', (await page.locator('.deck-chip').allInnerTexts()).map(s => s.replace('✕', '').trim()).join(' + '));
  // 4 carte della Corte fuori, 4 del Patto Neon dentro
  for (const id of [1, 2, 6, 7]) if (await page.locator(`#remove-${id}`).isEnabled()) await page.click(`#remove-${id}`);
  for (const id of [23, 24, 27, 29]) await page.click(`#plus-${id}`);
  console.log('carte:', await page.locator('#deck-editor .actions strong').innerText());
  await page.screenshot({ path: shots + '95-mazzo-due-fazioni.png' });
  await page.click('text=Salva mazzo');
  console.log('esito:', await page.locator('#deck-editor [role=status]').innerText());
  await page.click('#match');
  await page.click('#pick-first [data-hero="Corte di Hollow"]');
  await page.click('text=Inizia partita');
  await page.click('text=Conferma mano');
  await page.waitForSelector('.hero-strip.mine');
  console.log('in partita:', await page.locator('.hero-strip.mine .hero-info small').innerText());
  // togliere la seconda fazione rimette il pulsante e toglie le sue carte
  await page.click('text=☰ Menu');
  await page.click('#decks');
  await page.click('#remove-ally');
  console.log('dopo «✕»:', await page.locator('#deck-editor .actions strong').innerText(), '| pulsante di nuovo presente:', await page.locator('#add-ally').count());
  console.log('larghezza', await page.evaluate(() => document.documentElement.scrollWidth));
  console.log('errori:', errors.length ? errors.join(' | ') : 'nessuno');
  await browser.close();
})();
