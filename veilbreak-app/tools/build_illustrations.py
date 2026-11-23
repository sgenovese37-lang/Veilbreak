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

entries = {}
for pack in sorted(assets.glob("illustrazioni-*")):
    with open(pack / "mappa-carte.csv", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            cid = int(row["id_prototipo"])
            source = pack / row["file"]
            if not source.is_file():
                raise SystemExit(f"Immagine mancante per la carta {cid}: {source}")
            thumb = thumbs / source.name
            if not thumb.exists() or thumb.stat().st_mtime < source.stat().st_mtime:
                with Image.open(source) as im:
                    im = im.convert("RGB")
                    im = im.resize((THUMB_WIDTH, round(im.height * THUMB_WIDTH / im.width)), Image.LANCZOS)
                    im.save(thumb, "WEBP", quality=74, method=6)
            differences = []
            if row["fazione_illustrata"] != row["fazione_catalogo"]:
                differences.append(f"L'immagine indica la fazione {row['fazione_illustrata']}; il catalogo la assegna a {row['fazione_catalogo']}. In partita vale il catalogo.")
            if row["differenze_testo_note"].strip():
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
            }

ordered = {k: entries[k] for k in sorted(entries)}
(root / "illustrations.mjs").write_text(
    "// File generato da tools/build_illustrations.py: non modificarlo a mano.\n"
    "// Le illustrazioni sono collegate alle carte tramite id_prototipo.\n"
    "export const illustrations = " + json.dumps(ordered, ensure_ascii=False, indent=2) + ";\n\n"
    "export const illustrationFor = id => illustrations[id] ?? null;\n",
    encoding="utf-8",
)
print(f"{len(ordered)} illustrazioni collegate, {sum(bool(e['differences']) for e in ordered.values())} con differenze")
