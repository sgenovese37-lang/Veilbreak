"""Ornamenti dell'interfaccia ritagliati dalle cornici delle carte (stesso stile grafico).
Uso (dalla cartella veilbreak-app): python3 -I tools/build_ornaments.py ."""
import sys
from pathlib import Path
from PIL import Image, ImageOps

root = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
src = root / "assets/illustrazioni-01-30/illustrazioni"
out = root / "assets/ornamenti"
card = Image.open(next(src.glob("09-*.webp"))).convert("RGBA")

# Fascia di filigrana: metà sinistra della decorazione in fondo alla carta, specchiata (niente simbolo di fazione).
left = card.crop((46, 1268, 300, 1494))
band = Image.new("RGBA", (left.width * 2 - 8, left.height), (0, 0, 0, 0))
band.alpha_composite(left, (0, 0))
band.alpha_composite(ImageOps.mirror(left), (left.width - 8, 0))
# il nero di fondo diventa trasparente, così la fascia si appoggia su qualunque pannello
px = band.load()
for y in range(band.height):
    for x in range(band.width):
        r, g, b, a = px[x, y]
        lum = max(r, g, b)
        if lum < 70:
            px[x, y] = (r, g, b, int(a * max(0, lum - 30) / 40))
band = band.resize((band.width // 2, band.height // 2), Image.LANCZOS)
band.save(out / "filigrana.webp", "WEBP", quality=88)

# Divisore con il rombo, dal riquadro del testo.
line = card.crop((200, 1121, 824, 1141))
lpx = line.load()
for y in range(line.height):
    for x in range(line.width):
        r, g, b, a = lpx[x, y]
        lum = max(r, g, b)
        lpx[x, y] = (r, g, b, 0 if lum < 60 else min(255, (lum - 60) * 3))
line.save(out / "divisore.webp", "WEBP", quality=90)
print("ornamenti creati:", band.size, line.size)
