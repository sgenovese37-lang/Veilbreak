"""Ritratti degli eroi: medaglione di fazione ritagliato dalle illustrazioni originali 01-30.
Uso (dalla cartella veilbreak-app): python3 -I tools/build_heroes.py ."""
import sys
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
source = root / "assets/illustrazioni-01-30/illustrazioni"
# tema dell'eroe: carta originale con il medaglione di quella fazione
EMBLEMS = {"hollow": 4, "neon": 17, "saints": 6, "undercity": 3}
SIZE = 256
for theme, card in EMBLEMS.items():
    with Image.open(next(source.glob(f"{card:02d}-*.webp"))) as im:
        crop = im.convert("RGB").crop((28, 34, 232, 238)).resize((SIZE, SIZE), Image.LANCZOS)
    mask = Image.new("L", (SIZE, SIZE), 0)
    ImageDraw.Draw(mask).ellipse((2, 2, SIZE - 3, SIZE - 3), fill=255)
    out = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    out.paste(crop, (0, 0), mask)
    out.save(root / f"assets/eroi/{theme}.webp", "WEBP", quality=88)
print("ritratti creati:", ", ".join(EMBLEMS))
