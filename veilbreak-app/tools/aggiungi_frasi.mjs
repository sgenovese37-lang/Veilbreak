// Aggiunge o aggiorna frasi nei file delle lingue. Uso: node tools/aggiungi_frasi.mjs frasi.json
// frasi.json: { "frase italiana": { "en": "...", "de": "...", "es": "..." }, ... }
import fs from "fs";
const add = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
for (const lang of ["en", "de", "es"]) {
  const file = new URL(`../lingue/${lang}.mjs`, import.meta.url);
  const src = fs.readFileSync(file, "utf8");
  const head = src.slice(0, src.indexOf("export default"));
  const dict = (await import(file.href + "?t=" + Date.now())).default;
  for (const [it, tr] of Object.entries(add)) if (tr[lang]) dict[it] = tr[lang];
  fs.writeFileSync(file, `${head}export default ${JSON.stringify(dict, null, 1)};\n`);
  console.log(lang, Object.keys(dict).length);
}
