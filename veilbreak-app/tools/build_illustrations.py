"""Genera illustrations.mjs e le miniature WebP dalle due cartelle di illustrazioni.

Uso (dalla cartella veilbreak-app): python3 -I tools/build_illustrations.py .
Ogni pacchetto resta nella sua cartella con il proprio mappa-carte.csv.
"""
import csv, json, sys
from pathlib import Path
from PIL import Image

root = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
assets = root / "assets"
thumbs = assets / "miniature"
thumbs.mkdir(exist_ok=True)
THUMB_WIDTH = 360

notes = {}
with open(assets / "note-verifica.csv", encoding="utf-8-sig") as f:
    for row in csv.DictReader(f):
        notes.setdefault(int(row["id_prototipo"]), []).append(row["nota"])

# Versioni corrette (scritte e simboli allineati al catalogo): sostituiscono l'originale nel gioco.
corrections = {}
fixed_dir = assets / "illustrazioni-corrette"
if (fixed_dir / "mappa-correzioni.csv").is_file():
    with open(fixed_dir / "mappa-correzioni.csv", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            corrections[int(row["id_prototipo"])] = (fixed_dir / row["file"], row["correzione"])

entries = {}
for pack in sorted(p for p in assets.glob("illustrazioni-*") if p.name != "illustrazioni-corrette"):
    with open(pack / "mappa-carte.csv", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            cid = int(row["id_prototipo"])
            original = pack / row["file"]
            if not original.is_file():
                raise SystemExit(f"Immagine mancante per la carta {cid}: {original}")
            fixed = corrections.get(cid)
            source = fixed[0] if fixed else original
            thumb = thumbs / source.name
            if not thumb.exists() or thumb.stat().st_mtime < source.stat().st_mtime:
                with Image.open(source) as im:
                    im = im.convert("RGB")
                    im = im.resize((THUMB_WIDTH, round(im.height * THUMB_WIDTH / im.width)), Image.LANCZOS)
                    im.save(thumb, "WEBP", quality=74, method=6)
            differences = []
            if fixed:
                pass  # la versione corretta coincide con il catalogo per fazione e testo
            elif row["fazione_illustrata"] != row["fazione_catalogo"]:
                differences.append(f"L'immagine indica la fazione {row['fazione_illustrata']}; il catalogo la assegna a {row['fazione_catalogo']}. In partita vale il catalogo.")
            if not fixed and row["differenze_testo_note"].strip():
                differences.append(row["differenze_testo_note"].strip())
            for extra in notes.get(cid, []):
                if extra not in differences:
                    differences.append(extra)
            entries[cid] = {
                "card": row["carta"],
                "src": source.relative_to(root).as_posix(),
                "thumb": thumb.relative_to(root).as_posix(),
                "pack": pack.name,
                "illustratedFaction": row["fazione_illustrata"],
                "differences": differences,
                "original": original.relative_to(root).as_posix() if fixed else None,
                "correction": fixed[1] if fixed else None,
            }

ordered = {k: entries[k] for k in sorted(entries)}
(root / "illustrations.mjs").write_text(
    "// File generato da tools/build_illustrations.py: non modificarlo a mano.\n"
    "// Le illustrazioni sono collegate alle carte tramite id_prototipo.\n"
    "export const illustrations = " + json.dumps(ordered, ensure_ascii=False, indent=2) + ";\n\n"
    "export const illustrationFor = id => illustrations[id] ?? null;\n",
    encoding="utf-8",
)
(thumbs / "elenco.json").write_text(json.dumps([e["thumb"] for e in ordered.values()], indent=0), encoding="utf-8")
print(f"{len(ordered)} illustrazioni collegate, {sum(bool(e['differences']) for e in ordered.values())} con differenze")
