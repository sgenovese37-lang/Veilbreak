const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ ...devices['iPhone 13'], locale: 'it-IT' })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const W = page.viewportSize().width;
  const wide = () => page.evaluate(() => Math.max(document.documentElement.scrollWidth, innerWidth));
  await page.goto('http://127.0.0.1:8000/veilbreak-app/');
  await page.click('#pick-first [data-faction="Sottocittà"]');
  await page.click('#pick-second [data-faction="Senza Santi"]');
  await page.click('text=Inizia partita');
  await page.click('text=Conferma mano');
  await page.waitForTimeout(400);
  await page.click('text=Fine turno');
  await page.waitForTimeout(1200);
  await page.click('text=Fine turno');
  await page.waitForTimeout(1200);
  const bar = await page.locator('.turn-bar').boundingBox();
  const vh = page.viewportSize().height;
  console.log('barra in vista senza scorrere:', bar.y >= 0 && bar.y + bar.height <= vh);
  console.log('riepilogo:', (await page.locator('.recap').first().innerText().catch(() => 'assente')).replace(/\n/g, ' | '));
  console.log('mano scorre in orizzontale:', await page.locator('.hand').evaluate(e => e.scrollWidth > e.clientWidth));
  console.log('larghezza pagina', await wide(), 'schermo', W);
  await page.screenshot({ path: (process.env.SHOTS ?? require('os').tmpdir()) + '/11-barra-e-mano.png' });
  // dettagli in partita: si tiene premuta la carta (non c'è più il pulsante «i»)
  const held = await page.locator('.hand .hand-card').first().boundingBox();
  await page.mouse.move(held.x + held.width / 2, held.y + held.height / 2); await page.mouse.down();
  await page.waitForTimeout(700); await page.mouse.up(); await page.waitForTimeout(300);
  console.log('dettagli in partita aperti:', await page.locator('.peek-layer:not([hidden]) .peek-rules').count() === 1);
  await page.screenshot({ path: (process.env.SHOTS ?? require('os').tmpdir()) + '/12-dettagli-in-partita.png' });
  await page.mouse.click(195, 60); await page.waitForTimeout(300);
  page.once('dialog', d => d.accept());
  await page.click('.menu-exit');
  console.log('tornato al menu:', await page.locator('#setup').isVisible());
  for (const id of ['library', 'decks', 'missions']) { await page.click('#' + id); console.log(id, 'larghezza', await wide()); }
  console.log('errori:', errors.length ? errors : 'nessuno');
  await browser.close();
})();
