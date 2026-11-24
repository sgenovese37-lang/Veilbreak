// Prova su iPhone 13 simulato: Storia (capitolo 1), ricompense, missioni, buste, installazione e offline.
// Richiede Playwright e il server su 127.0.0.1:8000. Schermate in $SHOTS (predefinito: cartella temporanea).
const { chromium, devices } = require('playwright');
const shots = (process.env.SHOTS ?? require('os').tmpdir()) + '/';
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  const W = page.viewportSize().width;
  const checkWidth = async label => {
    const w = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, innerWidth));
    if (w > W) errors.push(`pagina larga ${w}px in ${label}`);
  };
  const status = () => page.locator('#table [role=status]').first().innerText();
  await page.goto('http://127.0.0.1:8000/veilbreak-app/');
  console.log('portafoglio iniziale:', await page.locator('#wallet').innerText());
  await page.screenshot({ path: shots + '20-intestazione.png' });
  await checkWidth('intestazione');

  // Storia
  await page.click('#story-nav');
  await page.screenshot({ path: shots + '21-storia.png', fullPage: true });
  console.log('capitolo 2 bloccato:', await page.locator('.chapter-list button').nth(1).isDisabled());
  await page.selectOption('.chapter select', 'Patto Neon');
  await page.click('text=Gioca il capitolo');
  console.log('introduzione visibile:', await page.locator('.recap').first().innerText().then(t => t.startsWith('Capitolo 1')));
  await page.click('text=Conferma mano');
  for (let turn = 0; turn < 40; turn++) {
    await page.waitForFunction(() => !(document.querySelector('#table [role=status]')?.textContent ?? '').includes('computer'), null, { timeout: 15000 });
    let s = await status();
    if (s === 'Vittoria!' || s === 'Sconfitta' || s === 'Pareggio') break;
    for (let k = 0; k < 10; k++) {
      const playable = page.locator('#table .side').last().locator('.cards.hand button.card:not([disabled])');
      if (!(await playable.count())) break;
      await playable.first().click();
      if ((await status()).includes('bersaglio')) {
        const t = page.locator('#table .target');
        if (await t.count()) await t.first().click(); else await page.click('text=Annulla');
      }
    }
    const power = page.locator('#table .side').last().locator('.hero-power button:not([disabled])');
    if (await power.count()) {
      await power.click();
      if ((await status()).includes('bersaglio')) {
        const t = page.locator('#table .target');
        if (await t.count()) await t.first().click(); else await page.click('text=Annulla');
      }
    }
    for (let k = 0; k < 8; k++) {
      const attacker = page.locator('#table .side').last().locator('.cards').first().locator('button.card:not([disabled])');
      s = await status();
      if (!(await attacker.count()) || s === 'Vittoria!' || s === 'Sconfitta') break;
      await attacker.first().click();
      const hero = page.locator('#table .hero button.target');
      if (await hero.count()) await hero.click();
      else if (await page.locator('#table .card.target').count()) await page.locator('#table .card.target').first().click();
      else { await page.click('text=Annulla'); break; }
    }
    s = await status();
    if (s === 'Vittoria!' || s === 'Sconfitta') break;
    await page.click('text=Fine turno');
    await page.waitForTimeout(600);
  }
  const result = await status();
  console.log('esito capitolo 1:', result, '|', await page.locator('.reward-line').first().innerText().catch(() => ''));
  if (result === 'Vittoria!') console.log('epilogo:', (await page.locator('.story-outro').innerText()).split('\n')[0]);
  await page.screenshot({ path: shots + '22-fine-capitolo.png', fullPage: true });
  await page.click('text=Torna alla Storia');
  console.log('capitolo 2 sbloccato:', !(await page.locator('.chapter-list button').nth(1).isDisabled()));

  // Missioni
  await page.click('#quests-nav');
  const progress = await page.locator('.quest-list li').allInnerTexts();
  console.log('missioni:', progress.map(t => t.replace(/\n/g, ' ')).join(' || '));
  await page.screenshot({ path: shots + '23-missioni.png', fullPage: true });
  const claim = page.locator('.quest-list button:not([disabled])');
  if (await claim.count()) {
    await claim.first().click();
    console.log('riscatto:', await page.locator('#quests [role=status]').innerText());
  }
  await checkWidth('missioni');

  // Buste
  await page.click('#library');
  const before = await page.locator('#wallet').innerText();
  await page.click('text=/Apri una busta/');
  await page.waitForTimeout(900);
  console.log('busta aperta:', await page.locator('.pack-result .card').count(), 'carte ·', (await page.locator('.pack-result .badge').allInnerTexts()).join(', '));
  console.log('portafoglio prima/dopo:', before, '→', await page.locator('#wallet').innerText());
  await page.screenshot({ path: shots + '24-busta.png' });
  await checkWidth('buste');

  // Installazione e offline
  const manifest = await page.evaluate(async () => (await fetch(document.querySelector('link[rel=manifest]').href)).json());
  console.log('manifesto:', manifest.name, manifest.display, manifest.icons.length, 'icone');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForTimeout(800);
  await ctx.setOffline(true);
  await page.reload();
  console.log('offline: titolo', await page.title(), '· portafoglio', await page.locator('#wallet').innerText());
  await page.click('#library');
  await page.waitForTimeout(500);
  const broken = await page.evaluate(() => [...document.querySelectorAll('#cards img')].filter(i => i.complete && i.naturalWidth === 0).length);
  console.log('offline: miniature non caricate', broken);
  await ctx.setOffline(false);
  console.log('errori:', errors.length ? errors : 'nessuno');
  await browser.close();
})();
