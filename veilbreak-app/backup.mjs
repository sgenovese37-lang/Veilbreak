// Backup dei progressi: tutti i dati del gioco salvati nel telefono (chiavi «veilbreak-…»)
// finiscono in un file .json che si può conservare o mandare a sé stessi, e si ripristinano da lì.
// Nell'app Android il file si salva e si condivide con i plugin di Capacitor; nel browser si scarica.
import { t } from "./i18n.mjs";

const prefix = "veilbreak-";
export const backupFormat = "veilbreak-backup";

function storage() {
  try { return typeof localStorage !== "undefined" ? localStorage : null; } catch { return null; }
}

// Contenuto del backup (oggetto). store: per i test si può passare un oggetto simile a localStorage.
export function createBackup(store = storage(), now = new Date()) {
  const data = {};
  if (store) {
    for (let i = 0; i < store.length; i++) {
      const key = store.key(i);
      if (key?.startsWith(prefix)) data[key] = store.getItem(key);
    }
  }
  return { format: backupFormat, version: 1, created: now.toISOString(), data };
}

// Controlla un backup letto da un file. Restituisce un riepilogo o lancia un errore con un messaggio chiaro.
export function readBackup(text) {
  let parsed;
  try { parsed = JSON.parse(text); } catch { throw new Error("Il file non è un backup di VEILBREAK."); }
  if (!parsed || parsed.format !== backupFormat || typeof parsed.data !== "object" || !parsed.data) {
    throw new Error("Il file non è un backup di VEILBREAK.");
  }
  const entries = Object.entries(parsed.data).filter(([k, v]) => k.startsWith(prefix) && typeof v === "string");
  let profile = null;
  try { profile = JSON.parse(parsed.data["veilbreak-profile"] ?? "null"); } catch { profile = null; }
  return {
    entries,
    created: parsed.created ?? null,
    shards: profile?.shards ?? 0,
    chapters: profile?.story?.cleared ?? 0,
    won: profile?.stats?.won ?? 0,
  };
}

// Sostituisce i dati attuali con quelli del backup (le chiavi del gioco non presenti nel backup vengono tolte).
export function restoreBackup(summary, store = storage()) {
  if (!store) return false;
  const old = [];
  for (let i = 0; i < store.length; i++) {
    const key = store.key(i);
    if (key?.startsWith(prefix)) old.push(key);
  }
  for (const key of old) store.removeItem(key);
  for (const [key, value] of summary.entries) store.setItem(key, value);
  return true;
}

export const backupName = (now = new Date()) => `veilbreak-backup-${now.toISOString().slice(0, 10)}.json`;

// Salva il file: nell'app Android lo scrive nella cache e apre «Condividi» (Drive, email, WhatsApp…);
// nel browser lo scarica. Restituisce "shared" o "downloaded".
export async function saveBackupFile(backup = createBackup()) {
  const text = JSON.stringify(backup);
  const name = backupName();
  const plugins = globalThis.Capacitor?.isNativePlatform?.() ? globalThis.Capacitor.Plugins : null;
  if (plugins?.Filesystem && plugins?.Share) {
    const written = await plugins.Filesystem.writeFile({ path: name, data: text, directory: "CACHE", encoding: "utf8" });
    await plugins.Share.share({ title: t("Backup VEILBREAK"), files: [written.uri], dialogTitle: t("Salva il backup di VEILBREAK") });
    return "shared";
  }
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const link = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return "downloaded";
}
