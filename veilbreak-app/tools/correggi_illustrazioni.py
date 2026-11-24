"""Corregge sulle illustrazioni 01-30 le scritte che non coincidono con il catalogo.

- 11 carte: riga di fazione e tipo sotto il disegno.
- Carta 1 (Sindaco) e 15 (Ultima Legge): testo delle regole.

Le immagini originali restano intatte; le versioni corrette vanno in
assets/illustrazioni-corrette/ insieme a mappa-correzioni.csv.

Requisiti: Pillow, numpy, opencv-python-headless (solo per chi rigenera le immagini).
Uso (dalla cartella veilbreak-app): python3 -I tools/correggi_illustrazioni.py .
Poi: python3 -I tools/build_illustrations.py .
"""
import csv, sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

root = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
source_dir = root / "assets/illustrazioni-01-30/illustrazioni"
out_dir = root / "assets/illustrazioni-corrette"
(out_dir / "illustrazioni").mkdir(parents=True, exist_ok=True)
fonts = root / "tools/fonts"
SEMIBOLD = str(fonts / "eb-garamond-latin-600-normal.woff")
MEDIUM = str(fonts / "eb-garamond-latin-500-normal.woff")
DIAMOND = "◆"

# id: (centro verticale approssimato della riga, testo stampato, testo corretto dal catalogo)
FACTION_LINES = {
    3: (909, "Sottocitta ◆ Creatura rara", "Corte di Hollow ◆ Creatura rara"),
    6: (905, "Senza Santi ◆ Artefatto raro", "Corte di Hollow ◆ Artefatto raro"),
    7: (905, "Patto Neon ◆ Artefatto non comune", "Corte di Hollow ◆ Artefatto non comune"),
    8: (1037, "Sottocitta ◆ Creatura comune", "Corte di Hollow ◆ Creatura comune"),
    9: (975, "Patto Neon ◆ Incantesimo comune", "Corte di Hollow ◆ Incantesimo comune"),
    10: (1035, "Senza Santi ◆ Creatura comune", "Corte di Hollow ◆ Creatura comune"),
    16: (971, "Sottocitta ◆ Incantesimo leggendario", "Patto Neon ◆ Incantesimo leggendario"),
    20: (973, "Senza Santi ◆ Creatura rara", "Patto Neon ◆ Creatura rara"),
    24: (1002, "Corte di Hollow ◆ Creatura non comune", "Patto Neon ◆ Creatura non comune"),
    25: (905, "Senza Santi ◆ Artefatto non comune", "Patto Neon ◆ Artefatto non comune"),
    27: (971, "Sottocitta ◆ Incantesimo non comune", "Patto Neon ◆ Incantesimo non comune"),
}


# Simboli di fazione: medaglione in alto a sinistra e in basso al centro, presi da una carta
# della fazione giusta con la stessa disposizione (creatura o no). id: (fonte angolo, fonte basso)
EMBLEM_SOURCES = {
    3: (4, 4), 6: (12, 12), 7: (13, 12), 8: (11, 11), 9: (11, 12), 10: (11, 11),
    16: (17, 17), 20: (18, 18), 24: (26, 26), 25: (21, 21), 27: (21, 21),
}
# Il simbolo del Patto Neon ha circuiti laterali: dove c'era o dove arriva serve una zona più larga.
NEON = {7, 9, 16, 20, 24, 25, 27}
FORMER_NEON_SPELLS = {7, 9}  # senza Attacco/Difesa: i circuiti vecchi arrivano più in fuori
CORNER = ((130, 135), (108, 106))
CORNER_WIDE = ((140, 135), (125, 104))
BOTTOM = ((512, 1385), (132, 112))
BOTTOM_WIDE = ((512, 1385), (185, 108))
BOTTOM_WIDER = ((512, 1385), (222, 108))


def ellipse_mask(size, center, radii, feather=14):
    m = Image.new("L", size, 0)
    (cx, cy), (rx, ry) = center, radii
    ImageDraw.Draw(m).ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=255)
    return m.filter(ImageFilter.GaussianBlur(feather))


def keep_original(target, donor):
    """Pixel da lasciare all'originale: titolo (testo chiaro) e bagliori colorati della cornice."""
    masks = []
    for im in (target, donor):
        a = np.asarray(im)
        hsv = cv2.cvtColor(a, cv2.COLOR_RGB2HSV)
        hue, sat, val = hsv[..., 0].astype(int), hsv[..., 1].astype(int), hsv[..., 2].astype(int)
        # bagliori della cornice: blu e viola anche tenui, verde solo se acceso; mai il rame
        glow = ((sat > 140) & (val > 100) & (hue > 30) & (hue < 170)) | ((sat > 55) & (val > 45) & (hue > 100) & (hue < 170))
        masks.append(glow)
    glow = (masks[0] | masks[1]).astype(np.uint8)
    # nel cuore dei medaglioni non c'è cornice: lì niente protezione (per esempio il filo azzurro dell'ago)
    cv2.ellipse(glow, (124, 132), (96, 90), 0, 0, 360, 0, -1)
    cv2.ellipse(glow, (512, 1380), (112, 96), 0, 0, 360, 0, -1)
    text = (cream_mask(np.asarray(target)) | cream_mask(np.asarray(donor))).astype(np.uint8)
    text[:, :226] = 0  # il titolo inizia a destra del medaglione
    text[300:, :] = 0
    text = cv2.dilate(text * 255, np.ones((13, 13), np.uint8))
    keep = np.maximum(cv2.dilate(glow * 255, np.ones((7, 7), np.uint8)), text)
    keep = cv2.GaussianBlur(keep, (0, 0), 3)
    return Image.fromarray(keep)


def swap_emblems(card_id, img):
    corner_src, bottom_src = EMBLEM_SOURCES[card_id]
    wide = card_id in NEON
    bottom = BOTTOM_WIDER if card_id in FORMER_NEON_SPELLS else BOTTOM_WIDE if wide else BOTTOM
    for src_id, (center, radii) in ((corner_src, CORNER_WIDE if wide else CORNER), (bottom_src, bottom)):
        donor = Image.open(next(source_dir.glob(f"{src_id:02d}-*.webp"))).convert("RGB")
        area = np.asarray(ellipse_mask(img.size, center, radii), dtype=float)
        keep = np.asarray(keep_original(img, donor), dtype=float) / 255
        mask = Image.fromarray((area * (1 - keep)).astype(np.uint8))
        img = Image.composite(donor, img, mask)
    return img


def cream_mask(a):
    r, g, b = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int)
    return (r > 165) & (g > 150) & (b > 115) & (r - b < 70) & (r - b > 0)


def segments(indexes, gap):
    groups, cur = [], [indexes[0]]
    for v in indexes[1:]:
        if v - cur[-1] <= gap:
            cur.append(v)
        else:
            groups.append(cur)
            cur = [v]
    groups.append(cur)
    return groups


def find_line(a, center, half=30):
    """Riquadro della riga di testo chiaro più vicina a `center`."""
    h, w, _ = a.shape
    cream = cream_mask(a)
    x0, x1 = int(w * .085), int(w * .915)
    rows = cream[:, x0:x1].sum(1)
    band = [y for y in range(center - half, center + half) if rows[y] > 4]
    group = max(segments(band, 2), key=lambda g: sum(rows[y] for y in g))
    top, bottom = group[0], group[-1]
    cols = list(np.where(cream[top:bottom + 1, x0:x1].sum(0) > 0)[0] + x0)
    # tiene il blocco centrale di colonne, scartando gli ornamenti della cornice ai lati
    parts = segments(cols, 40)
    mid = w / 2
    main = min(parts, key=lambda p: 0 if p[0] <= mid <= p[-1] else min(abs(p[0] - mid), abs(p[-1] - mid)))
    left, right = main[0], main[-1]
    for p in parts:
        if p[-1] < left and left - p[-1] <= 60:
            left = p[0]
    for p in reversed(parts):
        if p[0] > right and p[0] - right <= 60:
            right = p[-1]
    return left, top, right, bottom


def text_color(a, box):
    l, t, r, b = box
    region = a[t:b + 1, l:r + 1]
    m = cream_mask(region)
    px = region[m]
    bright = px[px.sum(1) >= np.percentile(px.sum(1), 60)]
    return tuple(int(v) for v in np.median(bright, axis=0))


def erase(img, box, pad=6, grow=4):
    """Cancella il testo chiaro nel riquadro ricostruendo lo sfondo."""
    a = np.asarray(img)
    l, t, r, b = box
    mask = np.zeros(a.shape[:2], np.uint8)
    region = cream_mask(a[t - pad:b + pad, l - pad:r + pad])
    mask[t - pad:b + pad, l - pad:r + pad] = region.astype(np.uint8) * 255
    mask = cv2.dilate(mask, np.ones((grow * 2 + 1, grow * 2 + 1), np.uint8))
    bgr = cv2.cvtColor(a, cv2.COLOR_RGB2BGR)
    fixed = cv2.inpaint(bgr, mask, 7, cv2.INPAINT_TELEA)
    return Image.fromarray(cv2.cvtColor(fixed, cv2.COLOR_BGR2RGB))


def advance(font, ch, size):
    return size * 0.62 if ch == DIAMOND else font.getlength(ch)


def line_width(font, text, size, tracking):
    return sum(advance(font, ch, size) for ch in text) + tracking * (len(text) - 1)


def ink_height(font, text):
    sample = text.replace(DIAMOND, "")
    l, t, r, b = font.getbbox(sample)
    return b - t, t


def fit_font(path, printed, box):
    """Dimensione e spaziatura che riproducono la riga stampata nel riquadro misurato."""
    height = box[3] - box[1] + 1
    size = 40
    for _ in range(4):
        font = ImageFont.truetype(path, size)
        h, _ = ink_height(font, printed)
        size = max(8, round(size * height / h))
    font = ImageFont.truetype(path, size)
    natural = line_width(font, printed, size, 0)
    tracking = ((box[2] - box[0] + 1) - natural) / max(1, len(printed) - 1)
    return font, size, tracking


def draw_line(img, text, font, size, tracking, center_x, top, color):
    width = line_width(font, text, size, tracking)
    _, offset = ink_height(font, text)
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    shadow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d, ds = ImageDraw.Draw(layer), ImageDraw.Draw(shadow)
    x = center_x - width / 2
    y = top - offset
    cap = ImageFont.truetype(font.path, size).getbbox("H")
    cap_top, cap_bottom = y + cap[1], y + cap[3]
    for ch in text:
        if ch == DIAMOND:
            cx, cy, s = x + size * 0.31, (cap_top + cap_bottom) / 2, size * 0.17
            pts = [(cx, cy - s), (cx + s, cy), (cx, cy + s), (cx - s, cy)]
            ds.polygon([(px + 1, py + 2) for px, py in pts], fill=(10, 6, 6, 170))
            d.polygon(pts, fill=color + (255,))
        else:
            ds.text((x + 1, y + 2), ch, font=font, fill=(10, 6, 6, 170))
            d.text((x, y), ch, font=font, fill=color + (255,))
        x += advance(font, ch, size) + tracking
    shadow = shadow.filter(ImageFilter.GaussianBlur(1.6))
    base = img.convert("RGBA")
    base.alpha_composite(shadow)
    base.alpha_composite(layer)
    return base.convert("RGB")


def fix_faction(card_id):
    center, printed, wanted = FACTION_LINES[card_id]
    path = next(source_dir.glob(f"{card_id:02d}-*.webp"))
    img = Image.open(path).convert("RGB")
    a = np.asarray(img)
    box = find_line(a, center)
    color = text_color(a, box)
    font, size, tracking = fit_font(SEMIBOLD, printed, box)
    # la riga corretta non deve uscire troppo dallo spazio della vecchia né avvicinarsi ai bordi
    limit = img.width * 0.74
    floor = tracking * 0.6
    while line_width(font, wanted, size, tracking) > limit and tracking > floor:
        tracking -= 0.25
    while line_width(font, wanted, size, tracking) > limit and size > 10:
        size -= 1
        font = ImageFont.truetype(SEMIBOLD, size)
    clean = erase(img, box)
    result = draw_line(clean, wanted, font, size, tracking, (box[0] + box[2]) / 2, box[1], color)
    result = swap_emblems(card_id, result)
    return path, result, f"Simboli e riga di fazione corretti: «{printed.replace(DIAMOND, '•')}» → «{wanted.replace(DIAMOND, '•')}»."


def wrap(font, text, size, tracking, max_width):
    lines, cur = [], ""
    for word in text.split():
        test = f"{cur} {word}".strip()
        if line_width(font, test, size, tracking) <= max_width or not cur:
            cur = test
        else:
            lines.append(cur)
            cur = word
    lines.append(cur)
    return lines


def text_rows(a, y0, y1):
    """Righe di testo chiaro (gruppi contigui) tra y0 e y1, con riquadro."""
    h, w, _ = a.shape
    cream = cream_mask(a)
    x0, x1 = int(w * .12), int(w * .88)
    rows = cream[:, x0:x1].sum(1)
    ys = [y for y in range(y0, y1) if rows[y] > 3]
    found = []
    for g in segments(ys, 3):
        if len(g) < 8:
            continue
        cols = list(np.where(cream[g[0]:g[-1] + 1, x0:x1].sum(0) > 0)[0] + x0)
        parts = segments(cols, 40)
        mid = w / 2
        main = [p for p in parts if p[-1] > w * .2 and p[0] < w * .8]
        found.append((min(p[0] for p in main), g[0], max(p[-1] for p in main), g[-1]))
    return found


RULE_SPECS = {
    1: {
        "rect": (86, 888, 936, 1104),  # titoletto «Rapidità» con ornamenti e tre righe di testo
        "reference": (0, "Quando il Sindaco di Hollow Street entra"),
        "font": MEDIUM,
        "text": "Quando entra in gioco, prendi il controllo di una creatura nemica fino alla fine del turno. Quella creatura ha Rapidità.",
        "note": "Testo delle regole corretto: Rapidità passa dal Sindaco alla creatura presa in controllo, come nel catalogo.",
    },
    15: {
        "rect": (100, 1036, 924, 1150),
        "reference": (0, "Prendi il controllo di tutte"),
        "font": SEMIBOLD,
        "text": "Prendi il controllo di tutte le creature nemiche fino alla fine del turno.",
        "note": "Testo delle regole corretto: aggiunta la durata «fino alla fine del turno», come nel catalogo.",
    },
}


def erase_rect(img, rect):
    """Cancella tutto ciò che è chiaro nel rettangolo (testo e ornamenti) ricostruendo lo sfondo."""
    a = np.asarray(img)
    l, t, r, b = rect
    mask = np.zeros(a.shape[:2], np.uint8)
    mask[t:b, l:r] = (a[t:b, l:r].max(axis=2) > 66).astype(np.uint8) * 255
    mask = cv2.dilate(mask, np.ones((9, 9), np.uint8))
    fixed = cv2.inpaint(cv2.cvtColor(a, cv2.COLOR_RGB2BGR), mask, 9, cv2.INPAINT_TELEA)
    return Image.fromarray(cv2.cvtColor(fixed, cv2.COLOR_BGR2RGB))


def fix_rules(card_id, spec):
    path = next(source_dir.glob(f"{card_id:02d}-*.webp"))
    img = Image.open(path).convert("RGB")
    a = np.asarray(img)
    l, t, r, b = spec["rect"]
    rows = [row for row in text_rows(a, t, b) if row[3] - row[1] < 50]
    row_index, ref_text = spec["reference"]
    lines_found = [row for row in rows if row[2] - row[0] > 300]
    ref = lines_found[row_index]
    color = text_color(a, ref)
    font, size, _ = fit_font(spec["font"], ref_text, ref)
    tracking = 0.0  # il testo delle regole non ha spaziatura aggiuntiva
    # si parte grandi e si riduce finché il testo sta nello spazio liberato
    size = round(size * 1.5)
    font = ImageFont.truetype(spec["font"], size)
    max_width = (r - l) * 0.92
    gap_ratio = 1.18  # interlinea simile a quella delle carte originali
    clean = erase_rect(img, spec["rect"])
    while True:
        lines = wrap(font, spec["text"], size, tracking, max_width)
        line_gap = size * gap_ratio
        cap = font.getbbox("Hd")
        height = line_gap * (len(lines) - 1) + (cap[3] - cap[1])
        if height <= (b - t) - 16 or size <= 14:
            break
        size -= 1
        font = ImageFont.truetype(spec["font"], size)
    start = t + ((b - t) - height) / 2
    result = clean
    for n, line in enumerate(lines):
        result = draw_line(result, line, font, size, tracking, img.width / 2, start + n * line_gap, color)
    return path, result, spec["note"]


def main():
    results = []
    for card_id in FACTION_LINES:
        results.append((card_id,) + fix_faction(card_id))
    for card_id, spec in RULE_SPECS.items():
        results.append((card_id,) + fix_rules(card_id, spec))
    rows = []
    for card_id, path, image, note in sorted(results):
        target = out_dir / "illustrazioni" / path.name
        image.save(target, "WEBP", quality=93, method=6)
        rows.append({"id_prototipo": card_id, "file": f"illustrazioni/{path.name}", "correzione": note})
    with open(out_dir / "mappa-correzioni.csv", "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["id_prototipo", "file", "correzione"])
        writer.writeheader()
        writer.writerows(rows)
    print(f"{len(rows)} illustrazioni corrette in {out_dir}")


if __name__ == "__main__":
    main()
