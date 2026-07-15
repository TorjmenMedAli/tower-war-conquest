#!/usr/bin/env python3
"""Generate Android launcher icons for TDS from assets/icon.png.

Produces, for every density (mdpi..xxxhdpi):
  - ic_launcher.png            legacy square, full bleed
  - ic_launcher_round.png      circular-masked (transparent corners)
  - ic_launcher_foreground.png adaptive foreground — art shrunk to the SAFE
    fraction of the canvas as a circular emblem, because launchers mask the
    outer ~1/3 of adaptive icons (full-bleed art gets visibly cut)
and sets @color/ic_launcher_background to a colour sampled from the art so
that masked adaptive corners blend in.

Usage:  python gen-icon.py        (needs Pillow: pip install Pillow)
Swap assets/icon.png (>=1024x1024) and re-run to re-brand.
"""
import os
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "assets", "icon.png")
RES = os.path.join(HERE, "android", "app", "src", "main", "res")

img = Image.open(SRC).convert("RGBA")
side = min(img.size)
left, top = (img.width - side) // 2, (img.height - side) // 2
img = img.crop((left, top, left + side, top + side))
MASTER = 1024
master = img.resize((MASTER, MASTER), Image.LANCZOS)


def avg_region(im, box):
    return im.crop(box).resize((1, 1), Image.LANCZOS).getpixel((0, 0))


c, s = MASTER, 120
corners = [avg_region(master, b) for b in
           [(0, 0, s, s), (c - s, 0, c, s), (0, c - s, s, c), (c - s, c - s, c, c)]]
bg = tuple(sum(ch[i] for ch in corners) // len(corners) for i in range(3))
bg_hex = "#%02X%02X%02X" % bg


def circle_mask(size):
    ss = size * 4
    m = Image.new("L", (ss, ss), 0)
    ImageDraw.Draw(m).ellipse((0, 0, ss - 1, ss - 1), fill=255)
    return m.resize((size, size), Image.LANCZOS)


legacy = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
fg = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}
SAFE = 0.72  # adaptive safe zone: keep the art inside the central ~66% the mask reveals

for dens, sz in legacy.items():
    d = os.path.join(RES, "mipmap-" + dens)
    sq = master.resize((sz, sz), Image.LANCZOS)
    sq.convert("RGB").save(os.path.join(d, "ic_launcher.png"))
    rnd = sq.copy()
    rnd.putalpha(circle_mask(sz))
    rnd.save(os.path.join(d, "ic_launcher_round.png"))
    fsz = fg[dens]
    # adaptive FOREGROUND: sharp SQUARE art in the safe zone (transparent border). No circle
    # mask — squircle/rounded-square launchers (MIUI etc.) reveal far more than a circle, and
    # a circular emblem shows its own edge + flat corners there.
    art = int(fsz * SAFE)
    canvas = Image.new("RGBA", (fsz, fsz), (0, 0, 0, 0))
    canvas.paste(master.resize((art, art), Image.LANCZOS), ((fsz - art) // 2, (fsz - art) // 2))
    canvas.save(os.path.join(d, "ic_launcher_foreground.png"))
    # adaptive BACKGROUND: blurred, zoomed art — whatever region a launcher's mask exposes
    # beyond the sharp foreground is matching artwork, never a flat ring or hard seam.
    crop = int(MASTER * 0.70)
    o = (MASTER - crop) // 2
    bgim = master.crop((o, o, o + crop, o + crop)).resize((fsz, fsz), Image.LANCZOS)
    bgim = bgim.filter(ImageFilter.GaussianBlur(max(2, int(fsz * 0.055))))
    bgim.convert("RGB").save(os.path.join(d, "ic_launcher_bgimg.png"))
    print("wrote", dens)

with open(os.path.join(RES, "values", "ic_launcher_background.xml"), "w", encoding="utf-8") as f:
    f.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
            '    <color name="ic_launcher_background">%s</color>\n</resources>\n' % bg_hex)
print("background", bg_hex, "- DONE")
