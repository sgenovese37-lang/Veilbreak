// Prova su iPhone 13 simulato: l'editor mostra i mazzi predefiniti bilanciati e le copie possedute.
const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ ...devices['iPhone 13'], locale: 'it-IT' })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:8000/veilbreak-app/');
  await page.click('#decks');
  const rows = await page.locator('.deck-list li').allInnerTexts();
  const count = name => rows.find(r => r.startsWith(name))?.split('\n').filter(Boolean);
  console.log('carte nel mazzo:', await page.locator('#deck-editor .actions strong').innerText());
  console.log('Specchio Incrinato:', count('Specchio Incrinato').join(' | '));
  console.log('Ultima Legge:', count('Ultima Legge').join(' | '));
  console.log('salva abilitato:', await page.locator('text=Salva mazzo').isEnabled());
  await page.click('text=Salva mazzo');
  console.log('esito:', await page.locator('#deck-editor [role=status]').innerText());
  console.log('errori:', errors.length ? errors : 'nessuno');
  await browser.close();
})();
