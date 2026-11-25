// Crea lingue/<lingua>.mjs da un elenco di frasi italiane (JSON) e da un file di traduzioni
// "indice|traduzione" con una riga per frase, nello stesso ordine.
// Uso: node tools/crea_lingue.mjs frasi.json en.txt lingue/en.mjs "English"
import fs from "fs";
const [keysFile, textFile, outFile, label] = process.argv.slice(2);
const keys = JSON.parse(fs.readFileSync(keysFile, "utf8"));
const lines = fs.readFileSync(textFile, "utf8").split("\n").filter(l => l.length);
if (lines.length !== keys.length) throw new Error(`${textFile}: ${lines.length} righe, servono ${keys.length}`);
const holes = s => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(",");
const dict = {};
lines.forEach((line, i) => {
  const cut = line.indexOf("|");
  const index = Number(line.slice(0, cut));
  const text = line.slice(cut + 1);
  if (index !== i) throw new Error(`${textFile}: riga ${i + 1} ha indice ${index}`);
  if (holes(text) !== holes(keys[i])) throw new Error(`${textFile}: segnaposto diversi alla riga ${i}: ${keys[i]} → ${text}`);
  dict[keys[i]] = text;
});
fs.writeFileSync(outFile, `// ${label}: traduzioni delle frasi italiane del gioco. File creato da tools/crea_lingue.mjs.\nexport default ${JSON.stringify(dict, null, 1)};\n`);
console.log(outFile, Object.keys(dict).length);
