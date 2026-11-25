// Prova su iPhone 13 simulato: più creature attaccano insieme lo stesso bersaglio,
// nessun riquadro copre il tavolo e il Registro segnala le mosse nuove.
const { chromium, devices } = require('playwright');
const shots = (process.env.SHOTS ?? require('os').tmpdir()) + '/';
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ ...devices['iPhone 13'], locale: 'it-IT' })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:8000/veilbreak-app/');
  await page.click('[data-level="Facile"]');
  await page.click('#pick-first [data-faction="Sottocittà"]');
  await page.click('#pick-second [data-faction="Senza Santi"]');
  await page.click('text=Inizia partita');
  await page.click('text=Conferma mano');
  let done = false;
  for (let turn = 0; turn < 14 && !done; turn++) {
    await page.waitForSelector('.arena.my-turn .end-turn:not([disabled]), .result', { timeout: 40000 });
    if (await page.locator('.result').count()) break;
    if (turn > 0) console.log(`turno ${turn}: riquadri sul tavolo ${await page.locator('.last-turn').count()} · registro "${await page.locator('.topbar button').last().innerText()}"`);
    for (let k = 0; k < 6; k++) {
      const c = page.locator('.hand .hand-card.playable');
      if (!(await c.count())) break;
      await c.first().click();
      if (await page.locator('.banner', { hasText: 'bersaglio' }).count()) {
        const t = page.locator('.token.target, .hero-portrait.target');
        if (await t.count()) await t.first().click(); else await page.click('text=Annulla');
      }
      await page.waitForTimeout(250);
    }
    const ready = page.locator('.board.mine .token.can-attack');
    if (await ready.count() >= 2) {
      await ready.nth(0).click();
      await ready.nth(1).click();
      console.log('banner:', await page.locator('.banner').innerText(), '| scelte:', await page.locator('.board.mine .token.attacking').count(),
        '| pulsante Tutte:', await page.locator('.end-turn.all').count());
      await page.screenshot({ path: shots + '70-attacco-multiplo.png' });
      const heroTarget = page.locator('.hero-portrait.target');
      const target = (await heroTarget.count()) ? heroTarget : page.locator('.token.target').first();
      const kind = (await heroTarget.count()) ? 'eroe' : 'creatura';
      const attackers = await page.locator('.board.mine .token.attacking .att').allInnerTexts();
      const enemiesBefore = await page.locator('.board.enemy .token').count();
      const lifeBefore = Number(await page.locator('.hero-strip.enemy .life').innerText());
      const readyBefore = await page.locator('.board.mine .token.can-attack').count();
      const targetDef = kind === 'creatura' ? await target.locator('.dif').innerText() : '-';
      const targetUid = kind === 'creatura' ? await target.getAttribute('data-uid') : null;
      console.log('bersaglio:', kind, 'difesa', targetDef, '| attacco delle creature scelte:', attackers.join(' + '), '| pronte prima', readyBefore);
      await target.click();
      await page.waitForSelector('.arena.my-turn:not(.busy)', { timeout: 10000 });
      await page.waitForTimeout(300);
      const lifeAfter = Number(await page.locator('.hero-strip.enemy .life').innerText());
      if (targetUid) console.log('bersaglio dopo:', (await page.locator(`.board.enemy .token[data-uid="${targetUid}"]`).count()) ? 'difesa ' + await page.locator(`.board.enemy .token[data-uid="${targetUid}"] .dif`).innerText() : 'distrutto');
      console.log('attacco multiplo eseguito · vita eroe nemico', lifeBefore, '→', lifeAfter, '· creature nemiche', enemiesBefore, '→', await page.locator('.board.enemy .token').count(), '· creature ancora pronte', await page.locator('.board.mine .token.can-attack').count());
      done = true;
      break;
    }
    await page.click('text=Fine turno');
    await page.waitForTimeout(400);
  }
  if (!done) console.log('nessun turno con due attaccanti in questa partita');
  console.log('errori:', errors.length ? errors : 'nessuno');
  await browser.close();
})();
