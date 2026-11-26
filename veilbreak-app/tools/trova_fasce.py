"""Trova su ogni illustrazione la fascia stampata «Fazione • Creatura …» cercando la parola «Creatura»
(confronto a più scale). Il gioco ci disegna sopra la sua fascia con il tipo (fase 5), tradotta.

Uso (dalla cartella veilbreak-app, con OpenCV): python3 -I tools/trova_fasce.py .
Risultato: assets/carte-pulite/fasce.json  { id: [centro_y_%, altezza_%] } solo per le creature.
"""
import json, subprocess, sys
from pathlib import Path
import cv2
import numpy as np

root = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
clean = root / "assets" / "carte-pulite"
pos = json.loads((clean / "posizioni.json").read_text())
cards = json.loads(subprocess.check_output(["node", "-e", "import('./cards.mjs').then(m => console.log(JSON.stringify(m.cards)))"], cwd=root))
creatures = {c["id"] for c in cards if c["type"] == "Creatura"}
def load(cid): return cv2.imread(str(clean / pos[str(cid)]["file"]), cv2.IMREAD_GRAYSCALE)

# modello: la parola «Creatura» sulla carta 61 (fascia ben leggibile)
ref = load(61)
H, W = ref.shape
band = ref[int(H * .624):int(H * .648), int(W * .2):int(W * .8)]
word = band[:, int(band.shape[1] * .47):int(band.shape[1] * .73)]

out = {}
for cid in sorted(creatures):
    if str(cid) not in pos: continue
    im = load(cid); H, W = im.shape
    top = int(H * .45)
    roi = im[top:int(H * .8)]
    best = (-1, None)
    for s in np.arange(.75, 1.3, .05):
        tw = cv2.resize(word, None, fx=s, fy=s)
        r = cv2.matchTemplate(roi, tw, cv2.TM_CCOEFF_NORMED)
        _, mx, _, loc = cv2.minMaxLoc(r)
        if mx > best[0]: best = (mx, (loc[1] + top, tw.shape[0]))
    score, (y, h) = best
    if score < .6:
        print(f"carta {cid}: fascia non trovata (somiglianza {score:.2f})"); continue
    out[cid] = [round((y + h / 2) / H * 100, 2), round(h / H * 100, 2)]
(clean / "fasce.json").write_text(json.dumps(out, indent=1))
print(f"{len(out)} fasce trovate su {len(creatures)} creature")
# copia per il gioco (modulo JavaScript)
(root / "fasce.mjs").write_text("// Generato da tools/trova_fasce.py: posizione della fascia del tipo sulle illustrazioni (centro y %, altezza %).\nexport const bands = " + json.dumps({str(k): v for k, v in out.items()}) + ";\n")
