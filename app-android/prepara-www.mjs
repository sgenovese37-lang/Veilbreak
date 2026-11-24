// Copia in www/ i file del gioco che servono all'app (senza test, strumenti e documenti).
import { cpSync, rmSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const source = new URL("../veilbreak-app/", import.meta.url).pathname;
const target = new URL("./www/", import.meta.url).pathname;
const skip = new Set(["tests", "tools", "README.md", "BILANCIAMENTO.md", "DIFFERENZE-ILLUSTRAZIONI.md"]);

rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
let files = 0;
for (const name of readdirSync(source)) {
  if (skip.has(name)) continue;
  cpSync(join(source, name), join(target, name), { recursive: true });
  files++;
}
const size = dir => readdirSync(dir).reduce((sum, n) => {
  const p = join(dir, n); const s = statSync(p);
  return sum + (s.isDirectory() ? size(p) : s.size);
}, 0);
console.log(`www pronta: ${files} voci, ${(size(target) / 1048576).toFixed(1)} MB`);
