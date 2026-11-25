// Prova su iPhone 13 simulato del secondo set: carte provvisorie in Collezione e in mano,
// scheda con la spiegazione delle parole chiave (Velato, Lascito, Furia, Patto).
const { chromium, devices } = require('playwright');
const shots = (process.env.SHOTS ?? require('os').tmpdir()) + '/';
const url = 'http://127.0.0.1:8000/veilbreak-app/';
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ ...devices['iPhone 13'], locale: 'it-IT' })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept());
  await page.goto(url);
  await page.evaluate(() => localStorage.setItem('veilbreak-custom-decks', JSON.stringify({
    'Patto Neon': [69, 70, 71, 72, 73, 74, 75, 17, 17, 17, 18, 18, 19, 19, 20, 20, 21, 22, 22, 23, 23, 24, 24, 25, 25, 26, 26, 27, 29, 30],
  })));
  await page.goto(url);
  await page.click('#library');
  await page.selectOption('#filter', 'Patto Neon');
  console.log('carte provvisorie in Collezione (Patto Neon):', await page.locator('.card .art.placeholder').count());
  await page.locator('.card', { hasText: 'La Regina Statica' }).first().click();
  const notes = await page.locator('#card-viewer .keyword-notes dt').allInnerTexts();
  console.log('parole chiave spiegate nella scheda della Regina Statica:', notes.join(', '));
  await page.screenshot({ path: shots + '90-scheda-secondo-set.png' });
  await page.keyboard.press('Escape');
  await page.click('#match');
  await page.click('#pick-first [data-hero="Patto Neon"]');
  await page.click('text=Inizia partita');
  console.log('carte provvisorie nella mano iniziale:', await page.locator('.hand .hand-card.placeholder').count(),
    '| costi con goccia di sangue (Patto):', await page.locator('.hand .gem.pact').count());
  await page.screenshot({ path: shots + '91-mano-secondo-set.png' });
  console.log('larghezza', await page.evaluate(() => document.documentElement.scrollWidth));
  console.log('errori:', errors.length ? errors.join(' | ') : 'nessuno');
  await browser.close();
})();
