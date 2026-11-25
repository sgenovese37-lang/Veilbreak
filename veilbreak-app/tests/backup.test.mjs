import { test } from "node:test";
import assert from "node:assert/strict";
import { createBackup, readBackup, restoreBackup } from "../backup.mjs";

// archivio finto con la stessa interfaccia di localStorage
function fakeStore(entries = {}) {
  const map = new Map(Object.entries(entries));
  return {
    get length() { return map.size; },
    key: i => [...map.keys()][i] ?? null,
    getItem: k => map.get(k) ?? null,
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: k => map.delete(k),
    map,
  };
}

test("il backup contiene solo i dati del gioco e si ripristina uguale", () => {
  const profile = JSON.stringify({ shards: 321, story: { cleared: 5 }, stats: { played: 9, won: 4 } });
  const from = fakeStore({ "veilbreak-profile": profile, "veilbreak-custom-decks": "{}", "altro-sito": "x" });
  const backup = createBackup(from, new Date("2026-11-25T10:00:00Z"));
  assert.deepEqual(Object.keys(backup.data).sort(), ["veilbreak-custom-decks", "veilbreak-profile"]);
  const summary = readBackup(JSON.stringify(backup));
  assert.equal(summary.shards, 321);
  assert.equal(summary.chapters, 5);
  assert.equal(summary.won, 4);
  const to = fakeStore({ "veilbreak-profile": "{}", "veilbreak-vecchio": "1", "altro-sito": "y" });
  assert.ok(restoreBackup(summary, to));
  assert.equal(to.getItem("veilbreak-profile"), profile);
  assert.equal(to.getItem("veilbreak-vecchio"), null, "i vecchi dati del gioco vengono tolti");
  assert.equal(to.getItem("altro-sito"), "y", "gli altri dati restano");
});

test("un file che non è un backup viene rifiutato", () => {
  assert.throws(() => readBackup("non json"), /non è un backup/);
  assert.throws(() => readBackup('{"format":"altro","data":{}}'), /non è un backup/);
});
