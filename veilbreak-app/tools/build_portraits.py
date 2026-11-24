"""Ritratti degli eroi (da assets/originali-chatgpt) ritagliati in tondo sul volto, e dorso delle carte.
Uso (dalla cartella veilbreak-app): python3 -I tools/build_portraits.py ."""
import sys
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
src = root / "assets/originali-chatgpt"
out = root / "assets/eroi/ritratti"
# nome file: (centro x, centro y, lato) del riquadro del volto, in frazioni dell'immagine
FACES = {
    "eroe-ada-vesper": (.50, .33, .56), "eroe-iona-volt": (.50, .33, .56), "eroe-elena-voss": (.50, .30, .56),
    "eroe-mara-sottorotaia": (.50, .27, .56), "eroe-orfeo-grimm": (.50, .30, .56), "eroe-dex-halogen": (.50, .30, .56),
    "eroe-ottavia": (.50, .30, .56), "eroe-nonna-ines": (.50, .36, .56),
}
SIZE = 320
mask = Image.new("L", (SIZE, SIZE), 0)
ImageDraw.Draw(mask).ellipse((1, 1, SIZE - 2, SIZE - 2), fill=255)
for name, (cx, cy, side) in FACES.items():
    with Image.open(src / f"{name}.webp") as im:
        w, h = im.size
        s = side * w
        box = (cx * w - s / 2, cy * h - s / 2, cx * w + s / 2, cy * h + s / 2)
        crop = im.convert("RGB").crop(tuple(round(v) for v in box)).resize((SIZE, SIZE), Image.LANCZOS)
    face = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    face.paste(crop, (0, 0), mask)
    face.save(out / f"{name.removeprefix('eroe-')}.webp", "WEBP", quality=86)
with Image.open(src / "dorso-carte.webp") as im:
    im.convert("RGB").resize((240, 360), Image.LANCZOS).save(root / "assets/ornamenti/dorso.webp", "WEBP", quality=82)
print("ritratti e dorso creati")
