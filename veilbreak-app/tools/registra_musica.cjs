// Registra i temi musicali del gioco in file WAV per ascoltarli fuori dal gioco.
// Serve il gioco su http://127.0.0.1:8000 (python3 -m http.server 8000 dalla radice del progetto).
// Uso: node tools/registra_musica.cjs <cartella di uscita> [secondi=40] [temi separati da virgola, oppure «effetti»]
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const [outDir = '.', secondsArg = '40', list = 'menu,hollow,neon,saints,undercity'] = process.argv.slice(2);
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:8000/veilbreak-app/manifest.webmanifest');
  for (const name of list.split(',')) {
    const b64 = await page.evaluate(async ([name, seconds]) => {
      let buf;
      if (name === 'effetti') {
        // tutti gli effetti e poi le voci di una creatura per fazione
        const { renderEffects } = await import('/veilbreak-app/audio.mjs');
        const { cards } = await import('/veilbreak-app/cards.mjs');
        buf = await renderEffects([4, 18, 37, 47].map(id => cards.find(c => c.id === id)));
      } else {
        const { renderTheme } = await import('/veilbreak-app/music.mjs');
        buf = await renderTheme(name, seconds);
      }
      const ch = [buf.getChannelData(0), buf.getChannelData(1)];
      let peak = 0;
      for (const c of ch) for (let i = 0; i < c.length; i++) peak = Math.max(peak, Math.abs(c[i]));
      const gain = peak > 0.98 ? 0.98 / peak : 1;
      const n = buf.length, bytes = new DataView(new ArrayBuffer(44 + n * 4));
      const str = (o, s) => { for (let i = 0; i < s.length; i++) bytes.setUint8(o + i, s.charCodeAt(i)); };
      str(0, 'RIFF'); bytes.setUint32(4, 36 + n * 4, true); str(8, 'WAVE'); str(12, 'fmt ');
      bytes.setUint32(16, 16, true); bytes.setUint16(20, 1, true); bytes.setUint16(22, 2, true);
      bytes.setUint32(24, buf.sampleRate, true); bytes.setUint32(28, buf.sampleRate * 4, true);
      bytes.setUint16(32, 4, true); bytes.setUint16(34, 16, true); str(36, 'data'); bytes.setUint32(40, n * 4, true);
      for (let i = 0; i < n; i++) for (let c = 0; c < 2; c++) bytes.setInt16(44 + i * 4 + c * 2, Math.max(-1, Math.min(1, ch[c][i] * gain)) * 32767, true);
      let s = ''; const u = new Uint8Array(bytes.buffer);
      for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode(...u.subarray(i, i + 32768));
      return [btoa(s), peak];
    }, [name, Number(secondsArg)]);
    const file = path.join(outDir, `${name}.wav`);
    fs.writeFileSync(file, Buffer.from(b64[0], 'base64'));
    console.log(file, 'picco', b64[1].toFixed(3));
  }
  await browser.close();
})();
