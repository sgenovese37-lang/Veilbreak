import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { cards } from "../cards.mjs";
import { heroes, lockedHeroes } from "../heroes.mjs";
import { chapters } from "../story.mjs";
import { environments } from "../environments.mjs";
import { missing, languages } from "../i18n.mjs";
import en from "../lingue/en.mjs";

const root = new URL("..", import.meta.url);
const read = f => readFileSync(new URL(f, root), "utf8");

// Frasi passate a t("...") nel codice
function codeKeys() {
  const keys = new Set();
  for (const f of ["app.mjs", "game.mjs", "tutorial.mjs", "missions.mjs", "profile.mjs", "story.mjs"]) {
    for (const m of read(f).matchAll(/\bt\(\s*"((?:[^"\\]|\\.)*)"/g)) keys.add(m[1]);
  }
  return [...keys];
}

test("le quattro lingue sono disponibili", () => {
  assert.deepEqual(Object.keys(languages), ["it", "en", "de", "es"]);
});

test("ogni frase del codice è tradotta in inglese, tedesco e spagnolo", () => {
  const keys = codeKeys();
  assert.ok(keys.length > 80);
  for (const lang of ["en", "de", "es"]) assert.deepEqual(missing(lang, keys), [], lang);
});

test("regole delle carte, poteri, Storia e ambientazioni sono tradotti", () => {
  const texts = [
    ...cards.map(c => c.text).filter(Boolean), ...new Set(cards.map(c => c.type)),
    ...[...Object.values(heroes), ...Object.values(lockedHeroes)].flatMap(h => [h.power.name, h.power.text]),
    ...chapters.flatMap(c => [c.title, c.intro, c.outro]),
    ...Object.values(environments).map(e => e.name),
  ];
  for (const lang of ["en", "de", "es"]) assert.deepEqual(missing(lang, texts), [], lang);
});

test("i segnaposto {nome} restano uguali nelle traduzioni", () => {
  const holes = s => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join();
  for (const [it, text] of Object.entries(en)) assert.equal(holes(text), holes(it), it);
});
