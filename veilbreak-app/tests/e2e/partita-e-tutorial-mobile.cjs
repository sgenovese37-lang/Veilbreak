const { chromium, devices } = require('playwright');
const shots = (process.env.SHOTS ?? require('os').tmpdir()) + '/';
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('requestfailed', r => errors.push('requestfailed: ' + r.url()));
  const overflow = async label => {
    const o = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, innerWidth)) - page.viewportSize().width;
    if (o > 0) errors.push(`overflow orizzontale ${o}px in ${label}`);
  };
  await page.goto('http://127.0.0.1:8000/veilbreak-app/');
  await page.screenshot({ path: shots + '01-setup.png' });
  await overflow('setup');

  // Partita contro il computer
  await page.selectOption('select[name=mode]', 'cpu');
  await page.selectOption('select[name=level]', 'Normale');
  await page.click('#pick-first [data-faction="Corte di Hollow"]');
  await page.click('#pick-second [data-faction="Patto Neon"]');
  await page.click('text=Inizia partita');
  await page.screenshot({ path: shots + '02-mulligan.png', fullPage: true });
  // sostituisci due carte
  const hand = page.locator('.hand .hand-card');
  await hand.nth(0).click(); await hand.nth(1).click();
  const pressed = await page.locator('.hand .hand-card[aria-pressed=true]').count();
  console.log('mulligan selezionate:', pressed);
  await page.click('text=Conferma mano');
  await page.waitForTimeout(900);
  let turns = 0, plays = 0, attacks = 0, powers = 0, imgsBroken = 0;
  const status = () => page.locator('#table [role=status]').first().innerText();
  for (; turns < 40; turns++) {
    await page.waitForFunction(() => {
      const s = document.querySelector('#table [role=status]')?.textContent ?? '';
      return !s.includes('avversario');
    }, null, { timeout: 10000 });
    if (/^(Vince|Vittoria|Sconfitta|Pareggio)/.test(await status())) break;
    // gioca le carte disponibili
    for (let k = 0; k < 10; k++) {
      const playable = page.locator('.hand .hand-card.playable');
      if (!(await playable.count())) break;
      await playable.first().click(); plays++;
      if ((await status()).includes('bersaglio')) {
        const t = page.locator('#table .target');
        if (await t.count()) await t.first().click(); else await page.click('text=Annulla');
      }
    }
    // potere eroe
    const power = page.locator('.hero-strip.mine .hero-power:not([disabled])');
    if (await power.count()) {
      await power.click(); powers++;
      if ((await status()).includes('bersaglio')) {
        const t = page.locator('#table .target');
        if (await t.count()) await t.first().click(); else await page.click('text=Annulla');
      }
    }
    // attacchi
    for (let k = 0; k < 8; k++) {
      const attacker = page.locator('.board.mine .token.can-attack');
      if (!(await attacker.count()) || /^(Vince|Vittoria|Sconfitta)/.test(await status())) break;
      await attacker.first().click();
      const heroTarget = page.locator('.hero-portrait.target');
      if (await heroTarget.count()) await heroTarget.click();
      else if (await page.locator('.token.target').count()) await page.locator('.token.target').first().click();
      else { await page.click('text=Annulla'); break; }
      attacks++;
    }
    if (turns === 2) await page.screenshot({ path: shots + '03-partita-turno3.png', fullPage: true });
    if (turns === 5) await page.screenshot({ path: shots + '04-partita-turno6.png' });
    const s = await status();
    if (/^(Vince|Vittoria|Sconfitta|Pareggio)/.test(s)) break;
    await overflow('partita turno ' + turns);
    await page.click('text=Fine turno');
    await page.waitForTimeout(700);
  }
  imgsBroken = await page.evaluate(() => [...document.images].filter(i => i.complete && i.naturalWidth === 0).length);
  console.log('esito:', await status(), '| turni giocati:', turns, '| carte:', plays, '| attacchi:', attacks, '| poteri:', powers, '| immagini rotte:', imgsBroken);
  await page.locator('#table details summary').click().catch(() => {});
  await page.screenshot({ path: shots + '05-fine-partita.png', fullPage: true });

  // Uscita dalla partita e catalogo
  page.once('dialog', d => d.accept());
  await page.locator('.result button, .menu-exit').first().click();
  await page.click('#library');
  await page.waitForTimeout(500);
  const imgs = await page.locator('#cards img').count();
  await page.screenshot({ path: shots + '06-catalogo.png' });
  await page.locator('#cards button.card').first().click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: shots + '07-dettaglio-sindaco.png' });
  const viewerText = await page.locator('#card-viewer').innerText();
  console.log('catalogo immagini:', imgs, '| avvisi differenze:', await page.locator('#cards .warning').count());
  console.log('dettaglio contiene differenze:', viewerText.includes('Differenze'));
  await page.click('#card-viewer >> text=Chiudi');
  await overflow('catalogo');

  // Mazzi
  await page.click('#decks');
  await page.screenshot({ path: shots + '08-mazzi.png' });
  await overflow('mazzi');

  // Tutorial
  await page.evaluate(() => localStorage.removeItem('veilbreak-tutorial-progress'));
  await page.click('#missions');
  await page.screenshot({ path: shots + '09-tutorial-inizio.png' });
  const answers = [1, 0, 2, 0, 1, 2, 0, 1, 2, 0];
  // risposta sbagliata alla prima
  await page.locator('.mission-options button').nth(0).click();
  console.log('risposta sbagliata:', await page.locator('#tutorial [role=status]').innerText());
  for (const a of answers) {
    await page.locator('.mission-options button').nth(a).click();
    await page.waitForTimeout(100);
  }
  await page.screenshot({ path: shots + '10-tutorial-completo.png', fullPage: true });
  console.log('tutorial:', (await page.locator('#tutorial').innerText()).split('\n').slice(0, 4).join(' | '));
  await page.reload();
  await page.click('#missions');
  console.log('dopo ricarica:', (await page.locator('#tutorial p').first().innerText()));
  await overflow('tutorial');
  console.log('errori:', errors.length ? errors : 'nessuno');
  await browser.close();
})();
