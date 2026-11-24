"""Sfondi delle quattro ambientazioni, ricavati dalle illustrazioni delle carte.
Uso (dalla cartella veilbreak-app): python3 -I tools/build_environments.py ."""
import sys
from pathlib import Path
from PIL import Image, ImageEnhance, ImageFilter, ImageDraw

root = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
# tema: carta con la scena adatta
SCENES = {"hollow": 14, "neon": 16, "saints": 36, "undercity": 54}
for theme, card in SCENES.items():
    path = next(root.glob(f"assets/illustrazioni-*/illustrazioni/{card:02d}-*.webp"))
    im = Image.open(path).convert("RGB")
    w, h = im.size
    art = im.crop((int(w * .085), int(h * .135), int(w * .915), int(h * .55)))
    art = art.resize((960, round(960 * art.height / art.width)), Image.LANCZOS)
    art = art.filter(ImageFilter.GaussianBlur(1.2))
    art = ImageEnhance.Brightness(art).enhance(.82)
    art = ImageEnhance.Color(art).enhance(.85)
    # vignettatura: bordi più scuri, così le carte restano leggibili
    vignette = Image.new("L", art.size, 0)
    d = ImageDraw.Draw(vignette)
    for i in range(40):  # rettangoli pieni sempre più chiari verso il centro
        d.rectangle((i * 4, i * 3, art.width - i * 4, art.height - i * 3), fill=min(255, int(90 + 165 * i / 40)))
    vignette = vignette.filter(ImageFilter.GaussianBlur(40))
    dark = Image.new("RGB", art.size, (8, 7, 10))
    out = Image.composite(art, dark, vignette)
    out.save(root / f"assets/ambientazioni/{theme}.webp", "WEBP", quality=72, method=6)
print("ambientazioni create:", ", ".join(SCENES))
