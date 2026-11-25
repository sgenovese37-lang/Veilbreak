// Prova su iPhone 13 simulato: trascinare una carta dalla mano al tavolo la gioca;
// rilasciarla di nuovo sulla mano annulla.
const { chromium, devices } = require('playwright');
const shots = (process.env.SHOTS ?? require('os').tmpdir()) + '/';
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'it-IT' });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('dialog', d => d.accept());
  await page.goto('http://127.0.0.1:8000/veilbreak-app/');
  await page.click('[data-mode="local"]');
  await page.click('text=Inizia partita');
  await page.click('text=Conferma mano'); await page.click('text=Mostra la mia mano');
  await page.click('text=Conferma mano'); await page.click('text=Mostra la mia mano');
  // dest(box del carta, box della mano) → punto di rilascio, calcolato dopo lo scorrimento
  const drag = async (card, dest, shot) => {
    await card.scrollIntoViewIfNeeded();
    const box = await card.boundingBox();
    const hand = await page.locator('.hand').boundingBox();
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    const [toX, toY] = dest(box, hand);
    await page.mouse.move(x, y); await page.mouse.down();
    for (let k = 1; k <= 12; k++) await page.mouse.move(x + (toX - x) * k / 12, y + (toY - y) * k / 12);
    if (shot) await page.screenshot({ path: shots + shot });
    await page.mouse.up();
    await page.waitForTimeout(900);
  };
  let played = false, cancelled = false;
  for (let turn = 0; turn < 10 && !(played && cancelled); turn++) {
    await page.waitForSelector('.end-turn:not([disabled])');
    await page.waitForTimeout(1600);
    const playable = page.locator('.hand .hand-card.playable');
    if (await playable.count() >= (cancelled ? 1 : 1)) {
      const handBefore = await page.locator('.hand .hand-card').count();
      if (!cancelled) {
        await drag(playable.first(), b => [b.x + b.width / 2 + 5, b.y + b.height / 2 - 30]);   // rilasciata sulla mano
        cancelled = (await page.locator('.hand .hand-card').count()) === handBefore && !(await page.locator('.drag-ghost').count());
        console.log('rilasciata sulla mano: carte', handBefore, '→', await page.locator('.hand .hand-card').count(), cancelled ? '(annullata, corretto)' : 'ERRORE');
      }
      if (!(await page.locator('.hand .hand-card.playable').count())) { await page.click('text=Fine turno'); await page.click('text=Mostra la mia mano'); continue; }
      const before = await page.locator('.hand .hand-card').count();
      await drag(page.locator('.hand .hand-card.playable').first(), (b, h) => [h.x + h.width / 2, Math.max(60, h.y - 160)], played ? undefined : 'trascina.png');
      if (await page.locator('.banner', { hasText: 'bersaglio' }).count()) {
        const t = page.locator('.token.target, .hero-portrait.target');
        if (await t.count()) await t.first().click(); else await page.click('text=Annulla');
      }
      const after = await page.locator('.hand .hand-card').count();
      if (!(await page.locator('.hand .hand-card.playable').count())) { /* niente altro da giocare */ }
      if (after < before) { played = true; console.log('trascinata sul tavolo: carte in mano', before, '→', after); }
    }
    await page.click('text=Fine turno'); await page.click('text=Mostra la mia mano');
  }
  console.log(played && cancelled ? 'trascinamento: ok' : 'ERRORE: trascinamento non riuscito');
  console.log('errori:', errors.length ? errors : 'nessuno');
  await browser.close();
})();
