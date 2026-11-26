// Prova su iPhone 13 simulato della fase 5: Collezione, Negozio (buste decorate, acquisto di un dorso), tavolo, mano piena, pass.
const { chromium, devices } = require('playwright');
const shots = (process.env.SHOTS ?? require('os').tmpdir()) + '/';
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'it-IT' });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('dialog', d => d.accept());
  await page.goto('http://127.0.0.1:8000/veilbreak-app/');
  await page.evaluate(() => { const p = JSON.parse(localStorage.getItem('veilbreak-profile') ?? '{}'); p.shards = 1500; localStorage.setItem('veilbreak-profile', JSON.stringify(p)); });
  await page.reload();
  // Collezione
  await page.click('#library');
  console.log('collezione:', (await page.locator('#collection-progress').innerText()).replace(/\n/g, ' | '));
  await page.selectOption('#filter', 'Sottocittà');
  await page.check('#missing-filter');
  console.log('Sottocittà incomplete:', await page.locator('#cards .card').count(), '|', (await page.locator('#collection-progress .progress-row').nth(1).innerText()).replace(/\n/g, ' '));
  await page.selectOption('#tribe-filter', 'Bestia');
  console.log('Bestie incomplete della Sottocittà:', await page.locator('#cards .card').count());
  await page.screenshot({ path: shots + 'f5-collezione.png' });
  // Negozio: buste decorate
  await page.click('#shop-nav');
  await page.waitForTimeout(300);
  console.log('buste decorate:', await page.locator('.offer .pack').count(), '| temi:', (await page.locator('.offer .pack').evaluateAll(els => els.map(e => e.className.replace('pack ', '').replace(' offer-art', '')))).join(', '));
  await page.screenshot({ path: shots + 'f5-negozio.png', fullPage: true });
  // Negozio: compra un dorso
  await page.click('text=Dorsi delle carte');
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem('veilbreak-profile')).shards);
  await page.locator('.back-tile', { hasText: 'Dorso al Neon' }).locator('button').click();
  await page.waitForTimeout(200);
  const prof = await page.evaluate(() => JSON.parse(localStorage.getItem('veilbreak-profile')));
  console.log('dorso comprato:', prof.backs, '| in uso:', prof.back, '| Schegge', before, '→', prof.shards, '| scheda:', (await page.locator('.back-tile.equipped').innerText()).replace(/\n/g, ' '));
  await page.screenshot({ path: shots + 'f5-dorsi.png' });
  // Missioni: Sentiero settimanale
  await page.click('#quests-nav');
  await page.waitForTimeout(300);
  console.log('sentiero:', (await page.locator('.pass-head').innerText()).replace(/\n/g, ' '), '| tappe:', await page.locator('.pass-node').count(), '| premi:', await page.locator('.pass-reward').count());
  await page.screenshot({ path: shots + 'f5-sentiero.png' });
  // Partita: tavolo
  await page.click('#match');
  await page.click('text=Inizia partita');
  await page.click('text=Conferma mano');
  await page.waitForTimeout(2200);
  console.log('vita eroi:', (await page.locator('.hero-portrait .life').allInnerTexts()).join(' / '), '| decorazioni:', await page.locator('.zone-decor').count());
  await page.screenshot({ path: shots + 'f5-tavolo.png' });
  console.log('errori:', errors.length ? errors : 'nessuno');
  await browser.close();
})();
