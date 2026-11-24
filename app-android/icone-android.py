"""Icone e schermata di avvio Android dall'icona del gioco (../veilbreak-app/assets/icone/icona-512.png).
Uso (dalla cartella app-android): python3 -I icone-android.py ."""
import sys
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
res = root / "android/app/src/main/res"
icon = Image.open(root / "../veilbreak-app/assets/icone/icona-512.png").convert("RGBA")
BG = (16, 17, 20, 255)
for folder, size in {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}.items():
    d = res / f"mipmap-{folder}"
    icon.resize((size, size), Image.LANCZOS).save(d / "ic_launcher.png")
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size - 1, size - 1), fill=255)
    rnd = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    rnd.paste(icon.resize((size, size), Image.LANCZOS), (0, 0), mask)
    rnd.save(d / "ic_launcher_round.png")
    # icona adattiva: primo piano 108dp con il disegno nei 72dp centrali
    fg = int(size * 108 / 48)
    inner = int(size * 72 / 48)
    layer = Image.new("RGBA", (fg, fg), (0, 0, 0, 0))
    layer.paste(icon.resize((inner, inner), Image.LANCZOS), ((fg - inner) // 2, (fg - inner) // 2))
    layer.save(d / "ic_launcher_foreground.png")
# schermata di avvio: sfondo scuro con l'icona al centro, per ogni cartella drawable*
for splash in res.glob("drawable*/splash.png"):
    with Image.open(splash) as old:
        w, h = old.size
    canvas = Image.new("RGBA", (w, h), BG)
    side = int(min(w, h) * 0.32)
    canvas.alpha_composite(icon.resize((side, side), Image.LANCZOS), ((w - side) // 2, (h - side) // 2))
    canvas.convert("RGB").save(splash)
values = res / "values/ic_launcher_background.xml"
values.write_text('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#101114</color>\n</resources>\n')
print("icone e schermate di avvio aggiornate")
