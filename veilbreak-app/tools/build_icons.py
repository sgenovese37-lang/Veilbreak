"""Crea le icone dell'app dall'illustrazione del Frammento di Veil (carta 60).
Uso (dalla cartella veilbreak-app): python3 -I tools/build_icons.py ."""
import sys
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
source = root / "assets/illustrazioni-31-60/illustrazioni/60-frammento-di-veil.webp"
with Image.open(source) as im:
    im = im.convert("RGB")
    w, h = im.size
    # riquadro dell'illustrazione, senza cornice e testo
    side = int(w * 0.62)
    left = (w - side) // 2
    top = int(h * 0.14)
    art = im.crop((left, top, left + side, top + side))
for size in (192, 512):
    icon = art.resize((size, size), Image.LANCZOS)
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size - 1, size - 1), radius=size // 6, fill=255)
    out = Image.new("RGB", (size, size), (16, 17, 20))
    out.paste(icon, (0, 0), mask)
    out.save(root / f"assets/icone/icona-{size}.png", optimize=True)
print("icone create")
