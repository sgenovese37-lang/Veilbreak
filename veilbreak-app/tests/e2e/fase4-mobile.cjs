// Prova su iPhone 13 simulato della fase 4: opzioni, backup e ripristino, profilo e statistiche, testo grande.
const { chromium, devices } = require('playwright');
const fs = require('fs');
const shots = (process.env.SHOTS ?? require('os').tmpdir()) + '/';
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'it-IT', acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('dialog', d => d.accept());
  await page.goto('http://127.0.0.1:8000/veilbreak-app/');
  // statistiche finte per vedere il profilo pieno
  await page.evaluate(() => {
    const p = JSON.parse(localStorage.getItem('veilbreak-profile') ?? '{}');
    Object.assign(p, { shards: 777, stats: { played: 12, won: 7 }, lifetime: { won: 7, played: 12, kills: 40, heroDamage: 180, spells: 22, factions: ['Sottocittà'], hardWins: 2, chapters: 3, descentBest: 4, brawlWins: 1,
      byFaction: { 'Sottocittà': { played: 8, won: 5 }, 'Patto Neon': { played: 4, won: 2 } }, byHero: { 'nonna-ines': { played: 3, won: 2 } }, byKind: { normal: { played: 9, won: 5 }, story: { played: 3, won: 2 } },
      cards: { 46: 9, 49: 7, 55: 5, 84: 4, 90: 1 }, streak: 2, bestStreak: 4, fastestWin: 7, turns: 120 } });
    localStorage.setItem('veilbreak-profile', JSON.stringify(p));
  });
  await page.reload();
  await page.click('#settings-open');
  console.log('impostazioni:', (await page.locator('.settings-body button').allInnerTexts()).join(' | '));
  await page.screenshot({ path: shots + 'impostazioni.png' });
  await page.click('#fast-toggle');
  await page.click('#text-toggle');
  console.log('dopo i tocchi:', await page.locator('#fast-toggle').innerText(), '|', await page.locator('#text-toggle').innerText(), '| classi:', await page.evaluate(() => document.documentElement.className));
  // backup: scarica il file
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#backup-save')]);
  const file = shots + 'backup-prova.json';
  await download.saveAs(file);
  const backup = JSON.parse(fs.readFileSync(file, 'utf8'));
  console.log('backup:', download.suggestedFilename(), '| chiavi:', Object.keys(backup.data).length, '| stato:', await page.locator('#backup-status').innerText());
  // cambia i dati, poi ripristina il backup
  await page.evaluate(() => { const p = JSON.parse(localStorage.getItem('veilbreak-profile')); p.shards = 1; localStorage.setItem('veilbreak-profile', JSON.stringify(p)); });
  await page.setInputFiles('#backup-file', file);
  await page.waitForEvent('load');
  console.log('Schegge dopo il ripristino:', await page.evaluate(() => JSON.parse(localStorage.getItem('veilbreak-profile')).shards));
  // file sbagliato
  await page.click('#settings-open');
  fs.writeFileSync(shots + 'non-backup.json', '{"ciao":1}');
  await page.setInputFiles('#backup-file', shots + 'non-backup.json');
  await page.waitForTimeout(200);
  console.log('file sbagliato:', await page.locator('#backup-status').innerText());
  // profilo
  await page.click('#profile-open');
  console.log('profilo:', (await page.locator('#profile-view h3').allInnerTexts()).join(' | '));
  console.log('riepilogo:', (await page.locator('#profile-view .stat-tiles').first().innerText()).replace(/\n/g, ' '));
  await page.screenshot({ path: shots + 'profilo.png', fullPage: true });
  // partita con testo grande
  await page.click('text=Indietro');
  await page.click('text=Inizia partita');
  await page.click('text=Conferma mano');
  await page.waitForTimeout(400);
  await page.screenshot({ path: shots + 'testo-grande-partita.png' });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  console.log('scorrimento orizzontale con testo grande:', overflow);
  console.log('errori:', errors.length ? errors : 'nessuno');
  await browser.close();
})();
