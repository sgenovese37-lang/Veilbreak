// Prova su iPhone 13 simulato delle modalità Discesa nel Velo e Rissa della settimana.
const { chromium, devices } = require('playwright');
const shots = (process.env.SHOTS ?? require('os').tmpdir()) + '/';
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'it-IT' });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('dialog', d => d.accept());
  await page.goto('http://127.0.0.1:8000/veilbreak-app/');
  console.log('riquadri modalità:', (await page.locator('.mode-tile').allInnerTexts()).map(t => t.replace(/\n/g, ' · ')).join(' || '));
  await page.click('.mode-tile.descent');
  await page.click('.mode-faction[data-faction="Sottocittà"]');
  console.log('discesa:', (await page.locator('.descent-status').innerText()).replace(/\n/g, ' · '), '|', await page.locator('.descent-next p').innerText());
  await page.screenshot({ path: shots + 'discesa.png' });
  await page.click('text=Combatti');
  await page.click('text=Conferma mano');
  console.log('partita della discesa avviata:', await page.locator('.arena').count() > 0, '| vita avversaria:', await page.locator('.hero-strip.enemy .hero-portrait').getAttribute('aria-label'));
  // abbandona dal menu: torna alla discesa
  await page.click('text=Menu');
  const leave = page.locator('button:has-text("Abbandona")');
  if (await leave.count()) await leave.first().click();
  await page.waitForTimeout(500);
  console.log('dopo l\'abbandono:', await page.locator('#modes-view').isVisible() ? 'schermata della discesa' : 'altro');
  await page.click('text=‹ Indietro');
  await page.click('.mode-tile.brawl');
  console.log('rissa:', (await page.locator('.brawl-rule').innerText()).replace(/\n/g, ' · '));
  await page.screenshot({ path: shots + 'rissa.png' });
  await page.click('.mode-faction[data-faction="Patto Neon"]');
  await page.click('text=Conferma mano');
  console.log('partita della rissa avviata:', await page.locator('.arena').count() > 0);
  console.log('errori:', errors.length ? errors : 'nessuno');
  await browser.close();
})();
