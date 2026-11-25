"""Toglie dalle illustrazioni le scritte «ATT n», «DIF n» e il numero del costo, per sostituirle nel
gioco con cerchi che mostrano i valori attuali (anche quando cambiano in partita).

Uso (dalla cartella veilbreak-app, con OpenCV installato: pip install opencv-python-headless):
    python3 -I tools/pulisci_carte.py .
Poi: python3 -I tools/build_illustrations.py .

Le targhette e la gemma del costo sono nello stesso punto in tutte le carte di un set: le posizioni
(in frazioni di larghezza e altezza) sono state misurate sulle illustrazioni. Restano le targhette
colorate (verde l'Attacco, rossa la Difesa) e la gemma: sopra il gioco disegna i cerchi.
Risultato: assets/carte-pulite/<file>.webp e assets/carte-pulite/posizioni.json.
"""
import csv, json, subprocess, sys
from pathlib import Path
import cv2
import numpy as np

root = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
assets = root / "assets"
out_dir = assets / "carte-pulite"
out_dir.mkdir(exist_ok=True)
WIDTH, HEIGHT = 720, 1080

# centro x, centro y, larghezza, altezza delle targhette; centro della gemma del costo
TEMPLATES = {
    1: {"att": (0.204, 0.915, 0.25, 0.062), "dif": (0.796, 0.915, 0.25, 0.062), "cost": (0.885, 0.090)},
    2: {"att": (0.230, 0.935, 0.305, 0.066), "dif": (0.770, 0.935, 0.305, 0.066), "cost": (0.885, 0.080)},
    3: {"att": (0.236, 0.901, 0.305, 0.046), "dif": (0.764, 0.901, 0.305, 0.046), "cost": (0.875, 0.080)},
}
set_of = lambda cid: 1 if cid <= 30 else 2 if cid <= 60 else 3

cards = json.loads(subprocess.check_output(["node", "-e", "import('./cards.mjs').then(m => console.log(JSON.stringify(m.cards)))"], cwd=root))
creatures = {c["id"] for c in cards if c["type"] == "Creatura"}

# sorgente di ogni carta: la versione corretta se c'è, altrimenti l'originale del pacchetto
sources = {}
for pack in sorted(p for p in assets.glob("illustrazioni-*") if p.name != "illustrazioni-corrette"):
    with open(pack / "mappa-carte.csv", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            sources[int(row["id_prototipo"])] = pack / row["file"]
fixed = assets / "illustrazioni-corrette"
if (fixed / "mappa-correzioni.csv").is_file():
    with open(fixed / "mappa-correzioni.csv", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            sources[int(row["id_prototipo"])] = fixed / row["file"]


def text_mask(im, x0, y0, x1, y1, margin_x=0):
    """Pixel chiari (lettere e cifre) dentro un riquadro, esclusi i bordi."""
    roi = cv2.cvtColor(im[y0:y1, x0:x1], cv2.COLOR_BGR2HSV)
    v = roi[..., 2].astype(int)
    s = roi[..., 1].astype(int)
    med = np.median(v)
    m = ((v > med + 45) | ((s < 70) & (v > med + 25))).astype(np.uint8) * 255
    b = max(3, int((y1 - y0) * 0.16))
    m[:b] = 0
    m[-b:] = 0
    if margin_x:
        m[:, :margin_x] = 0
        m[:, -margin_x:] = 0
    m = cv2.dilate(m, np.ones((5, 5), np.uint8), iterations=2)
    full = np.zeros(im.shape[:2], np.uint8)
    full[y0:y1, x0:x1] = m
    return full


positions = {}
for cid, path in sorted(sources.items()):
    im = cv2.imread(str(path))
    im = cv2.resize(im, (WIDTH, HEIGHT), interpolation=cv2.INTER_AREA)
    tpl = TEMPLATES[set_of(cid)]
    mask = np.zeros((HEIGHT, WIDTH), np.uint8)
    pos = {}
    if cid in creatures:
        for key in ("att", "dif"):
            cx, cy, w, h = tpl[key]
            x0, x1 = int((cx - w / 2) * WIDTH), int((cx + w / 2) * WIDTH)
            y0, y1 = int((cy - h / 2) * HEIGHT), int((cy + h / 2) * HEIGHT)
            mask |= text_mask(im, x0, y0, x1, y1, margin_x=int((y1 - y0) * 0.25))
            pos[key] = [round(cx * 100, 2), round(cy * 100, 2)]
    cx, cy = tpl["cost"]
    half = int(WIDTH * 0.05)
    x, y = int(cx * WIDTH), int(cy * HEIGHT)
    mask |= text_mask(im, x - half, y - half, x + half, y + half)
    pos["cost"] = [round(cx * 100, 2), round(cy * 100, 2)]
    clean = cv2.inpaint(im, mask, 7, cv2.INPAINT_TELEA)
    cv2.imwrite(str(out_dir / (path.stem + ".webp")), clean, [cv2.IMWRITE_WEBP_QUALITY, 80])
    positions[cid] = {"file": path.stem + ".webp", **pos}

(out_dir / "posizioni.json").write_text(json.dumps(positions, indent=1), encoding="utf-8")
print(f"{len(positions)} carte pulite in {out_dir.relative_to(root)}")
