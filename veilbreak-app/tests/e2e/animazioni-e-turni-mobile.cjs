// Prova su iPhone 13 simulato: scelta dell'eroe, annuncio del turno, mosse del computer
// mostrate una alla volta, anteprima tenendo premuto e cristalli di Essenza animati.
const { chromium, devices } = require('playwright');
const shots = (process.env.SHOTS ?? require('os').tmpdir()) + '/';
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ ...devices['iPhone 13'] })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:8000/veilbreak-app/');
  console.log('schede eroe:', await page.locator('#pick-first .hero-choice').count(), '+', await page.locator('#pick-second .hero-choice').count());
  await page.click('#pick-first [data-faction="Sottocittà"]');
  await page.click('#pick-second [data-faction="Patto Neon"]');
  console.log('eroe scelto:', await page.locator('#pick-first [aria-pressed=true] strong').innerText());
  await page.screenshot({ path: shots + '60-scelta-eroe.png', fullPage: true });
  await page.click('text=Inizia partita');
  await page.click('text=Conferma mano');
  await page.waitForSelector('.turn-splash', { timeout: 5000 });
  console.log('annuncio:', await page.locator('.turn-splash').innerText());
  await page.waitForTimeout(1600);
  // tenere premuto su una carta in mano
  const card = page.locator('.hand .hand-card').first();
  const box = await card.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(550);
  console.log('anteprima visibile:', await page.locator('.peek-layer:not([hidden])').count() === 1);
  await page.screenshot({ path: shots + '61-anteprima.png' });
  await page.mouse.up();
  console.log('anteprima chiusa:', await page.locator('.peek-layer[hidden]').count() === 1);
  // giocare una carta: l'Essenza cala con animazione
  const before = await page.locator('.hero-strip.mine .crystals .count b').innerText();
  const playable = page.locator('.hand .hand-card.playable');
  if (await playable.count()) {
    await playable.first().click();
    if (await page.locator('.banner', { hasText: 'bersaglio' }).count()) {
      const t = page.locator('.token.target, .hero-portrait.target');
      if (await t.count()) await t.first().click(); else await page.click('text=Annulla');
    }
    console.log('essenza prima/dopo:', before, '→', await page.locator('.hero-strip.mine .crystals .count b').innerText(), '| numero -N:', await page.locator('.float.mana').count());
  }
  // registro di tutti gli effetti che compaiono, per non dipendere dai tempi
  await page.evaluate(() => {
    window.__fx = [];
    new MutationObserver(list => {
      for (const m of list) for (const n of m.addedNodes) {
        if (!(n instanceof HTMLElement)) continue;
        if (n.matches('.turn-splash')) window.__fx.push('annuncio: ' + n.textContent);
        if (n.matches('.cast-preview')) window.__fx.push('carta: ' + n.textContent);
        if (n.matches('.token.ghost')) window.__fx.push('creatura distrutta');
        if (n.matches('.arena.enemy-turn')) window.__fx.push('tavolo avversario');
      }
    }).observe(document.body, { childList: true, subtree: true });
  });
  for (let turn = 0; turn < 4; turn++) {
    await page.waitForSelector('.arena.my-turn .end-turn:not([disabled])', { timeout: 30000 });
    for (let k = 0; k < 6; k++) {
      const c = page.locator('.hand .hand-card.playable');
      if (!(await c.count())) break;
      await c.first().click();
      if (await page.locator('.banner', { hasText: 'bersaglio' }).count()) {
        const t = page.locator('.token.target, .hero-portrait.target');
        if (await t.count()) await t.first().click(); else await page.click('text=Annulla');
      }
      await page.waitForTimeout(300);
    }
    for (let k = 0; k < 6; k++) {
      const a = page.locator('.board.mine .token.can-attack');
      if (!(await a.count())) break;
      await a.first().click();
      const t = page.locator('.hero-portrait.target, .token.target');
      if (await t.count()) await t.first().click(); else { await page.click('text=Annulla'); break; }
      await page.waitForTimeout(600);
    }
    if (await page.locator('.result').count()) break;
    await page.click('text=Fine turno');
    await page.waitForTimeout(500);
    if (turn === 2) {
      const shot = await page.waitForSelector('.cast-preview', { timeout: 15000 }).then(() => true).catch(() => false);
      if (shot) await page.screenshot({ path: shots + '62-mossa-avversario.png' });
    }
  }
  const fx = await page.evaluate(() => window.__fx);
  const count = prefix => fx.filter(x => x.startsWith(prefix)).length;
  console.log('annunci di turno:', count('annuncio'), '| carte dell’avversario mostrate:', fx.filter(x => x.startsWith('carta: L’avversario')).length,
    '| tue carte mostrate:', fx.filter(x => x.startsWith('carta: Hai')).length, '| creature distrutte animate:', count('creatura'));
  console.log('sequenza:', fx.slice(0, 8).join(' → '));
  console.log('larghezza', await page.evaluate(() => document.documentElement.scrollWidth));
  console.log('errori:', errors.length ? errors : 'nessuno');
  await browser.close();
})();
