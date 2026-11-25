// Prova su iPhone 13 simulato: le carte corrette usano le nuove immagini e mostrano l'originale a richiesta.
const { chromium, devices } = require('playwright');
const shots = (process.env.SHOTS ?? require('os').tmpdir()) + '/';
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ ...devices['iPhone 13'], locale: 'it-IT' })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('requestfailed', r => errors.push('richiesta fallita: ' + r.url()));
  await page.goto('http://127.0.0.1:8000/veilbreak-app/');
  await page.click('#library');
  await page.selectOption('#filter', 'Corte di Hollow');
  await page.waitForTimeout(600);
  console.log('avvisi ⚠ nel catalogo Corte:', await page.locator('#cards .warning').count());
  await page.screenshot({ path: shots + '30-catalogo-corte.png' });
  // Chirurgo del Vicolo (3)
  await page.locator('#cards button.card', { hasText: 'Chirurgo del Vicolo' }).click();
  await page.waitForTimeout(700);
  const src = await page.locator('.viewer-art').getAttribute('src');
  console.log('immagine nella scheda:', src);
  console.log('nota:', await page.locator('#card-viewer').innerText().then(t => t.includes('Illustrazione corretta')));
  await page.screenshot({ path: shots + '31-chirurgo-corretto.png' });
  await page.click('text=Vedi originale');
  await page.waitForTimeout(600);
  console.log('dopo «Vedi originale»:', await page.locator('.viewer-art').getAttribute('src'));
  await page.click('#card-viewer >> text=Chiudi');
  await page.selectOption('#filter', '');
  await page.waitForTimeout(400);
  console.log('avvisi ⚠ in tutto il catalogo:', await page.locator('#cards .warning').count());
  const broken = await page.evaluate(async () => {
    const imgs = [...document.querySelectorAll('#cards img')];
    for (const i of imgs) { i.loading = 'eager'; }
    await new Promise(r => setTimeout(r, 1500));
    return imgs.filter(i => i.complete && i.naturalWidth === 0).length;
  });
  console.log('miniature non caricate:', broken);
  console.log('errori:', errors.length ? errors : 'nessuno');
  await browser.close();
})();
